import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';
import { invalidateQuotesCache } from '@/app/api/quotes/route';

// GET - Fetch all user's quotes (both public and private)
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [quotes] = await pool.execute(
      `SELECT 
        uq.id,
        uq.text,
        uq.author,
        uq.theme_id,
        uq.font_id,
        uq.background_id,
        uq.is_public,
        uq.category_id,
        uq.created_at,
        uq.updated_at,
        c.name as category,
        c.icon as category_icon
      FROM user_quotes uq
      LEFT JOIN categories c ON uq.category_id = c.id
      WHERE uq.user_id = ?
      ORDER BY uq.created_at DESC`,
      [userId]
    ) as any[];

    return NextResponse.json({ quotes }, { status: 200 });
  } catch (error) {
    console.error('Get user quotes error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new quote
export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { text, author, categoryId, themeId, fontId, backgroundId, isPublic } = body;

    // Validation
    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Quote text is required' },
        { status: 400 }
      );
    }

    if (text.length < 10) {
      return NextResponse.json(
        { error: 'Quote must be at least 10 characters' },
        { status: 400 }
      );
    }

    if (text.length > 500) {
      return NextResponse.json(
        { error: 'Quote must be less than 500 characters' },
        { status: 400 }
      );
    }

    // Rate limiting - max 10 quotes per day
    const [quotesToday] = await pool.execute(
      `SELECT COUNT(*) as count FROM user_quotes 
       WHERE user_id = ? AND DATE(created_at) = CURDATE()`,
      [userId]
    ) as any[];

    if (quotesToday[0]?.count >= 10) {
      return NextResponse.json(
        { error: 'You can only create 10 quotes per day' },
        { status: 429 }
      );
    }

    // Insert the quote
    const [result] = await pool.execute(
      `INSERT INTO user_quotes (user_id, text, author, category_id, theme_id, font_id, background_id, is_public)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        text.trim(),
        author?.trim() || 'Me',
        categoryId || null,
        themeId || 'default',
        fontId || 'default',
        backgroundId || 'none',
        isPublic ? 1 : 0
      ]
    ) as any;

    const insertId = result.insertId;

    // Fetch the created quote with category info
    const [newQuote] = await pool.execute(
      `SELECT 
        uq.id,
        uq.text,
        uq.author,
        uq.theme_id,
        uq.font_id,
        uq.background_id,
        uq.is_public,
        uq.category_id,
        uq.created_at,
        c.name as category,
        c.icon as category_icon
      FROM user_quotes uq
      LEFT JOIN categories c ON uq.category_id = c.id
      WHERE uq.id = ?`,
      [insertId]
    ) as any[];

    // If the quote is public, invalidate the quotes cache so it appears in the feed
    if (isPublic) {
      invalidateQuotesCache();
    }

    return NextResponse.json(
      { message: 'Quote created successfully', quote: newQuote[0], cacheInvalidated: isPublic },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create user quote error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
