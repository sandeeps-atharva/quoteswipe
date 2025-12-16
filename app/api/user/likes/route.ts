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

    // Check if user already liked this quote
    const [existingLikes] = await pool.execute(
      'SELECT id FROM user_likes WHERE user_id = ? AND quote_id = ?',
      [userId, quoteId]
    ) as any[];

    if (Array.isArray(existingLikes) && existingLikes.length > 0) {
      return NextResponse.json(
        { message: 'Quote already liked', alreadyLiked: true },
        { status: 200 }
      );
    }

    // Remove dislike if exists (mutual exclusivity)
    await pool.execute(
      'DELETE FROM user_dislikes WHERE user_id = ? AND quote_id = ?',
      [userId, quoteId]
    );

    // Insert like (UNIQUE constraint ensures no duplicates)
    await pool.execute(
      'INSERT INTO user_likes (user_id, quote_id) VALUES (?, ?)',
      [userId, quoteId]
    );

    return NextResponse.json({ message: 'Quote liked' }, { status: 200 });
  } catch (error: any) {
    // Handle duplicate key error (shouldn't happen due to check above, but safety net)
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { message: 'Quote already liked', alreadyLiked: true },
        { status: 200 }
      );
    }
    console.error('Like quote error:', error);
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

    const [likes] = await pool.execute(
      `SELECT 
        q.id,
        q.text,
        q.author,
        c.name as category,
        c.icon as category_icon
      FROM user_likes ul
      INNER JOIN quotes q ON ul.quote_id = q.id
      INNER JOIN categories c ON q.category_id = c.id
      WHERE ul.user_id = ?
      ORDER BY ul.created_at DESC`,
      [userId]
    ) as any[];

    return NextResponse.json({ quotes: likes }, { status: 200 });
  } catch (error) {
    console.error('Get liked quotes error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

