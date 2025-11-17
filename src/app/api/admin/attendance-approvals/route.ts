import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/../../prisma/client'
import { pendingApprovalsQuerySchema, approveAttendanceSchema } from '@/lib/validators/approval'
import { z } from 'zod'
import { Prisma } from '@prisma/client'

/**
 * GET - Retrieve list of pending attendance records
 * 
 * Query parameters:
 * - employeeId: Employee ID (optional)
 * - departmentId: Department ID (optional)
 * - startDate: Start date (YYYY-MM-DD format, optional)
 * - endDate: End date (YYYY-MM-DD format, optional)
 * - page: Page number (default: 1)
 * - limit: Records per page (default: 20, max: 100)
 * - sortBy: Sort field (date | employeeName | totalWorkMinutes, default: date)
 * - sortOrder: Sort order (asc | desc, default: desc)
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

    // Get and validate query parameters
    const { searchParams } = new URL(request.url)
    
    const queryParams = {
      employeeId: searchParams.get('employeeId') || undefined,
      departmentId: searchParams.get('departmentId') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
      sortBy: (searchParams.get('sortBy') as 'date' | 'employeeName' | 'totalWorkMinutes') || 'date',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
    }

    // Zod validation
    let validatedQuery
    try {
      validatedQuery = pendingApprovalsQuerySchema.parse(queryParams)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: 'Invalid query parameters',
            details: error.issues,
          },
          { status: 400 }
        )
      }
      throw error
    }

    // Get user IDs in organization
    const orgUsers = await prisma.user.findMany({
      where: {
        organizationId: session.user.organizationId,
      },
      select: { id: true },
    })
    const orgUserIds = orgUsers.map(u => u.id)

    // Build filter conditions
    const whereClause: Prisma.AttendanceRecordWhereInput = {
      userId: { in: orgUserIds },
      status: 'COMPLETED',
      approvalStatus: 'PENDING',
    }

    // Employee ID filter
    if (validatedQuery.employeeId) {
      whereClause.userId = validatedQuery.employeeId
    }

    // Department ID filter
    if (validatedQuery.departmentId) {
      // Get IDs of employees in the department
      const departmentEmployees = await prisma.employee.findMany({
        where: {
          departmentId: validatedQuery.departmentId,
          organizationId: session.user.organizationId,
          isActive: true,
        },
        select: { id: true },
      })
      
      const employeeIds = departmentEmployees.map(e => e.id)
      whereClause.userId = { in: employeeIds }
    }

    // Date range filter
    if (validatedQuery.startDate || validatedQuery.endDate) {
      whereClause.date = {}
      
      if (validatedQuery.startDate) {
        whereClause.date.gte = new Date(validatedQuery.startDate)
      }
      
      if (validatedQuery.endDate) {
        const endDate = new Date(validatedQuery.endDate)
        endDate.setHours(23, 59, 59, 999)
        whereClause.date.lte = endDate
      }
    }

    // Get total count
    const total = await prisma.attendanceRecord.count({
      where: whereClause,
    })

    // Pagination calculation
    const totalPages = Math.ceil(total / validatedQuery.limit)
    const skip = (validatedQuery.page - 1) * validatedQuery.limit

    // Build sort conditions
    let orderBy: Prisma.AttendanceRecordOrderByWithRelationInput = {}
    
    switch (validatedQuery.sortBy) {
      case 'date':
        orderBy = { date: validatedQuery.sortOrder }
        break
      case 'totalWorkMinutes':
        orderBy = { totalWorkMinutes: validatedQuery.sortOrder }
        break
      case 'employeeName':
        // For employee name sorting, sort on application side after data retrieval
        orderBy = { date: 'desc' } // Default to date descending
        break
    }

    // Retrieve attendance records
    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where: whereClause,
      select: {
        id: true,
        userId: true,
        date: true,
        checkInTime: true,
        checkOutTime: true,
        totalWorkMinutes: true,
        status: true,
        approvalStatus: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy,
      skip,
      take: validatedQuery.limit,
    })

    // Retrieve user information
    const userIds = attendanceRecords.map(record => record.userId)
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

    // Retrieve employee information (including employeeCode and department name)
    const userEmails = users.map(user => user.email)
    const employees = await prisma.employee.findMany({
      where: {
        email: { in: userEmails },
        organizationId: session.user.organizationId,
      },
      select: {
        email: true,
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

    // Map employee information
    const employeeMap = new Map(
      employees.map(emp => [emp.email, emp])
    )

    // Format response data
    const formattedData = attendanceRecords.map(record => {
      const user = userMap.get(record.userId)
      const employee = user ? employeeMap.get(user.email) : undefined
      
      return {
        id: record.id,
        date: record.date.toISOString().split('T')[0],
        employee: {
          id: record.userId,
          firstName: employee?.firstName || user?.firstName || '',
          lastName: employee?.lastName || user?.lastName || '',
          employeeCode: employee?.employeeCode || '-',
          department: employee?.department?.name || '-',
        },
        clockInTime: record.checkInTime.toString(),
        clockOutTime: record.checkOutTime?.toString() || null,
        totalWorkMinutes: record.totalWorkMinutes,
        totalWorkHours: (record.totalWorkMinutes / 60).toFixed(1),
        status: record.status,
        approvalStatus: record.approvalStatus,
        notes: record.notes,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
      }
    })

    // Sort by employee name if specified
    if (validatedQuery.sortBy === 'employeeName') {
      formattedData.sort((a, b) => {
        const nameA = `${a.employee.lastName} ${a.employee.firstName}`
        const nameB = `${b.employee.lastName} ${b.employee.firstName}`
        const comparison = nameA.localeCompare(nameB)
        return validatedQuery.sortOrder === 'desc' ? -comparison : comparison
      })
    }

    // Response
    return NextResponse.json({
      success: true,
      data: formattedData,
      pagination: {
        total,
        page: validatedQuery.page,
        limit: validatedQuery.limit,
        totalPages,
      },
    })
  } catch (error) {
    console.error('Error fetching pending attendance approvals:', error)
    
    return NextResponse.json(
      {
        error: 'Failed to fetch pending attendance approvals',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * POST - Bulk approve attendance records
 * 
 * Request body:
 * - attendanceRecordIds: Array of attendance record IDs to approve
 * - comment: Approval comment (optional)
 */
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Admin権限チェック
    if (session.user.userType !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    // Get and validate request body
    let body
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    // Zod validation
    let validatedData
    try {
      validatedData = approveAttendanceSchema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: 'Invalid request data',
            details: error.issues,
          },
          { status: 400 }
        )
      }
      throw error
    }

    // Verify existence and permissions for attendance records to approve
    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where: {
        id: { in: validatedData.attendanceRecordIds },
      },
      select: {
        id: true,
        userId: true,
        approvalStatus: true,
        status: true,
      },
    })

    // Existence check
    if (attendanceRecords.length === 0) {
      return NextResponse.json(
        { error: 'No attendance records found' },
        { status: 404 }
      )
    }

    if (attendanceRecords.length !== validatedData.attendanceRecordIds.length) {
      const foundIds = attendanceRecords.map(r => r.id)
      const notFoundIds = validatedData.attendanceRecordIds.filter(
        id => !foundIds.includes(id)
      )
      return NextResponse.json(
        {
          error: 'Some attendance records not found',
          details: { notFoundIds },
        },
        { status: 404 }
      )
    }

    // Organization check - verify all attendance records belong to admin's organization
    const userIds = attendanceRecords.map(r => r.userId)
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds },
      },
      select: {
        id: true,
        organizationId: true,
      },
    })
    
    const invalidOrganization = users.some(
      user => user.organizationId !== session.user.organizationId
    )
    
    if (invalidOrganization) {
      return NextResponse.json(
        { error: 'Cannot approve attendance records from other organizations' },
        { status: 403 }
      )
    }

    // Check if records are in approvable state (status: COMPLETED, approvalStatus: PENDING)
    const invalidRecords = attendanceRecords.filter(
      record => record.status !== 'COMPLETED' || record.approvalStatus !== 'PENDING'
    )
    
    if (invalidRecords.length > 0) {
      return NextResponse.json(
        {
          error: 'Some records are not in a state that can be approved',
          details: {
            invalidRecordIds: invalidRecords.map(r => r.id),
            message: 'Records must have status=COMPLETED and approvalStatus=PENDING',
          },
        },
        { status: 400 }
      )
    }

    // Get current Unix timestamp (seconds)
    const approvedAt = Math.floor(Date.now() / 1000)

    // Bulk approve and create operation logs in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Bulk approve attendance records
      const updatedRecords = await tx.attendanceRecord.updateMany({
        where: {
          id: { in: validatedData.attendanceRecordIds },
        },
        data: {
          approvalStatus: 'APPROVED',
          approvedBy: session.user.id,
          approvedAt,
          approvalComment: validatedData.comment || null,
        },
      })

      // Create operation logs for each attendance record
      const operationLogs = await Promise.all(
        validatedData.attendanceRecordIds.map(async (attendanceRecordId) => {
          return tx.operationLog.create({
            data: {
              userId: session.user.id,
              action: 'APPROVE_ATTENDANCE',
              attendanceRecordId,
              newValue: {
                approvalStatus: 'APPROVED',
                comment: validatedData.comment || null,
              },
              timestamp: BigInt(approvedAt),
              ipAddress: request.headers.get('x-forwarded-for') || 
                         request.headers.get('x-real-ip') || 
                         'unknown',
              userAgent: request.headers.get('user-agent') || 'unknown',
            },
          })
        })
      )

      // Retrieve detailed attendance records after approval
      const approvedRecords = await tx.attendanceRecord.findMany({
        where: {
          id: { in: validatedData.attendanceRecordIds },
        },
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
          notes: true,
          createdAt: true,
          updatedAt: true,
        },
      })

      return {
        updatedCount: updatedRecords.count,
        records: approvedRecords,
        operationLogs,
      }
    })

    // Response
    return NextResponse.json({
      success: true,
      count: result.updatedCount,
      records: result.records.map(record => ({
        id: record.id,
        userId: record.userId,
        date: record.date.toISOString().split('T')[0],
        checkInTime: record.checkInTime.toString(),
        checkOutTime: record.checkOutTime?.toString() || null,
        totalWorkMinutes: record.totalWorkMinutes,
        status: record.status,
        approvalStatus: record.approvalStatus,
        approvedBy: record.approvedBy,
        approvedAt: record.approvedAt,
        approvalComment: record.approvalComment,
        notes: record.notes,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error('Error approving attendance records:', error)
    
    // In case of transaction error, all changes are rolled back
    return NextResponse.json(
      {
        error: 'Failed to approve attendance records',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
