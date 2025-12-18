import { NextRequest, NextResponse } from 'next/server';
import { getCollection, toObjectId } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';

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
    const user: any = await usersCollection.findOne({ _id: toObjectId(userId) as any });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Build response object
    const userResponse = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role || 'user',
      created_at: user.created_at,
      profile_picture: user.profile_picture,
      auth_provider: user.google_id ? 'google' : 'email',
    };
    
    return NextResponse.json({ 
      user: userResponse,
      onboarding_complete: user.onboarding_complete ?? true  // Default true for existing users
    }, { status: 200 });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
