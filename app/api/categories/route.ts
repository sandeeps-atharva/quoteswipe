import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';

// In-memory cache for categories (doesn't change often)
let cachedCategories: any[] | null = null;
let cacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Export function to invalidate cache
export function invalidateCategoriesCache() {
  cachedCategories = null;
  cacheTime = 0;
}

async function getCategoriesFromCache() {
  if (cachedCategories && Date.now() - cacheTime < CACHE_DURATION) {
    return cachedCategories;
  }

  const categoriesCollection = await getCollection('categories');

  // OPTIMIZED: Single aggregation with $lookup - replaces 2 queries
  const formattedCategories = await categoriesCollection.aggregate([
    { $sort: { name: 1 } },
    
    // Lookup quote counts for each category
    {
      $lookup: {
        from: 'quotes',
        let: { catId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $or: [
                  { $eq: ['$category_id', '$$catId'] },
                  { $eq: ['$category_id', { $toString: '$$catId' }] }
                ]
              }
            }
          },
          { $count: 'count' }
        ],
        as: 'quoteCount'
      }
    },
    
    // Project final shape
    {
      $project: {
        id: { $toString: '$_id' },
        name: 1,
        icon: 1,
        count: { $ifNull: [{ $arrayElemAt: ['$quoteCount.count', 0] }, 0] }
      }
    }
  ]).toArray() as any[];

  cachedCategories = formattedCategories;
  cacheTime = Date.now();
  return formattedCategories;
}

export async function GET(request: NextRequest) {
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

    const response = NextResponse.json(
      {
        categories: limitedCategories,
        totalCategories: totalCategories, // Total count for login prompt
        isLimited: !isAuthenticated && !isOnboarding && totalCategories > 1
      },
      { status: 200 }
    );

    // Use private cache - different response based on auth status
    // Vary by Cookie ensures authenticated vs guest get different cached responses
    response.headers.set('Cache-Control', 'private, max-age=300');
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
