import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

// GET /api/admin/festivals - Get all festivals
export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const [festivals] = await pool.execute(`
      SELECT 
        f.*,
        COUNT(fq.id) as quotes_count
      FROM festivals f
      LEFT JOIN festival_quotes fq ON f.id = fq.festival_id
      GROUP BY f.id
      ORDER BY f.date ASC
    `);

    return NextResponse.json({ festivals });
  } catch (error) {
    console.error('Get festivals error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/festivals - Create a new festival
export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const { name, date, description } = await request.json();

    if (!name || !date) {
      return NextResponse.json(
        { error: 'Name and date are required' },
        { status: 400 }
      );
    }

    const [result] = await pool.execute(
      'INSERT INTO festivals (name, date, description) VALUES (?, ?, ?)',
      [name, date, description || null]
    ) as any;

    return NextResponse.json({
      message: 'Festival created successfully',
      festivalId: result.insertId,
    }, { status: 201 });
  } catch (error) {
    console.error('Create festival error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

