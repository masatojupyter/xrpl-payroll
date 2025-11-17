import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/../../prisma/client';

// PUT - Update memo for a timer event
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const userId = session.user.id;
    const { id: eventId } = await params;
    const body = await request.json();
    const { memo } = body;

    // Validate memo length
    if (memo && memo.length > 500) {
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
      return NextResponse.json(
        { error: 'Timer event not found or unauthorized' },
        { status: 404 }
      );
    }

    // Check if attendance is already approved (applies to all users including admin)
    if (existingEvent.attendanceRecord.approvalStatus === 'APPROVED') {
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

    return NextResponse.json({
      success: true,
      event: {
        ...updatedEvent,
        timestamp: updatedEvent.timestamp.toString(),
        endTimestamp: updatedEvent.endTimestamp?.toString(),
      },
    });
  } catch (error) {
    console.error('Error updating memo:', error);
    return NextResponse.json(
      { error: 'Failed to update memo' },
      { status: 500 }
    );
  }
}
