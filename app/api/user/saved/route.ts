import { NextRequest, NextResponse } from 'next/server';
import { getCollection, toObjectId } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';
import { getPlanFeatures, PlanId } from '@/lib/subscription';

export async function POST(request: NextRequest) {
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
    const usersCollection = await getCollection('users');

    // Check if already saved (upsert behavior)
    const existing: any = await userSavedCollection.findOne({
      user_id: userId,
      quote_id: quoteId
    });

    if (!existing) {
      // Check subscription limit
      const user = await usersCollection.findOne({ _id: toObjectId(userId) as any }) as { subscription_plan?: string } | null;
      const userPlan = (user?.subscription_plan || 'free') as PlanId;
      const features = getPlanFeatures(userPlan);
      const savedLimit = features.savedQuotesLimit;

      if (savedLimit !== -1) {
        const savedCount = await userSavedCollection.countDocuments({ user_id: userId });
        if (savedCount >= savedLimit) {
          return NextResponse.json(
            { error: 'Saved quotes limit reached', code: 'LIMIT_REACHED', limit: savedLimit, current: savedCount },
            { status: 403 }
          );
        }
      }

      await userSavedCollection.insertOne({
        user_id: userId,
        quote_id: quoteId,
        created_at: new Date()
      } as any);
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

    // Get user's saved quote IDs
    const saved = await userSavedCollection
      .find({ user_id: userId })
      .sort({ created_at: -1 })
      .toArray() as any[];

    const quoteIds = saved.map((s: any) => s.quote_id);

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

    // Transform quotes
    const result = quotes.map((q: any) => {
      const category = categoryMap.get(q.category_id) || categoryMap.get(String(q.category_id));
      return {
        id: q.id || q._id?.toString(),
        text: q.text,
        author: q.author,
        category: category?.name || 'Unknown',
        category_icon: category?.icon || '📚'
      };
    });

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
