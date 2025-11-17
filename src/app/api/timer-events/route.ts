import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/../../prisma/client';

// GET - Get timer events for logged-in user (today or specific date)
export async function GET(request: NextRequest) {
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
        // If no User record found, return empty events
        return NextResponse.json({
          success: true,
          events: [],
          record: null,
        });
      }
    }

    console.log('[DEBUG GET] Session info:', {
      sessionUserId: session.user.id,
      actualUserId: userId,
      email: session.user.email,
      userType: session.user.userType,
      organizationId: session.user.organizationId
    });

    // Get date from query params or use today
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    
    // Get target date string
    let dateString: string;
    if (dateParam) {
      dateString = dateParam; // Already in YYYY-MM-DD format
    } else {
      // Use today's date in local timezone
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      dateString = `${year}-${month}-${day}`;
    }
    
    // Create date object for database query (same as POST method)
    const targetDate = new Date(`${dateString}T00:00:00.000Z`);

    console.log('[DEBUG] Received dateParam:', dateParam);
    console.log('[DEBUG] Target date string:', dateString);
    console.log('[DEBUG] Target date object:', targetDate.toString());
    console.log('[DEBUG] Target date (ISO):', targetDate.toISOString());
    console.log('[DEBUG] UserId:', userId);

    // Get all attendance records for this user
    const allRecords = await prisma.attendanceRecord.findMany({
      where: {
        userId,
      },
      include: {
        timerEvents: {
          orderBy: {
            timestamp: 'asc',
          },
        },
      },
    });

    console.log('[DEBUG] Total records found for user:', allRecords.length);
    allRecords.forEach(record => {
      console.log('[DEBUG] Record date:', record.date, 'Local:', new Date(record.date).toLocaleDateString());
    });

    // Find the record that matches the target date by comparing ISO strings
    const attendanceRecord = allRecords.find(record => {
      const recordDateISO = new Date(record.date).toISOString();
      const targetDateISO = targetDate.toISOString();
      
      console.log('[DEBUG] Comparing record ISO:', recordDateISO, 'with target ISO:', targetDateISO);
      
      return recordDateISO === targetDateISO;
    });

    console.log('[DEBUG] Query result - Record found:', !!attendanceRecord);
    if (attendanceRecord) {
      console.log('[DEBUG] Record date:', attendanceRecord.date);
      console.log('[DEBUG] Record ID:', attendanceRecord.id);
      console.log('[DEBUG] Timer events count:', attendanceRecord.timerEvents.length);
    }

    // If no record exists, return empty events
    if (!attendanceRecord) {
      return NextResponse.json({
        success: true,
        events: [],
        record: null,
      });
    }

    // Convert BigInt to string for JSON serialization and calculate durationFromNext
    const serializedEvents = attendanceRecord.timerEvents.map((event, index) => {
      let durationFromNext = null;
      
      // Calculate duration to next event if it exists
      if (index < attendanceRecord.timerEvents.length - 1) {
        const nextEvent = attendanceRecord.timerEvents[index + 1];
        durationFromNext = Number(nextEvent.timestamp) - Number(event.timestamp);
      }
      
      return {
        id: event.id,
        userId: event.userId,
        attendanceRecordId: event.attendanceRecordId,
        eventType: event.eventType,
        timestamp: event.timestamp.toString(),
        endTimestamp: event.endTimestamp?.toString() || null,
        durationFromPrevious: event.durationFromPrevious,
        durationFromNext,
        memo: event.memo,
        createdAt: event.createdAt.toISOString(),
        updatedAt: event.updatedAt.toISOString(),
      };
    });

    const serializedRecord = {
      id: attendanceRecord.id,
      userId: attendanceRecord.userId,
      date: attendanceRecord.date.toISOString(),
      checkInTime: attendanceRecord.checkInTime.toString(),
      checkOutTime: attendanceRecord.checkOutTime?.toString() || null,
      totalWorkMinutes: attendanceRecord.totalWorkMinutes,
      status: attendanceRecord.status,
      approvalStatus: attendanceRecord.approvalStatus,
      rejectionReason: attendanceRecord.rejectionReason,
      createdAt: attendanceRecord.createdAt.toISOString(),
      updatedAt: attendanceRecord.updatedAt.toISOString(),
      timerEvents: serializedEvents,
    };

    return NextResponse.json({
      success: true,
      events: serializedEvents,
      record: serializedRecord,
    });
  } catch (error) {
    console.error('Error fetching timer events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch timer events' },
      { status: 500 }
    );
  }
}

// POST - Create new timer event (WORK, REST, END)
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
        // If no User record found, cannot create timer event
        return NextResponse.json(
          { error: 'User record not found' },
          { status: 404 }
        );
      }
    }

    console.log('[DEBUG POST] Session info:', {
      sessionUserId: session.user.id,
      actualUserId: userId,
      email: session.user.email,
      userType: session.user.userType,
      organizationId: session.user.organizationId
    });

    const body = await request.json();
    const { eventType, timestamp: requestTimestamp, memo, attendanceId } = body;

    // Validate eventType
    if (!['WORK', 'REST', 'END'].includes(eventType)) {
      return NextResponse.json(
        { error: 'Invalid event type. Must be WORK, REST, or END' },
        { status: 400 }
      );
    }

    // Get client info
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Use provided timestamp or current time
    const eventTimestamp = requestTimestamp || Math.floor(Date.now() / 1000);
    
    let attendanceRecord;
    
    // If attendanceId is provided, use that record directly
    if (attendanceId) {
      console.log('[DEBUG POST] Using provided attendanceId:', attendanceId);
      
      attendanceRecord = await prisma.attendanceRecord.findUnique({
        where: { id: attendanceId },
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
          { error: 'Attendance record not found' },
          { status: 404 }
        );
      }
      
      // Verify the record belongs to the current user
      if (attendanceRecord.userId !== userId) {
        return NextResponse.json(
          { error: 'Forbidden: Cannot create event for another user' },
          { status: 403 }
        );
      }
    } else {
      // Original logic: Get or create today's attendance record
      const now = Math.floor(Date.now() / 1000);
      
      // Get today's date in local timezone
      const nowDate = new Date();
      const year = nowDate.getFullYear();
      const month = String(nowDate.getMonth() + 1).padStart(2, '0');
      const day = String(nowDate.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}T00:00:00.000Z`;
      
      // Create date object that will be stored correctly in database
      const today = new Date(dateString);

      console.log('[DEBUG POST] Creating event - today date string:', dateString);
      console.log('[DEBUG POST] Today date object:', today.toString());
      console.log('[DEBUG POST] Today ISO:', today.toISOString());

      // Use upsert to get or create today's attendance record atomically
      attendanceRecord = await prisma.attendanceRecord.upsert({
        where: {
          userId_date: {
            userId,
            date: today,
          },
        },
        update: {
          // If record exists, don't update anything, just return it
        },
        create: {
          userId,
          date: today,
          checkInTime: BigInt(now),
          status: 'IN_PROGRESS',
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
    }

    console.log('[DEBUG POST] Attendance record ID:', attendanceRecord.id);

    // Get all events for validation
    const allEvents = await prisma.timerEvent.findMany({
      where: {
        attendanceRecordId: attendanceRecord.id,
      },
      orderBy: {
        timestamp: 'asc',
      },
    });

    // Check if END event already exists
    const endEvent = allEvents.find(e => e.eventType === 'END');
    
    if (endEvent) {
      const endTimestamp = Number(endEvent.timestamp);
      
      console.log('[DEBUG POST] Validating against existing END event', {
        eventType,
        eventTimestamp,
        endTimestamp,
        isAfterEnd: eventTimestamp > endTimestamp
      });
      
      // Cannot create any event after END event
      if (eventTimestamp > endTimestamp) {
        return NextResponse.json(
          { 
            error: 'ENDイベントが既に存在するため、それより後の時刻にイベントを作成できません',
            details: {
              requestedTime: new Date(eventTimestamp * 1000).toISOString(),
              endEventTime: new Date(endTimestamp * 1000).toISOString()
            }
          },
          { status: 400 }
        );
      }
    }

    // Validate END event - must be the latest timestamp
    if (eventType === 'END' && allEvents.length > 0) {
      const latestEvent = allEvents[allEvents.length - 1];
      const latestTimestamp = Number(latestEvent.timestamp);
      
      console.log('[DEBUG POST] Validating END event timestamp', {
        eventTimestamp,
        latestTimestamp,
        isAfterLatest: eventTimestamp > latestTimestamp
      });
      
      if (eventTimestamp <= latestTimestamp) {
        return NextResponse.json(
          { 
            error: 'ENDイベントは既存のすべてのイベントより後の時刻である必要があります',
            details: {
              requestedTime: new Date(eventTimestamp * 1000).toISOString(),
              latestEventTime: new Date(latestTimestamp * 1000).toISOString()
            }
          },
          { status: 400 }
        );
      }
    }

    // Get the previous event
    const previousEvent = attendanceRecord.timerEvents[0];

    // Calculate duration from previous event
    let durationFromPrevious = null;
    if (previousEvent) {
      durationFromPrevious = eventTimestamp - Number(previousEvent.timestamp);
    }

    // Handle WORK event pressed while already in WORK state
    if (eventType === 'WORK' && previousEvent?.eventType === 'WORK' && !previousEvent.endTimestamp) {
      // End the previous WORK event
      await prisma.timerEvent.update({
        where: { id: previousEvent.id },
        data: {
          endTimestamp: BigInt(eventTimestamp),
        },
      });
    }

    // Create the new timer event
    const timerEvent = await prisma.timerEvent.create({
      data: {
        userId,
        attendanceRecordId: attendanceRecord.id,
        eventType,
        timestamp: BigInt(eventTimestamp),
        durationFromPrevious,
        memo: memo || null,
      },
    });

    // Update attendance record based on event type
    if (eventType === 'END') {
      // Calculate total work minutes (excluding REST periods)
      const allEvents = await prisma.timerEvent.findMany({
        where: {
          attendanceRecordId: attendanceRecord.id,
        },
        orderBy: {
          timestamp: 'asc',
        },
      });

      let totalWorkSeconds = 0;
      let lastWorkStart: number | null = null;

      for (const event of allEvents) {
        if (event.eventType === 'WORK') {
          lastWorkStart = Number(event.timestamp);
        } else if (event.eventType === 'REST' && lastWorkStart !== null) {
          totalWorkSeconds += Number(event.timestamp) - lastWorkStart;
          lastWorkStart = null;
        } else if (event.eventType === 'END' && lastWorkStart !== null) {
          totalWorkSeconds += Number(event.timestamp) - lastWorkStart;
          lastWorkStart = null;
        }
      }

      await prisma.attendanceRecord.update({
        where: { id: attendanceRecord.id },
        data: {
          checkOutTime: BigInt(eventTimestamp),
          totalWorkMinutes: Math.floor(totalWorkSeconds / 60),
          status: 'COMPLETED',
        },
      });
    }

    // Create operation log
    await prisma.operationLog.create({
      data: {
        userId,
        attendanceRecordId: attendanceRecord.id,
        action: eventType,
        newValue: {
          eventType,
          timestamp: eventTimestamp,
          durationFromPrevious,
          memo: memo || null,
        },
        ipAddress,
        userAgent,
        timestamp: BigInt(eventTimestamp),
      },
    });

    return NextResponse.json({
      success: true,
      event: {
        ...timerEvent,
        timestamp: timerEvent.timestamp.toString(),
        endTimestamp: timerEvent.endTimestamp?.toString(),
      },
    });
  } catch (error) {
    console.error('Error creating timer event:', error);
    return NextResponse.json(
      { error: 'Failed to create timer event' },
      { status: 500 }
    );
  }
}
