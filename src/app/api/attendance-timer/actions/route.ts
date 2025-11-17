import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/../../prisma/client';

// POST - Handle attendance actions (check-out, break start/end, cancel)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { action } = body;

    // Get client info
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const now = Math.floor(Date.now() / 1000);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get today's attendance record
    const record = await prisma.attendanceRecord.findFirst({
      where: {
        userId,
        date: today,
      },
    });

    if (!record) {
      return NextResponse.json(
        { error: 'No attendance record found for today' },
        { status: 404 }
      );
    }

    switch (action) {
      case 'CHECK_OUT': {
        if (record.checkOutTime) {
          return NextResponse.json(
            { error: 'Already checked out' },
            { status: 400 }
          );
        }

        // Calculate total work minutes (excluding REST events)
        const checkInSeconds = Number(record.checkInTime);
        
        // Get all REST events for this attendance record
        const restEvents = await prisma.timerEvent.findMany({
          where: {
            attendanceRecordId: record.id,
            eventType: 'REST',
          },
          orderBy: {
            timestamp: 'asc',
          },
        });

        // Calculate total rest time in minutes
        let totalRestMinutes = 0;
        for (const restEvent of restEvents) {
          if (restEvent.endTimestamp) {
            const restDuration = Number(restEvent.endTimestamp) - Number(restEvent.timestamp);
            totalRestMinutes += Math.floor(restDuration / 60);
          }
        }

        const totalMinutes = Math.floor((now - checkInSeconds) / 60) - totalRestMinutes;

        const updatedRecord = await prisma.attendanceRecord.update({
          where: { id: record.id },
          data: {
            checkOutTime: BigInt(now),
            totalWorkMinutes: totalMinutes,
            status: 'COMPLETED',
          },
        });

        // Create operation log
        await prisma.operationLog.create({
          data: {
            userId,
            attendanceRecordId: record.id,
            action: 'CHECK_OUT',
            oldValue: { checkOutTime: null },
            newValue: { checkOutTime: now, totalWorkMinutes: totalMinutes },
            ipAddress,
            userAgent,
            timestamp: BigInt(now),
          },
        });

        return NextResponse.json({
          success: true,
          record: {
            ...updatedRecord,
            checkInTime: updatedRecord.checkInTime.toString(),
            checkOutTime: updatedRecord.checkOutTime?.toString(),
          },
        });
      }

      case 'CANCEL_CHECKOUT': {
        if (!record.checkOutTime) {
          return NextResponse.json(
            { error: 'No checkout to cancel' },
            { status: 400 }
          );
        }

        // Check if within 5 minutes
        const checkOutSeconds = Number(record.checkOutTime);
        const timeSinceCheckout = now - checkOutSeconds;
        if (timeSinceCheckout > 300) { // 5 minutes = 300 seconds
          return NextResponse.json(
            { error: 'Cannot cancel checkout after 5 minutes' },
            { status: 400 }
          );
        }

        // Check cancel count for today
        const cancelCount = await prisma.operationLog.count({
          where: {
            userId,
            attendanceRecordId: record.id,
            action: 'CANCEL_CHECKOUT',
          },
        });

        if (cancelCount >= 3) {
          return NextResponse.json(
            { error: 'Cancel limit reached (3 times per day)' },
            { status: 400 }
          );
        }

        const updatedRecord = await prisma.attendanceRecord.update({
          where: { id: record.id },
          data: {
            checkOutTime: null,
            totalWorkMinutes: 0,
            status: 'IN_PROGRESS',
          },
        });

        await prisma.operationLog.create({
          data: {
            userId,
            attendanceRecordId: record.id,
            action: 'CANCEL_CHECKOUT',
            oldValue: { 
              checkOutTime: checkOutSeconds, 
              totalWorkMinutes: record.totalWorkMinutes 
            },
            newValue: { checkOutTime: null, totalWorkMinutes: 0 },
            ipAddress,
            userAgent,
            timestamp: BigInt(now),
          },
        });

        return NextResponse.json({
          success: true,
          record: {
            ...updatedRecord,
            checkInTime: updatedRecord.checkInTime.toString(),
            checkOutTime: updatedRecord.checkOutTime?.toString(),
          },
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error handling attendance action:', error);
    return NextResponse.json(
      { error: 'Failed to process attendance action' },
      { status: 500 }
    );
  }
}
