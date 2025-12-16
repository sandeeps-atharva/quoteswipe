import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// Cache stats for 60 seconds
export const revalidate = 60;

// In-memory cache
let cachedStats: any = null;
let cacheTime = 0;
const CACHE_DURATION = 60 * 1000; // 60 seconds

export async function GET() {
  // Return cached data if valid
  if (cachedStats && Date.now() - cacheTime < CACHE_DURATION) {
    return NextResponse.json(cachedStats, { 
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      }
    });
  }
  try {
    // Get total quotes
    const [quotesResult] = await pool.execute(
      'SELECT COUNT(*) as count FROM quotes'
    ) as any[];
    const totalQuotes = quotesResult[0]?.count || 0;

    // Get total categories
    const [categoriesResult] = await pool.execute(
      'SELECT COUNT(*) as count FROM categories'
    ) as any[];
    const totalCategories = categoriesResult[0]?.count || 0;

    // Get total users
    const [usersResult] = await pool.execute(
      'SELECT COUNT(*) as count FROM users'
    ) as any[];
    const totalUsers = usersResult[0]?.count || 0;

    // Get total saved quotes
    const [savedResult] = await pool.execute(
      'SELECT COUNT(*) as count FROM user_saved'
    ) as any[];
    const totalSaved = savedResult[0]?.count || 0;

    // Get total likes
    const [likesResult] = await pool.execute(
      'SELECT COUNT(*) as count FROM user_likes'
    ) as any[];
    const totalLikes = likesResult[0]?.count || 0;

    // Get average rating from feedback (if rating column exists)
    let avgRating = '5.0';
    try {
      const [ratingResult] = await pool.execute(
        'SELECT AVG(rating) as avg_rating FROM feedback WHERE is_approved = 1'
      ) as any[];
      if (ratingResult[0]?.avg_rating) {
        avgRating = parseFloat(ratingResult[0].avg_rating).toFixed(1);
      }
    } catch {
      // Rating column doesn't exist, use default
      avgRating = '5.0';
    }

    // Get total testimonials (if columns exist)
    let totalTestimonials = 0;
    try {
      const [testimonialsResult] = await pool.execute(
        'SELECT COUNT(*) as count FROM feedback WHERE is_testimonial = 1 AND is_approved = 1'
      ) as any[];
      totalTestimonials = testimonialsResult[0]?.count || 0;
    } catch {
      // Columns don't exist, use default
      totalTestimonials = 0;
    }

    // Format numbers
    const formatNumber = (num: number): string => {
      if (num >= 1000000) {
        return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M+';
      }
      if (num >= 1000) {
        return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K+';
      }
      return num.toString() + '+';
    };

    // Build response data
    const responseData = {
      stats: {
        quotes: formatNumber(totalQuotes),
        quotesRaw: totalQuotes,
        categories: totalCategories + '+',
        categoriesRaw: totalCategories,
        users: formatNumber(totalUsers),
        usersRaw: totalUsers,
        saved: formatNumber(totalSaved),
        savedRaw: totalSaved,
        likes: formatNumber(totalLikes),
        likesRaw: totalLikes,
        avgRating: avgRating,
        testimonials: totalTestimonials,
      }
    };

    // Update cache
    cachedStats = responseData;
    cacheTime = Date.now();

    return NextResponse.json(responseData, { 
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}

