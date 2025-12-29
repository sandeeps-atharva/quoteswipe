// import { NextRequest, NextResponse } from 'next/server';
// import { getCollection, ObjectId } from '@/lib/db';
// import { getUserIdFromRequest } from '@/lib/auth';

// // In-memory cache for quotes (rarely changes)
// interface QuoteCache {
//   data: any[];
//   timestamp: number;
// }
// const quotesCache = new Map<string, QuoteCache>();
// const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// // Get base quotes (without user-specific data) from cache
// async function getBaseQuotesFromCache(cacheKey: string, categoriesParam: string | null): Promise<any[]> {
//   const cached = quotesCache.get(cacheKey);
//   if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
//     return cached.data;
//   }

//   const quotesCollection = await getCollection('quotes');
//   const categoriesCollection = await getCollection('categories');
//   const userQuotesCollection = await getCollection('user_quotes');
//   const usersCollection = await getCollection('users');
//   const likesCollection = await getCollection('user_likes');
//   const dislikesCollection = await getCollection('user_dislikes');

//   // Build category filter
//   let categoryIds: any[] = [];
//   if (categoriesParam && categoriesParam !== 'All') {
//     const categoryNames = categoriesParam.split(',').map((c: any) => c.trim()).filter(c => c && c !== 'All');
//     if (categoryNames.length > 0) {
//       const cats = await categoriesCollection.find({ name: { $in: categoryNames } }).toArray() as any[];
//       categoryIds = cats.map((c: any) => c.id || c._id);
//     }
//   }

//   // Query regular quotes
//   const quotesFilter = categoryIds.length > 0 ? { category_id: { $in: categoryIds } } : {};
//   const regularQuotes = await quotesCollection.find(quotesFilter).toArray() as any[];

//   // Get all categories for mapping
//   const allCategories = await categoriesCollection.find({}).toArray() as any[];
//   const categoryMap = new Map(allCategories.map((c: any) => [c.id || c._id?.toString(), c]));

//   // Get likes and dislikes counts
//   const likeCounts = await likesCollection.aggregate([
//     { $group: { _id: '$quote_id', count: { $sum: 1 } } }
//   ]).toArray() as any[];
//   const likeCountMap = new Map(likeCounts.map((l: any) => [String(l._id), l.count]));

//   const dislikeCounts = await dislikesCollection.aggregate([
//     { $group: { _id: '$quote_id', count: { $sum: 1 } } }
//   ]).toArray() as any[];
//   const dislikeCountMap = new Map(dislikeCounts.map((d: any) => [String(d._id), d.count]));

//   // Transform regular quotes
//   const formattedQuotes = regularQuotes.map((q: any) => {
//     const category = categoryMap.get(q.category_id) || categoryMap.get(String(q.category_id));
//     const quoteId = q.id || q._id?.toString();
//     return {
//       id: quoteId,
//       text: q.text,
//       author: q.author,
//       category: category?.name || 'General',
//       category_icon: category?.icon || '💭',
//       category_id: q.category_id,
//       likes_count: likeCountMap.get(String(quoteId)) || 0,
//       dislikes_count: dislikeCountMap.get(String(quoteId)) || 0,
//       quote_type: 'regular',
//       creator_id: null,
//       creator_name: null,
//     };
//   });

//   // Query public user quotes - handle both boolean (true) and number (1)
//   const userQuotesFilter: any = { $or: [{ is_public: true }, { is_public: 1 }] };
//   if (categoryIds.length > 0) {
//     userQuotesFilter.category_id = { $in: categoryIds };
//   }
//   const publicUserQuotes = await userQuotesCollection.find(userQuotesFilter).toArray() as any[];

//   // Get user names for user quotes
//   const userIds = [...new Set(publicUserQuotes.map((uq: any) => uq.user_id).filter(Boolean))];
//   let userMap = new Map();
  
//   if (userIds.length > 0) {
//     const users = await usersCollection.find({ 
//       $or: userIds.map(id => {
//         try {
//           if (ObjectId.isValid(id)) return { _id: new ObjectId(id) };
//         } catch {}
//         return { id: id };
//       })
//     }).toArray() as any[];
//     userMap = new Map(users.map((u: any) => [u._id?.toString() || u.id, u]));
//   }

//   // Transform user quotes
//   const formattedUserQuotes = publicUserQuotes.map((uq: any) => {
//     const category = categoryMap.get(uq.category_id) || categoryMap.get(String(uq.category_id));
//     const user = userMap.get(uq.user_id?.toString()) || userMap.get(String(uq.user_id));
//     return {
//       id: `user_${uq.id || uq._id}`,
//       text: uq.text,
//       author: uq.author,
//       category: category?.name || 'Personal',
//       category_icon: category?.icon || '✨',
//       category_id: uq.category_id,
//       likes_count: 0,
//       dislikes_count: 0,
//       quote_type: 'user',
//       creator_id: uq.user_id,
//       creator_name: user?.name || 'Anonymous',
//       is_public: uq.is_public,
//       custom_background: uq.custom_background,
//     };
//   });

//   // Combine and shuffle
//   const allQuotes = [...formattedQuotes, ...formattedUserQuotes];
//   const shuffled = allQuotes.sort(() => Math.random() - 0.5);

//   // Store in cache
//   quotesCache.set(cacheKey, { data: shuffled, timestamp: Date.now() });

//   return shuffled;
// }

// export async function GET(request: NextRequest) {
//   try {
//     const { searchParams } = new URL(request.url);
//     const categoriesParam = searchParams.get('categories');
//     const userId = getUserIdFromRequest(request);

//     // Create cache key based on categories
//     const cacheKey = `quotes:${categoriesParam || 'all'}`;

//     // Get base quotes from cache
//     let quotes = await getBaseQuotesFromCache(cacheKey, categoriesParam);

//     // If user is authenticated, add user-specific data (not cached)
//     if (userId) {
//       const likesCollection = await getCollection('user_likes');
//       const savedCollection = await getCollection('user_saved');

//       // Get user's likes
//       const userLikes = await likesCollection.find({ user_id: userId }).toArray() as any[];
//       const likedIds = new Set(userLikes.map((l: any) => String(l.quote_id)));

//       // Get user's saves
//       const userSaves = await savedCollection.find({ user_id: userId }).toArray() as any[];
//       const savedIds = new Set(userSaves.map((s: any) => String(s.quote_id)));

//       // Merge user data with cached quotes
//       quotes = quotes.map((q: any) => ({
//         ...q,
//         is_liked: likedIds.has(String(q.id)) ? 1 : 0,
//         is_saved: savedIds.has(String(q.id)) ? 1 : 0,
//         is_own_quote: q.quote_type === 'user' && String(q.creator_id) === String(userId) ? 1 : 0,
//       }));
//     } else {
//       // For non-authenticated users, add default values
//       quotes = quotes.map((q: any) => ({
//         ...q,
//         is_liked: 0,
//         is_saved: 0,
//         is_own_quote: 0,
//       }));
//     }

//     // Return with cache headers for browser caching
//     const response = NextResponse.json({ quotes }, { status: 200 });

//     // Cache for 1 minute in browser (stale-while-revalidate for 5 minutes)
//     response.headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');

//     return response;
//   } catch (error) {
//     console.error('Get quotes error:', error);
//     return NextResponse.json(
//       { error: 'Internal server error' },
//       { status: 500 }
//     );
//   }
// }

// // Export function to invalidate cache (call this when quotes are updated)
// export function invalidateQuotesCache() {
//   quotesCache.clear();
// }

import { NextRequest, NextResponse } from 'next/server';
import { getCollection, ObjectId } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';

// ============================================================================
// OPTIMIZED QUOTES API
// ============================================================================
// Key improvements:
// 1. Reduced database queries using efficient aggregation pipelines
// 2. Parallel execution of independent operations
// 3. Optimized data transformation with single-pass operations
// 4. Better cache strategy with separate caching for static vs dynamic data
// 5. Index recommendations for optimal query performance
// ============================================================================

// Enhanced cache with separate storage for different data types
interface QuoteCache {
  data: any[];
  timestamp: number;
}

interface UserDataCache {
  likes: Set<string>;
  saves: Set<string>;
  timestamp: number;
}

const quotesCache = new Map<string, QuoteCache>();
const userDataCache = new Map<string, UserDataCache>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const USER_DATA_CACHE_DURATION = 30 * 1000; // 30 seconds for user-specific data

/**
 * Optimized function to fetch all quotes with minimal database queries
 * Uses aggregation pipelines to join data in a single operation
 */
async function getOptimizedQuotes(categoriesParam: string | null): Promise<any[]> {
  const quotesCollection = await getCollection('quotes');
  const categoriesCollection = await getCollection('categories');
  const userQuotesCollection = await getCollection('user_quotes');
  const usersCollection = await getCollection('users');
  const likesCollection = await getCollection('user_likes');
  const dislikesCollection = await getCollection('user_dislikes');

  // Parse category filter once
  let categoryIds: any[] = [];
  if (categoriesParam && categoriesParam !== 'All') {
    const categoryNames = categoriesParam
      .split(',')
      .map(c => c.trim())
      .filter(c => c && c !== 'All');
    
    if (categoryNames.length > 0) {
      const cats = await categoriesCollection
        .find({ name: { $in: categoryNames } })
        .project({ id: 1, _id: 1 })
        .toArray();
      categoryIds = cats.map((c: any) => c.id || c._id);
    }
  }

  const categoryFilter = categoryIds.length > 0 ? { $in: categoryIds } : { $exists: true };

  // ========================================================================
  // PARALLEL EXECUTION: Run all independent queries simultaneously
  // ========================================================================
  const [
    allCategories,
    regularQuotes,
    publicUserQuotes,
    likeCounts,
    dislikeCounts
  ] = await Promise.all([
    // 1. Get all categories (for mapping)
    categoriesCollection.find({}).toArray(),

    // 2. Get regular quotes with optimized aggregation pipeline
    quotesCollection.aggregate([
      { $match: categoryIds.length > 0 ? { category_id: { $in: categoryIds } } : {} },
      {
        $project: {
          _id: 1,
          id: 1,
          text: 1,
          author: 1,
          category_id: 1
        }
      }
    ]).toArray(),

    // 3. Get public user quotes with optimized aggregation
    userQuotesCollection.aggregate([
      {
        $match: {
          $or: [{ is_public: true }, { is_public: 1 }],
          ...(categoryIds.length > 0 ? { category_id: categoryFilter } : {})
        }
      },
      {
        $lookup: {
          from: 'users',
          let: { userId: '$user_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: [{ $toString: '$_id' }, { $toString: '$$userId' }] },
                    { $eq: ['$id', '$$userId'] }
                  ]
                }
              }
            },
            { $project: { name: 1 } }
          ],
          as: 'user'
        }
      },
      {
        $project: {
          _id: 1,
          id: 1,
          text: 1,
          author: 1,
          category_id: 1,
          user_id: 1,
          is_public: 1,
          custom_background: 1,
          creator_name: { $ifNull: [{ $arrayElemAt: ['$user.name', 0] }, 'Anonymous'] }
        }
      }
    ]).toArray(),

    // 4. Get like counts using aggregation (more efficient than separate queries)
    likesCollection.aggregate([
      { $group: { _id: '$quote_id', count: { $sum: 1 } } }
    ]).toArray(),

    // 5. Get dislike counts
    dislikesCollection.aggregate([
      { $group: { _id: '$quote_id', count: { $sum: 1 } } }
    ]).toArray()
  ]);

  // ========================================================================
  // FAST LOOKUPS: Create maps for O(1) lookups instead of O(n) searches
  // ========================================================================
  const categoryMap = new Map(
    allCategories.map((c: any) => [
      c.id || c._id?.toString(),
      { name: c.name, icon: c.icon }
    ])
  );

  const likeCountMap = new Map(
    likeCounts.map((l: any) => [String(l._id), l.count])
  );

  const dislikeCountMap = new Map(
    dislikeCounts.map((d: any) => [String(d._id), d.count])
  );

  // ========================================================================
  // TRANSFORM DATA: Single-pass transformation for efficiency
  // ========================================================================
  const formattedQuotes = regularQuotes.map((q: any) => {
    const quoteId = q.id || q._id?.toString();
    const category = categoryMap.get(q.category_id) || categoryMap.get(String(q.category_id));
    
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

  const formattedUserQuotes = publicUserQuotes.map((uq: any) => {
    const category = categoryMap.get(uq.category_id) || categoryMap.get(String(uq.category_id));
    
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
      creator_name: uq.creator_name,
      is_public: uq.is_public,
      custom_background: uq.custom_background,
    };
  });

  // Combine and shuffle efficiently
  const allQuotes = [...formattedQuotes, ...formattedUserQuotes];
  
  // Fisher-Yates shuffle (more efficient than sort with random)
  for (let i = allQuotes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allQuotes[i], allQuotes[j]] = [allQuotes[j], allQuotes[i]];
  }

  return allQuotes;
}

/**
 * Optimized function to get user-specific data (likes and saves)
 */
async function getUserSpecificData(userId: string): Promise<UserDataCache> {
  // Check cache first
  const cached = userDataCache.get(userId);
  if (cached && Date.now() - cached.timestamp < USER_DATA_CACHE_DURATION) {
    return cached;
  }

  const likesCollection = await getCollection('user_likes');
  const savedCollection = await getCollection('user_saved');

  // Fetch user likes and saves in parallel
  const [userLikes, userSaves] = await Promise.all([
    likesCollection
      .find({ user_id: userId })
      .project({ quote_id: 1 })
      .toArray(),
    savedCollection
      .find({ user_id: userId })
      .project({ quote_id: 1 })
      .toArray()
  ]);

  const userData: UserDataCache = {
    likes: new Set(userLikes.map((l: any) => String(l.quote_id))),
    saves: new Set(userSaves.map((s: any) => String(s.quote_id))),
    timestamp: Date.now()
  };

  // Cache the user data
  userDataCache.set(userId, userData);

  return userData;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoriesParam = searchParams.get('categories');
    const userId = getUserIdFromRequest(request);
    
    // PAGINATION SUPPORT
    const limit = parseInt(searchParams.get('limit') || '0', 10); // 0 = no limit (legacy)
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const paginated = limit > 0;

    // Create cache key based on categories
    const cacheKey = `quotes:${categoriesParam || 'all'}`;

    // ========================================================================
    // CACHING STRATEGY: Check cache first for base quotes
    // ========================================================================
    let quotes: any[];
    const cached = quotesCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      quotes = cached.data;
    } else {
      // Cache miss - fetch fresh data
      quotes = await getOptimizedQuotes(categoriesParam);
      quotesCache.set(cacheKey, { data: quotes, timestamp: Date.now() });
    }

    const totalQuotes = quotes.length;

    // Apply pagination if requested
    if (paginated) {
      quotes = quotes.slice(offset, offset + limit);
    }

    // ========================================================================
    // USER-SPECIFIC DATA: Add user likes/saves efficiently
    // ========================================================================
    if (userId) {
      const userData = await getUserSpecificData(userId);

      // Single-pass merge of user data with quotes
      quotes = quotes.map((q: any) => ({
        ...q,
        is_liked: userData.likes.has(String(q.id)) ? 1 : 0,
        is_saved: userData.saves.has(String(q.id)) ? 1 : 0,
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

    // Return with pagination info
    const response = NextResponse.json({ 
      quotes,
      pagination: paginated ? {
        total: totalQuotes,
        limit,
        offset,
        hasMore: offset + limit < totalQuotes,
      } : undefined,
    }, { status: 200 });
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

// ============================================================================
// CACHE INVALIDATION
// ============================================================================
export function invalidateQuotesCache(userId?: string) {
  quotesCache.clear();
  
  if (userId) {
    // Invalidate specific user's cache
    userDataCache.delete(userId);
  } else {
    // Clear all user caches
    userDataCache.clear();
  }
}

// Utility to clear only user data caches (useful for like/save operations)
export function invalidateUserDataCache(userId: string) {
  userDataCache.delete(userId);
}

// ============================================================================
// RECOMMENDED DATABASE INDEXES
// ============================================================================
// Run these commands in your MongoDB to create optimal indexes:
//
// db.quotes.createIndex({ category_id: 1 })
// db.user_quotes.createIndex({ is_public: 1, category_id: 1 })
// db.user_quotes.createIndex({ user_id: 1 })
// db.user_likes.createIndex({ user_id: 1, quote_id: 1 })
// db.user_likes.createIndex({ quote_id: 1 })
// db.user_saved.createIndex({ user_id: 1, quote_id: 1 })
// db.user_dislikes.createIndex({ quote_id: 1 })
// db.categories.createIndex({ name: 1 })
// db.users.createIndex({ id: 1 })
//
// ============================================================================