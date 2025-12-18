import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { getCollection } from '@/lib/db';

// Maximum file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;
// Allowed image types
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
// Maximum custom backgrounds per user
const MAX_BACKGROUNDS = 20;
// Maximum Base64 size (approximately 7MB to allow for Base64 overhead)
const MAX_BASE64_SIZE = 7 * 1024 * 1024;

interface CustomBackground {
  id: string;
  url: string; // This will be a Base64 data URL
  name: string;
  createdAt: number;
}

// Compress image using canvas (run on server with node-canvas or send to client)
async function compressImageToBase64(buffer: Buffer, mimeType: string): Promise<string> {
  // Convert buffer to base64
  const base64 = buffer.toString('base64');
  const dataUrl = `data:${mimeType};base64,${base64}`;
  
  // If already small enough, return as-is
  if (base64.length <= MAX_BASE64_SIZE) {
    return dataUrl;
  }
  
  // For server-side compression, we'd need sharp or similar
  // For now, return the image but it may be rejected if too large
  return dataUrl;
}

// POST - Upload a new background image (stored as Base64 in database)
export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Please login to upload custom backgrounds' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('image') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload JPEG, PNG, WebP, or GIF' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB' },
        { status: 400 }
      );
    }

    const preferencesCollection = await getCollection('user_preferences');

    // Get existing custom backgrounds
    const preferences: any = await preferencesCollection.findOne({ user_id: userId }) as any;

    let existingBackgrounds: CustomBackground[] = [];
    if (preferences?.custom_backgrounds) {
      existingBackgrounds = typeof preferences.custom_backgrounds === 'string' 
        ? JSON.parse(preferences.custom_backgrounds)
        : preferences.custom_backgrounds;
    }

    // Check limit
    if (existingBackgrounds.length >= MAX_BACKGROUNDS) {
      return NextResponse.json(
        { error: `Maximum ${MAX_BACKGROUNDS} custom backgrounds allowed. Please delete one first.` },
        { status: 400 }
      );
    }

    // Convert file to Base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64DataUrl = await compressImageToBase64(buffer, file.type);
    
    // Check final Base64 size
    if (base64DataUrl.length > MAX_BASE64_SIZE) {
      return NextResponse.json(
        { error: 'Image too large after processing. Please use a smaller image (max 5MB)' },
        { status: 400 }
      );
    }

    // Generate unique ID
    const timestamp = Date.now();
    const newBackground: CustomBackground = {
      id: `custom_${timestamp}`,
      url: base64DataUrl, // Store Base64 data URL directly
      name: file.name.replace(/\.[^/.]+$/, '').substring(0, 20) || 'Custom',
      createdAt: timestamp,
    };

    // Update database
    const updatedBackgrounds = [...existingBackgrounds, newBackground];
    
    // Upsert preferences
    await preferencesCollection.updateOne(
      { user_id: userId },
      {
        $set: {
          custom_backgrounds: updatedBackgrounds,
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
      background: newBackground,
      total: updatedBackgrounds.length,
    });

  } catch (error) {
    console.error('Upload background error:', error);
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    );
  }
}

// GET - Get all custom backgrounds for user
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    
    if (!userId) {
      return NextResponse.json({ backgrounds: [] });
    }

    const preferencesCollection = await getCollection('user_preferences');
    const preferences: any = await preferencesCollection.findOne({ user_id: userId }) as any;

    let backgrounds: CustomBackground[] = [];
    if (preferences?.custom_backgrounds) {
      backgrounds = typeof preferences.custom_backgrounds === 'string'
        ? JSON.parse(preferences.custom_backgrounds)
        : preferences.custom_backgrounds;
    }

    return NextResponse.json({ backgrounds });

  } catch (error) {
    console.error('Get backgrounds error:', error);
    return NextResponse.json({ backgrounds: [] });
  }
}

// DELETE - Delete a custom background
export async function DELETE(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { backgroundId } = await request.json();
    
    if (!backgroundId) {
      return NextResponse.json(
        { error: 'Background ID required' },
        { status: 400 }
      );
    }

    const preferencesCollection = await getCollection('user_preferences');
    const preferences: any = await preferencesCollection.findOne({ user_id: userId }) as any;

    if (!preferences?.custom_backgrounds) {
      return NextResponse.json(
        { error: 'Background not found' },
        { status: 404 }
      );
    }

    const backgrounds: CustomBackground[] = typeof preferences.custom_backgrounds === 'string'
      ? JSON.parse(preferences.custom_backgrounds)
      : preferences.custom_backgrounds;

    const backgroundToDelete = backgrounds.find(bg => bg.id === backgroundId);
    
    if (!backgroundToDelete) {
      return NextResponse.json(
        { error: 'Background not found' },
        { status: 404 }
      );
    }

    // Update database (no file to delete - it's all in database!)
    const updatedBackgrounds = backgrounds.filter(bg => bg.id !== backgroundId);
    
    await preferencesCollection.updateOne(
      { user_id: userId },
      { $set: { custom_backgrounds: updatedBackgrounds, updated_at: new Date() } }
    );

    return NextResponse.json({
      success: true,
      remaining: updatedBackgrounds.length,
    });

  } catch (error) {
    console.error('Delete background error:', error);
    return NextResponse.json(
      { error: 'Failed to delete background' },
      { status: 500 }
    );
  }
}
