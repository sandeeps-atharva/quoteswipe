import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';

// GET - Fetch user's theme preference
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const [preferences] = await pool.execute(
      `SELECT theme_mode FROM user_preferences WHERE user_id = ?`,
      [userId]
    ) as any[];

    if (Array.isArray(preferences) && preferences.length > 0 && preferences[0].theme_mode) {
      return NextResponse.json({
        theme: preferences[0].theme_mode,
      });
    }

    // Return default if no preference found
    return NextResponse.json({
      theme: 'light',
    });

  } catch (error) {
    console.error('Get theme preference error:', error);
    return NextResponse.json(
      { error: 'Failed to get theme preference' },
      { status: 500 }
    );
  }
}

// POST - Save user's theme preference
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { theme } = await request.json();

    // Validate theme value
    if (theme !== 'light' && theme !== 'dark') {
      return NextResponse.json(
        { error: 'Invalid theme value. Must be "light" or "dark"' },
        { status: 400 }
      );
    }

    // Check if user already has preferences
    const [existing] = await pool.execute(
      `SELECT id FROM user_preferences WHERE user_id = ?`,
      [userId]
    ) as any[];

    if (Array.isArray(existing) && existing.length > 0) {
      // Update existing preferences
      await pool.execute(
        `UPDATE user_preferences SET theme_mode = ?, updated_at = NOW() WHERE user_id = ?`,
        [theme, userId]
      );
    } else {
      // Insert new preferences
      await pool.execute(
        `INSERT INTO user_preferences (user_id, theme_mode, created_at, updated_at) VALUES (?, ?, NOW(), NOW())`,
        [userId, theme]
      );
    }

    return NextResponse.json({
      success: true,
      theme,
    });

  } catch (error) {
    console.error('Save theme preference error:', error);
    return NextResponse.json(
      { error: 'Failed to save theme preference' },
      { status: 500 }
    );
  }
}

