import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getWalletBalance } from '@/lib/xrp/testnet-client';
import { prisma } from '@/../../prisma/client';
import { z } from 'zod';

// Validation schema for POST request
const walletBalanceRequestSchema = z.object({
  walletAddress: z
    .string()
    .min(1, 'Wallet address is required')
    .regex(
      /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/,
      'Invalid XRP wallet address format'
    ),
});

/**
 * GET /api/xrp/wallet-balance
 * Get XRP wallet balance for authenticated employee
 */
export async function GET() {
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
        { error: { message: 'Forbidden - Employee access only', code: 'FORBIDDEN' } },
        { status: 403 }
      );
    }

    // Get employee record with wallet address
    const employee = await prisma.employee.findFirst({
      where: { email: session.user.email || '' },
      select: {
        id: true,
        walletAddress: true,
      },
    });

    if (!employee) {
      return NextResponse.json(
        { error: { message: 'Employee record not found', code: 'NOT_FOUND' } },
        { status: 404 }
      );
    }

    // Check if wallet address is registered
    if (!employee.walletAddress) {
      return NextResponse.json(
        {
          error: {
            message: 'Wallet address not registered',
            code: 'WALLET_NOT_REGISTERED',
          },
        },
        { status: 400 }
      );
    }

    // Get balance from XRP Ledger
    const balanceResult = await getWalletBalance(employee.walletAddress);

    if (balanceResult.error) {
      return NextResponse.json(
        {
          error: {
            message: balanceResult.error,
            code: 'BALANCE_RETRIEVAL_FAILED',
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      walletAddress: employee.walletAddress,
      balance: balanceResult.balance,
    });
  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    return NextResponse.json(
      {
        error: {
          message: 'Failed to fetch wallet balance',
          code: 'INTERNAL_ERROR',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/xrp/wallet-balance
 * Get XRP wallet balance for any wallet address (requires authentication)
 */
export async function POST(req: Request) {
  try {
    // Authentication check
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    
    let validatedData;
    try {
      validatedData = walletBalanceRequestSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: {
              message: 'Invalid wallet address format',
              code: 'VALIDATION_ERROR',
              details: error.issues,
            },
          },
          { status: 400 }
        );
      }
      throw error;
    }

    // Get balance from XRP Ledger
    const balanceResult = await getWalletBalance(validatedData.walletAddress);

    if (balanceResult.error) {
      return NextResponse.json(
        {
          error: {
            message: balanceResult.error,
            code: 'BALANCE_RETRIEVAL_FAILED',
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      walletAddress: validatedData.walletAddress,
      balance: balanceResult.balance,
    });
  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    return NextResponse.json(
      {
        error: {
          message: 'Failed to fetch wallet balance',
          code: 'INTERNAL_ERROR',
        },
      },
      { status: 500 }
    );
  }
}
