import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/../../prisma/client';

// GET - Get today's attendance record for logged-in user
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get today's date in YYYY-MM-DD format
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all attendance records for this user
    const allRecords = await prisma.attendanceRecord.findMany({
      where: {
        userId,
      },
      include: {
        operationLogs: {
          orderBy: {
            timestamp: 'desc',
          },
          take: 10,
        },
        timeCorrections: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    // Create date string for today
    const todayYear = today.getFullYear();
    const todayMonth = String(today.getMonth() + 1).padStart(2, '0');
    const todayDay = String(today.getDate()).padStart(2, '0');
    const todayDateString = `${todayYear}-${todayMonth}-${todayDay}`;

    // Find the record that matches today's date
    const attendanceRecord = allRecords.find(record => {
      const recordDate = new Date(record.date);
      const recordYear = recordDate.getFullYear();
      const recordMonth = String(recordDate.getMonth() + 1).padStart(2, '0');
      const recordDay = String(recordDate.getDate()).padStart(2, '0');
      const recordDateString = `${recordYear}-${recordMonth}-${recordDay}`;
      
      return recordDateString === todayDateString;
    });

    // Convert BigInt to string for JSON serialization
    const serializedRecord = attendanceRecord ? {
      ...attendanceRecord,
      checkInTime: attendanceRecord.checkInTime.toString(),
      checkOutTime: attendanceRecord.checkOutTime?.toString(),
      operationLogs: attendanceRecord.operationLogs.map(log => ({
        ...log,
        timestamp: log.timestamp.toString(),
      })),
      timeCorrections: attendanceRecord.timeCorrections.map(correction => ({
        ...correction,
        beforeValue: correction.beforeValue.toString(),
        afterValue: correction.afterValue.toString(),
        approvedAt: correction.approvedAt?.toString(),
      })),
    } : null;

    return NextResponse.json({ 
      success: true, 
      record: serializedRecord 
    });
  } catch (error) {
    console.error('Error fetching attendance record:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attendance record' },
      { status: 500 }
    );
  }
}

// POST - Create new attendance record (check-in)
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

    const now = Math.floor(Date.now() / 1000); // Unix timestamp in seconds
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all attendance records for this user
    const allUserRecords = await prisma.attendanceRecord.findMany({
      where: {
        userId,
      },
    });

    // Create date string for today
    const todayYear = today.getFullYear();
    const todayMonth = String(today.getMonth() + 1).padStart(2, '0');
    const todayDay = String(today.getDate()).padStart(2, '0');
    const todayDateString = `${todayYear}-${todayMonth}-${todayDay}`;

    // Check if record already exists for today
    const existingRecord = allUserRecords.find(record => {
      const recordDate = new Date(record.date);
      const recordYear = recordDate.getFullYear();
      const recordMonth = String(recordDate.getMonth() + 1).padStart(2, '0');
      const recordDay = String(recordDate.getDate()).padStart(2, '0');
      const recordDateString = `${recordYear}-${recordMonth}-${recordDay}`;
      
      return recordDateString === todayDateString;
    });

    if (action === 'CHECK_IN') {
      if (existingRecord) {
        return NextResponse.json(
          { error: 'Already checked in today' },
          { status: 400 }
        );
      }

      // Create new attendance record
      const record = await prisma.attendanceRecord.create({
        data: {
          userId,
          date: today,
          checkInTime: BigInt(now),
          status: 'IN_PROGRESS',
        },
      });

      // Create operation log
      await prisma.operationLog.create({
        data: {
          userId,
          attendanceRecordId: record.id,
          action: 'CHECK_IN',
          newValue: { checkInTime: now },
          ipAddress,
          userAgent,
          timestamp: BigInt(now),
        },
      });

      return NextResponse.json({
        success: true,
        record: {
          ...record,
          checkInTime: record.checkInTime.toString(),
        },
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error creating attendance record:', error);
    return NextResponse.json(
      { error: 'Failed to create attendance record' },
      { status: 500 }
    );
  }
}
