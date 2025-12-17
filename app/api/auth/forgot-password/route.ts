import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
import crypto from 'crypto';
import { sendEmail } from '@/lib/email';
import { passwordResetEmailTemplate, passwordResetEmailText } from '@/lib/email-templates';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const usersCollection = await getCollection('users');

    // Find user
    const user: any = await usersCollection.findOne({ email }) as any;

    // Always return success message for security (don't reveal if email exists)
    if (!user) {
      return NextResponse.json(
        { 
          message: 'Password reset email sent! 📧',
          instructions: 'Check your inbox and click the reset link to update your password. The link will expire in 1 hour.'
        },
        { status: 200 }
      );
    }

    // Check if user signed up with Google only (has google_id but no password)
    if (user.google_id && !user.password) {
      return NextResponse.json(
        { error: 'This account is linked with Google Sign-In. You cannot set a password. Please continue using Google to sign in.' },
        { status: 400 }
      );
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date();
    resetExpires.setHours(resetExpires.getHours() + 1); // Token expires in 1 hour

    // Store reset token in database
    await usersCollection.updateOne(
      { _id: user._id },
      { $set: { password_reset_token: resetToken, password_reset_expires: resetExpires } }
    );

    // Build reset link
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const resetLink = `${appUrl}/reset-password?token=${resetToken}`;

    // Send password reset email
    const html = passwordResetEmailTemplate(user.name, resetLink, appUrl);
    const text = passwordResetEmailText(user.name, resetLink, appUrl);

    const emailResult = await sendEmail({
      to: user.email,
      subject: '🔐 Reset Your QuoteSwipe Password',
      html,
      text,
    });

    if (!emailResult.success) {
      console.error('Failed to send password reset email:', emailResult.error);
      return NextResponse.json(
        { error: 'Failed to send reset email. Please try again later.' },
        { status: 500 }
      );
    }

    console.log(`Password reset email sent to ${user.email}`);

    return NextResponse.json(
      { 
        message: 'Password reset email sent! 📧',
        instructions: 'Check your inbox and click the reset link to update your password. The link will expire in 1 hour.'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
