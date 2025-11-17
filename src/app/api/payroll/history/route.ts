import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/../prisma/client';
import { PayrollHistoryQuerySchema } from '@/lib/validators/payroll';
import { Prisma } from '@prisma/client';

/**
 * GET /api/payroll/history
 * Get payroll payment history with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with organization
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { organizationId: true },
    });

    if (!user?.organizationId) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    const organizationId = user.organizationId;

    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    const validatedQuery = PayrollHistoryQuerySchema.parse(queryParams);
    const { employeeId, period, status, page, limit, sortBy, sortOrder } = validatedQuery;

    // Build where clause
    const where: Prisma.PayrollWhereInput = {
      employee: {
        organizationId,
      },
    };

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (period) {
      where.period = period;
    }

    if (status) {
      where.status = status;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;
    const take = limit;

    // Build orderBy clause
    const orderBy: Prisma.PayrollOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    // Execute queries
    const [payrolls, total] = await Promise.all([
      prisma.payroll.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          employee: {
            select: {
              id: true,
              employeeCode: true,
              firstName: true,
              lastName: true,
              email: true,
              walletAddress: true,
              department: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      prisma.payroll.count({ where }),
    ]);

    // Calculate statistics
    const stats = await prisma.payroll.aggregate({
      where,
      _sum: {
        totalAmount: true,
        totalHours: true,
      },
      _count: true,
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    // Get status breakdown
    const statusBreakdown = await prisma.payroll.groupBy({
      by: ['status'],
      where: {
        employee: {
          organizationId,
        },
        ...(employeeId && { employeeId }),
        ...(period && { period }),
      },
      _count: {
        status: true,
      },
      _sum: {
        totalAmount: true,
      },
    });

    return NextResponse.json({
      data: payrolls.map((payroll) => ({
        id: payroll.id,
        employee: {
          id: payroll.employee.id,
          employeeCode: payroll.employee.employeeCode,
          name: `${payroll.employee.firstName} ${payroll.employee.lastName}`,
          email: payroll.employee.email,
          walletAddress: payroll.employee.walletAddress,
          department: payroll.employee.department,
        },
        period: payroll.period,
        totalHours: payroll.totalHours.toString(),
        totalAmount: payroll.totalAmount.toString(),
        status: payroll.status,
        transactionHash: payroll.transactionHash,
        createdAt: payroll.createdAt.toISOString(),
        paidAt: payroll.paidAt?.toISOString(),
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      },
      statistics: {
        totalAmount: stats._sum.totalAmount?.toString() || '0',
        totalHours: stats._sum.totalHours?.toString() || '0',
        totalRecords: stats._count,
      },
      statusBreakdown: statusBreakdown.map((item) => ({
        status: item.status,
        count: item._count.status,
        totalAmount: item._sum.totalAmount?.toString() || '0',
      })),
    });
  } catch (error) {
    console.error('Error fetching payroll history:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch payroll history' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/payroll/history
 * Create payroll records from calculations
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with organization
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { organizationId: true },
    });

    if (!user?.organizationId) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    const organizationId = user.organizationId;

    const body = await request.json();
    const { calculations } = body;

    if (!Array.isArray(calculations) || calculations.length === 0) {
      return NextResponse.json(
        { error: 'Calculations array is required' },
        { status: 400 }
      );
    }

    const createdPayrolls = [];
    const errors = [];

    for (const calc of calculations) {
      try {
        // Verify employee belongs to organization
        const employee = await prisma.employee.findFirst({
          where: {
            id: calc.employeeId,
            organizationId,
          },
        });

        if (!employee) {
          errors.push({
            employeeId: calc.employeeId,
            error: 'Employee not found',
          });
          continue;
        }

        // Check if payroll already exists
        const existing = await prisma.payroll.findUnique({
          where: {
            employeeId_period: {
              employeeId: calc.employeeId,
              period: calc.period,
            },
          },
        });

        if (existing) {
          errors.push({
            employeeId: calc.employeeId,
            period: calc.period,
            error: 'Payroll already exists for this period',
          });
          continue;
        }

        // Create payroll record
        const payroll = await prisma.payroll.create({
          data: {
            employeeId: calc.employeeId,
            organizationId,
            period: calc.period,
            totalHours: calc.totalHours,
            totalAmountUSD: calc.totalAmount,
            totalAmount: calc.totalAmount,
            status: 'pending',
          },
          include: {
            employee: {
              select: {
                id: true,
                employeeCode: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        });

        createdPayrolls.push({
          id: payroll.id,
          employeeId: payroll.employeeId,
          employeeName: `${payroll.employee.firstName} ${payroll.employee.lastName}`,
          period: payroll.period,
          totalHours: payroll.totalHours.toString(),
          totalAmount: payroll.totalAmount.toString(),
          status: payroll.status,
        });
      } catch (err) {
        errors.push({
          employeeId: calc.employeeId,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      created: createdPayrolls.length,
      failed: errors.length,
      payrolls: createdPayrolls,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error creating payroll records:', error);

    return NextResponse.json(
      { error: 'Failed to create payroll records' },
      { status: 500 }
    );
  }
}
