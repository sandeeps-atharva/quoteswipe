import { NextRequest, NextResponse } from 'next/server';
import { getCollection, ObjectId } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';

// ============================================================================
// OPTIMIZED INITIAL DATA API
// ============================================================================
// Combines multiple API calls into ONE for faster initial page load:
// - Auth check
// - Categories
// - Initial quotes (paginated)
// - User preferences
// - User likes/dislikes/saved (if authenticated)
// ============================================================================

// In-memory cache for static data
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const categoriesCache: CacheEntry<any[]> = { data: [], timestamp: 0 };
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Get categories with caching
async function getCachedCategories(): Promise<any[]> {
  if (categoriesCache.data.length > 0 && Date.now() - categoriesCache.timestamp < CACHE_DURATION) {
    return categoriesCache.data;
  }

  const categoriesCollection = await getCollection('categories');
  const quotesCollection = await getCollection('quotes');

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
  categoriesCache.timestamp = Date.now();
  
  return formattedCategories;
}

// Get paginated quotes efficiently
async function getPaginatedQuotes(
  categoryIds: string[] | null,
  limit: number = 50,
  offset: number = 0
): Promise<{ quotes: any[]; total: number }> {
  const quotesCollection = await getCollection('quotes');
  const categoriesCollection = await getCollection('categories');
  const likesCollection = await getCollection('user_likes');
  const dislikesCollection = await getCollection('user_dislikes');

  // Build filter
  const filter: any = {};
  if (categoryIds && categoryIds.length > 0) {
    filter.category_id = { $in: categoryIds };
  }

  // Run queries in parallel
  const [
    quotes,
    totalCount,
    allCategories,
    likeCounts,
    dislikeCounts
  ] = await Promise.all([
    // Get paginated quotes
    quotesCollection
      .find(filter)
      .skip(offset)
      .limit(limit)
      .toArray(),
    
    // Get total count for pagination info
    quotesCollection.countDocuments(filter),
    
    // Get categories for mapping
    categoriesCollection.find({}).toArray(),
    
    // Get like counts (only for current batch - more efficient)
    likesCollection.aggregate([
      { $group: { _id: '$quote_id', count: { $sum: 1 } } }
    ]).toArray(),
    
    // Get dislike counts
    dislikesCollection.aggregate([
      { $group: { _id: '$quote_id', count: { $sum: 1 } } }
    ]).toArray()
  ]);

  // Create lookup maps
  const categoryMap = new Map(
    allCategories.map((c: any) => [
      c._id?.toString() || c.id,
      { name: c.name, icon: c.icon }
    ])
  );

  const likeCountMap = new Map(
    likeCounts.map((l: any) => [String(l._id), l.count])
  );

  const dislikeCountMap = new Map(
    dislikeCounts.map((d: any) => [String(d._id), d.count])
  );

  // Transform quotes
  const formattedQuotes = quotes.map((q: any) => {
    const quoteId = q.id || q._id?.toString();
    const category = categoryMap.get(q.category_id?.toString()) || 
                     categoryMap.get(String(q.category_id));
    
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

  // Shuffle for variety
  for (let i = formattedQuotes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [formattedQuotes[i], formattedQuotes[j]] = [formattedQuotes[j], formattedQuotes[i]];
  }

  return { quotes: formattedQuotes, total: totalCount };
}

// Get user data efficiently
async function getUserData(userId: string): Promise<{
  user: any;
  preferences: any;
  likedIds: string[];
  dislikedIds: string[];
  savedIds: string[];
  onboardingComplete: boolean;
}> {
  const usersCollection = await getCollection('users');
  const preferencesCollection = await getCollection('user_preferences');
  const likesCollection = await getCollection('user_likes');
  const dislikesCollection = await getCollection('user_dislikes');
  const savedCollection = await getCollection('user_saved');

  // Build user query - try ObjectId first if valid, otherwise use string id
  const userQuery = ObjectId.isValid(userId) 
    ? { $or: [{ _id: new ObjectId(userId) }, { id: userId }] as any }
    : { id: userId };

  // Run all user queries in parallel
  const [user, preferences, likes, dislikes, saved] = await Promise.all([
    usersCollection.findOne(userQuery),
    preferencesCollection.findOne({ user_id: userId }),
    likesCollection.find({ user_id: userId }).project({ quote_id: 1 }).toArray(),
    dislikesCollection.find({ user_id: userId }).project({ quote_id: 1 }).toArray(),
    savedCollection.find({ user_id: userId }).project({ quote_id: 1 }).toArray()
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
    likedIds: likes.map((l: any) => String(l.quote_id)),
    dislikedIds: dislikes.map((d: any) => String(d.quote_id)),
    savedIds: saved.map((s: any) => String(s.quote_id)),
    onboardingComplete: userDoc?.onboarding_complete ?? true,
  };
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const categoriesParam = searchParams.get('categories');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    
    const userId = getUserIdFromRequest(request);
    const isAuthenticated = !!userId;

    // Parse category filter
    let categoryIds: string[] | null = null;
    if (categoriesParam && categoriesParam !== 'All') {
      const categoryNames = categoriesParam.split(',').map(c => c.trim()).filter(Boolean);
      if (categoryNames.length > 0) {
        const categoriesCollection = await getCollection('categories');
        const cats = await categoriesCollection
          .find({ name: { $in: categoryNames } })
          .project({ _id: 1 })
          .toArray();
        categoryIds = cats.map((c: any) => c._id?.toString());
      }
    }

    // Run ALL queries in parallel - this is the key optimization!
    const [categories, quotesData, userData] = await Promise.all([
      getCachedCategories(),
      getPaginatedQuotes(categoryIds, limit, offset),
      isAuthenticated && userId ? getUserData(userId) : Promise.resolve(null)
    ]);

    // For non-authenticated users, limit categories
    let limitedCategories = categories;
    let totalCategories = categories.length;
    if (!isAuthenticated) {
      limitedCategories = categories.slice(0, 1);
    }

    // Add user-specific data to quotes if authenticated
    let finalQuotes = quotesData.quotes;
    if (userData) {
      const likedSet = new Set(userData.likedIds);
      const dislikedSet = new Set(userData.dislikedIds);
      const savedSet = new Set(userData.savedIds);
      
      finalQuotes = quotesData.quotes.map((q: any) => ({
        ...q,
        is_liked: likedSet.has(String(q.id)) ? 1 : 0,
        is_disliked: dislikedSet.has(String(q.id)) ? 1 : 0,
        is_saved: savedSet.has(String(q.id)) ? 1 : 0,
      }));
    } else {
      finalQuotes = quotesData.quotes.map((q: any) => ({
        ...q,
        is_liked: 0,
        is_disliked: 0,
        is_saved: 0,
      }));
    }

    const responseTime = Date.now() - startTime;
    console.log(`[initial-data] Loaded in ${responseTime}ms (auth: ${isAuthenticated})`);

    const response = NextResponse.json({
      // Auth status
      isAuthenticated,
      user: userData?.user || null,
      onboardingComplete: userData?.onboardingComplete ?? true,
      
      // Categories
      categories: limitedCategories,
      totalCategories,
      isLimited: !isAuthenticated && totalCategories > 1,
      
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
      }
    });

    // Cache for a short time
    response.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
    
    return response;
  } catch (error) {
    console.error('[initial-data] Error:', error);
    return NextResponse.json(
      { error: 'Failed to load initial data' },
      { status: 500 }
    );
  }
}



