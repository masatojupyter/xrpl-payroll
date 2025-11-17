import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/../../prisma/client"

// Type for operation log values (with index signature for Prisma JSON compatibility)
interface OperationLogValue {
  status?: string
  attendanceType?: 'present' | 'absent' | 'leave' | 'holiday' | 'sick_leave' | 'half_day'
  notes?: string | null
  checkInTime?: number
  [key: string]: string | number | null | undefined
}

/**
 * POST /api/employee/attendance/[id]
 * Update employee's own attendance record
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    // Check if user is authenticated
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Check if user is an employee
    if (session.user.userType !== 'employee') {
      return NextResponse.json(
        { error: "Forbidden - Employee access only" },
        { status: 403 }
      )
    }

    const { id: recordId } = await params

    // Get the attendance record to verify ownership
    const existingRecord = await prisma.attendanceRecord.findUnique({
      where: { id: recordId },
    })

    if (!existingRecord) {
      return NextResponse.json(
        { error: "Attendance record not found" },
        { status: 404 }
      )
    }

    // Find User record by email to get actual userId
    let actualUserId = session.user.id
    if (session.user.userType === 'employee') {
      const user = await prisma.user.findFirst({
        where: {
          email: session.user.email || '',
          role: 'employee',
        },
      })
      
      if (user) {
        actualUserId = user.id
      }
    }

    // Verify that the record belongs to the authenticated user
    if (existingRecord.userId !== actualUserId) {
      return NextResponse.json(
        { error: "Forbidden - Cannot update other user's attendance" },
        { status: 403 }
      )
    }

    const body = await request.json()
    console.log('[POST /api/employee/attendance/[id]] Request body:', body)
    console.log('[POST /api/employee/attendance/[id]] Existing record:', {
      status: existingRecord.status,
      attendanceType: existingRecord.attendanceType
    })

    // Parse and validate the update data
    const updateData: {
      attendanceType?: 'present' | 'absent' | 'leave' | 'holiday' | 'sick_leave' | 'half_day'
      notes?: string | null
      checkInTime?: bigint
    } = {}

    // Map frontend status to database attendanceType
    if (body.status) {
      console.log('[POST /api/employee/attendance/[id]] Mapping status to attendanceType:', body.status)
      const attendanceTypeMap: Record<string, 'present' | 'absent' | 'leave' | 'holiday' | 'sick_leave' | 'half_day'> = {
        'present': 'present',
        'absent': 'absent',
        'leave': 'leave',
        'holiday': 'holiday',
        'sick_leave': 'sick_leave',
        'half_day': 'half_day',
      }
      updateData.attendanceType = attendanceTypeMap[body.status] || existingRecord.attendanceType
      console.log('[POST /api/employee/attendance/[id]] Updated attendanceType:', updateData.attendanceType)
    }

    if (body.notes !== undefined) {
      updateData.notes = body.notes
    }

    // Support updating checkInTime (from timer event correction)
    if (body.checkInTime !== undefined) {
      console.log('[POST /api/employee/attendance/[id]] Updating checkInTime:', body.checkInTime)
      updateData.checkInTime = BigInt(body.checkInTime)
    }

    console.log('[POST /api/employee/attendance/[id]] Update data:', updateData)

    // Update the attendance record
    const updatedRecord = await prisma.attendanceRecord.update({
      where: { id: recordId },
      data: updateData,
    })

    console.log('[POST /api/employee/attendance/[id]] Updated record:', {
      status: updatedRecord.status,
      attendanceType: updatedRecord.attendanceType
    })

    // Create operation log (convert bigint to number for JSON compatibility)
    const oldLogValue: OperationLogValue = {
      status: existingRecord.status,
      notes: existingRecord.notes,
      checkInTime: Number(existingRecord.checkInTime),
    }

    const newLogValue: OperationLogValue = {
      attendanceType: updateData.attendanceType,
      notes: updateData.notes,
      checkInTime: updateData.checkInTime ? Number(updateData.checkInTime) : undefined,
    }

    await prisma.operationLog.create({
      data: {
        attendanceRecordId: recordId,
        userId: actualUserId,
        action: 'EDIT_STATUS',
        oldValue: oldLogValue,
        newValue: newLogValue,
        timestamp: BigInt(Math.floor(Date.now() / 1000)),
        reason: 'Employee self-update',
      },
    })

    // Convert Unix timestamps to Date objects for response
    const checkIn = new Date(Number(updatedRecord.checkInTime) * 1000)
    const checkOut = updatedRecord.checkOutTime ? new Date(Number(updatedRecord.checkOutTime) * 1000) : null

    // Format date as YYYY-MM-DD
    const year = updatedRecord.date.getUTCFullYear()
    const month = String(updatedRecord.date.getUTCMonth() + 1).padStart(2, '0')
    const day = String(updatedRecord.date.getUTCDate()).padStart(2, '0')
    const dateString = `${year}-${month}-${day}`

    // Use attendanceType as frontend status (they are the same)
    const frontendStatus = updatedRecord.attendanceType

    return NextResponse.json({
      success: true,
      data: {
        id: updatedRecord.id,
        date: dateString,
        checkIn: checkIn.toISOString(),
        checkOut: checkOut?.toISOString() || null,
        status: frontendStatus,
        notes: updatedRecord.notes,
      },
    })
  } catch (error) {
    console.error("Error updating employee attendance:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
