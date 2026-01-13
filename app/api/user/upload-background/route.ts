import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { getCollection } from '@/lib/db';
import sharp from 'sharp';

// Maximum file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;
// Allowed image types
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
// Maximum custom backgrounds per user (synced with frontend CardCustomization.tsx)
const MAX_BACKGROUNDS = 100;
// Maximum Base64 size (approximately 500KB after compression)
const MAX_BASE64_SIZE = 500 * 1024;
// Compression settings
const MAX_WIDTH = 1200;
const MAX_HEIGHT = 1600;
const COMPRESSION_QUALITY = 80;

interface CustomBackground {
  id: string;
  url: string; // This will be a Base64 data URL
  name: string;
  createdAt: number;
}

/**
 * Compress image using sharp
 * - Resizes to max 1200x1600
 * - Converts to WebP (smallest size) or JPEG
 * - Uses 80% quality
 * - Returns Base64 data URL
 */
async function compressImageToBase64(buffer: Buffer, mimeType: string): Promise<string> {
  try {
    // Get image metadata
    const metadata = await sharp(buffer).metadata();
    const originalWidth = metadata.width || 0;
    const originalHeight = metadata.height || 0;
    
    // Calculate new dimensions (maintain aspect ratio)
    let width = originalWidth;
    let height = originalHeight;
    
    if (width > MAX_WIDTH) {
      height = Math.round((height * MAX_WIDTH) / width);
      width = MAX_WIDTH;
    }
    if (height > MAX_HEIGHT) {
      width = Math.round((width * MAX_HEIGHT) / height);
      height = MAX_HEIGHT;
    }
    
    // Try WebP first (smaller file size)
    let compressedBuffer: Buffer;
    let outputMimeType: string;
    
    try {
      compressedBuffer = await sharp(buffer)
        .resize(width, height, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: COMPRESSION_QUALITY })
        .toBuffer();
      outputMimeType = 'image/webp';
    } catch {
      // Fallback to JPEG if WebP fails
      compressedBuffer = await sharp(buffer)
        .resize(width, height, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: COMPRESSION_QUALITY })
        .toBuffer();
      outputMimeType = 'image/jpeg';
    }
    
    // Convert to Base64
    const base64 = compressedBuffer.toString('base64');
    const dataUrl = `data:${outputMimeType};base64,${base64}`;
  
    // Log compression results
    const originalKB = (buffer.length / 1024).toFixed(1);
    const compressedKB = (compressedBuffer.length / 1024).toFixed(1);
    const reduction = (((buffer.length - compressedBuffer.length) / buffer.length) * 100).toFixed(0);
    console.log(`[Server] Image compressed: ${originalKB}KB → ${compressedKB}KB (${reduction}% smaller)`);
    
    return dataUrl;
  } catch (error) {
    console.error('Server compression error:', error);
    // Fallback: return original as Base64
    const base64 = buffer.toString('base64');
    return `data:${mimeType};base64,${base64}`;
  }
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

    return NextResponse.json(
      { backgrounds },
      {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );

  } catch (error) {
    console.error('Get backgrounds error:', error);
    return NextResponse.json(
      { backgrounds: [] },
      {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
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
