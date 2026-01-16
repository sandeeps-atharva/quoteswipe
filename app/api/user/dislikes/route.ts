import { NextRequest, NextResponse } from 'next/server';
import { getCollection, toObjectId, normalizeId } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';
import { startTimer, recordMetric } from '@/lib/perf';

/**
 * OPTIMIZED: Uses parallel queries with proper ID handling
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

    const userDislikesCollection = await getCollection('user_dislikes');
    const userLikesCollection = await getCollection('user_likes');

    const existingDislike: any = await userDislikesCollection.findOne({
      user_id: userId,
      quote_id: quoteId
    });

    if (existingDislike) {
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

    await userDislikesCollection.insertOne({
      user_id: userId,
      quote_id: quoteId,
      custom_background: customBackground || null,
      created_at: new Date()
    } as any);

    return NextResponse.json({ message: 'Quote disliked' }, { status: 200 });
  } catch (error: any) {
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
  const endTimer = startTimer();
  
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all collections in parallel
    const [userDislikesCollection, quotesCollection, categoriesCollection] = await Promise.all([
      getCollection('user_dislikes'),
      getCollection('quotes'),
      getCollection('categories')
    ]);

    // Step 1: Get user's dislikes - handle both string and ObjectId user_id formats
    const userObjId = toObjectId(userId);
    const userDislikes = await userDislikesCollection
      .find({ 
        $or: [
          { user_id: userId },
          { user_id: userObjId }
        ]
      })
      .project({ quote_id: 1, custom_background: 1, created_at: 1, _id: 0 })
      .sort({ created_at: -1 })
      .toArray();

    if (userDislikes.length === 0) {
      const duration = endTimer();
      recordMetric('/api/user/dislikes', duration, false, userId);
      return NextResponse.json({ quotes: [], _meta: { responseTime: duration } }, { status: 200 });
    }

    // Step 2: Build quote ID queries - handle multiple formats
    const quoteQueries: any[] = [];
    const bgMap = new Map<string, any>();
    
    for (const dislike of userDislikes) {
      const qid = dislike.quote_id;
      const normalizedId = normalizeId(qid);
      bgMap.set(normalizedId, dislike.custom_background);
      
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
    for (const dislike of userDislikes) {
      const qid = normalizeId(dislike.quote_id);
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
    recordMetric('/api/user/dislikes', duration, duration < 50, userId);

    return NextResponse.json({ 
      quotes: result,
      _meta: { responseTime: duration, count: result.length }
    }, { status: 200 });
  } catch (error) {
    console.error('Get disliked quotes error:', error);
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

    const userDislikesCollection = await getCollection('user_dislikes');

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
