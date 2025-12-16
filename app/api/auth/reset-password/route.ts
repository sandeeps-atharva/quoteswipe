import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and password are required' },
        { status: 400 }
      );
    }

    // Find user with valid reset token
    const [users] = await pool.execute(
      'SELECT id, google_id, password FROM users WHERE password_reset_token = ? AND password_reset_expires > NOW()',
      [token]
    ) as any[];

    if (!Array.isArray(users) || users.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    const user = users[0];

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
    await pool.execute(
      'UPDATE users SET password = ?, password_reset_token = NULL, password_reset_expires = NULL WHERE id = ?',
      [hashedPassword, user.id]
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

