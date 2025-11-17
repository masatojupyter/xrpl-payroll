import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/../../prisma/client';

// POST - Cancel END event (undo checkout)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Timer events are only for employees
    if (session.user.userType !== 'employee') {
      return NextResponse.json({ error: 'Forbidden: Only employees can access timer events' }, { status: 403 });
    }

    // For employee login, we need to find the corresponding User record by email
    // because AttendanceRecord.userId references User.id, not Employee.id
    let userId = session.user.id;
    
    if (session.user.userType === 'employee') {
      // Find User record by email
      const user = await prisma.user.findFirst({
        where: {
          email: session.user.email || '',
          role: 'employee',
        },
      });
      
      if (user) {
        userId = user.id;
      } else {
        // If no User record found, cannot cancel END event
        return NextResponse.json(
          { error: 'User record not found' },
          { status: 404 }
        );
      }
    }

    // Get today's date in local timezone (same format as timer-events/route.ts)
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}T00:00:00.000Z`;
    const today = new Date(dateString);

    // Get today's attendance record
    const attendanceRecord = await prisma.attendanceRecord.findFirst({
      where: {
        userId,
        date: today,
      },
      include: {
        timerEvents: {
          orderBy: {
            timestamp: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!attendanceRecord) {
      return NextResponse.json(
        { error: 'No attendance record found for today' },
        { status: 404 }
      );
    }

    // Check if last event is END
    const lastEvent = attendanceRecord.timerEvents[0];
    if (!lastEvent || lastEvent.eventType !== 'END') {
      return NextResponse.json(
        { error: 'Cannot cancel: Last event is not END' },
        { status: 400 }
      );
    }

    // Check if attendance is already approved
    if (attendanceRecord.approvalStatus === 'APPROVED') {
      return NextResponse.json(
        { error: 'Cannot cancel: This attendance has been approved by admin' },
        { status: 400 }
      );
    }

    const nowTimestamp = Math.floor(Date.now() / 1000);

    // Delete the END event
    await prisma.timerEvent.delete({
      where: { id: lastEvent.id },
    });

    // Update attendance record
    await prisma.attendanceRecord.update({
      where: { id: attendanceRecord.id },
      data: {
        checkOutTime: null,
        totalWorkMinutes: 0,
        status: 'IN_PROGRESS',
      },
    });

    // Get client info
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Create operation log
    await prisma.operationLog.create({
      data: {
        userId,
        attendanceRecordId: attendanceRecord.id,
        action: 'CANCEL_END',
        oldValue: {
          eventId: lastEvent.id,
          eventType: 'END',
          timestamp: Number(lastEvent.timestamp),
        },
        ipAddress,
        userAgent,
        timestamp: BigInt(nowTimestamp),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'END event cancelled successfully',
    });
  } catch (error) {
    console.error('Error cancelling END event:', error);
    return NextResponse.json(
      { error: 'Failed to cancel END event' },
      { status: 500 }
    );
  }
}
