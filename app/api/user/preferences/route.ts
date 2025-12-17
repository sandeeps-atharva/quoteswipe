import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
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

    const preferencesCollection = await getCollection('user_preferences');
    const preferences: any = await preferencesCollection.findOne({ user_id: userId }) as any;

    if (!preferences) {
      // No preferences saved yet
      return NextResponse.json({
        selectedCategories: [],
      });
    }

    let selectedCategories: string[] = [];

    // Parse if it's stored as a string
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

    const preferencesCollection = await getCollection('user_preferences');

    // Upsert preferences
    await preferencesCollection.updateOne(
      { user_id: userId },
      {
        $set: {
          selected_categories: selectedCategories,
          updated_at: new Date()
        },
        $setOnInsert: {
          user_id: userId,
          created_at: new Date()
        }
      },
      { upsert: true }
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
