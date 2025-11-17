import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/../../prisma/client';

// POST - Correct time for a timer event
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Timer events are only for employees
    if (session.user.userType !== 'employee') {
      return NextResponse.json({ error: 'Forbidden: Only employees can access timer events' }, { status: 403 });
    }

    // Find User record by email to get actual userId
    let actualUserId = session.user.id;
    if (session.user.userType === 'employee') {
      const user = await prisma.user.findFirst({
        where: {
          email: session.user.email || '',
          role: 'employee',
        },
      });
      
      if (user) {
        actualUserId = user.id;
      }
    }

    const userId = actualUserId;
    const { id: eventId } = await context.params;
    const body = await request.json();
    const { newTimestamp, newEventType, reason } = body;

    // Validate inputs
    if (!newTimestamp) {
      return NextResponse.json(
        { error: 'newTimestamp is required' },
        { status: 400 }
      );
    }

    // Validate eventType if provided
    if (newEventType && !['WORK', 'REST', 'END'].includes(newEventType)) {
      return NextResponse.json(
        { error: 'Invalid eventType' },
        { status: 400 }
      );
    }

    const newTime = Number(newTimestamp);
    const now = Math.floor(Date.now() / 1000);

    // Cannot set future time
    if (newTime > now) {
      return NextResponse.json(
        { error: 'Cannot set time in the future' },
        { status: 400 }
      );
    }

    // Verify the timer event exists and belongs to the user
    const existingEvent = await prisma.timerEvent.findFirst({
      where: {
        id: eventId,
        userId,
      },
      include: {
        attendanceRecord: {
          include: {
            timerEvents: {
              orderBy: {
                timestamp: 'asc',
              },
            },
          },
        },
      },
    });

    if (!existingEvent) {
      return NextResponse.json(
        { error: 'Timer event not found or unauthorized' },
        { status: 404 }
      );
    }

    // Check if attendance is already approved (applies to all users including admin)
    if (existingEvent.attendanceRecord.approvalStatus === 'APPROVED') {
      return NextResponse.json(
        { error: 'Cannot edit: This attendance has been approved by admin' },
        { status: 400 }
      );
    }

    // Check if record is within 30 days
    const recordDate = new Date(existingEvent.attendanceRecord.date);
    const daysSince = Math.floor((now * 1000 - recordDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSince > 30) {
      return NextResponse.json(
        { error: 'Cannot edit records older than 30 days' },
        { status: 400 }
      );
    }

    // Find the index of this event
    const events = existingEvent.attendanceRecord.timerEvents;
    const eventIndex = events.findIndex(e => e.id === eventId);

    // Validate logical order
    if (eventIndex > 0) {
      const previousEvent = events[eventIndex - 1];
      if (newTime <= Number(previousEvent.timestamp)) {
        return NextResponse.json(
          { error: 'New time must be after the previous event' },
          { status: 400 }
        );
      }
    }

    if (eventIndex < events.length - 1) {
      const nextEvent = events[eventIndex + 1];
      if (newTime >= Number(nextEvent.timestamp)) {
        return NextResponse.json(
          { error: 'New time must be before the next event' },
          { status: 400 }
        );
      }
    }

    const oldTimestamp = existingEvent.timestamp;
    const oldEventType = existingEvent.eventType;

    // Update the event timestamp and eventType
    const updateData: {
      timestamp: bigint;
      updatedAt: Date;
      eventType?: string;
    } = {
      timestamp: BigInt(newTime),
      updatedAt: new Date(),
    };
    
    if (newEventType) {
      updateData.eventType = newEventType;
    }

    const updatedEvent = await prisma.timerEvent.update({
      where: { id: eventId },
      data: updateData,
    });

    // Recalculate durationFromPrevious for this event
    if (eventIndex > 0) {
      const previousEvent = events[eventIndex - 1];
      const duration = newTime - Number(previousEvent.timestamp);
      
      await prisma.timerEvent.update({
        where: { id: eventId },
        data: {
          durationFromPrevious: duration,
        },
      });
    }

    // Recalculate durationFromPrevious for next event if exists
    if (eventIndex < events.length - 1) {
      const nextEvent = events[eventIndex + 1];
      const duration = Number(nextEvent.timestamp) - newTime;
      
      await prisma.timerEvent.update({
        where: { id: nextEvent.id },
        data: {
          durationFromPrevious: duration,
        },
      });
    }

    // Update checkInTime if this is the first event
    if (eventIndex === 0) {
      await prisma.attendanceRecord.update({
        where: { id: existingEvent.attendanceRecordId },
        data: {
          checkInTime: BigInt(newTime),
        },
      });
    }

    // Update attendance record if eventType changed to/from END
    if (newEventType === 'END' && oldEventType !== 'END') {
      // Changed to END - mark as completed
      await prisma.attendanceRecord.update({
        where: { id: existingEvent.attendanceRecordId },
        data: {
          checkOutTime: BigInt(newTime),
          status: 'COMPLETED',
        },
      });
    } else if (oldEventType === 'END' && newEventType && newEventType !== 'END') {
      // Changed from END to something else - mark as in progress
      await prisma.attendanceRecord.update({
        where: { id: existingEvent.attendanceRecordId },
        data: {
          checkOutTime: null,
          status: 'IN_PROGRESS',
        },
      });
    }

    // Recalculate total work time if needed
    const recordStatus = await prisma.attendanceRecord.findUnique({
      where: { id: existingEvent.attendanceRecordId },
      select: { status: true },
    });
    
    if (recordStatus?.status === 'COMPLETED') {
      const allEvents = await prisma.timerEvent.findMany({
        where: {
          attendanceRecordId: existingEvent.attendanceRecordId,
        },
        orderBy: {
          timestamp: 'asc',
        },
      });

      let totalWorkSeconds = 0;
      let lastWorkStart: number | null = null;

      for (const event of allEvents) {
        const timestamp = Number(event.timestamp);
        
        if (event.eventType === 'WORK') {
          lastWorkStart = timestamp;
        } else if (event.eventType === 'REST' && lastWorkStart !== null) {
          totalWorkSeconds += timestamp - lastWorkStart;
          lastWorkStart = null;
        } else if (event.eventType === 'END' && lastWorkStart !== null) {
          totalWorkSeconds += timestamp - lastWorkStart;
          lastWorkStart = null;
        }
      }

      await prisma.attendanceRecord.update({
        where: { id: existingEvent.attendanceRecordId },
        data: {
          totalWorkMinutes: Math.floor(totalWorkSeconds / 60),
        },
      });
    }

    // Get client info
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Use default reason if not provided
    const correctionReason = reason?.trim() || '修正理由なし';

    // Create time correction record
    await prisma.timeCorrection.create({
      data: {
        attendanceRecordId: existingEvent.attendanceRecordId,
        userId,
        fieldName: `timerEvent_${eventId}_timestamp`,
        beforeValue: oldTimestamp,
        afterValue: BigInt(newTime),
        reason: correctionReason,
        approvalStatus: 'APPROVED', // Auto-approve for timer events
      },
    });

    // Create operation log
    await prisma.operationLog.create({
      data: {
        userId,
        attendanceRecordId: existingEvent.attendanceRecordId,
        action: 'EDIT_TIME',
        oldValue: {
          eventId,
          timestamp: Number(oldTimestamp),
          eventType: oldEventType,
        },
        newValue: {
          eventId,
          timestamp: newTime,
          eventType: newEventType || oldEventType,
        },
        ipAddress,
        userAgent,
        timestamp: BigInt(now),
        reason: correctionReason,
      },
    });

    return NextResponse.json({
      success: true,
      event: {
        ...updatedEvent,
        timestamp: updatedEvent.timestamp.toString(),
        endTimestamp: updatedEvent.endTimestamp?.toString(),
      },
    });
  } catch (error) {
    console.error('Error correcting time:', error);
    return NextResponse.json(
      { error: 'Failed to correct time' },
      { status: 500 }
    );
  }
}
