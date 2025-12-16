import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';

// GET user preferences (including selected categories)
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const [rows] = await pool.execute(
      'SELECT selected_categories FROM user_preferences WHERE user_id = ?',
      [userId]
    ) as any[];

    if (rows.length === 0) {
      // No preferences saved yet
      return NextResponse.json({
        selectedCategories: [],
      });
    }

    const preferences = rows[0];
    let selectedCategories: string[] = [];

    // Parse JSON if it's stored as a string
    if (preferences.selected_categories) {
      if (typeof preferences.selected_categories === 'string') {
        selectedCategories = JSON.parse(preferences.selected_categories);
      } else {
        selectedCategories = preferences.selected_categories;
      }
    }

    return NextResponse.json({
      selectedCategories,
    });
  } catch (error) {
    console.error('Get user preferences error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST/PUT user preferences (save selected categories)
export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { selectedCategories } = body;

    if (!Array.isArray(selectedCategories)) {
      return NextResponse.json(
        { error: 'selectedCategories must be an array' },
        { status: 400 }
      );
    }

    // Use INSERT ... ON DUPLICATE KEY UPDATE for upsert behavior
    await pool.execute(
      `INSERT INTO user_preferences (user_id, selected_categories) 
       VALUES (?, ?) 
       ON DUPLICATE KEY UPDATE selected_categories = VALUES(selected_categories), updated_at = CURRENT_TIMESTAMP`,
      [userId, JSON.stringify(selectedCategories)]
    );

    return NextResponse.json({
      success: true,
      selectedCategories,
    });
  } catch (error) {
    console.error('Save user preferences error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

