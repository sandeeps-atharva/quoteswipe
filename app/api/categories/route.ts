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
  const quotesCollection = await getCollection('quotes');

  // Get all categories
  const categories = await categoriesCollection.find({}).sort({ name: 1 }).toArray() as any[];

  // Get quote counts per category
  const quoteCounts = await quotesCollection.aggregate([
    { $group: { _id: '$category_id', count: { $sum: 1 } } }
  ]).toArray() as any[];
  
  // Create count map with string keys for consistent lookup
  // Use .toString() which works correctly for MongoDB ObjectId
  const countMap = new Map<string, number>();
  quoteCounts.forEach((q: any) => {
    const key = q._id?.toString ? q._id.toString() : String(q._id);
    countMap.set(key, q.count);
  });

  // Format categories with counts
  const formattedCategories = categories.map((c: any) => {
    // Convert ObjectId to string using .toString() method
    const categoryId = c._id?.toString ? c._id.toString() : String(c._id);
    const count = countMap.get(categoryId) || 0;
    
    return {
      id: categoryId,
      name: c.name,
      icon: c.icon,
      count: count,
    };
  });

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

    const categories = await getCategoriesFromCache();

    const totalCategories = categories.length;

    // For non-authenticated users, limit to only 1 category
    let limitedCategories = categories;
    if (!isAuthenticated) {
      limitedCategories = categories.slice(0, 1);
    }

    const response = NextResponse.json(
      {
        categories: limitedCategories,
        totalCategories: totalCategories, // Total count for login prompt
        isLimited: !isAuthenticated && totalCategories > 1
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
