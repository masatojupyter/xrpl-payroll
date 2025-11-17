import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/../prisma/client';

// Validation schema
const setPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be 100 characters or less')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  confirmPassword: z.string().min(1, 'Password confirmation is required'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

/**
 * Password Setup API
 * POST /api/auth/set-password
 * 
 * Supports password setup for both User and Employee
 */
export async function POST(request: NextRequest) {
  try {
    // Get request body
    const body = await request.json();

    // Validation
    const validationResult = setPasswordSchema.safeParse(body);
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

    const { token, password } = validationResult.data;

    // Hash password (using bcryptjs)
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // First search as User token
    const user = await prisma.user.findUnique({
      where: { verificationToken: token },
    });

    if (user) {
      // Process for User
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
            error: 'This account is already activated',
          },
          { status: 400 }
        );
      }

      // Update user record
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          emailVerified: new Date(), // Set email verification completion date/time
          verificationToken: null, // Clear token
          tokenExpiry: null, // Clear expiry
        },
      });

      // Success response
      return NextResponse.json(
        {
          message: 'Password setup completed. You can now log in.',
          type: 'user',
          user: {
            id: updatedUser.id,
            email: updatedUser.email,
            companyName: updatedUser.companyName,
            role: updatedUser.role,
            emailVerified: updatedUser.emailVerified,
          },
        },
        { status: 200 }
      );
    }

    // Search as Employee token
    const employee = await prisma.employee.findUnique({
      where: { invitationToken: token },
      include: {
        organization: true,
      },
    });

    if (employee) {
      // Process for Employee
      // Check token expiry
      if (!employee.invitationExpiry || new Date() > employee.invitationExpiry) {
        return NextResponse.json(
          {
            error: 'Token has expired',
          },
          { status: 400 }
        );
      }

      // If invitation is already accepted
      if (employee.isInvitationAccepted) {
        return NextResponse.json(
          {
            error: 'This invitation has already been accepted',
          },
          { status: 400 }
        );
      }

      // Update employee record
      const updatedEmployee = await prisma.employee.update({
        where: { id: employee.id },
        data: {
          password: hashedPassword,
          isInvitationAccepted: true, // Invitation acceptance completed
          invitationToken: null, // Clear token
          invitationExpiry: null, // Clear expiry
        },
      });

      // Success response
      return NextResponse.json(
        {
          message: 'Password setup completed. You can now log in.',
          type: 'employee',
          employee: {
            id: updatedEmployee.id,
            email: updatedEmployee.email,
            firstName: updatedEmployee.firstName,
            lastName: updatedEmployee.lastName,
            employeeCode: updatedEmployee.employeeCode,
            isInvitationAccepted: updatedEmployee.isInvitationAccepted,
            organization: {
              id: employee.organization.id,
              name: employee.organization.name,
            },
          },
        },
        { status: 200 }
      );
    }

    // If not found with either token
    return NextResponse.json(
      {
        error: 'Invalid token',
      },
      { status: 404 }
    );
  } catch (error) {
    console.error('Password setup error:', error);

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
