import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/../../prisma/client';

// GET - Get detailed attendance record with all related data
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    // Check if user is authenticated and is admin
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const { id: recordId } = await context.params;

    // Get the attendance record with all related data
    const record = await prisma.attendanceRecord.findUnique({
      where: { id: recordId },
      include: {
        timerEvents: {
          orderBy: {
            timestamp: 'asc',
          },
        },
        operationLogs: {
          orderBy: {
            timestamp: 'desc',
          },
        },
        timeCorrections: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!record) {
      return NextResponse.json(
        { error: 'Attendance record not found' },
        { status: 404 }
      );
    }

    // Get user information
    const user = await prisma.user.findUnique({
      where: { id: record.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        organizationId: true,
      },
    });

    // Check if admin has access to this organization's data
    if (session.user.organizationId && user?.organizationId !== session.user.organizationId) {
      return NextResponse.json(
        { error: 'Forbidden - Cannot access other organization data' },
        { status: 403 }
      );
    }

    // Get employee information if exists
    let employee = null;
    if (user?.organizationId) {
      employee = await prisma.employee.findFirst({
        where: {
          email: user.email,
          organizationId: user.organizationId,
        },
        select: {
          id: true,
          employeeCode: true,
          firstName: true,
          lastName: true,
          position: true,
          department: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    }

    // Calculate work statistics from timer events
    const workStats = calculateWorkStats(record.timerEvents);

    // Serialize BigInt fields to strings for JSON
    const serializedRecord = {
      ...record,
      checkInTime: record.checkInTime.toString(),
      checkOutTime: record.checkOutTime?.toString() || null,
      timerEvents: record.timerEvents.map(event => ({
        ...event,
        timestamp: event.timestamp.toString(),
        endTimestamp: event.endTimestamp?.toString() || null,
      })),
      operationLogs: record.operationLogs.map(log => ({
        ...log,
        timestamp: log.timestamp.toString(),
      })),
      timeCorrections: record.timeCorrections.map(correction => ({
        ...correction,
        beforeValue: correction.beforeValue.toString(),
        afterValue: correction.afterValue.toString(),
        approvedAt: correction.approvedAt?.toString() || null,
      })),
    };

    return NextResponse.json({
      success: true,
      record: serializedRecord,
      user,
      employee,
      workStats,
    });
  } catch (error) {
    console.error('Error fetching attendance record:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attendance record' },
      { status: 500 }
    );
  }
}

// Helper function to calculate work statistics from timer events
interface TimerEventForStats {
  eventType: string;
  timestamp: bigint;
}

function calculateWorkStats(timerEvents: TimerEventForStats[]) {
  let totalWorkSeconds = 0;
  let totalRestSeconds = 0;
  let lastWorkStart: number | null = null;
  let lastRestStart: number | null = null;

  const sortedEvents = [...timerEvents].sort((a, b) => 
    Number(a.timestamp) - Number(b.timestamp)
  );

  for (const event of sortedEvents) {
    const timestamp = Number(event.timestamp);

    if (event.eventType === 'WORK') {
      // If there was a rest period, calculate its duration
      if (lastRestStart !== null) {
        totalRestSeconds += timestamp - lastRestStart;
        lastRestStart = null;
      }
      lastWorkStart = timestamp;
    } else if (event.eventType === 'REST') {
      // If there was a work period, calculate its duration
      if (lastWorkStart !== null) {
        totalWorkSeconds += timestamp - lastWorkStart;
        lastWorkStart = null;
      }
      lastRestStart = timestamp;
    } else if (event.eventType === 'END') {
      // End of day - close any open periods
      if (lastWorkStart !== null) {
        totalWorkSeconds += timestamp - lastWorkStart;
        lastWorkStart = null;
      }
      if (lastRestStart !== null) {
        totalRestSeconds += timestamp - lastRestStart;
        lastRestStart = null;
      }
    }
  }

  return {
    totalWorkMinutes: Math.floor(totalWorkSeconds / 60),
    totalRestMinutes: Math.floor(totalRestSeconds / 60),
    totalWorkHours: (totalWorkSeconds / 3600).toFixed(2),
    totalRestHours: (totalRestSeconds / 3600).toFixed(2),
    workPeriods: sortedEvents.filter(e => e.eventType === 'WORK').length,
    restPeriods: sortedEvents.filter(e => e.eventType === 'REST').length,
  };
}
