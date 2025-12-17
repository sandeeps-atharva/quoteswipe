import { NextRequest, NextResponse } from 'next/server';
import { getCollection, toObjectId } from '@/lib/db';
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

    const userQuotesCollection = await getCollection('user_quotes');
    const categoriesCollection = await getCollection('categories');

    // Find quote by id or _id
    const quote: any = await userQuotesCollection.findOne({
      $and: [
        { user_id: userId },
        { $or: [{ id: id }, { _id: toObjectId(id) as any }] }
      ]
    });

    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    // Get category info
    let category: any = null;
    if (quote.category_id) {
      category = await categoriesCollection.findOne({
        $or: [{ id: quote.category_id }, { _id: quote.category_id }]
      });
    }

    const formattedQuote = {
      id: quote.id || quote._id?.toString(),
      text: quote.text,
      author: quote.author,
      theme_id: quote.theme_id,
      font_id: quote.font_id,
      background_id: quote.background_id,
      is_public: quote.is_public,
      category_id: quote.category_id,
      created_at: quote.created_at,
      updated_at: quote.updated_at,
      category: category?.name || 'Personal',
      category_icon: category?.icon || '✨',
      custom_background: quote.custom_background
    };

    return NextResponse.json({ quote: formattedQuote }, { status: 200 });
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

    const userQuotesCollection = await getCollection('user_quotes');
    const categoriesCollection = await getCollection('categories');

    // Check if quote exists and belongs to user
    const existing: any = await userQuotesCollection.findOne({
      $and: [
        { user_id: userId },
        { $or: [{ id: id }, { _id: toObjectId(id) as any }] }
      ]
    });

    if (!existing) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    const wasPublic = existing.is_public === true;
    const body = await request.json();
    const { text, author, categoryId, themeId, fontId, backgroundId, isPublic, customBackground } = body;

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

    // Build update object
    const updates: any = { updated_at: new Date() };

    if (text !== undefined) updates.text = text.trim();
    if (author !== undefined) updates.author = author.trim() || 'Me';
    if (categoryId !== undefined) updates.category_id = categoryId || null;
    if (themeId !== undefined) updates.theme_id = themeId;
    if (fontId !== undefined) updates.font_id = fontId;
    if (backgroundId !== undefined) updates.background_id = backgroundId;
    if (isPublic !== undefined) updates.is_public = isPublic ? true : false;
    if (customBackground !== undefined) updates.custom_background = customBackground;

    if (Object.keys(updates).length === 1) { // Only updated_at
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Update quote
    await userQuotesCollection.updateOne(
      { $or: [{ id: id }, { _id: toObjectId(id) as any }] },
      { $set: updates }
    );

    // Fetch updated quote
    const updatedQuote: any = await userQuotesCollection.findOne({
      $or: [{ id: id }, { _id: toObjectId(id) as any }]
    });

    // Get category info
    let category: any = null;
    if (updatedQuote?.category_id) {
      category = await categoriesCollection.findOne({
        $or: [{ id: updatedQuote.category_id }, { _id: updatedQuote.category_id }]
      });
    }

    const isNowPublic = updatedQuote?.is_public === true;

    // Invalidate cache if visibility changed
    if (wasPublic || isNowPublic) {
      invalidateQuotesCache();
    }

    const formattedQuote = {
      id: updatedQuote?.id || updatedQuote?._id?.toString(),
      text: updatedQuote?.text,
      author: updatedQuote?.author,
      theme_id: updatedQuote?.theme_id,
      font_id: updatedQuote?.font_id,
      background_id: updatedQuote?.background_id,
      is_public: updatedQuote?.is_public,
      category_id: updatedQuote?.category_id,
      created_at: updatedQuote?.created_at,
      updated_at: updatedQuote?.updated_at,
      category: category?.name || 'Personal',
      category_icon: category?.icon || '✨',
      custom_background: updatedQuote?.custom_background
    };

    return NextResponse.json(
      { message: 'Quote updated successfully', quote: formattedQuote, cacheInvalidated: wasPublic || isNowPublic },
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

    const userQuotesCollection = await getCollection('user_quotes');

    // Check if quote exists and belongs to user
    const existing: any = await userQuotesCollection.findOne({
      $and: [
        { user_id: userId },
        { $or: [{ id: id }, { _id: toObjectId(id) as any }] }
      ]
    });

    if (!existing) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    const wasPublic = existing.is_public === true;

    // Delete the quote
    await userQuotesCollection.deleteOne({
      $and: [
        { user_id: userId },
        { $or: [{ id: id }, { _id: toObjectId(id) as any }] }
      ]
    });

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
