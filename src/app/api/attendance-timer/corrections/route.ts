import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/../../prisma/client';

// GET - Get time corrections history
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get corrections for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const corrections = await prisma.timeCorrection.findMany({
      where: {
        userId,
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      include: {
        attendanceRecord: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      corrections: corrections.map(c => ({
        ...c,
        beforeValue: c.beforeValue.toString(),
        afterValue: c.afterValue.toString(),
        approvedAt: c.approvedAt?.toString(),
      })),
    });
  } catch (error) {
    console.error('Error fetching corrections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch corrections' },
      { status: 500 }
    );
  }
}

// POST - Submit time correction request
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { attendanceRecordId, fieldName, newValue, reason } = body;

    // Validate inputs
    if (!attendanceRecordId || !fieldName || !newValue || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!['checkInTime', 'checkOutTime'].includes(fieldName)) {
      return NextResponse.json(
        { error: 'Invalid field name' },
        { status: 400 }
      );
    }

    // Get the attendance record
    const record = await prisma.attendanceRecord.findUnique({
      where: { id: attendanceRecordId },
    });

    if (!record) {
      return NextResponse.json(
        { error: 'Attendance record not found' },
        { status: 404 }
      );
    }

    if (record.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized access to record' },
        { status: 403 }
      );
    }

    // Check if record is within 30 days
    const recordDate = new Date(record.date);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    if (recordDate < thirtyDaysAgo) {
      return NextResponse.json(
        { error: 'Cannot edit records older than 30 days' },
        { status: 400 }
      );
    }

    // Get the old value from the record
    const oldValue = record[fieldName as keyof typeof record];

    if (oldValue === null) {
      return NextResponse.json(
        { error: 'Cannot edit field that has not been set' },
        { status: 400 }
      );
    }

    // Validate new value (should not be in the future)
    const now = Math.floor(Date.now() / 1000);
    const newTimestamp = BigInt(newValue);

    if (Number(newTimestamp) > now) {
      return NextResponse.json(
        { error: 'Cannot set time in the future' },
        { status: 400 }
      );
    }

    // Validate logical constraints
    if (fieldName === 'checkOutTime' && Number(newTimestamp) <= Number(record.checkInTime)) {
      return NextResponse.json(
        { error: 'Check-out time must be after check-in time' },
        { status: 400 }
      );
    }

    // Get client info
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Create time correction record
    const correction = await prisma.timeCorrection.create({
      data: {
        attendanceRecordId,
        userId,
        fieldName,
        beforeValue: oldValue as bigint,
        afterValue: newTimestamp,
        reason,
        approvalStatus: 'PENDING',
      },
    });

    // Create operation log
    await prisma.operationLog.create({
      data: {
        userId,
        attendanceRecordId,
        action: 'EDIT_TIME',
        oldValue: { [fieldName]: oldValue.toString() },
        newValue: { [fieldName]: newValue.toString() },
        ipAddress,
        userAgent,
        timestamp: BigInt(now),
        reason,
      },
    });

    return NextResponse.json({
      success: true,
      correction: {
        ...correction,
        beforeValue: correction.beforeValue.toString(),
        afterValue: correction.afterValue.toString(),
      },
    });
  } catch (error) {
    console.error('Error creating time correction:', error);
    return NextResponse.json(
      { error: 'Failed to create time correction' },
      { status: 500 }
    );
  }
}
