import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/../prisma/client'

/**
 * GET /api/admin/attendance-approvals/[id]
 * Get detailed information for individual attendance record (for approval)
 * 
 * @param req - Request object
 * @param params - URL parameters containing attendance record id
 * @returns Detailed attendance record with timer events and operation logs
 */
export async function GET(
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

    // Fetch attendance record with related data
    const attendance = await prisma.attendanceRecord.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        date: true,
        checkInTime: true,
        checkOutTime: true,
        totalWorkMinutes: true,
        status: true,
        approvalStatus: true,
        approvedBy: true,
        approvedAt: true,
        approvalComment: true,
        rejectionReason: true,
        notes: true,
      },
    })

    if (!attendance) {
      return NextResponse.json(
        { error: 'Attendance record not found' },
        { status: 404 }
      )
    }

    // Check organization access
    const user = await prisma.user.findUnique({
      where: { id: attendance.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        organizationId: true,
      },
    })

    if (!user || user.organizationId !== session.user.organizationId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Get employee information
    const employee = await prisma.employee.findUnique({
      where: {
        email_organizationId: {
          email: user.email,
          organizationId: session.user.organizationId,
        },
      },
      select: {
        id: true,
        employeeCode: true,
        firstName: true,
        lastName: true,
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    // Get timer events
    const timerEvents = await prisma.timerEvent.findMany({
      where: { attendanceRecordId: id },
      orderBy: { timestamp: 'asc' },
      select: {
        id: true,
        eventType: true,
        timestamp: true,
        endTimestamp: true,
        memo: true,
        notes: true,
      },
    })

    // Calculate duration from previous event
    const eventsWithDuration = timerEvents.map((event, index) => {
      let durationFromPrevious = null
      if (index > 0) {
        const prevEvent = timerEvents[index - 1]
        durationFromPrevious = Number(event.timestamp) - Number(prevEvent.timestamp)
      }
      return {
        ...event,
        timestamp: event.timestamp.toString(),
        endTimestamp: event.endTimestamp?.toString() || null,
        durationFromPrevious,
      }
    })

    // Calculate work stats
    let totalWorkSeconds = 0
    let totalRestSeconds = 0
    let workPeriods = 0
    let restPeriods = 0
    let lastWorkStart: number | null = null
    let lastBreakStart: number | null = null

    for (const event of timerEvents) {
      const timestamp = Number(event.timestamp)
      
      if (event.eventType === 'WORK') {
        if (lastBreakStart !== null) {
          const breakDuration = timestamp - lastBreakStart
          totalRestSeconds += breakDuration
          lastBreakStart = null
        }
        if (lastWorkStart === null) {
          lastWorkStart = timestamp
          workPeriods++
        }
      } else if (event.eventType === 'REST') {
        if (lastWorkStart !== null) {
          const workDuration = timestamp - lastWorkStart
          totalWorkSeconds += workDuration
          lastWorkStart = null
        }
        if (lastBreakStart === null) {
          lastBreakStart = timestamp
          restPeriods++
        }
      } else if (event.eventType === 'END') {
        if (lastWorkStart !== null) {
          const workDuration = timestamp - lastWorkStart
          totalWorkSeconds += workDuration
          lastWorkStart = null
        }
        if (lastBreakStart !== null) {
          const breakDuration = timestamp - lastBreakStart
          totalRestSeconds += breakDuration
          lastBreakStart = null
        }
      }
    }

    const workStats = {
      totalWorkMinutes: Math.floor(totalWorkSeconds / 60),
      totalRestMinutes: Math.floor(totalRestSeconds / 60),
      totalWorkHours: (totalWorkSeconds / 3600).toFixed(2),
      totalRestHours: (totalRestSeconds / 3600).toFixed(2),
      workPeriods,
      restPeriods,
    }

    // Get operation logs
    const operationLogs = await prisma.operationLog.findMany({
      where: { attendanceRecordId: id },
      orderBy: { timestamp: 'desc' },
      select: {
        id: true,
        action: true,
        oldValue: true,
        newValue: true,
        ipAddress: true,
        userAgent: true,
        timestamp: true,
        reason: true,
      },
    })

    const formattedLogs = operationLogs.map((log) => ({
      ...log,
      timestamp: log.timestamp.toString(),
      oldValue: log.oldValue as Record<string, unknown> | null,
      newValue: log.newValue as Record<string, unknown> | null,
    }))

    // Format response
    const response = {
      id: attendance.id,
      date: attendance.date.toISOString(),
      employee: {
        id: user.id,
        firstName: employee?.firstName || user.firstName || '',
        lastName: employee?.lastName || user.lastName || '',
        employeeCode: employee?.employeeCode || '-',
        department: employee?.department?.name || '-',
      },
      clockInTime: attendance.checkInTime.toString(),
      clockOutTime: attendance.checkOutTime?.toString() || null,
      totalWorkMinutes: attendance.totalWorkMinutes,
      totalBreakMinutes: workStats.totalRestMinutes, // Calculate from timer events
      approvalStatus: attendance.approvalStatus,
      approvedBy: attendance.approvedBy,
      approvedAt: attendance.approvedAt?.toString() || null,
      approvalComment: attendance.approvalComment,
      rejectionReason: attendance.rejectionReason,
      notes: attendance.notes,
      timerEvents: eventsWithDuration,
      operationLogs: formattedLogs,
      workStats,
    }

    return NextResponse.json({
      success: true,
      data: response,
    })

  } catch (error) {
    console.error('Error fetching attendance detail:', error)

    return NextResponse.json(
      { error: 'Failed to fetch attendance record' },
      { status: 500 }
    )
  }
}
