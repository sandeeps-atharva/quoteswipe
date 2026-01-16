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
  const endTimer = startTimer();
  
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all collections in parallel
    const [userSavedCollection, quotesCollection, categoriesCollection] = await Promise.all([
      getCollection('user_saved'),
      getCollection('quotes'),
      getCollection('categories')
    ]);

    // Step 1: Get user's saved - handle both string and ObjectId user_id formats
    const userObjId = toObjectId(userId);
    const userSaved = await userSavedCollection
      .find({ 
        $or: [
          { user_id: userId },
          { user_id: userObjId }
        ]
      })
      .project({ quote_id: 1, custom_background: 1, created_at: 1, _id: 0 })
      .sort({ created_at: -1 })
      .toArray();

    if (userSaved.length === 0) {
      const duration = endTimer();
      recordMetric('/api/user/saved', duration, false, userId);
      return NextResponse.json({ quotes: [], _meta: { responseTime: duration } }, { status: 200 });
    }

    // Step 2: Build quote ID queries - handle multiple formats
    const quoteQueries: any[] = [];
    const bgMap = new Map<string, any>();
    
    for (const saved of userSaved) {
      const qid = saved.quote_id;
      const normalizedId = normalizeId(qid);
      bgMap.set(normalizedId, saved.custom_background);
      
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
    for (const saved of userSaved) {
      const qid = normalizeId(saved.quote_id);
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
    recordMetric('/api/user/saved', duration, duration < 50, userId);

    return NextResponse.json({ 
      quotes: result,
      _meta: { responseTime: duration, count: result.length }
    }, { status: 200 });
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
