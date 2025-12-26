import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Verify admin access
async function verifyAdmin(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  
  if (!token) return null;
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role?: string };
    if (decoded.role !== 'admin') return null;
    return decoded;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = await getDb();
    
    // Get counts in parallel
    const [
      totalUsers,
      totalQuotes,
      totalCategories,
      totalLikes,
      totalSaved,
      totalUserQuotes,
      totalReviews,
      recentUsers,
      topCategories,
      emailStats,
    ] = await Promise.all([
      // Total users
      db.collection('users').countDocuments(),
      
      // Total quotes
      db.collection('quotes').countDocuments(),
      
      // Total categories
      db.collection('categories').countDocuments(),
      
      // Total likes (sum of all user likes)
      db.collection('users').aggregate([
        { $project: { likesCount: { $size: { $ifNull: ['$liked_quotes', []] } } } },
        { $group: { _id: null, total: { $sum: '$likesCount' } } }
      ]).toArray().then(r => r[0]?.total || 0),
      
      // Total saved
      db.collection('users').aggregate([
        { $project: { savedCount: { $size: { $ifNull: ['$saved_quotes', []] } } } },
        { $group: { _id: null, total: { $sum: '$savedCount' } } }
      ]).toArray().then(r => r[0]?.total || 0),
      
      // Total user-created quotes
      db.collection('user_quotes').countDocuments(),
      
      // Total reviews
      db.collection('reviews').countDocuments(),
      
      // Recent users (last 7 days)
      db.collection('users').countDocuments({
        created_at: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      }),
      
      // Top categories by quote count
      db.collection('quotes').aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        { $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: 'name',
          as: 'categoryInfo'
        }},
        { $project: {
          name: '$_id',
          count: 1,
          icon: { $arrayElemAt: ['$categoryInfo.icon', 0] }
        }}
      ]).toArray(),
      
      // Email campaign stats
      db.collection('email_campaigns').aggregate([
        { $group: {
          _id: null,
          totalCampaigns: { $sum: 1 },
          totalSent: { $sum: '$sent_count' },
          totalFailed: { $sum: '$failed_count' }
        }}
      ]).toArray().then(r => r[0] || { totalCampaigns: 0, totalSent: 0, totalFailed: 0 }),
    ]);

    // Calculate growth (mock for now - you can implement real growth tracking)
    const userGrowth = recentUsers > 0 ? `+${recentUsers}` : '0';
    
    return NextResponse.json({
      success: true,
      stats: {
        overview: {
          totalUsers,
          totalQuotes,
          totalCategories,
          totalLikes,
          totalSaved,
          totalUserQuotes,
          totalReviews,
          userGrowth,
        },
        email: {
          totalCampaigns: emailStats.totalCampaigns || 0,
          totalSent: emailStats.totalSent || 0,
          totalFailed: emailStats.totalFailed || 0,
          successRate: emailStats.totalSent > 0 
            ? Math.round((emailStats.totalSent / (emailStats.totalSent + emailStats.totalFailed)) * 100) 
            : 100,
        },
        topCategories,
        recentUsersCount: recentUsers,
      }
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}

