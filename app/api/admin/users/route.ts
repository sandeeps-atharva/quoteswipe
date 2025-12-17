import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

// GET /api/admin/users - Get all users (admin only)
export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    const usersCollection = await getCollection('users');
    const likesCollection = await getCollection('user_likes');
    const savedCollection = await getCollection('user_saved');

    // Build filter
    let filter = {};
    if (search) {
      filter = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      };
    }

    // Get users
    const users = await usersCollection
      .find(filter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .toArray() as any[];

    // Get total count
    const total = await usersCollection.countDocuments(filter);

    // Get likes and saved counts for each user
    const userIds = users.map((u: any) => u._id.toString());
    
    const likesCounts = await likesCollection.aggregate([
      { $match: { user_id: { $in: userIds } } },
      { $group: { _id: '$user_id', count: { $sum: 1 } } }
    ]).toArray() as any[];
    const likesMap = new Map(likesCounts.map((l: any) => [l._id, l.count]));

    const savedCounts = await savedCollection.aggregate([
      { $match: { user_id: { $in: userIds } } },
      { $group: { _id: '$user_id', count: { $sum: 1 } } }
    ]).toArray() as any[];
    const savedMap = new Map(savedCounts.map((s: any) => [s._id, s.count]));

    const formattedUsers = users.map((u: any) => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.role || 'user',
      created_at: u.created_at,
      likes_count: likesMap.get(u._id.toString()) || 0,
      saved_count: savedMap.get(u._id.toString()) || 0
    }));

    return NextResponse.json({
      users: formattedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
