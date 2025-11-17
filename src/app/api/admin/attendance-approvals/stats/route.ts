import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/../../prisma/client'

/**
 * GET - Retrieve approval statistics
 * 
 * Statistics returned:
 * - totalPending: Number of pending approvals
 * - totalApproved: Number of approved records (this month)
 * - totalRejected: Number of rejected records (this month)
 * - approvalRate: Approval rate (approved / (approved + rejected) * 100)
 * - employeesWithPending: List of employees with unapproved attendance
 *   - employeeId
 *   - employeeName
 *   - pendingCount
 * - oldestPending: Date of oldest pending attendance record
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Admin permission check
    if (session.user.userType !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    // Get user IDs in organization
    const orgUsers = await prisma.user.findMany({
      where: {
        organizationId: session.user.organizationId,
      },
      select: { id: true },
    })
    const orgUserIds = orgUsers.map(u => u.id)

    // Calculate start and end dates of current month
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    startOfMonth.setHours(0, 0, 0, 0)
    
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    endOfMonth.setHours(23, 59, 59, 999)

    // 1. Get number of pending approvals
    const totalPending = await prisma.attendanceRecord.count({
      where: {
        userId: { in: orgUserIds },
        status: 'COMPLETED',
        approvalStatus: 'PENDING',
      },
    })

    // 2. Get number of approved records this month
    const totalApproved = await prisma.attendanceRecord.count({
      where: {
        userId: { in: orgUserIds },
        status: 'COMPLETED',
        approvalStatus: 'APPROVED',
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    })

    // 3. Get number of rejected records this month
    const totalRejected = await prisma.attendanceRecord.count({
      where: {
        userId: { in: orgUserIds },
        status: 'COMPLETED',
        approvalStatus: 'REJECTED',
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    })

    // 4. Calculate approval rate (approved / (approved + rejected) * 100)
    const totalProcessed = totalApproved + totalRejected
    const approvalRate = totalProcessed > 0 
      ? Math.round((totalApproved / totalProcessed) * 100 * 10) / 10 // Round to 1 decimal place
      : 0

    // 5. Get list of employees with unapproved attendance
    const pendingRecords = await prisma.attendanceRecord.groupBy({
      by: ['userId'],
      where: {
        userId: { in: orgUserIds },
        status: 'COMPLETED',
        approvalStatus: 'PENDING',
      },
      _count: {
        id: true,
      },
    })

    // Get user information
    const userIds = pendingRecords.map(record => record.userId)
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    })

    const userMap = new Map(users.map(user => [user.id, user]))

    // Get employee information
    const userEmails = users.map(user => user.email)
    const employees = await prisma.employee.findMany({
      where: {
        email: { in: userEmails },
        organizationId: session.user.organizationId,
      },
      select: {
        email: true,
        firstName: true,
        lastName: true,
      },
    })

    const employeeMap = new Map(
      employees.map(emp => [emp.email, emp])
    )

    // Format employee list
    const employeesWithPending = pendingRecords
      .map(record => {
        const user = userMap.get(record.userId)
        const employee = user ? employeeMap.get(user.email) : undefined
        
        return {
          employeeId: record.userId,
          employeeName: employee 
            ? `${employee.lastName} ${employee.firstName}`
            : user
            ? `${user.lastName || ''} ${user.firstName || ''}`.trim() || user.email
            : '-',
          pendingCount: record._count.id,
        }
      })
      .sort((a, b) => b.pendingCount - a.pendingCount) // Sort by count descending

    // 6. Get date of oldest pending attendance record
    const oldestPendingRecord = await prisma.attendanceRecord.findFirst({
      where: {
        userId: { in: orgUserIds },
        status: 'COMPLETED',
        approvalStatus: 'PENDING',
      },
      select: {
        date: true,
      },
      orderBy: {
        date: 'asc',
      },
    })

    const oldestPending = oldestPendingRecord 
      ? oldestPendingRecord.date.toISOString().split('T')[0]
      : null

    // Response
    return NextResponse.json({
      success: true,
      stats: {
        totalPending,
        totalApproved,
        totalRejected,
        approvalRate,
        employeesWithPending,
        oldestPending,
      },
      period: {
        startDate: startOfMonth.toISOString().split('T')[0],
        endDate: endOfMonth.toISOString().split('T')[0],
      },
    })
  } catch (error) {
    console.error('Error fetching attendance approval stats:', error)
    
    return NextResponse.json(
      {
        error: 'Failed to fetch attendance approval stats',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
