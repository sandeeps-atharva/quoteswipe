import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getCollection } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and password are required' },
        { status: 400 }
      );
    }

    const usersCollection = await getCollection('users');

    // Find user with valid reset token
    const user: any = await usersCollection.findOne({
      password_reset_token: token,
      password_reset_expires: { $gt: new Date() as any }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    // Check if user signed up with Google only (has google_id but no password)
    if (user.google_id && !user.password) {
      return NextResponse.json(
        { error: 'This account is linked with Google Sign-In. You cannot set a password. Please continue using Google to sign in.' },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password and clear reset token
    await usersCollection.updateOne(
      { _id: user._id },
      { 
        $set: { password: hashedPassword },
        $unset: { password_reset_token: '', password_reset_expires: '' }
      }
    );

    return NextResponse.json(
      { message: 'Password has been reset successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
