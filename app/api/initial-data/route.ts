import { NextRequest, NextResponse } from 'next/server';
import { getCollection, ObjectId } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';

// ============================================================================
// HIGHLY OPTIMIZED INITIAL DATA API v2
// ============================================================================
// Key Optimizations:
// 1. Aggressive caching (categories, quotes with like counts)
// 2. No full collection scans - only fetch counts for requested quotes
// 3. Reuse database connection (warm connection)
// 4. Parallel queries with minimal overhead
// ============================================================================

// In-memory cache structures
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// Cache durations
const CACHE_DURATIONS = {
  categories: 10 * 60 * 1000,    // 10 minutes (rarely change)
  quotesWithCounts: 2 * 60 * 1000, // 2 minutes (quotes + like counts)
  userPrefs: 30 * 1000,          // 30 seconds (user-specific)
} as const;

// Global caches
const categoriesCache: CacheEntry<any[]> = { data: [], timestamp: 0 };
const quotesCache: CacheEntry<{ quotes: any[]; total: number }> = {
  data: { quotes: [], total: 0 },
  timestamp: 0
};
// Per-category quote caches
const categoryQuotesCache = new Map<string, CacheEntry<{ quotes: any[]; total: number }>>();

// ============================================================================
// OPTIMIZED: Get categories with aggressive caching
// ============================================================================
async function getCachedCategories(): Promise<any[]> {
  const now = Date.now();

  if (categoriesCache.data.length > 0 && now - categoriesCache.timestamp < CACHE_DURATIONS.categories) {
    return categoriesCache.data;
  }

  const categoriesCollection = await getCollection('categories');
  const quotesCollection = await getCollection('quotes');

  // Use aggregation for counts - single query with index
  const [categories, quoteCounts] = await Promise.all([
    categoriesCollection.find({}).sort({ name: 1 }).toArray(),
    quotesCollection.aggregate([
      { $group: { _id: '$category_id', count: { $sum: 1 } } }
    ]).toArray()
  ]);

  const countMap = new Map<string, number>();
  quoteCounts.forEach((q: any) => {
    const key = q._id?.toString ? q._id.toString() : String(q._id);
    countMap.set(key, q.count);
  });

  const formattedCategories = categories.map((c: any) => {
    const categoryId = c._id?.toString ? c._id.toString() : String(c._id);
    return {
      id: categoryId,
      name: c.name,
      icon: c.icon,
      count: countMap.get(categoryId) || 0,
    };
  });

  categoriesCache.data = formattedCategories;
  categoriesCache.timestamp = now;

  return formattedCategories;
}

// ============================================================================
// OPTIMIZED: Get quotes WITHOUT like counts (faster initial load)
// Like counts loaded separately or cached
// ============================================================================
async function getQuotesWithCachedCounts(
  categoryIds: string[] | null,
  limit: number = 50,
  offset: number = 0
): Promise<{ quotes: any[]; total: number }> {
  const cacheKey = categoryIds ? categoryIds.sort().join(',') : 'all';
  const now = Date.now();

  // Check cache
  const cached = categoryIds ? categoryQuotesCache.get(cacheKey) : quotesCache;
  if (cached && cached.data.quotes.length > 0 && now - cached.timestamp < CACHE_DURATIONS.quotesWithCounts) {
    // Return cached quotes with proper pagination
    const paginatedQuotes = cached.data.quotes.slice(offset, offset + limit);
    return { quotes: paginatedQuotes, total: cached.data.total };
  }

  const quotesCollection = await getCollection('quotes');
  const categoriesCollection = await getCollection('categories');

  // Build filter
  const filter: any = {};
  if (categoryIds && categoryIds.length > 0) {
    // Convert string IDs to ObjectIds for category_id
    const objectIds = categoryIds.map(id => {
      try {
        return ObjectId.isValid(id) ? new ObjectId(id) : id;
      } catch {
        return id;
      }
    });
    filter.category_id = { $in: objectIds };
  }

  // Get quotes and total count in parallel
  // OPTIMIZATION: Use projection to only fetch needed fields
  const [quotes, totalCount, allCategories] = await Promise.all([
    quotesCollection
      .find(filter)
      .project({
        id: 1,
        text: 1,
        author: 1,
        category_id: 1,
        likes_count: 1,  // Use denormalized field if available
        dislikes_count: 1,
        _id: 1
      })
      .limit(500) // Fetch more for caching, paginate from cache
      .toArray(),

    quotesCollection.estimatedDocumentCount(), // Much faster than countDocuments

    // Categories are likely cached, this is fast
    getCachedCategories()
  ]);

  // Create category lookup map
  const categoryMap = new Map(
    allCategories.map((c: any) => [
      c.id,
      { name: c.name, icon: c.icon }
    ])
  );

  // Transform quotes - use denormalized counts if available
  const formattedQuotes = quotes.map((q: any) => {
    const quoteId = q.id || q._id?.toString();
    const categoryIdStr = q.category_id?.toString() || String(q.category_id);
    const category = categoryMap.get(categoryIdStr);

    return {
      id: quoteId,
      text: q.text,
      author: q.author,
      category: category?.name || 'General',
      category_icon: category?.icon || '💭',
      category_id: q.category_id,
      // Use stored counts or default to 0
      likes_count: q.likes_count || 0,
      dislikes_count: q.dislikes_count || 0,
      quote_type: 'regular',
      creator_id: null,
      creator_name: null,
    };
  });

  // Shuffle for variety
  for (let i = formattedQuotes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [formattedQuotes[i], formattedQuotes[j]] = [formattedQuotes[j], formattedQuotes[i]];
  }

  // Store in appropriate cache
  const cacheData = { quotes: formattedQuotes, total: totalCount };
  if (categoryIds) {
    categoryQuotesCache.set(cacheKey, { data: cacheData, timestamp: now });
  } else {
    quotesCache.data = cacheData;
    quotesCache.timestamp = now;
  }

  // Return paginated result
  const paginatedQuotes = formattedQuotes.slice(offset, offset + limit);
  return { quotes: paginatedQuotes, total: totalCount };
}

// ============================================================================
// OPTIMIZED: Get minimal user data for initial load
// ============================================================================
async function getUserDataFast(userId: string): Promise<{
  user: any;
  preferences: any;
  onboardingComplete: boolean;
}> {
  const usersCollection = await getCollection('users');
  const preferencesCollection = await getCollection('user_preferences');

  // Build user query
  const userQuery = ObjectId.isValid(userId)
    ? { $or: [{ _id: new ObjectId(userId) }, { id: userId }] as any }
    : { id: userId };

  // Only fetch user and preferences for INITIAL load
  // Likes/dislikes/saved are fetched separately in background
  const [user, preferences] = await Promise.all([
    usersCollection.findOne(userQuery, {
      projection: {
        name: 1,
        email: 1,
        role: 1,
        profile_picture: 1,
        google_id: 1,
        onboarding_complete: 1
      }
    }),
    preferencesCollection.findOne({ user_id: userId })
  ]);

  const userDoc = user as any;
  const prefsDoc = preferences as any;

  return {
    user: userDoc ? {
      id: userDoc._id.toString(),
      name: userDoc.name,
      email: userDoc.email,
      role: userDoc.role || 'user',
      profile_picture: userDoc.profile_picture,
      auth_provider: userDoc.google_id ? 'google' : 'email',
    } : null,
    preferences: prefsDoc ? {
      selectedCategories: prefsDoc.selected_categories || [],
      themeId: prefsDoc.theme_id || 'default',
      fontId: prefsDoc.font_id || 'default',
      backgroundId: prefsDoc.background_id || 'none',
      customBackgrounds: prefsDoc.custom_backgrounds || [],
    } : null,
    onboardingComplete: userDoc?.onboarding_complete ?? true,
  };
}

// ============================================================================
// MAIN API HANDLER - Optimized for < 500ms response
// ============================================================================
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const categoriesParam = searchParams.get('categories');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const userId = getUserIdFromRequest(request);
    const isAuthenticated = !!userId;

    // Parse category filter
    let categoryIds: string[] | null = null;
    if (categoriesParam && categoriesParam !== 'All') {
      const categoryNames = categoriesParam.split(',').map(c => c.trim()).filter(Boolean);
      if (categoryNames.length > 0) {
        // Get category IDs from cached categories
        const categories = await getCachedCategories();
        categoryIds = categories
          .filter(c => categoryNames.includes(c.name))
          .map(c => c.id);
      }
    }

    // ======================================================================
    // PARALLEL EXECUTION - All independent queries run simultaneously
    // ======================================================================
    const [categories, quotesData, userData] = await Promise.all([
      getCachedCategories(),
      getQuotesWithCachedCounts(categoryIds, limit, offset),
      isAuthenticated && userId ? getUserDataFast(userId) : Promise.resolve(null)
    ]);

    // All users can access all categories (no authentication restriction)
    const limitedCategories = categories;
    const totalCategories = categories.length;

    // Quotes already have default like counts, no need to merge user data here
    // User's likes/dislikes/saved will be fetched by client in background
    const finalQuotes = quotesData.quotes.map((q: any) => ({
      ...q,
      is_liked: 0,
      is_disliked: 0,
      is_saved: 0,
    }));

    const responseTime = Date.now() - startTime;

    // Log slow responses for debugging
    if (responseTime > 500) {
      console.warn(`[initial-data] SLOW: ${responseTime}ms (auth: ${isAuthenticated})`);
    }

    const response = NextResponse.json({
      // Auth status
      isAuthenticated,
      user: userData?.user || null,
      onboardingComplete: userData?.onboardingComplete ?? true,

      // Categories
      categories: limitedCategories,
      totalCategories,
      isLimited: false,

      // Quotes with pagination info
      quotes: finalQuotes,
      pagination: {
        total: quotesData.total,
        limit,
        offset,
        hasMore: offset + limit < quotesData.total,
      },

      // User preferences (if authenticated)
      preferences: userData?.preferences || null,

      // Performance metrics
      _meta: {
        responseTime,
        timestamp: Date.now(),
        cached: responseTime < 100, // Likely cached if very fast
      }
    });

    // Aggressive caching headers
    if (isAuthenticated) {
      response.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
    } else {
      // Public pages can be cached more aggressively
      response.headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
    }

    return response;
  } catch (error) {
    console.error('[initial-data] Error:', error);
    return NextResponse.json(
      { error: 'Failed to load initial data' },
      { status: 500 }
    );
  }
}
