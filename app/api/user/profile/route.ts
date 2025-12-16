import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';

// GET user profile with stats
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user details
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
    delete user.google_id; // Don't expose to client

    // Get user stats
    const [likedCount] = await pool.execute(
      'SELECT COUNT(*) as count FROM user_likes WHERE user_id = ?',
      [userId]
    ) as any[];

    const [dislikedCount] = await pool.execute(
      'SELECT COUNT(*) as count FROM user_dislikes WHERE user_id = ?',
      [userId]
    ) as any[];

    const [savedCount] = await pool.execute(
      'SELECT COUNT(*) as count FROM user_saved WHERE user_id = ?',
      [userId]
    ) as any[];

    const stats = {
      liked: likedCount[0]?.count || 0,
      disliked: dislikedCount[0]?.count || 0,
      saved: savedCount[0]?.count || 0,
    };

    return NextResponse.json({
      user,
      stats,
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT update user profile
export async function PUT(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name } = body;

    // Validate name
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Name must be at least 2 characters' },
        { status: 400 }
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        { error: 'Name must be less than 100 characters' },
        { status: 400 }
      );
    }

    // Update user name
    await pool.execute(
      'UPDATE users SET name = ? WHERE id = ?',
      [name.trim(), userId]
    );

    // Fetch updated user
    const [users] = await pool.execute(
      `SELECT 
        id, name, email, 
        COALESCE(role, 'user') as role, 
        created_at,
        profile_picture,
        CASE 
          WHEN google_id IS NOT NULL THEN 'google'
          ELSE 'email'
        END as auth_provider
      FROM users WHERE id = ?`,
      [userId]
    ) as any[];

    return NextResponse.json({
      success: true,
      user: users[0],
    });
  } catch (error) {
    console.error('Update user profile error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

