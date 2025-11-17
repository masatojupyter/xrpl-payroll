import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '@/../prisma/client';
import { sendVerificationEmail } from '@/lib/mail';

// Validation schema
const registerSchema = z.object({
  email: z
    .string()
    .email('Please enter a valid email address')
    .min(1, 'Email address is required')
    .toLowerCase()
    .trim(),
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name must be 50 characters or less')
    .trim(),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be 50 characters or less')
    .trim(),
  phoneNumber: z
    .string()
    .min(1, 'Phone number is required')
    .regex(/^[0-9-]+$/, 'Please enter a valid phone number')
    .trim(),
  address: z
    .string()
    .min(1, 'Address is required')
    .max(200, 'Address must be 200 characters or less')
    .trim(),
  companyName: z
    .string()
    .min(1, 'Company name is required')
    .max(100, 'Company name must be 100 characters or less')
    .trim()
    .optional(),
});

/**
 * Admin Account Registration API
 * POST /api/auth/register
 */
export async function POST(request: NextRequest) {
  try {
    // Get request body
    const body = await request.json();

    // Validation
    const validationResult = registerSchema.safeParse(body);
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

    const { email, firstName, lastName, phoneNumber, address, companyName } = validationResult.data;

    // Check for duplicate
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          error: 'This email address is already registered',
        },
        { status: 409 }
      );
    }

    // Generate verification token (32-byte random token)
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    // Token expiry (24 hours from now)
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 24);

    // Generate username (use part before @ in email)
    const username = email.split('@')[0];

    // Determine organization name (use company name if provided, otherwise use default)
    const organizationName = companyName || `${firstName} ${lastName}'s Organization`;

    // Create organization and user together
    const newUser = await prisma.user.create({
      data: {
        email,
        password: '', // Empty string as password will be set after verification
        firstName,
        lastName,
        phoneNumber,
        address,
        companyName: companyName || null,
        verificationToken,
        tokenExpiry,
        role: 'admin', // Register as admin account
        emailVerified: null, // null as email is not verified yet
        organization: {
          create: {
            name: organizationName,
          },
        },
      },
      include: {
        organization: true,
      },
    });

    // Send verification email
    try {
      await sendVerificationEmail({
        to: email,
        token: verificationToken,
        username,
      });
    } catch (emailError) {
      console.error('Verification email sending error:', emailError);
      
      // If email sending fails, delete the created user
      await prisma.user.delete({
        where: { id: newUser.id },
      });

      return NextResponse.json(
        {
          error: 'Failed to send verification email. Please try again.',
        },
        { status: 500 }
      );
    }

    // Success response
    return NextResponse.json(
      {
        message: 'Registration completed. A confirmation email has been sent. Please complete email verification.',
        user: {
          id: newUser.id,
          email: newUser.email,
          companyName: newUser.companyName,
          role: newUser.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);

    // Database errors or other unexpected errors
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
