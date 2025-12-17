import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
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

    const preferencesCollection = await getCollection('user_preferences');
    const preferences: any = await preferencesCollection.findOne({ user_id: userId }) as any;

    if (preferences?.theme_mode) {
      return NextResponse.json({
        theme: preferences.theme_mode,
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

    const preferencesCollection = await getCollection('user_preferences');

    // Upsert preferences
    await preferencesCollection.updateOne(
      { user_id: userId },
      {
        $set: {
          theme_mode: theme,
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
