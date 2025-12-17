import { NextRequest, NextResponse } from 'next/server';
import { getCollection, toObjectId } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';

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

    const userDislikesCollection = await getCollection('user_dislikes');
    const userLikesCollection = await getCollection('user_likes');

    // Check if user already disliked this quote
    const existingDislike: any = await userDislikesCollection.findOne({
      user_id: userId,
      quote_id: quoteId
    });

    if (existingDislike) {
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

    // Insert dislike
    await userDislikesCollection.insertOne({
      user_id: userId,
      quote_id: quoteId,
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
    const quotesCollection = await getCollection('quotes');
    const categoriesCollection = await getCollection('categories');

    // Get user's disliked quote IDs
    const dislikes = await userDislikesCollection
      .find({ user_id: userId })
      .sort({ created_at: -1 })
      .toArray() as any[];

    const quoteIds = dislikes.map((d: any) => d.quote_id);

    if (quoteIds.length === 0) {
      return NextResponse.json({ quotes: [] }, { status: 200 });
    }

    // Get quotes - try both string and ObjectId matching
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
    const categoryIds = [...new Set(quotes.map((q: any) => q.category_id).filter(Boolean))];
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
    console.error('Get disliked quotes error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
