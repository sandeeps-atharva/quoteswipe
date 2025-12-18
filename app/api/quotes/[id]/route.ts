import { NextRequest, NextResponse } from 'next/server';
import { getCollection, toObjectId, isValidObjectId } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';

// Types for quote responses
interface QuoteResponse {
  id: string;
  text: string;
  author: string;
  category: string;
  category_icon: string;
  category_id: string;
  likes_count: number;
  dislikes_count: number;
  quote_type: 'regular' | 'user';
  creator_id: string | null;
  creator_name: string | null;
  is_public?: boolean | number;
  custom_background?: string;
  is_liked: number;
  is_saved: number;
  is_own_quote: number;
}

// Build flexible query for ID matching (supports both string id and ObjectId _id)
function buildIdQuery(id: string): object {
  const conditions: object[] = [{ id }];
  if (isValidObjectId(id)) {
    conditions.push({ _id: toObjectId(id) });
  }
  return { $or: conditions };
}

// Get category info from map
function getCategoryFromMap(
  categoryMap: Map<string, { name: string; icon: string }>,
  categoryId: string | undefined
): { name: string; icon: string } {
  const category = categoryMap.get(String(categoryId));
  return category || { name: 'General', icon: '💭' };
}

/**
 * GET /api/quotes/[id] - Fetch a single quote by ID
 * Supports both regular quotes and user quotes (with user_ prefix)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = getUserIdFromRequest(request);

    // Parse quote type from ID
    const isUserQuote = id.startsWith('user_');
    const actualId = isUserQuote ? id.replace('user_', '') : id;

    // Get categories for mapping (needed for both quote types)
    const categoriesCollection = await getCollection('categories');
    const allCategories = await categoriesCollection.find({}).toArray() as any[];
    const categoryMap = new Map(
      allCategories.map((c: any) => [
        String(c.id || c._id),
        { name: c.name, icon: c.icon }
      ])
    );

    let quote: QuoteResponse | null = null;

    if (isUserQuote) {
      quote = await fetchUserQuote(actualId, categoryMap, userId);
    } else {
      quote = await fetchRegularQuote(actualId, categoryMap, userId);
    }

    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    return NextResponse.json({ quote }, { status: 200 });
  } catch (error) {
    console.error('Get quote by ID error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Fetch a user-created quote
 */
async function fetchUserQuote(
  id: string,
  categoryMap: Map<string, { name: string; icon: string }>,
  userId: string | null
): Promise<QuoteResponse | null> {
  const [userQuotesCollection, usersCollection] = await Promise.all([
    getCollection('user_quotes'),
    getCollection('users'),
  ]);

  const rawQuote = await userQuotesCollection.findOne(buildIdQuery(id)) as any;
  if (!rawQuote) return null;

  // Get creator name
  let creatorName = 'Anonymous';
  if (rawQuote.user_id) {
    const user = await usersCollection.findOne({
      $or: [
        { _id: toObjectId(rawQuote.user_id) },
        { id: rawQuote.user_id }
      ]
    }) as any;
    if (user) creatorName = user.name;
  }

  const { name: categoryName, icon: categoryIcon } = getCategoryFromMap(categoryMap, rawQuote.category_id);

  return {
    id: `user_${rawQuote.id || rawQuote._id}`,
    text: rawQuote.text,
    author: rawQuote.author,
    category: categoryName || 'Personal',
    category_icon: categoryIcon || '✨',
    category_id: rawQuote.category_id,
    likes_count: 0,
    dislikes_count: 0,
    quote_type: 'user',
    creator_id: rawQuote.user_id,
    creator_name: creatorName,
    is_public: rawQuote.is_public,
    custom_background: rawQuote.custom_background,
    is_liked: 0,
    is_saved: 0,
    is_own_quote: userId && String(rawQuote.user_id) === String(userId) ? 1 : 0,
  };
}

/**
 * Fetch a regular quote with engagement data
 */
async function fetchRegularQuote(
  id: string,
  categoryMap: Map<string, { name: string; icon: string }>,
  userId: string | null
): Promise<QuoteResponse | null> {
  const [quotesCollection, likesCollection, dislikesCollection, savedCollection] = await Promise.all([
    getCollection('quotes'),
    getCollection('user_likes'),
    getCollection('user_dislikes'),
    getCollection('user_saved'),
  ]);

  const rawQuote = await quotesCollection.findOne(buildIdQuery(id)) as any;
  if (!rawQuote) return null;

  const quoteId = rawQuote.id || rawQuote._id?.toString();
  const { name: categoryName, icon: categoryIcon } = getCategoryFromMap(categoryMap, rawQuote.category_id);

  // Fetch engagement data in parallel
  const [likeCount, dislikeCount, userLike, userSave] = await Promise.all([
    likesCollection.countDocuments({ quote_id: quoteId }),
    dislikesCollection.countDocuments({ quote_id: quoteId }),
    userId ? likesCollection.findOne({ user_id: userId, quote_id: quoteId }) : null,
    userId ? savedCollection.findOne({ user_id: userId, quote_id: quoteId }) : null,
  ]);

  return {
    id: quoteId,
    text: rawQuote.text,
    author: rawQuote.author,
    category: categoryName,
    category_icon: categoryIcon,
    category_id: rawQuote.category_id,
    likes_count: likeCount,
    dislikes_count: dislikeCount,
    quote_type: 'regular',
    creator_id: null,
    creator_name: null,
    is_liked: userLike ? 1 : 0,
    is_saved: userSave ? 1 : 0,
    is_own_quote: 0,
  };
}
