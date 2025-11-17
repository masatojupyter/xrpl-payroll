import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/../prisma/client'
import { z } from 'zod'

/**
 * Individual Attendance Rejection Schema
 * Reason is required for rejection
 */
const rejectSchema = z.object({
  reason: z
    .string()
    .min(10, 'Rejection reason must be at least 10 characters')
    .max(500, 'Rejection reason must be 500 characters or less'),
})

/**
 * POST /api/admin/attendance-approvals/[id]/reject
 * Reject individual attendance record
 * 
 * @param req - Request object
 * @param params - URL parameters containing attendance record id
 * @returns Updated attendance record with rejection status
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Admin authentication check
    const session = await auth()
    if (!session || session.user.userType !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const { id } = await params
    
    // Validate request body
    const body = await req.json()
    const validatedData = rejectSchema.parse(body)

    // Check if attendance record exists and is pending
    const attendance = await prisma.attendanceRecord.findUnique({
      where: { id },
    })

    if (!attendance) {
      return NextResponse.json(
        { error: 'Attendance record not found' },
        { status: 404 }
      )
    }

    if (attendance.approvalStatus !== 'PENDING') {
      return NextResponse.json(
        { error: 'This attendance record is not in pending status' },
        { status: 400 }
      )
    }

    // Update attendance record to rejected
    const updatedAttendance = await prisma.attendanceRecord.update({
      where: { id },
      data: {
        approvalStatus: 'REJECTED',
        approvedBy: session.user.id,
        approvedAt: BigInt(Math.floor(Date.now() / 1000)),
        rejectionReason: validatedData.reason,
      },
    })

    // Create operation log
    await prisma.operationLog.create({
      data: {
        userId: session.user.id,
        attendanceRecordId: id,
        action: 'REJECT_ATTENDANCE',
        newValue: {
          approvalStatus: 'REJECTED',
          approvedBy: session.user.id,
          rejectionReason: validatedData.reason,
        },
        timestamp: BigInt(Math.floor(Date.now() / 1000)),
        reason: validatedData.reason,
        ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
        userAgent: req.headers.get('user-agent') || 'unknown',
      },
    })

    // TODO: Send notification to employee
    // await notifyAttendanceRejected(attendance.userId, attendance.id, validatedData.reason)

    return NextResponse.json({
      success: true,
      message: 'Attendance record has been rejected',
    })

  } catch (error) {
    console.error('Error rejecting attendance:', error)

    // Validation error
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation error',
          details: error.issues,
        },
        { status: 400 }
      )
    }

    // Internal server error
    return NextResponse.json(
      { error: 'Failed to reject attendance' },
      { status: 500 }
    )
  }
}
