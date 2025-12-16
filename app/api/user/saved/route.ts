import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { quoteId } = await request.json();
    if (!quoteId) {
      return NextResponse.json(
        { error: 'Quote ID is required' },
        { status: 400 }
      );
    }

    await pool.execute(
      'INSERT IGNORE INTO user_saved (user_id, quote_id) VALUES (?, ?)',
      [userId, quoteId]
    );

    return NextResponse.json({ message: 'Quote saved' }, { status: 200 });
  } catch (error) {
    console.error('Save quote error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [saved] = await pool.execute(
      `SELECT 
        q.id,
        q.text,
        q.author,
        c.name as category,
        c.icon as category_icon
      FROM user_saved us
      INNER JOIN quotes q ON us.quote_id = q.id
      INNER JOIN categories c ON q.category_id = c.id
      WHERE us.user_id = ?
      ORDER BY us.created_at DESC`,
      [userId]
    ) as any[];

    return NextResponse.json({ quotes: saved }, { status: 200 });
  } catch (error) {
    console.error('Get saved quotes error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { quoteId } = await request.json();
    if (!quoteId) {
      return NextResponse.json(
        { error: 'Quote ID is required' },
        { status: 400 }
      );
    }

    await pool.execute(
      'DELETE FROM user_saved WHERE user_id = ? AND quote_id = ?',
      [userId, quoteId]
    );

    return NextResponse.json({ message: 'Quote removed from collection' }, { status: 200 });
  } catch (error) {
    console.error('Delete saved quote error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

