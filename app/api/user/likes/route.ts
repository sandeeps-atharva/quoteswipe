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

    // Insert like
    await userLikesCollection.insertOne({
      user_id: userObjId,
      quote_id: quoteObjId,
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
    const quotesCollection = await getCollection('quotes');
    const categoriesCollection = await getCollection('categories');

    // Get user's liked quote IDs
    const likes = await userLikesCollection
      .find({ user_id: toObjectId(userId) as any })
      .sort({ created_at: -1 })
      .toArray() as any[];

    const quoteIds = likes.map((l: any) => l.quote_id);

    if (quoteIds.length === 0) {
      return NextResponse.json({ quotes: [] }, { status: 200 });
    }

    // Get quotes - try both string id and ObjectId matching
    const stringIds = quoteIds.map(id => String(id));
    const objectIds = quoteIds.filter(id => id !== null);
    
    const quotes = await quotesCollection.find({
      $or: [
        { id: { $in: stringIds } },
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
    console.error('Get liked quotes error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
