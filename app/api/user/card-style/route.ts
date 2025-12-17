import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
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

    const preferencesCollection = await getCollection('user_preferences');
    const preferences: any = await preferencesCollection.findOne({ user_id: userId }) as any;

    if (preferences) {
      // Parse custom_backgrounds if it exists
      let customBackgrounds = [];
      if (preferences.custom_backgrounds) {
        customBackgrounds = typeof preferences.custom_backgrounds === 'string'
          ? JSON.parse(preferences.custom_backgrounds)
          : preferences.custom_backgrounds;
      }

      return NextResponse.json({
        themeId: preferences.card_theme_id || 'default',
        fontId: preferences.card_font_id || 'elegant',
        backgroundId: preferences.card_background_id || 'none',
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

    const preferencesCollection = await getCollection('user_preferences');

    // Upsert preferences
    await preferencesCollection.updateOne(
      { user_id: userId },
      {
        $set: {
          card_theme_id: themeId,
          card_font_id: fontId,
          card_background_id: backgroundId || 'none',
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
