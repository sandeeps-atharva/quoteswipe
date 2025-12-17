import { NextRequest, NextResponse } from 'next/server';
import { getCollection, toObjectId } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';

interface VisitorData {
  browserName: string;
  browserVersion: string;
  osName: string;
  osVersion: string;
  deviceType: 'Desktop' | 'Mobile' | 'Tablet' | 'Unknown';
  cpuCores: number | null;
  ramGb: number | null;
  screenWidth: number;
  screenHeight: number;
  userAgent: string;
  language: string;
  timezone: string;
  referrer: string;
}

// Get client IP from request headers
function getClientIP(request: NextRequest): string {
  // Check various headers for the real IP (in order of reliability)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  // Vercel specific
  const vercelForwardedFor = request.headers.get('x-vercel-forwarded-for');
  if (vercelForwardedFor) {
    return vercelForwardedFor.split(',')[0].trim();
  }

  // Fallback
  return '0.0.0.0';
}

export async function POST(request: NextRequest) {
  try {
    const body: VisitorData = await request.json();
    
    // Get IP from server-side
    const ipAddress = getClientIP(request);
    
    // Get user ID if authenticated
    const userId = getUserIdFromRequest(request);

    // Validate device type
    const validDeviceTypes = ['Desktop', 'Mobile', 'Tablet', 'Unknown'];
    const deviceType = validDeviceTypes.includes(body.deviceType) ? body.deviceType : 'Unknown';

    const visitorsCollection = await getCollection('visitors');

    // Insert visitor data into database
    await visitorsCollection.insertOne({
      ip_address: ipAddress,
      browser_name: body.browserName || null,
      browser_version: body.browserVersion || null,
      os_name: body.osName || null,
      os_version: body.osVersion || null,
      device_type: deviceType,
      cpu_cores: body.cpuCores || null,
      ram_gb: body.ramGb || null,
      screen_width: body.screenWidth || null,
      screen_height: body.screenHeight || null,
      user_agent: body.userAgent || null,
      language: body.language || null,
      timezone: body.timezone || null,
      referrer: body.referrer || null,
      user_id: userId || null,
      visited_at: new Date()
    } as any);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Visitor tracking error:', error);
    // Don't expose error details, but still return success to not break the user experience
    return NextResponse.json({ success: true });
  }
}

// GET endpoint to retrieve visitor stats (admin only)
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const usersCollection = await getCollection('users');
    const user: any = await usersCollection.findOne({ _id: toObjectId(userId) as any });

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const visitorsCollection = await getCollection('visitors');

    // Get visitor statistics
    const totalVisits = await visitorsCollection.countDocuments();

    const uniqueVisitorsResult = await visitorsCollection.aggregate([
      { $group: { _id: '$ip_address' } },
      { $count: 'unique_count' }
    ]).toArray() as any[];
    const uniqueVisitors = uniqueVisitorsResult[0]?.unique_count || 0;

    const deviceStats = await visitorsCollection.aggregate([
      { $group: { _id: '$device_type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray() as any[];

    const browserStats = await visitorsCollection.aggregate([
      { $match: { browser_name: { $ne: null } } },
      { $group: { _id: '$browser_name', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]).toArray() as any[];

    const osStats = await visitorsCollection.aggregate([
      { $match: { os_name: { $ne: null } } },
      { $group: { _id: '$os_name', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]).toArray() as any[];

    const recentVisitors = await visitorsCollection
      .find({})
      .sort({ visited_at: -1 })
      .limit(50)
      .toArray() as any[];

    // Daily stats for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyStats = await visitorsCollection.aggregate([
      { $match: { visited_at: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$visited_at' } },
          visits: { $sum: 1 },
          unique_visitors: { $addToSet: '$ip_address' }
        }
      },
      {
        $project: {
          date: '$_id',
          visits: 1,
          unique_visitors: { $size: '$unique_visitors' }
        }
      },
      { $sort: { date: -1 } }
    ]).toArray() as any[];

    return NextResponse.json({
      totalVisits,
      uniqueVisitors,
      deviceStats: deviceStats.map((d: any) => ({ device_type: d._id, count: d.count })),
      browserStats: browserStats.map(b => ({ browser_name: b._id, count: b.count })),
      osStats: osStats.map(o => ({ os_name: o._id, count: o.count })),
      recentVisitors: recentVisitors.map(v => ({
        ip_address: v.ip_address,
        browser_name: v.browser_name,
        os_name: v.os_name,
        device_type: v.device_type,
        screen_width: v.screen_width,
        screen_height: v.screen_height,
        visited_at: v.visited_at
      })),
      dailyStats,
    });
  } catch (error) {
    console.error('Get visitor stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
