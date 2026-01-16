import { NextRequest, NextResponse } from 'next/server';
import { getCollection, toObjectId, normalizeId } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';
import { startTimer, recordMetric } from '@/lib/perf';

/**
 * OPTIMIZED: Uses parallel queries with proper ID handling
 * Key optimizations:
 * 1. Parallel queries instead of sequential $lookup
 * 2. In-memory joins with O(1) Map lookups
 * 3. Proper handling of both string and ObjectId formats
 */

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
  const endTimer = startTimer();
  
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all collections in parallel
    const [userLikesCollection, quotesCollection, categoriesCollection] = await Promise.all([
      getCollection('user_likes'),
      getCollection('quotes'),
      getCollection('categories')
    ]);

    // Step 1: Get user's likes - handle both string and ObjectId user_id formats
    const userObjId = toObjectId(userId);
    const userLikes = await userLikesCollection
      .find({ 
        $or: [
          { user_id: userId },
          { user_id: userObjId }
        ]
      })
      .project({ quote_id: 1, custom_background: 1, created_at: 1, _id: 0 })
      .sort({ created_at: -1 })
      .toArray();

    if (userLikes.length === 0) {
      const duration = endTimer();
      recordMetric('/api/user/likes', duration, false, userId);
      return NextResponse.json({ quotes: [], _meta: { responseTime: duration } }, { status: 200 });
    }

    // Step 2: Build quote ID queries - handle multiple formats
    const quoteQueries: any[] = [];
    const bgMap = new Map<string, any>();
    
    for (const like of userLikes) {
      const qid = like.quote_id;
      const normalizedId = normalizeId(qid);
      bgMap.set(normalizedId, like.custom_background);
      
      // Add both ObjectId and string queries
      if (typeof qid === 'string') {
        try {
          const objId = toObjectId(qid);
          quoteQueries.push({ _id: objId });
        } catch {
          quoteQueries.push({ _id: qid });
        }
      } else {
        quoteQueries.push({ _id: qid });
      }
    }

    // Step 3: Fetch quotes and categories in parallel
    const [quotes, categories] = await Promise.all([
      quotesCollection
        .find({ $or: quoteQueries })
        .project({ _id: 1, text: 1, author: 1, category_id: 1 })
        .toArray(),
      categoriesCollection
        .find({})
        .project({ _id: 1, name: 1, icon: 1 })
        .toArray()
    ]);

    // Step 4: Create lookup maps
    const quoteMap = new Map<string, any>();
    for (const q of quotes) {
      quoteMap.set(normalizeId(q._id), q);
    }
    
    const categoryMap = new Map<string, any>();
    for (const c of categories) {
      categoryMap.set(normalizeId(c._id), c);
    }

    // Step 5: Transform maintaining original order
    const result: any[] = [];
    for (const like of userLikes) {
      const qid = normalizeId(like.quote_id);
      const quote = quoteMap.get(qid);
      if (!quote) continue;
      
      const catId = normalizeId(quote.category_id);
      const category = categoryMap.get(catId);
      
      result.push({
        id: normalizeId(quote._id),
        text: quote.text,
        author: quote.author,
        category: category?.name || 'Unknown',
        category_icon: category?.icon || '📚',
        custom_background: bgMap.get(qid) || null
      });
    }

    const duration = endTimer();
    recordMetric('/api/user/likes', duration, duration < 50, userId);

    return NextResponse.json({ 
      quotes: result,
      _meta: { responseTime: duration, count: result.length }
    }, { status: 200 });
  } catch (error) {
    console.error('Get liked quotes error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE handler for removing a like
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
