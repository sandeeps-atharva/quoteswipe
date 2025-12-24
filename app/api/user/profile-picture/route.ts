import { NextRequest, NextResponse } from 'next/server';
import { getCollection, toObjectId } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';

// Max file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;
// Allowed MIME types
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// PUT - Update profile picture (base64)
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
    const { profile_picture } = body;

    // Validate profile picture
    if (!profile_picture) {
      return NextResponse.json(
        { error: 'Profile picture is required' },
        { status: 400 }
      );
    }

    // Check if it's a valid base64 data URL
    if (typeof profile_picture === 'string') {
      // Allow external URLs (like Google profile pictures)
      if (profile_picture.startsWith('http://') || profile_picture.startsWith('https://')) {
        // External URL is fine
      } else if (profile_picture.startsWith('data:image/')) {
        // Base64 validation
        const matches = profile_picture.match(/^data:([^;]+);base64,(.+)$/);
        if (!matches) {
          return NextResponse.json(
            { error: 'Invalid image format' },
            { status: 400 }
          );
        }

        const mimeType = matches[1];
        const base64Data = matches[2];

        // Check MIME type
        if (!ALLOWED_TYPES.includes(mimeType)) {
          return NextResponse.json(
            { error: 'Only JPEG, PNG, GIF, and WebP images are allowed' },
            { status: 400 }
          );
        }

        // Check file size (base64 is ~33% larger than binary)
        const estimatedSize = (base64Data.length * 3) / 4;
        if (estimatedSize > MAX_FILE_SIZE) {
          return NextResponse.json(
            { error: 'Image size must be less than 5MB' },
            { status: 400 }
          );
        }
      } else {
        return NextResponse.json(
          { error: 'Invalid image URL or format' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Profile picture must be a string' },
        { status: 400 }
      );
    }

    const usersCollection = await getCollection('users');

    // Update user profile picture
    await usersCollection.updateOne(
      { _id: toObjectId(userId) as any },
      { $set: { profile_picture } }
    );

    // Fetch updated user
    const user: any = await usersCollection.findOne({ _id: toObjectId(userId) as any });

    const userResponse = {
      id: user?._id.toString(),
      name: user?.name,
      email: user?.email,
      role: user?.role || 'user',
      created_at: user?.created_at,
      profile_picture: user?.profile_picture,
      auth_provider: user?.google_id ? 'google' : 'email',
    };

    return NextResponse.json({
      success: true,
      user: userResponse,
    });
  } catch (error) {
    console.error('Update profile picture error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Remove profile picture
export async function DELETE(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const usersCollection = await getCollection('users');

    // Remove profile picture (set to null)
    await usersCollection.updateOne(
      { _id: toObjectId(userId) as any },
      { $set: { profile_picture: null } }
    );

    // Fetch updated user
    const user: any = await usersCollection.findOne({ _id: toObjectId(userId) as any });

    const userResponse = {
      id: user?._id.toString(),
      name: user?.name,
      email: user?.email,
      role: user?.role || 'user',
      created_at: user?.created_at,
      profile_picture: user?.profile_picture,
      auth_provider: user?.google_id ? 'google' : 'email',
    };

    return NextResponse.json({
      success: true,
      user: userResponse,
    });
  } catch (error) {
    console.error('Delete profile picture error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

