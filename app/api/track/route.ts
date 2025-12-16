import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
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

    // Insert visitor data into database
    await pool.execute(
      `INSERT INTO visitors (
        ip_address,
        browser_name,
        browser_version,
        os_name,
        os_version,
        device_type,
        cpu_cores,
        ram_gb,
        screen_width,
        screen_height,
        user_agent,
        language,
        timezone,
        referrer,
        user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ipAddress,
        body.browserName || null,
        body.browserVersion || null,
        body.osName || null,
        body.osVersion || null,
        deviceType,
        body.cpuCores || null,
        body.ramGb || null,
        body.screenWidth || null,
        body.screenHeight || null,
        body.userAgent || null,
        body.language || null,
        body.timezone || null,
        body.referrer || null,
        userId || null,
      ]
    );

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

    // Check if user is admin
    const [users] = await pool.execute(
      'SELECT role FROM users WHERE id = ?',
      [userId]
    ) as any[];

    if (users.length === 0 || users[0].role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get visitor statistics
    const [totalVisits] = await pool.execute(
      'SELECT COUNT(*) as total FROM visitors'
    ) as any[];

    const [uniqueVisitors] = await pool.execute(
      'SELECT COUNT(DISTINCT ip_address) as unique_count FROM visitors'
    ) as any[];

    const [deviceStats] = await pool.execute(
      `SELECT device_type, COUNT(*) as count 
       FROM visitors 
       GROUP BY device_type 
       ORDER BY count DESC`
    ) as any[];

    const [browserStats] = await pool.execute(
      `SELECT browser_name, COUNT(*) as count 
       FROM visitors 
       WHERE browser_name IS NOT NULL
       GROUP BY browser_name 
       ORDER BY count DESC 
       LIMIT 10`
    ) as any[];

    const [osStats] = await pool.execute(
      `SELECT os_name, COUNT(*) as count 
       FROM visitors 
       WHERE os_name IS NOT NULL
       GROUP BY os_name 
       ORDER BY count DESC 
       LIMIT 10`
    ) as any[];

    const [recentVisitors] = await pool.execute(
      `SELECT ip_address, browser_name, os_name, device_type, screen_width, screen_height, visited_at
       FROM visitors 
       ORDER BY visited_at DESC 
       LIMIT 50`
    ) as any[];

    const [dailyStats] = await pool.execute(
      `SELECT 
         DATE(visited_at) as date,
         COUNT(*) as visits,
         COUNT(DISTINCT ip_address) as unique_visitors
       FROM visitors 
       WHERE visited_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
       GROUP BY DATE(visited_at)
       ORDER BY date DESC`
    ) as any[];

    return NextResponse.json({
      totalVisits: totalVisits[0].total,
      uniqueVisitors: uniqueVisitors[0].unique_count,
      deviceStats,
      browserStats,
      osStats,
      recentVisitors,
      dailyStats,
    });
  } catch (error) {
    console.error('Get visitor stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

