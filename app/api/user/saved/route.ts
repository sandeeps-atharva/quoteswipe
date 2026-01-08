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

    const userSavedCollection = await getCollection('user_saved');

    // Check if already saved (upsert behavior)
    const existing: any = await userSavedCollection.findOne({
      user_id: userId,
      quote_id: quoteId
    });

    if (!existing) {
      await userSavedCollection.insertOne({
        user_id: userId,
        quote_id: quoteId,
        custom_background: customBackground || null,
        created_at: new Date()
      } as any);
    } else if (customBackground && existing.custom_background !== customBackground) {
      // Update background if provided and different
      await userSavedCollection.updateOne(
        { user_id: userId, quote_id: quoteId },
        { $set: { custom_background: customBackground, updated_at: new Date() } }
      );
    }

    return NextResponse.json({ message: 'Quote saved' }, { status: 200 });
  } catch (error) {
    console.error('Save quote error:', error);
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

    const userSavedCollection = await getCollection('user_saved');

    // Single aggregation with $lookup - replaces 3 separate queries
    // Maintains order by created_at (saved order)
    const result = await userSavedCollection.aggregate([
      // Match user's saved quotes
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
    console.error('Get saved quotes error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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

    const userSavedCollection = await getCollection('user_saved');
    await userSavedCollection.deleteOne({
      user_id: userId,
      quote_id: quoteId
    });

    return NextResponse.json({ message: 'Quote removed from collection' }, { status: 200 });
  } catch (error) {
    console.error('Delete saved quote error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update custom background for a saved quote
export async function PATCH(request: NextRequest) {
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

    const userSavedCollection = await getCollection('user_saved');
    
    // Check if quote is saved
    const existing = await userSavedCollection.findOne({
      user_id: userId,
      quote_id: quoteId
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Quote not found in your collection' },
        { status: 404 }
      );
    }

    // Update the custom background (can be null to remove)
    await userSavedCollection.updateOne(
      { user_id: userId, quote_id: quoteId },
      { $set: { custom_background: customBackground || null, updated_at: new Date() } }
    );

    return NextResponse.json({ 
      message: 'Background updated',
      custom_background: customBackground || null
    }, { status: 200 });
  } catch (error) {
    console.error('Update saved quote background error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
