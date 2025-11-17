/**
 * POST /api/payroll/create-batch
 * Create payroll records in batch from calculated payroll data
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/../prisma/client';
import { PayrollCreateBatchSchema } from '@/lib/validators/payroll';
import { Decimal } from '@prisma/client/runtime/library';
import { logPayrollBatchCreation } from '@/lib/xrp/payment-logger';

/**
 * Fetch current XRP/USD exchange rate
 */
async function fetchExchangeRate(): Promise<number> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const response = await fetch(`${baseUrl}/api/xrp/exchange-rate`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch exchange rate: ${response.status}`);
  }

  const data = await response.json();
  
  if (!data.success || typeof data.rate !== 'number') {
    throw new Error('Invalid exchange rate response');
  }

  return data.rate;
}

/**
 * POST /api/payroll/create-batch
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authentication check (admin only)
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user with organization
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { 
        organizationId: true,
        role: true,
      },
    });

    if (!user?.organizationId) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Check admin role
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const organizationId = user.organizationId;

    // 2. Validate request body
    const body = await request.json();
    const validatedData = PayrollCreateBatchSchema.parse(body);

    const { period, calculations } = validatedData;

    // 3. Fetch current XRP/USD exchange rate
    let exchangeRate: number;
    try {
      exchangeRate = await fetchExchangeRate();
    } catch (error) {
      console.error('Failed to fetch exchange rate:', error);
      return NextResponse.json(
        { 
          error: 'Failed to fetch exchange rate',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 503 }
      );
    }

    // 4. Check for existing payroll records and validate employees
    const employeeIds = calculations.map(calc => calc.employeeId);
    
    // Validate all employees exist and belong to the organization
    const employees = await prisma.employee.findMany({
      where: {
        id: { in: employeeIds },
        organizationId,
        isActive: true,
      },
      select: {
        id: true,
        walletAddress: true,
      },
    });

    const foundEmployeeIds = new Set(employees.map(e => e.id));
    const missingEmployeeIds = employeeIds.filter(id => !foundEmployeeIds.has(id));

    if (missingEmployeeIds.length > 0) {
      return NextResponse.json(
        { 
          error: 'Invalid employees',
          details: `Employees not found or inactive: ${missingEmployeeIds.join(', ')}`
        },
        { status: 400 }
      );
    }

    // Check for missing wallet addresses
    const employeesWithoutWallet = employees.filter(e => !e.walletAddress);
    if (employeesWithoutWallet.length > 0) {
      console.warn(
        `Employees without wallet address: ${employeesWithoutWallet.map(e => e.id).join(', ')}`
      );
    }

    // Check for existing payroll records
    const existingPayrolls = await prisma.payroll.findMany({
      where: {
        employeeId: { in: employeeIds },
        period,
      },
      select: {
        employeeId: true,
      },
    });

    const existingEmployeeIds = new Set(existingPayrolls.map(p => p.employeeId));
    
    // Filter out calculations for employees with existing payroll
    const newCalculations = calculations.filter(
      calc => !existingEmployeeIds.has(calc.employeeId)
    );
    const skippedCalculations = calculations.filter(
      calc => existingEmployeeIds.has(calc.employeeId)
    );

    // Log skipped entries
    if (skippedCalculations.length > 0) {
      console.warn(
        `Skipped ${skippedCalculations.length} payroll(s) - already exists for period ${period}:`,
        skippedCalculations.map(c => c.employeeId).join(', ')
      );
    }

    // If all were skipped, return early
    if (newCalculations.length === 0) {
      return NextResponse.json({
        success: true,
        created: 0,
        skipped: skippedCalculations.length,
        payrolls: [],
        exchangeRate,
        summary: {
          totalAmountUSD: '0.00',
          totalAmountXRP: '0.000000',
          employeeCount: 0,
        },
        message: 'All payroll records already exist for this period',
      });
    }

    // 5. Create payroll records in transaction
    const createdPayrolls = await prisma.$transaction(
      newCalculations.map(calc => {
        const totalAmountUSD = new Decimal(calc.totalAmountUSD);
        const totalAmountXRP = totalAmountUSD.dividedBy(exchangeRate);
        const totalHours = new Decimal(calc.totalHours);

        return prisma.payroll.create({
          data: {
            employeeId: calc.employeeId,
            organizationId,
            period,
            totalHours,
            totalAmountUSD,
            totalAmountXRP,
            totalAmount: totalAmountUSD, // Legacy field
            exchangeRate: new Decimal(exchangeRate),
            status: 'pending',
            transactionStatus: 'pending',
            retryCount: 0,
          },
          include: {
            employee: {
              select: {
                employeeCode: true,
                firstName: true,
                lastName: true,
                email: true,
                walletAddress: true,
                department: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        });
      })
    );

    // 6. Calculate summary
    const totalAmountUSD = createdPayrolls.reduce(
      (sum, p) => sum.plus(p.totalAmountUSD),
      new Decimal(0)
    );
    const totalAmountXRP = createdPayrolls.reduce(
      (sum, p) => sum.plus(p.totalAmountXRP || 0),
      new Decimal(0)
    );

    // 7. Log successful batch creation
    await logPayrollBatchCreation({
      userId: session.user.id,
      organizationId,
      period,
      batchSize: createdPayrolls.length,
      totalAmountUSD: totalAmountUSD.toFixed(2),
      totalAmountXRP: totalAmountXRP.toFixed(6),
      exchangeRate,
      status: 'success',
      metadata: {
        created: createdPayrolls.length,
        skipped: skippedCalculations.length,
      },
    });

    // 8. Format response
    const response = {
      success: true,
      created: createdPayrolls.length,
      skipped: skippedCalculations.length,
      payrolls: createdPayrolls.map(payroll => ({
        id: payroll.id,
        employeeId: payroll.employeeId,
        employee: {
          employeeCode: payroll.employee.employeeCode,
          name: `${payroll.employee.firstName} ${payroll.employee.lastName}`,
          email: payroll.employee.email,
          department: payroll.employee.department?.name || null,
          walletAddress: payroll.employee.walletAddress,
        },
        period: payroll.period,
        totalHours: payroll.totalHours.toString(),
        totalAmountUSD: payroll.totalAmountUSD.toString(),
        totalAmountXRP: payroll.totalAmountXRP?.toString() || null,
        exchangeRate: payroll.exchangeRate?.toString() || null,
        status: payroll.status,
        transactionStatus: payroll.transactionStatus,
        createdAt: payroll.createdAt.toISOString(),
      })),
      exchangeRate,
      summary: {
        totalAmountUSD: totalAmountUSD.toFixed(2),
        totalAmountXRP: totalAmountXRP.toFixed(6),
        employeeCount: createdPayrolls.length,
      },
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Payroll batch creation error:', error);

    // Log batch creation failure
    const session = await auth();
    if (session?.user?.id) {
      try {
        const user = await prisma.user.findUnique({
          where: { email: session.user.email || '' },
          select: { organizationId: true },
        });

        await logPayrollBatchCreation({
          userId: session.user.id,
          organizationId: user?.organizationId || undefined,
          period: '',
          batchSize: 0,
          totalAmountUSD: '0',
          totalAmountXRP: '0',
          exchangeRate: 0,
          status: 'failed',
          level: 'error',
          metadata: {
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      } catch (logError) {
        console.error('Failed to log batch creation error:', logError);
      }
    }

    // Handle validation errors
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { 
          error: 'Invalid input',
          details: error.message,
        },
        { status: 400 }
      );
    }

    // Handle other errors
    return NextResponse.json(
      { 
        error: 'Failed to create payroll batch',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
