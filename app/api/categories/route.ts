import { NextRequest, NextResponse } from 'next/server';
import { getCollection, normalizeId } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';
import { recordMetric, startTimer } from '@/lib/perf';

// In-memory cache for categories (doesn't change often)
let cachedCategories: any[] | null = null;
let cacheTime = 0;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes (increased - categories rarely change)

// Export function to invalidate cache
export function invalidateCategoriesCache() {
  cachedCategories = null;
  cacheTime = 0;
}

/**
 * OPTIMIZED: Uses parallel queries instead of $lookup with $expr
 * $expr prevents index usage and causes full collection scans
 * This approach uses indexed queries with in-memory join
 */
async function getCategoriesFromCache() {
  if (cachedCategories && Date.now() - cacheTime < CACHE_DURATION) {
    return cachedCategories;
  }

  const [categoriesCollection, quotesCollection] = await Promise.all([
    getCollection('categories'),
    getCollection('quotes')
  ]);

  // Parallel indexed queries (much faster than $lookup with $expr)
  const [categories, quoteCounts] = await Promise.all([
    // Simple find with sort - uses default _id index
    categoriesCollection
      .find({})
      .project({ _id: 1, id: 1, name: 1, icon: 1 })
      .sort({ name: 1 })
      .toArray(),
    
    // Aggregation uses category_id index for grouping
    quotesCollection.aggregate([
      { $group: { _id: '$category_id', count: { $sum: 1 } } }
    ]).toArray()
  ]);

  // Build count map - O(n) in memory, not in DB
  const countMap = new Map<string, number>();
  quoteCounts.forEach((q: any) => {
    // Normalize all ID formats to string
    const key = normalizeId(q._id);
    if (key) countMap.set(key, q.count);
  });

  // Transform with O(1) count lookups
  const formattedCategories = categories.map((c: any) => {
    const categoryId = normalizeId(c._id);
    const legacyId = c.id ? String(c.id) : null;
    
    return {
      id: categoryId,
      name: c.name,
      icon: c.icon,
      // Check both ObjectId string and legacy numeric id
      count: countMap.get(categoryId) || (legacyId ? countMap.get(legacyId) : 0) || 0,
    };
  });

  cachedCategories = formattedCategories;
  cacheTime = Date.now();
  return formattedCategories;
}

export async function GET(request: NextRequest) {
  const endTimer = startTimer();
  
  try {
    const userId = getUserIdFromRequest(request);
    const isAuthenticated = !!userId;
    
    // Check for force refresh
    const { searchParams } = new URL(request.url);
    if (searchParams.get('refresh') === 'true') {
      invalidateCategoriesCache();
    }
    
    // Check if this is for onboarding (show all categories even for guests)
    const isOnboarding = searchParams.get('onboarding') === 'true';

    const categories = await getCategoriesFromCache();
    const totalCategories = categories.length;

    // For non-authenticated users, limit to only 1 category (unless onboarding)
    let limitedCategories = categories;
    if (!isAuthenticated && !isOnboarding) {
      limitedCategories = categories.slice(6, 7);
    }

    const duration = endTimer();
    const cached = duration < 50;
    
    // Record performance metric
    recordMetric('/api/categories', duration, cached, userId || undefined);

    const response = NextResponse.json(
      {
        categories: limitedCategories,
        totalCategories: totalCategories,
        isLimited: !isAuthenticated && !isOnboarding && totalCategories > 1,
        _meta: { responseTime: duration, cached }
      },
      { status: 200 }
    );

    // Aggressive caching - categories rarely change
    if (isAuthenticated) {
      response.headers.set('Cache-Control', 'private, max-age=300, stale-while-revalidate=600');
    } else {
      response.headers.set('Cache-Control', 'public, max-age=600, stale-while-revalidate=1200');
    }
    response.headers.set('Vary', 'Cookie');

    return response;
  } catch (error) {
    console.error('Get categories error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
