// import { NextRequest, NextResponse } from 'next/server';
// import { getCollection } from '@/lib/db';
// import { getUserIdFromRequest } from '@/lib/auth';

// // ============================================================================
// // Types
// // ============================================================================

// interface CustomBackground {
//   id: string;
//   url: string;
//   name: string;
// }

// interface AllPreferencesResponse {
//   selectedCategories: string[];
//   themeId: string;
//   fontId: string;
//   backgroundId: string;
//   customBackgrounds: CustomBackground[];
// }

// // ============================================================================
// // Constants
// // ============================================================================

// const DEFAULTS: AllPreferencesResponse = {
//   selectedCategories: [],
//   themeId: 'default',
//   fontId: 'elegant',
//   backgroundId: 'none',
//   customBackgrounds: [],
// };

// // ============================================================================
// // Helpers
// // ============================================================================

// function parseJsonField<T>(field: string | T[] | undefined): T[] {
//   if (!field) return [];
//   if (typeof field === 'string') {
//     try {
//       return JSON.parse(field);
//     } catch {
//       return [];
//     }
//   }
//   return field;
// }

// // ============================================================================
// // GET - Fetch all preferences in single call
// // ============================================================================

// export async function GET(request: NextRequest) {
//   try {
//     const userId = getUserIdFromRequest(request);
    
//     if (!userId) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//     }

//     const collection = await getCollection('user_preferences');
//     const prefs: any = await collection.findOne({ user_id: userId });

//     if (!prefs) {
//       return NextResponse.json(DEFAULTS);
//     }

//     return NextResponse.json({
//       selectedCategories: parseJsonField(prefs.selected_categories),
//       themeId: prefs.card_theme_id || DEFAULTS.themeId,
//       fontId: prefs.card_font_id || DEFAULTS.fontId,
//       backgroundId: prefs.card_background_id || DEFAULTS.backgroundId,
//       customBackgrounds: parseJsonField(prefs.custom_backgrounds),
//     });
//   } catch (error) {
//     console.error('Get all preferences error:', error);
//     return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
//   }
// }

// // ============================================================================
// // POST - Save preferences (partial updates supported)
// // ============================================================================

// export async function POST(request: NextRequest) {
//   try {
//     const userId = getUserIdFromRequest(request);
    
//     if (!userId) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//     }

//     const body = await request.json();
//     const { selectedCategories, themeId, fontId, backgroundId } = body;

//     // Build update with only provided fields
//     const updates: Record<string, unknown> = { updated_at: new Date() };

//     if (selectedCategories !== undefined) {
//       if (!Array.isArray(selectedCategories)) {
//         return NextResponse.json({ error: 'selectedCategories must be an array' }, { status: 400 });
//       }
//       updates.selected_categories = selectedCategories;
//     }

//     if (themeId !== undefined) updates.card_theme_id = themeId;
//     if (fontId !== undefined) updates.card_font_id = fontId;
//     if (backgroundId !== undefined) updates.card_background_id = backgroundId || 'none';

//     const collection = await getCollection('user_preferences');

//     await collection.updateOne(
//       { user_id: userId },
//       {
//         $set: updates,
//         $setOnInsert: { user_id: userId, created_at: new Date() },
//       },
//       { upsert: true }
//     );

//     return NextResponse.json({ success: true, ...body });
//   } catch (error) {
//     console.error('Save all preferences error:', error);
//     return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
//   }
// }


import { NextRequest, NextResponse } from 'next/server';
import { getCollection, toObjectId } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';

// ============================================================================
// Types
// ============================================================================

interface CustomBackground {
  id: string;
  url: string;
  name: string;
}

interface AllPreferencesResponse {
  selectedCategories: string[];
  themeId: string;
  fontId: string;
  backgroundId: string;
  customBackgrounds: CustomBackground[];
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULTS: AllPreferencesResponse = {
  selectedCategories: [],
  themeId: 'default',
  fontId: 'elegant',
  backgroundId: 'none',
  customBackgrounds: [],
};

// ============================================================================
// Helpers
// ============================================================================

function parseJsonField<T>(field: string | T[] | undefined): T[] {
  if (!field) return [];
  if (typeof field === 'string') {
    try {
      return JSON.parse(field);
    } catch {
      return [];
    }
  }
  return field;
}

// ============================================================================
// GET - Optimized version with projection and early returns
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const collection = await getCollection('user_preferences');
    
    // Use projection to fetch only needed fields (faster query)
    const prefs: any = await collection.findOne(
      { user_id: userId },
      {
        projection: {
          selected_categories: 1,
          card_theme_id: 1,
          card_font_id: 1,
          card_background_id: 1,
          custom_backgrounds: 1,
          _id: 0 // Exclude _id for smaller payload
        }
      }
    );

    // Early return with defaults if no preferences
    if (!prefs) {
      return NextResponse.json(DEFAULTS);
    }

    // Build response object
    const response: AllPreferencesResponse = {
      selectedCategories: parseJsonField(prefs.selected_categories),
      themeId: prefs.card_theme_id || DEFAULTS.themeId,
      fontId: prefs.card_font_id || DEFAULTS.fontId,
      backgroundId: prefs.card_background_id || DEFAULTS.backgroundId,
      customBackgrounds: parseJsonField(prefs.custom_backgrounds),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Get all preferences error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================================================
// POST - Optimized with batch operations
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { selectedCategories, themeId, fontId, backgroundId, markOnboardingComplete } = body;

    // Validate early
    if (selectedCategories !== undefined && !Array.isArray(selectedCategories)) {
      return NextResponse.json({ error: 'selectedCategories must be an array' }, { status: 400 });
    }

    // Build update object more efficiently
    const updates: Record<string, unknown> = { updated_at: new Date() };

    if (selectedCategories !== undefined) updates.selected_categories = selectedCategories;
    if (themeId !== undefined) updates.card_theme_id = themeId;
    if (fontId !== undefined) updates.card_font_id = fontId;
    if (backgroundId !== undefined) updates.card_background_id = backgroundId || 'none';

    const collection = await getCollection('user_preferences');

    await collection.updateOne(
      { user_id: userId },
      {
        $set: updates,
        $setOnInsert: { user_id: userId, created_at: new Date() },
      },
      { upsert: true }
    );

    // Mark onboarding as complete in users collection if requested
    if (markOnboardingComplete) {
      const usersCollection = await getCollection('users');
      await usersCollection.updateOne(
        { _id: toObjectId(userId) as any },
        { $set: { onboarding_complete: true } }
      );
    }

    return NextResponse.json({ success: true, ...body });
  } catch (error) {
    console.error('Save all preferences error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}