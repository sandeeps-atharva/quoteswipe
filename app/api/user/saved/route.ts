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
    const quotesCollection = await getCollection('quotes');
    const categoriesCollection = await getCollection('categories');

    // Get user's saved quote data (including custom_background)
    const saved = await userSavedCollection
      .find({ user_id: userId })
      .sort({ created_at: -1 })
      .toArray() as any[];

    const quoteIds = saved.map((s: any) => s.quote_id);
    
    // Create a map of quote_id to custom_background
    const backgroundMap = new Map(
      saved.map((s: any) => [String(s.quote_id), s.custom_background])
    );

    if (quoteIds.length === 0) {
      return NextResponse.json({ quotes: [] }, { status: 200 });
    }

    // Get quotes - try both string id and ObjectId matching
    const objectIds = quoteIds.map(id => {
      try { return toObjectId(id); } catch { return null; }
    }).filter((id): id is any => id !== null);
    
    const quotes = await quotesCollection.find({
      $or: [
        { id: { $in: quoteIds } },
        { _id: { $in: objectIds } }
      ]
    }).toArray() as any[];

    // Get categories
    const categories = await categoriesCollection.find({}).toArray() as any[];
    const categoryMap = new Map(categories.map((c: any) => [c.id || c._id?.toString(), c]));

    // Transform quotes - include custom_background from saved data
    const result = quotes.map((q: any) => {
      const quoteId = q.id || q._id?.toString();
      const category = categoryMap.get(q.category_id) || categoryMap.get(String(q.category_id));
      return {
        id: quoteId,
        text: q.text,
        author: q.author,
        category: category?.name || 'Unknown',
        category_icon: category?.icon || '📚',
        custom_background: backgroundMap.get(String(quoteId)) || null
      };
    });

    // Sort result by saved order (maintain the order from user_saved)
    const orderedResult = quoteIds.map(id => 
      result.find(r => String(r.id) === String(id))
    ).filter(Boolean);

    return NextResponse.json({ quotes: orderedResult }, { status: 200 });
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
