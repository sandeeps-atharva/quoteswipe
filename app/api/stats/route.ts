import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';

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
    const quotesCollection = await getCollection('quotes');
    const categoriesCollection = await getCollection('categories');
    const usersCollection = await getCollection('users');
    const savedCollection = await getCollection('user_saved');
    const likesCollection = await getCollection('user_likes');
    const feedbackCollection = await getCollection('feedback');

    // OPTIMIZED: Run all counts in parallel using estimatedDocumentCount (faster)
    // and aggregation for computed values
    const [
      totalQuotes,
      totalCategories,
      totalUsers,
      totalSaved,
      totalLikes,
      feedbackStats
    ] = await Promise.all([
      quotesCollection.estimatedDocumentCount(),
      categoriesCollection.estimatedDocumentCount(),
      usersCollection.estimatedDocumentCount(),
      savedCollection.estimatedDocumentCount(),
      likesCollection.estimatedDocumentCount(),
      // Single aggregation for feedback stats with $facet
      feedbackCollection.aggregate([
        {
          $facet: {
            avgRating: [
              { $match: { $or: [{ is_approved: true }, { is_approved: 1 }], rating: { $exists: true } } },
              { $group: { _id: null, avg: { $avg: '$rating' } } }
            ],
            testimonials: [
              { 
                $match: { 
                  $and: [
                    { $or: [{ is_testimonial: true }, { is_testimonial: 1 }] },
                    { $or: [{ is_approved: true }, { is_approved: 1 }] }
                  ]
                } 
              },
              { $count: 'count' }
            ]
          }
        }
      ]).toArray()
    ]);

    // Extract feedback stats
    const fbStats = feedbackStats[0] || {};
    const avgRating = fbStats.avgRating?.[0]?.avg 
      ? parseFloat(fbStats.avgRating[0].avg).toFixed(1) 
      : '5.0';
    const totalTestimonials = fbStats.testimonials?.[0]?.count || 0;

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
