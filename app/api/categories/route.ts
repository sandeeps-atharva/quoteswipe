import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';

// In-memory cache for categories (doesn't change often)
let cachedCategories: any[] | null = null;
let cacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function getCategoriesFromCache() {
  if (cachedCategories && Date.now() - cacheTime < CACHE_DURATION) {
    return cachedCategories;
  }
  
  const [categories] = await pool.execute(
    `SELECT 
      c.id,
      c.name,
      c.icon,
      COUNT(q.id) as count
    FROM categories c
    LEFT JOIN quotes q ON q.category_id = c.id
    GROUP BY c.id, c.name, c.icon
    ORDER BY c.name`
  ) as any[];
  
  cachedCategories = categories;
  cacheTime = Date.now();
  return categories;
}

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    const isAuthenticated = !!userId;

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

