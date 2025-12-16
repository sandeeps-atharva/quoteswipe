import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';
import { invalidateQuotesCache } from '@/app/api/quotes/route';

// GET - Fetch a single quote
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const quoteId = parseInt(id);

    if (isNaN(quoteId)) {
      return NextResponse.json({ error: 'Invalid quote ID' }, { status: 400 });
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
      WHERE uq.id = ? AND uq.user_id = ?`,
      [quoteId, userId]
    ) as any[];

    if (!quotes || quotes.length === 0) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    return NextResponse.json({ quote: quotes[0] }, { status: 200 });
  } catch (error) {
    console.error('Get user quote error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update a quote
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const quoteId = parseInt(id);

    if (isNaN(quoteId)) {
      return NextResponse.json({ error: 'Invalid quote ID' }, { status: 400 });
    }

    // Check if quote exists and belongs to user (also get current is_public status)
    const [existing] = await pool.execute(
      'SELECT id, is_public FROM user_quotes WHERE id = ? AND user_id = ?',
      [quoteId, userId]
    ) as any[];

    if (!existing || existing.length === 0) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    const wasPublic = existing[0].is_public === 1;
    const body = await request.json();
    const { text, author, categoryId, themeId, fontId, backgroundId, isPublic } = body;

    // Validation
    if (text !== undefined) {
      if (text.trim().length === 0) {
        return NextResponse.json(
          { error: 'Quote text cannot be empty' },
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
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];

    if (text !== undefined) {
      updates.push('text = ?');
      values.push(text.trim());
    }
    if (author !== undefined) {
      updates.push('author = ?');
      values.push(author.trim() || 'Me');
    }
    if (categoryId !== undefined) {
      updates.push('category_id = ?');
      values.push(categoryId || null);
    }
    if (themeId !== undefined) {
      updates.push('theme_id = ?');
      values.push(themeId);
    }
    if (fontId !== undefined) {
      updates.push('font_id = ?');
      values.push(fontId);
    }
    if (backgroundId !== undefined) {
      updates.push('background_id = ?');
      values.push(backgroundId);
    }
    if (isPublic !== undefined) {
      updates.push('is_public = ?');
      values.push(isPublic ? 1 : 0);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    values.push(quoteId, userId);

    await pool.execute(
      `UPDATE user_quotes SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      values
    );

    // Fetch updated quote
    const [updatedQuote] = await pool.execute(
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
      WHERE uq.id = ?`,
      [quoteId]
    ) as any[];

    const isNowPublic = updatedQuote[0]?.is_public === 1;

    // Invalidate cache if:
    // 1. Quote was public and got updated (content change visible to others)
    // 2. Quote visibility changed (from private to public or vice versa)
    if (wasPublic || isNowPublic) {
      invalidateQuotesCache();
    }

    return NextResponse.json(
      { message: 'Quote updated successfully', quote: updatedQuote[0], cacheInvalidated: wasPublic || isNowPublic },
      { status: 200 }
    );
  } catch (error) {
    console.error('Update user quote error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a quote
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const quoteId = parseInt(id);

    if (isNaN(quoteId)) {
      return NextResponse.json({ error: 'Invalid quote ID' }, { status: 400 });
    }

    // Check if quote exists and belongs to user (also get is_public status for cache invalidation)
    const [existing] = await pool.execute(
      'SELECT id, is_public FROM user_quotes WHERE id = ? AND user_id = ?',
      [quoteId, userId]
    ) as any[];

    if (!existing || existing.length === 0) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    const wasPublic = existing[0].is_public === 1;

    // Delete the quote
    await pool.execute(
      'DELETE FROM user_quotes WHERE id = ? AND user_id = ?',
      [quoteId, userId]
    );

    // If the quote was public, invalidate the quotes cache
    if (wasPublic) {
      invalidateQuotesCache();
    }

    return NextResponse.json(
      { message: 'Quote deleted successfully', cacheInvalidated: wasPublic },
      { status: 200 }
    );
  } catch (error) {
    console.error('Delete user quote error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
