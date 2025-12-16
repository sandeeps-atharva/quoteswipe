import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

// GET /api/admin/users - Get all users (admin only)
export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    let users;
    let total = 0;

    if (search) {
      // With search filter
      const searchPattern = `%${search}%`;
      
      // Use query instead of execute to avoid prepared statement issues with LIMIT
      const [userResults] = await pool.query(`
        SELECT 
          id, name, email, COALESCE(role, 'user') as role, created_at,
          (SELECT COUNT(*) FROM user_likes WHERE user_id = users.id) as likes_count,
          (SELECT COUNT(*) FROM user_saved WHERE user_id = users.id) as saved_count
        FROM users
        WHERE name LIKE ? OR email LIKE ?
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `, [searchPattern, searchPattern]);
      
      users = userResults;

      const [countResult] = await pool.query(
        'SELECT COUNT(*) as total FROM users WHERE name LIKE ? OR email LIKE ?',
        [searchPattern, searchPattern]
      );
      total = Array.isArray(countResult) && countResult.length > 0 
        ? (countResult[0] as { total: number }).total 
        : 0;
    } else {
      // No search filter - use query with inline LIMIT/OFFSET
      const [userResults] = await pool.query(`
        SELECT 
          id, name, email, COALESCE(role, 'user') as role, created_at,
          (SELECT COUNT(*) FROM user_likes WHERE user_id = users.id) as likes_count,
          (SELECT COUNT(*) FROM user_saved WHERE user_id = users.id) as saved_count
        FROM users
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `);
      
      users = userResults;

      const [countResult] = await pool.query('SELECT COUNT(*) as total FROM users');
      total = Array.isArray(countResult) && countResult.length > 0 
        ? (countResult[0] as { total: number }).total 
        : 0;
    }

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

