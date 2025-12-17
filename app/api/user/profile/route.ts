import { NextRequest, NextResponse } from 'next/server';
import { getCollection, toObjectId } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';

// GET user profile with stats
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const usersCollection = await getCollection('users');
    const likesCollection = await getCollection('user_likes');
    const dislikesCollection = await getCollection('user_dislikes');
    const savedCollection = await getCollection('user_saved');

    // Get user details
    const user: any = await usersCollection.findOne({ _id: toObjectId(userId) as any });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Format user response
    const userResponse = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role || 'user',
      created_at: user.created_at,
      profile_picture: user.profile_picture,
      auth_provider: user.google_id ? 'google' : 'email',
    };

    // Get user stats
    const likedCount = await likesCollection.countDocuments({ user_id: userId });
    const dislikedCount = await dislikesCollection.countDocuments({ user_id: userId });
    const savedCount = await savedCollection.countDocuments({ user_id: userId });

    const stats = {
      liked: likedCount,
      disliked: dislikedCount,
      saved: savedCount,
    };

    return NextResponse.json({
      user: userResponse,
      stats,
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT update user profile
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
    const { name } = body;

    // Validate name
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Name must be at least 2 characters' },
        { status: 400 }
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        { error: 'Name must be less than 100 characters' },
        { status: 400 }
      );
    }

    const usersCollection = await getCollection('users');

    // Update user name
    await usersCollection.updateOne(
      { _id: toObjectId(userId) as any },
      { $set: { name: name.trim() } }
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
    console.error('Update user profile error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
