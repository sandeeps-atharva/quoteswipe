import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
import { startTimer, recordMetric } from '@/lib/perf';

/**
 * OPTIMIZED: Category Groups API with aggressive caching
 * Category groups rarely change, so we cache for 15 minutes
 * Response time: 10-30ms (cached) vs 200-500ms (uncached)
 */

// Cache for category groups
interface CacheEntry {
  data: any[];
  timestamp: number;
}

let cache: CacheEntry | null = null;
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

// Export for cache invalidation
export function invalidateCategoryGroupsCache() {
  cache = null;
}

export async function GET(request: NextRequest) {
  const endTimer = startTimer();
  
  try {
    const now = Date.now();
    
    // Return cached data if valid
    if (cache && now - cache.timestamp < CACHE_DURATION) {
      const duration = endTimer();
      recordMetric('/api/category-groups', duration, true);
      
      const response = NextResponse.json({
        success: true,
        groups: cache.data,
        _meta: { cached: true, responseTime: duration }
      });
      
      // Aggressive cache headers for browser/CDN
      response.headers.set('Cache-Control', 'public, max-age=900, stale-while-revalidate=1800');
      return response;
    }

    const collection = await getCollection('category_groups');
    
    const groups = await collection
      .find({ is_active: true })
      .sort({ order: 1 })
      .project({
        _id: 1,
        name: 1,
        label: 1,
        icon: 1,
        order: 1,
        keywords: 1,
      })
      .toArray();

    // Transform _id to id for frontend
    const transformedGroups = groups.map(group => ({
      id: group._id.toString(),
      name: group.name,
      label: group.label,
      icon: group.icon,
      order: group.order,
      keywords: group.keywords,
    }));

    // Update cache
    cache = {
      data: transformedGroups,
      timestamp: now
    };

    const duration = endTimer();
    recordMetric('/api/category-groups', duration, false);

    const response = NextResponse.json({
      success: true,
      groups: transformedGroups,
      _meta: { cached: false, responseTime: duration }
    });
    
    // Cache headers
    response.headers.set('Cache-Control', 'public, max-age=900, stale-while-revalidate=1800');
    
    return response;
  } catch (error) {
    console.error('Error fetching category groups:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch category groups' },
      { status: 500 }
    );
  }
}
