import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/../prisma/client';

// PUT - Update memo for a timer event
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  
  try {
    console.log('🔵 [MEMO API] Attempting authentication...');
    const session = await auth();
    console.log('🔵 [MEMO API] Auth result:', { 
      hasSession: !!session, 
      hasUser: !!session?.user, 
      userId: session?.user?.id,
      userType: session?.user?.userType 
    });

    if (!session?.user?.id) {
      console.log('🔴 [MEMO API] Unauthorized - No session or user ID');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Timer events are only for employees
    if (session.user.userType !== 'employee') {
      console.log('🔴 [MEMO API] Forbidden - User is not employee', { userType: session.user.userType });
      return NextResponse.json({ error: 'Forbidden: Only employees can access timer events' }, { status: 403 });
    }

    const employeeEmail = session.user.email;

    if (!employeeEmail) {
      console.log('🔴 [MEMO API] No email found in session');
      return NextResponse.json({ error: 'Email not found in session' }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: {
        email: employeeEmail 
      },
      select: {
        id: true
      },
    });

    if (!user) {
      console.log('🔴 [MEMO API] User not found for email:', employeeEmail);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = user.id;
    const { id: eventId } = await params;
    
    const body = await request.json();
    
    const { memo } = body;

    // Validate memo length
    if (memo && memo.length > 500) {
      console.log('🔴 [MEMO API] Validation failed - Memo too long', { length: memo.length });
      return NextResponse.json(
        { error: 'Memo must be 500 characters or less' },
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
        attendanceRecord: true,
      },
    });


    if (!existingEvent) {
      console.log('🔴 [MEMO API] Timer event not found or unauthorized');
      return NextResponse.json(
        { error: 'Timer event not found or unauthorized' },
        { status: 404 }
      );
    }

    // Check if attendance is already approved (applies to all users including admin)
    if (existingEvent.attendanceRecord.approvalStatus === 'APPROVED') {
      console.log('🔴 [MEMO API] Cannot edit - Attendance already approved');
      return NextResponse.json(
        { error: 'Cannot edit memo: This attendance has been approved by admin' },
        { status: 400 }
      );
    }

    
    // Update the memo
    const updatedEvent = await prisma.timerEvent.update({
      where: { id: eventId },
      data: {
        memo: memo || null,
        updatedAt: new Date(),
      },
    });
    
    // Get client info
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    

    // Create operation log for memo update
    await prisma.operationLog.create({
      data: {
        userId,
        attendanceRecordId: existingEvent.attendanceRecordId,
        action: 'MEMO_UPDATE',
        oldValue: {
          eventId,
          memo: existingEvent.memo,
        },
        newValue: {
          eventId,
          memo: memo || null,
        },
        ipAddress,
        userAgent,
        timestamp: BigInt(Math.floor(Date.now() / 1000)),
      },
    });
    

    const responseData = {
      success: true,
      event: {
        ...updatedEvent,
        timestamp: updatedEvent.timestamp.toString(),
        endTimestamp: updatedEvent.endTimestamp?.toString(),
      },
    };
    
    console.log('🟢 [MEMO API] Sending success response:', responseData);
    
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('🔴 [MEMO API] Error updating memo:', error);
    console.error('🔴 [MEMO API] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: 'Failed to update memo' },
      { status: 500 }
    );
  }
}
