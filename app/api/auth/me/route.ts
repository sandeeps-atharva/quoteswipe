import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const [users] = await pool.execute(
      `SELECT 
        id, name, email, 
        COALESCE(role, 'user') as role, 
        created_at,
        profile_picture,
        google_id,
        CASE 
          WHEN google_id IS NOT NULL THEN 'google'
          ELSE 'email'
        END as auth_provider
      FROM users WHERE id = ?`,
      [userId]
    ) as any[];

    if (!Array.isArray(users) || users.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const user = users[0];
    // Don't expose google_id to client
    delete user.google_id;
    
    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

