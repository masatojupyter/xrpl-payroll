import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/../prisma/client'
import { z } from 'zod'

/**
 * Individual Attendance Approval Schema
 * Optional comment for approval
 */
const approveSchema = z.object({
  comment: z
    .string()
    .max(500, 'Comment must be 500 characters or less')
    .optional(),
})

/**
 * POST /api/admin/attendance-approvals/[id]/approve
 * Approve individual attendance record
 * 
 * @param req - Request object
 * @param params - URL parameters containing attendance record id
 * @returns Updated attendance record with approval status
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
    const validatedData = approveSchema.parse(body)

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

    // Update attendance record to approved
    const updatedAttendance = await prisma.attendanceRecord.update({
      where: { id },
      data: {
        approvalStatus: 'APPROVED',
        approvedBy: session.user.id,
        approvedAt: BigInt(Math.floor(Date.now() / 1000)),
        approvalComment: validatedData.comment,
      },
    })

    // Create operation log
    await prisma.operationLog.create({
      data: {
        userId: session.user.id,
        attendanceRecordId: id,
        action: 'APPROVE_ATTENDANCE',
        newValue: {
          approvalStatus: 'APPROVED',
          approvedBy: session.user.id,
          approvalComment: validatedData.comment,
        },
        timestamp: BigInt(Math.floor(Date.now() / 1000)),
        ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
        userAgent: req.headers.get('user-agent') || 'unknown',
      },
    })

    // TODO: Send notification to employee
    // await notifyAttendanceApproved(attendance.userId, attendance.id, validatedData.comment)

    return NextResponse.json({
      success: true,
      message: 'Attendance record has been approved',
    })

  } catch (error) {
    console.error('Error approving attendance:', error)

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
      { error: 'Failed to approve attendance' },
      { status: 500 }
    )
  }
}
