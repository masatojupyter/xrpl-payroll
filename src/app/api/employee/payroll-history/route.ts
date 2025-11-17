import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/../prisma/client';
import { z } from 'zod';

// Query parameters schema
const PayrollHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * GET /api/employee/payroll-history
 * Get authenticated employee's payroll history with pagination
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } },
        { status: 401 }
      );
    }

    // Check if user is an employee
    if (session.user.userType !== 'employee') {
      return NextResponse.json(
        {
          error: {
            message: 'Forbidden - Employee access only',
            code: 'FORBIDDEN',
          },
        },
        { status: 403 }
      );
    }

    // Get employee ID from session
    const employeeId = session.user.id;

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
    };

    let validatedQuery;
    try {
      validatedQuery = PayrollHistoryQuerySchema.parse(queryParams);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: {
              message: 'Invalid query parameters',
              code: 'VALIDATION_ERROR',
              details: error.issues,
            },
          },
          { status: 400 }
        );
      }
      throw error;
    }

    const { page, limit } = validatedQuery;

    // Calculate pagination
    const skip = (page - 1) * limit;
    const take = limit;

    // Query payroll records with payment transactions
    const [payrolls, total] = await Promise.all([
      prisma.payroll.findMany({
        where: {
          employeeId,
        },
        skip,
        take,
        orderBy: [{ period: 'desc' }, { createdAt: 'desc' }],
        include: {
          paymentTransaction: {
            select: {
              transactionHash: true,
              completedAt: true,
              status: true,
            },
          },
        },
      }),
      prisma.payroll.count({
        where: {
          employeeId,
        },
      }),
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);

    // Format response data
    const formattedData = payrolls.map((payroll) => ({
      id: payroll.id,
      period: payroll.period,
      totalHours: payroll.totalHours.toString(),
      totalAmountUSD: payroll.totalAmountUSD.toString(),
      totalAmountXRP: payroll.totalAmountXRP?.toString() || null,
      exchangeRate: payroll.exchangeRate?.toString() || null,
      status: payroll.status,
      paidAt: payroll.paidAt?.toISOString() || null,
      paymentTransaction: payroll.paymentTransaction
        ? {
            transactionHash: payroll.paymentTransaction.transactionHash || null,
            completedAt:
              payroll.paymentTransaction.completedAt?.toISOString() || null,
          }
        : null,
    }));

    return NextResponse.json({
      success: true,
      data: formattedData,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Error fetching employee payroll history:', error);

    return NextResponse.json(
      {
        error: {
          message: 'Failed to fetch payroll history',
          code: 'INTERNAL_ERROR',
        },
      },
      { status: 500 }
    );
  }
}
