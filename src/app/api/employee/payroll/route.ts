import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/../../prisma/client"
import { Prisma } from "@prisma/client"

/**
 * GET /api/employee/payroll
 * Get the authenticated employee's payroll history
 * Query params:
 * - period: specific period (optional, e.g., "2024-01")
 * - status: filter by status (optional: pending, processing, paid, failed)
 * - limit: number (optional, default 50)
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period")
    const status = searchParams.get("status")
    const limit = parseInt(searchParams.get("limit") || "50")

    // Build query filters
    const where: Prisma.PayrollWhereInput = {
      employeeId: session.user.id,
    }

    if (period) {
      where.period = period
    }

    if (status) {
      where.status = status
    }

    // Get payroll records
    const payrolls = await prisma.payroll.findMany({
      where,
      orderBy: {
        period: 'desc',
      },
      take: limit,
      select: {
        id: true,
        period: true,
        totalHours: true,
        totalAmount: true,
        transactionHash: true,
        status: true,
        paidAt: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    // Calculate summary statistics
    const summary = await prisma.payroll.aggregate({
      where,
      _count: {
        id: true,
      },
      _sum: {
        totalHours: true,
        totalAmount: true,
      },
    })

    // Count by status
    const statusCounts = await prisma.payroll.groupBy({
      by: ['status'],
      where: {
        employeeId: session.user.id,
      },
      _count: {
        id: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: payrolls,
      summary: {
        totalRecords: summary._count.id,
        totalHours: summary._sum.totalHours?.toString() || "0",
        totalAmount: summary._sum.totalAmount?.toString() || "0",
        statusCounts: statusCounts.reduce((acc, item) => {
          acc[item.status] = item._count.id
          return acc
        }, {} as Record<string, number>),
      },
    })
  } catch (error) {
    console.error("Error fetching employee payroll:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
