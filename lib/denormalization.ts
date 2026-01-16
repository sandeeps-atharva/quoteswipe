/**
 * Denormalization Utilities
 * 
 * Instead of aggregating like/dislike counts on every request,
 * we store them directly on quotes. This makes reads O(1) instead of O(n).
 * 
 * Call updateQuoteCounts() after each like/dislike operation.
 * Run updateAllQuoteCounts() as a periodic background job.
 */

import { getCollection, toObjectId, normalizeId } from './db';

/**
 * Update like/dislike counts for a single quote
 * Call this after a like/dislike/unlike/undislike operation
 * 
 * Fire-and-forget pattern: Don't await this in the API handler
 * to keep response times fast.
 * 
 * Usage:
 *   updateQuoteCounts(quoteId).catch(console.error);
 */
export async function updateQuoteCounts(quoteId: string | any): Promise<void> {
  try {
    const [likesCollection, dislikesCollection, quotesCollection] = await Promise.all([
      getCollection('user_likes'),
      getCollection('user_dislikes'),
      getCollection('quotes')
    ]);

    const quoteObjId = toObjectId(quoteId) as any;

    // Count likes and dislikes in parallel
    const [likeCount, dislikeCount] = await Promise.all([
      likesCollection.countDocuments({ quote_id: quoteObjId }),
      dislikesCollection.countDocuments({ quote_id: quoteObjId })
    ]);

    // Update the quote with counts
    await quotesCollection.updateOne(
      { _id: quoteObjId } as any,
      { 
        $set: { 
          likes_count: likeCount,
          dislikes_count: dislikeCount,
          counts_updated_at: new Date()
        } 
      }
    );
  } catch (error) {
    console.error(`[Denormalization] Failed to update counts for quote ${quoteId}:`, error);
  }
}

/**
 * Batch update all quote counts
 * Run this as a periodic background job (e.g., every 5 minutes)
 * 
 * Usage (in a cron job or scheduled task):
 *   await updateAllQuoteCounts();
 */
export async function updateAllQuoteCounts(): Promise<{ updated: number; duration: number }> {
  const startTime = Date.now();
  
  try {
    const [likesCollection, dislikesCollection, quotesCollection] = await Promise.all([
      getCollection('user_likes'),
      getCollection('user_dislikes'),
      getCollection('quotes')
    ]);

    // Aggregate counts in parallel
    const [likeCounts, dislikeCounts] = await Promise.all([
      likesCollection.aggregate([
        { $group: { _id: '$quote_id', count: { $sum: 1 } } }
      ]).toArray(),
      dislikesCollection.aggregate([
        { $group: { _id: '$quote_id', count: { $sum: 1 } } }
      ]).toArray()
    ]);

    // Create lookup maps
    const likeMap = new Map(
      likeCounts.map((l: any) => [normalizeId(l._id), l.count])
    );
    const dislikeMap = new Map(
      dislikeCounts.map((d: any) => [normalizeId(d._id), d.count])
    );

    // Get all quote IDs
    const quotes = await quotesCollection
      .find({})
      .project({ _id: 1 })
      .toArray();

    // Build bulk operations
    const bulkOps = quotes.map((q: any) => {
      const qid = normalizeId(q._id);
      return {
        updateOne: {
          filter: { _id: q._id },
          update: {
            $set: {
              likes_count: likeMap.get(qid) || 0,
              dislikes_count: dislikeMap.get(qid) || 0,
              counts_updated_at: new Date()
            }
          }
        }
      };
    });

    // Execute bulk update
    if (bulkOps.length > 0) {
      await quotesCollection.bulkWrite(bulkOps, { ordered: false });
    }

    const duration = Date.now() - startTime;
    console.log(`[Denormalization] Updated ${bulkOps.length} quotes in ${duration}ms`);

    return { updated: bulkOps.length, duration };
  } catch (error) {
    console.error('[Denormalization] Batch update failed:', error);
    throw error;
  }
}

/**
 * Get quotes with their current counts (for verification)
 */
export async function getQuotesWithCounts(limit: number = 10): Promise<any[]> {
  const quotesCollection = await getCollection('quotes');
  
  return quotesCollection
    .find({})
    .project({ 
      _id: 1, 
      text: 1, 
      likes_count: 1, 
      dislikes_count: 1, 
      counts_updated_at: 1 
    })
    .sort({ likes_count: -1 })
    .limit(limit)
    .toArray();
}
