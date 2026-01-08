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

    const userDislikesCollection = await getCollection('user_dislikes');
    const userLikesCollection = await getCollection('user_likes');

    // Check if user already disliked this quote
    const existingDislike: any = await userDislikesCollection.findOne({
      user_id: userId,
      quote_id: quoteId
    });

    if (existingDislike) {
      // Update background if provided and different
      if (customBackground && existingDislike.custom_background !== customBackground) {
        await userDislikesCollection.updateOne(
          { _id: existingDislike._id },
          { $set: { custom_background: customBackground } }
        );
      }
      return NextResponse.json(
        { message: 'Quote already disliked', alreadyDisliked: true },
        { status: 200 }
      );
    }

    // Remove like if exists (mutual exclusivity)
    await userLikesCollection.deleteOne({
      user_id: userId,
      quote_id: quoteId
    });

    // Insert dislike with custom background
    await userDislikesCollection.insertOne({
      user_id: userId,
      quote_id: quoteId,
      custom_background: customBackground || null,
      created_at: new Date()
    } as any);

    return NextResponse.json({ message: 'Quote disliked' }, { status: 200 });
  } catch (error: any) {
    // Handle duplicate key error
    if (error.code === 11000) {
      return NextResponse.json(
        { message: 'Quote already disliked', alreadyDisliked: true },
        { status: 200 }
      );
    }
    console.error('Dislike quote error:', error);
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

    const userDislikesCollection = await getCollection('user_dislikes');

    // Single aggregation with $lookup - replaces 3 separate queries
    const result = await userDislikesCollection.aggregate([
      // Match user's dislikes
      { $match: { user_id: userId } },
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
                    { $eq: ['$_id', { $toObjectId: '$$quoteId' }] },
                    { $eq: ['$id', '$$quoteId'] },
                    { $eq: [{ $toString: '$_id' }, '$$quoteId'] }
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
    console.error('Get disliked quotes error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE handler for removing a dislike (used by undo functionality)
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

    const userDislikesCollection = await getCollection('user_dislikes');

    // Remove the dislike
    const result = await userDislikesCollection.deleteOne({
      user_id: userId,
      quote_id: quoteId
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { message: 'Dislike not found', notFound: true },
        { status: 200 }
      );
    }

    return NextResponse.json({ message: 'Dislike removed' }, { status: 200 });
  } catch (error) {
    console.error('Remove dislike error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
