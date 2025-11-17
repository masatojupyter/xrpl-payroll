import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/../../prisma/client';

// POST - Reject a time correction request
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: correctionId } = await params;
    const body = await request.json();
    const { rejectionReason } = body;

    if (!rejectionReason) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      );
    }

    const now = Math.floor(Date.now() / 1000);

    // Get the time correction
    const correction = await prisma.timeCorrection.findUnique({
      where: { id: correctionId },
      include: {
        attendanceRecord: true,
      },
    });

    if (!correction) {
      return NextResponse.json(
        { error: 'Time correction not found' },
        { status: 404 }
      );
    }

    // Check if already approved or rejected
    if (correction.approvalStatus !== 'PENDING') {
      return NextResponse.json(
        { error: `Time correction already ${correction.approvalStatus.toLowerCase()}` },
        { status: 400 }
      );
    }

    // Check organization access
    const user = await prisma.user.findUnique({
      where: { id: correction.userId },
      select: { organizationId: true },
    });

    if (session.user.organizationId && user?.organizationId !== session.user.organizationId) {
      return NextResponse.json(
        { error: 'Forbidden - Cannot access other organization data' },
        { status: 403 }
      );
    }

    // Update the time correction status (but don't modify the attendance record)
    const updatedCorrection = await prisma.timeCorrection.update({
      where: { id: correctionId },
      data: {
        approvalStatus: 'REJECTED',
        approvedBy: session.user.id,
        approvedAt: BigInt(now),
        reason: `${correction.reason}\n\nRejection reason: ${rejectionReason}`,
      },
    });

    // Create operation log for rejection
    await prisma.operationLog.create({
      data: {
        userId: correction.userId,
        attendanceRecordId: correction.attendanceRecordId,
        action: 'EDIT_TIME',
        oldValue: { 
          status: 'REJECTED',
          [correction.fieldName]: correction.beforeValue.toString(),
        },
        newValue: { 
          rejectionReason,
          [correction.fieldName]: correction.afterValue.toString(),
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: BigInt(now),
        reason: `Rejected by admin: ${rejectionReason}`,
      },
    });

    return NextResponse.json({
      success: true,
      correction: {
        ...updatedCorrection,
        beforeValue: updatedCorrection.beforeValue.toString(),
        afterValue: updatedCorrection.afterValue.toString(),
        approvedAt: updatedCorrection.approvedAt?.toString() || null,
      },
    });
  } catch (error) {
    console.error('Error rejecting time correction:', error);
    return NextResponse.json(
      { error: 'Failed to reject time correction' },
      { status: 500 }
    );
  }
}
