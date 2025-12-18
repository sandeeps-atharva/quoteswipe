import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';
import { invalidateQuotesCache } from '@/app/api/quotes/route';

// GET - Fetch all user's quotes (both public and private)
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userQuotesCollection = await getCollection('user_quotes');
    const categoriesCollection = await getCollection('categories');

    // Get user's quotes
    const quotes = await userQuotesCollection
      .find({ user_id: userId })
      .sort({ created_at: -1 })
      .toArray() as any[];

    // Get categories for mapping - store by multiple key formats
    const categories = await categoriesCollection.find({}).toArray() as any[];
    const categoryMap = new Map<string, any>();
    categories.forEach((c: any) => {
      if (c.id) categoryMap.set(String(c.id), c);
      if (c._id) categoryMap.set(c._id.toString(), c);
    });

    // Transform quotes
    const formattedQuotes = quotes.map((q: any) => {
      const catId = q.category_id;
      const category = catId ? (categoryMap.get(String(catId)) || categoryMap.get(catId)) : null;
      return {
        id: q.id || q._id?.toString(),
        text: q.text,
        author: q.author,
        theme_id: q.theme_id,
        font_id: q.font_id,
        background_id: q.background_id,
        is_public: q.is_public,
        category_id: q.category_id,
        created_at: q.created_at,
        updated_at: q.updated_at,
        category: category?.name || 'Personal',
        category_icon: category?.icon || '✨',
        custom_background: q.custom_background
      };
    });

    return NextResponse.json({ quotes: formattedQuotes }, { status: 200 });
  } catch (error) {
    console.error('Get user quotes error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new quote
export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { text, author, categoryId, themeId, fontId, backgroundId, isPublic, customBackground } = body;

    // Validation
    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Quote text is required' },
        { status: 400 }
      );
    }

    if (text.length < 10) {
      return NextResponse.json(
        { error: 'Quote must be at least 10 characters' },
        { status: 400 }
      );
    }

    if (text.length > 500) {
      return NextResponse.json(
        { error: 'Quote must be less than 500 characters' },
        { status: 400 }
      );
    }

    const userQuotesCollection = await getCollection('user_quotes');
    const categoriesCollection = await getCollection('categories');

    // Rate limiting - max 10 quotes per day
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const quotesToday = await userQuotesCollection.countDocuments({
      user_id: userId,
      created_at: { $gte: today }
    });

    if (quotesToday >= 10) {
      return NextResponse.json(
        { error: 'You can only create 10 quotes per day' },
        { status: 429 }
      );
    }

    // Insert the quote
    const newQuote = {
      user_id: userId,
      text: text.trim(),
      author: author?.trim() || 'Me',
      category_id: categoryId || null,
      theme_id: themeId || 'default',
      font_id: fontId || 'default',
      background_id: backgroundId || 'none',
      is_public: isPublic ? true : false,
      custom_background: customBackground || null,
      created_at: new Date(),
      updated_at: new Date()
    };

    const result = await userQuotesCollection.insertOne(newQuote as any);

    // Get category info
    let category: any = null;
    if (categoryId) {
      category = await categoriesCollection.findOne({ 
        $or: [{ id: categoryId }, { _id: categoryId }] 
      });
    }

    // If the quote is public, invalidate the quotes cache so it appears in the feed
    if (isPublic) {
      invalidateQuotesCache();
    }

    const responseQuote = {
      id: result.insertedId.toString(),
      ...newQuote,
      category: category?.name || 'Personal',
      category_icon: category?.icon || '✨'
    };

    return NextResponse.json(
      { message: 'Quote created successfully', quote: responseQuote, cacheInvalidated: isPublic },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create user quote error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
