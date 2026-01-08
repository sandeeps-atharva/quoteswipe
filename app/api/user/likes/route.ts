import { NextRequest, NextResponse } from 'next/server';
import { getCollection, toObjectId } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { quoteId, customBackground } = await request.json();
    if (!quoteId) {
      return NextResponse.json(
        { error: 'Quote ID is required' },
        { status: 400 }
      );
    }

    const userLikesCollection = await getCollection('user_likes');
    const userDislikesCollection = await getCollection('user_dislikes');

    const userObjId = toObjectId(userId) as any;
    const quoteObjId = toObjectId(quoteId);

    // Check if user already liked this quote
    const existingLike: any = await userLikesCollection.findOne({
      user_id: userObjId,
      quote_id: quoteObjId
    });

    if (existingLike) {
      // Update background if provided and different
      if (customBackground && existingLike.custom_background !== customBackground) {
        await userLikesCollection.updateOne(
          { _id: existingLike._id },
          { $set: { custom_background: customBackground } }
        );
      }
      return NextResponse.json(
        { message: 'Quote already liked', alreadyLiked: true },
        { status: 200 }
      );
    }

    // Remove dislike if exists (mutual exclusivity)
    await userDislikesCollection.deleteOne({
      user_id: userObjId,
      quote_id: quoteObjId
    });

    // Insert like with custom background
    await userLikesCollection.insertOne({
      user_id: userObjId,
      quote_id: quoteObjId,
      custom_background: customBackground || null,
      created_at: new Date()
    } as any);

    return NextResponse.json({ message: 'Quote liked' }, { status: 200 });
  } catch (error: any) {
    // Handle duplicate key error
    if (error.code === 11000) {
      return NextResponse.json(
        { message: 'Quote already liked', alreadyLiked: true },
        { status: 200 }
      );
    }
    console.error('Like quote error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userLikesCollection = await getCollection('user_likes');

    // Single aggregation with $lookup - replaces 3 separate queries
    const result = await userLikesCollection.aggregate([
      // Match user's likes
      { $match: { user_id: toObjectId(userId) as any } },
      { $sort: { created_at: -1 } },
      
      // Lookup quote details
      {
        $lookup: {
          from: 'quotes',
          let: { quoteId: '$quote_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ['$_id', '$$quoteId'] },
                    { $eq: ['$id', { $toString: '$$quoteId' }] }
                  ]
                }
              }
            }
          ],
          as: 'quote'
        }
      },
      { $unwind: { path: '$quote', preserveNullAndEmptyArrays: false } },
      
      // Lookup category details
      {
        $lookup: {
          from: 'categories',
          let: { catId: '$quote.category_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ['$_id', '$$catId'] },
                    { $eq: ['$id', { $toString: '$$catId' }] },
                    { $eq: [{ $toString: '$_id' }, { $toString: '$$catId' }] }
                  ]
                }
              }
            }
          ],
          as: 'category'
        }
      },
      
      // Project final shape (same as before)
      {
        $project: {
          id: { $ifNull: ['$quote.id', { $toString: '$quote._id' }] },
          text: '$quote.text',
          author: '$quote.author',
          category: { $ifNull: [{ $arrayElemAt: ['$category.name', 0] }, 'Unknown'] },
          category_icon: { $ifNull: [{ $arrayElemAt: ['$category.icon', 0] }, '📚'] },
          custom_background: { $ifNull: ['$custom_background', null] }
        }
      }
    ]).toArray() as any[];

    return NextResponse.json({ quotes: result }, { status: 200 });
  } catch (error) {
    console.error('Get liked quotes error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE handler for removing a like (used by undo functionality)
export async function DELETE(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { quoteId } = await request.json();
    if (!quoteId) {
      return NextResponse.json(
        { error: 'Quote ID is required' },
        { status: 400 }
      );
    }

    const userLikesCollection = await getCollection('user_likes');
    const userObjId = toObjectId(userId) as any;
    const quoteObjId = toObjectId(quoteId);

    // Remove the like
    const result = await userLikesCollection.deleteOne({
      user_id: userObjId,
      quote_id: quoteObjId
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { message: 'Like not found', notFound: true },
        { status: 200 }
      );
    }

    return NextResponse.json({ message: 'Like removed' }, { status: 200 });
  } catch (error) {
    console.error('Remove like error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
