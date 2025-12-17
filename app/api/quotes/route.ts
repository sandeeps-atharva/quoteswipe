import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
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

  // Category filter
  let categoryFilter = '';
  const params: any[] = [];
  
  if (categoriesParam && categoriesParam !== 'All') {
    const categories = categoriesParam.split(',').map(c => c.trim()).filter(c => c && c !== 'All');
    if (categories.length > 0) {
      const placeholders = categories.map(() => '?').join(',');
      categoryFilter = ` WHERE c.name IN (${placeholders})`;
      params.push(...categories);
    }
  }

  // Query for regular quotes - cast id to string for UNION compatibility
  const regularQuotesQuery = `
    SELECT 
      CAST(q.id AS CHAR) as id,
      q.text COLLATE utf8mb4_unicode_ci as text,
      q.author COLLATE utf8mb4_unicode_ci as author,
      c.name COLLATE utf8mb4_unicode_ci as category,
      c.icon COLLATE utf8mb4_unicode_ci as category_icon,
      c.id as category_id,
      (SELECT COUNT(*) FROM user_likes WHERE quote_id = q.id) as likes_count,
      (SELECT COUNT(*) FROM user_dislikes WHERE quote_id = q.id) as dislikes_count,
      'regular' COLLATE utf8mb4_unicode_ci as quote_type,
      CAST(NULL AS SIGNED) as creator_id,
      CAST(NULL AS CHAR) COLLATE utf8mb4_unicode_ci as creator_name
    FROM quotes q
    INNER JOIN categories c ON q.category_id = c.id
    ${categoryFilter}
  `;

  // Query for public user quotes
  const publicUserQuotesQuery = `
    SELECT 
      CONCAT('user_', CAST(uq.id AS CHAR)) COLLATE utf8mb4_unicode_ci as id,
      uq.text COLLATE utf8mb4_unicode_ci as text,
      uq.author COLLATE utf8mb4_unicode_ci as author,
      COALESCE(c.name, 'Personal') COLLATE utf8mb4_unicode_ci as category,
      COALESCE(c.icon, '✨') COLLATE utf8mb4_unicode_ci as category_icon,
      uq.category_id,
      0 as likes_count,
      0 as dislikes_count,
      'user' COLLATE utf8mb4_unicode_ci as quote_type,
      uq.user_id as creator_id,
      u.name COLLATE utf8mb4_unicode_ci as creator_name
    FROM user_quotes uq
    LEFT JOIN categories c ON uq.category_id = c.id
    LEFT JOIN users u ON uq.user_id = u.id
    WHERE uq.is_public = 1
    ${categoryFilter ? categoryFilter.replace('WHERE', 'AND') : ''}
  `;

  // Combine both queries
  const combinedQuery = `
    (${regularQuotesQuery})
    UNION ALL
    (${publicUserQuotesQuery})
    ORDER BY RAND()
  `;

  // Double the params for the UNION (same category filter used twice)
  const allParams = categoryFilter ? [...params, ...params] : [];

  const [quotes] = await pool.execute(combinedQuery, allParams) as any[];
  
  // Store in cache
  quotesCache.set(cacheKey, { data: quotes, timestamp: Date.now() });
  
  return quotes;
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
      // Filter out regular quote IDs (not user quotes) - keep as strings
      const regularQuoteIds = quotes
        .filter((q: any) => q.quote_type === 'regular')
        .map((q: any) => q.id);
      
      if (regularQuoteIds.length > 0) {
        const placeholders = regularQuoteIds.map(() => '?').join(',');
        
        // Get user's likes
        const [userLikes] = await pool.execute(
          `SELECT quote_id FROM user_likes WHERE user_id = ? AND quote_id IN (${placeholders})`,
          [userId, ...regularQuoteIds]
        ) as any[];
        const likedIds = new Set(userLikes.map((l: any) => String(l.quote_id)));

        // Get user's saves
        const [userSaves] = await pool.execute(
          `SELECT quote_id FROM user_saved WHERE user_id = ? AND quote_id IN (${placeholders})`,
          [userId, ...regularQuoteIds]
        ) as any[];
        const savedIds = new Set(userSaves.map((s: any) => String(s.quote_id)));

        // Merge user data with cached quotes - keep IDs as strings
        quotes = quotes.map((q: any) => ({
          ...q,
          id: q.id, // Keep ID as is (string)
          is_liked: q.quote_type === 'regular' && likedIds.has(String(q.id)) ? 1 : 0,
          is_saved: q.quote_type === 'regular' && savedIds.has(String(q.id)) ? 1 : 0,
          is_own_quote: q.quote_type === 'user' && q.creator_id === userId ? 1 : 0,
        }));
      } else {
        quotes = quotes.map((q: any) => ({
          ...q,
          id: q.id, // Keep ID as is (string)
          is_liked: 0,
          is_saved: 0,
          is_own_quote: q.quote_type === 'user' && q.creator_id === userId ? 1 : 0,
        }));
      }
    } else {
      // For non-authenticated users, add default values
      quotes = quotes.map((q: any) => ({
        ...q,
        id: q.id, // Keep ID as is (string)
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
