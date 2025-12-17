import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';

// GET - Fetch user's card style preferences
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch card style preferences including background AND custom backgrounds
    const [preferences] = await pool.execute(
      `SELECT card_theme_id, card_font_id, card_background_id, custom_backgrounds FROM user_preferences WHERE user_id = ?`,
      [userId]
    ) as any[];

    if (Array.isArray(preferences) && preferences.length > 0) {
      // Parse custom_backgrounds if it exists
      let customBackgrounds = [];
      if (preferences[0].custom_backgrounds) {
        customBackgrounds = typeof preferences[0].custom_backgrounds === 'string'
          ? JSON.parse(preferences[0].custom_backgrounds)
          : preferences[0].custom_backgrounds;
      }

      return NextResponse.json({
        themeId: preferences[0].card_theme_id || 'default',
        fontId: preferences[0].card_font_id || 'elegant',
        backgroundId: preferences[0].card_background_id || 'none',
        customBackgrounds, // Include custom backgrounds in response
      });
    }

    // Return defaults if no preferences found
    return NextResponse.json({
      themeId: 'default',
      fontId: 'elegant',
      backgroundId: 'none',
      customBackgrounds: [],
    });

  } catch (error) {
    console.error('Get card style error:', error);
    return NextResponse.json(
      { error: 'Failed to get card style' },
      { status: 500 }
    );
  }
}

// POST - Save user's card style preferences
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { themeId, fontId, backgroundId } = await request.json();

    // Check if user already has preferences
    const [existing] = await pool.execute(
      `SELECT id FROM user_preferences WHERE user_id = ?`,
      [userId]
    ) as any[];

    if (Array.isArray(existing) && existing.length > 0) {
      // Update existing preferences
      await pool.execute(
        `UPDATE user_preferences SET card_theme_id = ?, card_font_id = ?, card_background_id = ?, updated_at = NOW() WHERE user_id = ?`,
        [themeId, fontId, backgroundId || 'none', userId]
      );
    } else {
      // Insert new preferences
      await pool.execute(
        `INSERT INTO user_preferences (user_id, card_theme_id, card_font_id, card_background_id, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())`,
        [userId, themeId, fontId, backgroundId || 'none']
      );
    }

    return NextResponse.json({
      success: true,
      themeId,
      fontId,
      backgroundId: backgroundId || 'none',
    });

  } catch (error) {
    console.error('Save card style error:', error);
    return NextResponse.json(
      { error: 'Failed to save card style' },
      { status: 500 }
    );
  }
}
