import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/../prisma/client';
import { PayrollProcessSchema } from '@/lib/validators/payroll';
import { processBatchPayments } from '@/lib/xrp/transaction';
import { notifyPayrollCompleted, notifyPayrollFailed } from '@/lib/notifications';
import { 
  logPaymentProcessing, 
  logPaymentSuccess, 
  logPaymentFailure 
} from '@/lib/xrp/payment-logger';

/**
 * POST /api/payroll/process
 * Process payroll payments using XRP on XRP Ledger
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (session.user.userType !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
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
    const validatedData = PayrollProcessSchema.parse(body);

    const { payrollIds, batchSize } = validatedData;

    // Fetch payroll records with employee details
    const payrolls = await prisma.payroll.findMany({
      where: {
        id: { in: payrollIds },
        employee: {
          organizationId,
        },
        status: 'pending',
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            email: true,
            walletAddress: true,
          },
        },
      },
    });

    if (payrolls.length === 0) {
      return NextResponse.json(
        { error: 'No pending payrolls found' },
        { status: 404 }
      );
    }

    // Update all payrolls to processing status
    await prisma.payroll.updateMany({
      where: {
        id: { in: payrolls.map((p) => p.id) },
      },
      data: {
        status: 'processing',
      },
    });

    // Separate payrolls with and without wallet addresses
    const payrollsWithWallet = payrolls.filter((p) => p.employee.walletAddress !== null);
    const payrollsWithoutWallet = payrolls.filter((p) => p.employee.walletAddress === null);

    // Update payrolls without wallet addresses to failed status
    if (payrollsWithoutWallet.length > 0) {
      await prisma.payroll.updateMany({
        where: {
          id: { in: payrollsWithoutWallet.map((p) => p.id) },
        },
        data: {
          status: 'failed',
        },
      });

      // Create failure notifications for employees without wallets
      const notificationPromises = payrollsWithoutWallet.map(async (payroll) => {
        try {
          if (session.user.id) {
            await notifyPayrollFailed(session.user.id, {
              id: payroll.id,
              employeeName: `${payroll.employee.firstName} ${payroll.employee.lastName}`,
              amount: payroll.totalAmount.toString(),
              errorMessage: 'Employee wallet address not configured',
            });
          }
        } catch (notificationError) {
          console.error('Error creating failure notification:', notificationError);
        }
      });
      await Promise.all(notificationPromises);
    }

    // Check if there are any payrolls with valid wallet addresses to process
    if (payrollsWithWallet.length === 0) {
      return NextResponse.json(
        { error: 'No employees with configured wallet addresses found' },
        { status: 400 }
      );
    }

    // Prepare payments for batch processing (now guaranteed to have non-null wallet addresses)
    const payments = payrollsWithWallet.map((payroll) => ({
      employeeId: payroll.employeeId,
      walletAddress: payroll.employee.walletAddress as string,
      amount: payroll.totalAmount.toString(),
    }));

    // Process batch payments
    const batchResult = await processBatchPayments(payments, batchSize);

    // Update payroll records based on transaction results
    const updatePromises = batchResult.results.map(async (result) => {
      const payroll = payrollsWithWallet.find((p) => p.employeeId === result.employeeId);
      if (!payroll) return;

      if (result.success) {
        // Update payroll status
        await prisma.payroll.update({
          where: { id: payroll.id },
          data: {
            status: 'paid',
            transactionHash: result.transactionHash,
            paidAt: new Date(),
          },
        });

        // Log successful payment
        await logPaymentSuccess({
          userId: session.user.id,
          organizationId,
          payrollId: payroll.id,
          employeeId: payroll.employeeId,
          amountUSD: payroll.totalAmountUSD?.toString() || payroll.totalAmount.toString(),
          amountXRP: payroll.totalAmountXRP?.toString(),
          transactionHash: result.transactionHash || '',
          metadata: {
            employeeName: `${payroll.employee.firstName} ${payroll.employee.lastName}`,
            period: payroll.period,
          },
        });

        // Create success notification
        try {
          if (session.user.id) {
            await notifyPayrollCompleted(session.user.id, {
              id: payroll.id,
              employeeName: `${payroll.employee.firstName} ${payroll.employee.lastName}`,
              amount: payroll.totalAmount.toString(),
              transactionHash: result.transactionHash || '',
            });
          }
        } catch (notificationError) {
          console.error('Error creating success notification:', notificationError);
        }
      } else {
        // Update payroll status
        await prisma.payroll.update({
          where: { id: payroll.id },
          data: {
            status: 'failed',
          },
        });

        // Log failed payment
        await logPaymentFailure({
          userId: session.user.id,
          organizationId,
          payrollId: payroll.id,
          employeeId: payroll.employeeId,
          amountUSD: payroll.totalAmountUSD?.toString() || payroll.totalAmount.toString(),
          amountXRP: payroll.totalAmountXRP?.toString(),
          errorMessage: result.error || 'Transaction failed',
          metadata: {
            employeeName: `${payroll.employee.firstName} ${payroll.employee.lastName}`,
            period: payroll.period,
          },
        });

        // Create failure notification
        try {
          if (session.user.id) {
            await notifyPayrollFailed(session.user.id, {
              id: payroll.id,
              employeeName: `${payroll.employee.firstName} ${payroll.employee.lastName}`,
              amount: payroll.totalAmount.toString(),
              errorMessage: result.error || 'Transaction failed',
            });
          }
        } catch (notificationError) {
          console.error('Error creating failure notification:', notificationError);
        }
      }
    });

    await Promise.all(updatePromises);

    // Fetch updated payrolls
    const updatedPayrolls = await prisma.payroll.findMany({
      where: {
        id: { in: payrolls.map((p) => p.id) },
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            email: true,
            walletAddress: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      summary: {
        total: batchResult.total + payrollsWithoutWallet.length,
        successful: batchResult.successful,
        failed: batchResult.failed + payrollsWithoutWallet.length,
        skipped: payrollsWithoutWallet.length,
      },
      payrolls: updatedPayrolls.map((payroll) => ({
        id: payroll.id,
        employeeId: payroll.employeeId,
        employeeName: `${payroll.employee.firstName} ${payroll.employee.lastName}`,
        period: payroll.period,
        totalAmount: payroll.totalAmount.toString(),
        status: payroll.status,
        transactionHash: payroll.transactionHash,
        paidAt: payroll.paidAt?.toISOString(),
      })),
      details: batchResult.results,
    });
  } catch (error) {
    console.error('Payroll processing error:', error);

    // Log processing failure
    const session = await auth();
    if (session?.user?.id) {
      try {
        const user = await prisma.user.findUnique({
          where: { email: session.user.email || '' },
          select: { organizationId: true },
        });

        // Log generic failure (not tied to specific payroll)
        await logPaymentFailure({
          userId: session.user.id,
          organizationId: user?.organizationId || undefined,
          payrollId: 'batch_error',
          employeeId: 'unknown',
          amountUSD: '0',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          metadata: {
            stage: 'batch_processing',
          },
        });
      } catch (logError) {
        console.error('Failed to log processing error:', logError);
      }
    }

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input', details: error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to process payroll' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/payroll/process
 * Get processing status for payrolls
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (session.user.userType !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
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

    // Get processing payrolls
    const processingPayrolls = await prisma.payroll.findMany({
      where: {
        employee: {
          organizationId,
        },
        status: 'processing',
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
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return NextResponse.json({
      processing: processingPayrolls.map((payroll) => ({
        id: payroll.id,
        employeeId: payroll.employeeId,
        employeeName: `${payroll.employee.firstName} ${payroll.employee.lastName}`,
        period: payroll.period,
        totalAmount: payroll.totalAmount.toString(),
        status: payroll.status,
        updatedAt: payroll.updatedAt.toISOString(),
      })),
      count: processingPayrolls.length,
    });
  } catch (error) {
    console.error('Error fetching processing status:', error);

    return NextResponse.json(
      { error: 'Failed to fetch processing status' },
      { status: 500 }
    );
  }
}
