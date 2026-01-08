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

    // Build filter
    const matchStage: any = {};
    if (search) {
      matchStage.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Get total count first (for pagination)
    const total = await usersCollection.countDocuments(matchStage);

    // Single aggregation with $lookup - replaces 3 separate queries
    const formattedUsers = await usersCollection.aggregate([
      // Match filter
      { $match: matchStage },
      { $sort: { created_at: -1 } },
      { $skip: skip },
      { $limit: limit },
      
      // Add string version of _id for lookups
      { $addFields: { userIdStr: { $toString: '$_id' } } },
      
      // Lookup likes count
      {
        $lookup: {
          from: 'user_likes',
          let: { odId: '$_id', odIdStr: '$userIdStr' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ['$user_id', '$$odId'] },
                    { $eq: ['$user_id', '$$odIdStr'] }
                  ]
                }
              }
            },
            { $count: 'count' }
          ],
          as: 'likesData'
        }
      },
      
      // Lookup saved count
      {
        $lookup: {
          from: 'user_saved',
          let: { odId: '$_id', odIdStr: '$userIdStr' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ['$user_id', '$$odId'] },
                    { $eq: ['$user_id', '$$odIdStr'] }
                  ]
                }
              }
            },
            { $count: 'count' }
          ],
          as: 'savedData'
        }
      },
      
      // Project final shape (same as before)
      {
        $project: {
          id: { $toString: '$_id' },
          name: 1,
          email: 1,
          role: { $ifNull: ['$role', 'user'] },
          created_at: 1,
          likes_count: { $ifNull: [{ $arrayElemAt: ['$likesData.count', 0] }, 0] },
          saved_count: { $ifNull: [{ $arrayElemAt: ['$savedData.count', 0] }, 0] }
        }
      }
    ]).toArray() as any[];

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
