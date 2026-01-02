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
    const quotesCollection = await getCollection('quotes');
    const categoriesCollection = await getCollection('categories');

    // Get user's disliked quote IDs with backgrounds
    const dislikes = await userDislikesCollection
      .find({ user_id: userId })
      .sort({ created_at: -1 })
      .toArray() as any[];

    const quoteIds = dislikes.map((d: any) => d.quote_id);
    
    // Create a map of quote_id -> custom_background (store multiple key formats for reliable lookup)
    const backgroundMap = new Map<string, string | null>();
    dislikes.forEach((d: any) => {
      const bg = d.custom_background || null;
      // Store with ObjectId string representation
      backgroundMap.set(String(d.quote_id), bg);
      // Also store with just the hex string if it's an ObjectId
      if (d.quote_id?.toHexString) {
        backgroundMap.set(d.quote_id.toHexString(), bg);
      }
    });

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

    // Transform quotes with stored background
    const result = quotes.map((q: any) => {
      const category = categoryMap.get(q.category_id) || categoryMap.get(String(q.category_id));
      const quoteId = q.id || q._id?.toString();
      const objIdStr = q._id?.toString();
      const hexStr = q._id?.toHexString?.();
      
      // Try multiple lookup strategies to find the background
      const storedBg = backgroundMap.get(String(quoteId)) 
        || backgroundMap.get(objIdStr) 
        || backgroundMap.get(hexStr)
        || null;
      
      return {
        id: quoteId,
        text: q.text,
        author: q.author,
        category: category?.name || 'Unknown',
        category_icon: category?.icon || '📚',
        custom_background: storedBg
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
