import { NextRequest, NextResponse } from 'next/server';
import { getCollection, ObjectId } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';

// In-memory cache for quotes (rarely changes)
interface QuoteCache {
  data: any[];
  timestamp: number;
}
const quotesCache = new Map<string, QuoteCache>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Get base quotes (without user-specific data) from cache
async function getBaseQuotesFromCache(cacheKey: string, categoriesParam: string | null): Promise<any[]> {
  const cached = quotesCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  const quotesCollection = await getCollection('quotes');
  const categoriesCollection = await getCollection('categories');
  const userQuotesCollection = await getCollection('user_quotes');
  const usersCollection = await getCollection('users');
  const likesCollection = await getCollection('user_likes');
  const dislikesCollection = await getCollection('user_dislikes');

  // Build category filter
  let categoryIds: any[] = [];
  if (categoriesParam && categoriesParam !== 'All') {
    const categoryNames = categoriesParam.split(',').map((c: any) => c.trim()).filter(c => c && c !== 'All');
    if (categoryNames.length > 0) {
      const cats = await categoriesCollection.find({ name: { $in: categoryNames } }).toArray() as any[];
      categoryIds = cats.map((c: any) => c.id || c._id);
    }
  }

  // Query regular quotes
  const quotesFilter = categoryIds.length > 0 ? { category_id: { $in: categoryIds } } : {};
  const regularQuotes = await quotesCollection.find(quotesFilter).toArray() as any[];

  // Get all categories for mapping
  const allCategories = await categoriesCollection.find({}).toArray() as any[];
  const categoryMap = new Map(allCategories.map((c: any) => [c.id || c._id?.toString(), c]));

  // Get likes and dislikes counts
  const likeCounts = await likesCollection.aggregate([
    { $group: { _id: '$quote_id', count: { $sum: 1 } } }
  ]).toArray() as any[];
  const likeCountMap = new Map(likeCounts.map((l: any) => [String(l._id), l.count]));

  const dislikeCounts = await dislikesCollection.aggregate([
    { $group: { _id: '$quote_id', count: { $sum: 1 } } }
  ]).toArray() as any[];
  const dislikeCountMap = new Map(dislikeCounts.map((d: any) => [String(d._id), d.count]));

  // Transform regular quotes
  const formattedQuotes = regularQuotes.map((q: any) => {
    const category = categoryMap.get(q.category_id) || categoryMap.get(String(q.category_id));
    const quoteId = q.id || q._id?.toString();
    return {
      id: quoteId,
      text: q.text,
      author: q.author,
      category: category?.name || 'General',
      category_icon: category?.icon || '💭',
      category_id: q.category_id,
      likes_count: likeCountMap.get(String(quoteId)) || 0,
      dislikes_count: dislikeCountMap.get(String(quoteId)) || 0,
      quote_type: 'regular',
      creator_id: null,
      creator_name: null,
    };
  });

  // Query public user quotes
  const userQuotesFilter: any = { is_public: true };
  if (categoryIds.length > 0) {
    userQuotesFilter.category_id = { $in: categoryIds };
  }
  const publicUserQuotes = await userQuotesCollection.find(userQuotesFilter).toArray() as any[];

  // Get user names for user quotes
  const userIds = [...new Set(publicUserQuotes.map((uq: any) => uq.user_id).filter(Boolean))];
  let userMap = new Map();
  
  if (userIds.length > 0) {
    const users = await usersCollection.find({ 
      $or: userIds.map(id => {
        try {
          if (ObjectId.isValid(id)) return { _id: new ObjectId(id) };
        } catch {}
        return { id: id };
      })
    }).toArray() as any[];
    userMap = new Map(users.map((u: any) => [u._id?.toString() || u.id, u]));
  }

  // Transform user quotes
  const formattedUserQuotes = publicUserQuotes.map((uq: any) => {
    const category = categoryMap.get(uq.category_id) || categoryMap.get(String(uq.category_id));
    const user = userMap.get(uq.user_id?.toString()) || userMap.get(String(uq.user_id));
    return {
      id: `user_${uq.id || uq._id}`,
      text: uq.text,
      author: uq.author,
      category: category?.name || 'Personal',
      category_icon: category?.icon || '✨',
      category_id: uq.category_id,
      likes_count: 0,
      dislikes_count: 0,
      quote_type: 'user',
      creator_id: uq.user_id,
      creator_name: user?.name || 'Anonymous',
      is_public: uq.is_public,
      custom_background: uq.custom_background,
    };
  });

  // Combine and shuffle
  const allQuotes = [...formattedQuotes, ...formattedUserQuotes];
  const shuffled = allQuotes.sort(() => Math.random() - 0.5);

  // Store in cache
  quotesCache.set(cacheKey, { data: shuffled, timestamp: Date.now() });

  return shuffled;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoriesParam = searchParams.get('categories');
    const userId = getUserIdFromRequest(request);

    // Create cache key based on categories
    const cacheKey = `quotes:${categoriesParam || 'all'}`;

    // Get base quotes from cache
    let quotes = await getBaseQuotesFromCache(cacheKey, categoriesParam);

    // If user is authenticated, add user-specific data (not cached)
    if (userId) {
      const likesCollection = await getCollection('user_likes');
      const savedCollection = await getCollection('user_saved');

      // Get user's likes
      const userLikes = await likesCollection.find({ user_id: userId }).toArray() as any[];
      const likedIds = new Set(userLikes.map((l: any) => String(l.quote_id)));

      // Get user's saves
      const userSaves = await savedCollection.find({ user_id: userId }).toArray() as any[];
      const savedIds = new Set(userSaves.map((s: any) => String(s.quote_id)));

      // Merge user data with cached quotes
      quotes = quotes.map((q: any) => ({
        ...q,
        is_liked: likedIds.has(String(q.id)) ? 1 : 0,
        is_saved: savedIds.has(String(q.id)) ? 1 : 0,
        is_own_quote: q.quote_type === 'user' && String(q.creator_id) === String(userId) ? 1 : 0,
      }));
    } else {
      // For non-authenticated users, add default values
      quotes = quotes.map((q: any) => ({
        ...q,
        is_liked: 0,
        is_saved: 0,
        is_own_quote: 0,
      }));
    }

    // Return with cache headers for browser caching
    const response = NextResponse.json({ quotes }, { status: 200 });

    // Cache for 1 minute in browser (stale-while-revalidate for 5 minutes)
    response.headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');

    return response;
  } catch (error) {
    console.error('Get quotes error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Export function to invalidate cache (call this when quotes are updated)
export function invalidateQuotesCache() {
  quotesCache.clear();
}
