import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/../../prisma/client';

// DELETE - Delete a timer event
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: eventId } = await context.params;
    
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
        return NextResponse.json(
          { error: 'User record not found' },
          { status: 404 }
        );
      }
    }

    console.log('🔷 DELETE Timer Event: Session info', {
      sessionUserId: session.user.id,
      actualUserId: userId,
      userType: session.user.userType,
      eventId
    });

    // Get the timer event
    const existingEvent = await prisma.timerEvent.findUnique({
      where: { id: eventId },
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
      console.log('🔷 DELETE Timer Event: Event not found', { eventId });
      return NextResponse.json(
        { error: 'Timer event not found' },
        { status: 404 }
      );
    }

    console.log('🔷 DELETE Timer Event: Event found', {
      eventId,
      eventUserId: existingEvent.userId,
      sessionUserId: userId,
      sessionUserType: session.user.userType
    });

    // Authorization check
    // - Employees can only delete their own events
    // - Admins can delete any event
    if (session.user.userType === 'employee') {
      console.log('🔷 DELETE Timer Event: User is employee, checking ownership');
      if (existingEvent.userId !== userId) {
        console.log('🔷 DELETE Timer Event: Employee cannot delete other user events', {
          eventUserId: existingEvent.userId,
          actualUserId: userId
        });
        return NextResponse.json(
          { error: 'Forbidden: You can only delete your own events' },
          { status: 403 }
        );
      }
      console.log('🔷 DELETE Timer Event: Employee is owner, deletion allowed');
    } else if (session.user.userType !== 'admin') {
      console.log('🔷 DELETE Timer Event: User is neither employee nor admin', {
        userType: session.user.userType
      });
      return NextResponse.json(
        { error: 'Forbidden: Only employees and admins can delete timer events' },
        { status: 403 }
      );
    } else {
      console.log('🔷 DELETE Timer Event: User is admin, deletion allowed');
    }

    // Check if attendance is already approved (applies to all users including admin)
    if (existingEvent.attendanceRecord.approvalStatus === 'APPROVED') {
      console.log('🔷 DELETE Timer Event: Cannot delete - attendance is approved');
      return NextResponse.json(
        { error: 'Cannot delete: This attendance has been approved by admin' },
        { status: 400 }
      );
    }

    const events = existingEvent.attendanceRecord.timerEvents;
    const eventIndex = events.findIndex(e => e.id === eventId);
    const isFirstEvent = eventIndex === 0;

    console.log('🔷 DELETE Timer Event: Event position', {
      eventIndex,
      isFirstEvent,
      totalEvents: events.length
    });

    // Delete the event
    await prisma.timerEvent.delete({
      where: { id: eventId },
    });

    // If deleting the first event, update checkInTime with the next event's timestamp
    if (isFirstEvent && events.length > 1) {
      const nextEvent = events[1]; // The event that will become the new first event
      console.log('🔷 DELETE Timer Event: Updating checkInTime', {
        oldCheckInTime: existingEvent.attendanceRecord.checkInTime.toString(),
        newCheckInTime: nextEvent.timestamp.toString()
      });
      
      await prisma.attendanceRecord.update({
        where: { id: existingEvent.attendanceRecordId },
        data: {
          checkInTime: nextEvent.timestamp,
        },
      });
    }

    // Recalculate durationFromPrevious for next event if exists
    if (eventIndex < events.length - 1) {
      const nextEvent = events[eventIndex + 1];
      
      if (eventIndex > 0) {
        const previousEvent = events[eventIndex - 1];
        const duration = Number(nextEvent.timestamp) - Number(previousEvent.timestamp);
        
        await prisma.timerEvent.update({
          where: { id: nextEvent.id },
          data: {
            durationFromPrevious: duration,
          },
        });
      } else {
        // If deleting first event, next event has no previous
        await prisma.timerEvent.update({
          where: { id: nextEvent.id },
          data: {
            durationFromPrevious: null,
          },
        });
      }
    }

    // If deleting END event, update attendance record status
    if (existingEvent.eventType === 'END') {
      await prisma.attendanceRecord.update({
        where: { id: existingEvent.attendanceRecordId },
        data: {
          checkOutTime: null,
          totalWorkMinutes: 0,
          status: 'IN_PROGRESS',
        },
      });
    }

    // Recalculate total work time if record was completed
    const remainingEvents = await prisma.timerEvent.findMany({
      where: {
        attendanceRecordId: existingEvent.attendanceRecordId,
      },
      orderBy: {
        timestamp: 'asc',
      },
    });

    const hasEndEvent = remainingEvents.some(e => e.eventType === 'END');
    
    if (hasEndEvent) {
      let totalWorkSeconds = 0;
      let lastWorkStart: number | null = null;

      for (const event of remainingEvents) {
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

    // Create operation log
    await prisma.operationLog.create({
      data: {
        userId,
        attendanceRecordId: existingEvent.attendanceRecordId,
        action: 'DELETE',
        oldValue: {
          eventId,
          eventType: existingEvent.eventType,
          timestamp: Number(existingEvent.timestamp),
        },
        ipAddress,
        userAgent,
        timestamp: BigInt(Math.floor(Date.now() / 1000)),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Timer event deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting timer event:', error);
    return NextResponse.json(
      { error: 'Failed to delete timer event' },
      { status: 500 }
    );
  }
}
