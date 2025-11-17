import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/../../prisma/client';
import { sendPasswordResetEmail } from '@/lib/mail';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Please enter your email address' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Always return success to prevent email enumeration
    // Even if user doesn't exist, we pretend to send email
    if (!user) {
      return NextResponse.json({
        message: 'Password reset email has been sent',
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 1); // Token expires in 1 hour

    // Update user with reset token
    await prisma.user.update({
      where: { email: email.toLowerCase() },
      data: {
        verificationToken: resetToken,
        tokenExpiry: tokenExpiry,
      },
    });

    // Send password reset email
    await sendPasswordResetEmail({
      to: email,
      token: resetToken,
      username: user.companyName || user.email,
    });

    return NextResponse.json({
      message: 'Password reset email has been sent',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Failed to process password reset request' },
      { status: 500 }
    );
  }
}
