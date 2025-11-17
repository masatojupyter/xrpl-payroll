import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/../prisma/client';

// Validation schema
const verifySchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

/**
 * Email Verification API
 * POST /api/auth/verify
 */
export async function POST(request: NextRequest) {
  try {
    // Get request body
    const body = await request.json();

    // Validation
    const validationResult = verifySchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      return NextResponse.json(
        {
          error: 'Validation error',
          details: errors,
        },
        { status: 400 }
      );
    }

    const { token } = validationResult.data;

    // Find user by token
    const user = await prisma.user.findUnique({
      where: { verificationToken: token },
    });

    if (!user) {
      return NextResponse.json(
        {
          error: 'Invalid token',
        },
        { status: 404 }
      );
    }

    // Check token expiry
    if (!user.tokenExpiry || new Date() > user.tokenExpiry) {
      return NextResponse.json(
        {
          error: 'Token has expired',
        },
        { status: 400 }
      );
    }

    // If email is already verified
    if (user.emailVerified) {
      return NextResponse.json(
        {
          error: 'This email address is already verified',
        },
        { status: 400 }
      );
    }

    // Success response (return information to transition to password setup screen)
    return NextResponse.json(
      {
        message: 'Token verification successful',
        user: {
          id: user.id,
          email: user.email,
          companyName: user.companyName,
        },
        token: token, // Used for password setup
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Verification error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: 'Server error occurred',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

/**
 * GET requests are not allowed
 */
export async function GET() {
  return NextResponse.json(
    {
      error: 'This endpoint only supports POST requests',
    },
    { status: 405 }
  );
}
