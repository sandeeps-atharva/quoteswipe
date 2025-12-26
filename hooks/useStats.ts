'use client';

import { useState, useCallback } from 'react';
import { apiCache, CACHE_KEYS, CACHE_TTL } from '@/lib/api-cache';

// Types
interface Stats {
  totalQuotes: number;
  totalCategories: number;
  totalUsers: number;
  totalLikes: number;
  [key: string]: unknown;
}

interface Review {
  _id: string;
  name: string;
  rating: number;
  comment: string;
  createdAt: string;
  [key: string]: unknown;
}

interface UseStatsReturn {
  stats: Stats | null;
  reviews: Review[];
  isLoadingStats: boolean;
  isLoadingReviews: boolean;
  
  // Fetch functions
  fetchStats: (force?: boolean) => Promise<Stats | null>;
  fetchReviews: (force?: boolean) => Promise<Review[]>;
  
  // Invalidate
  invalidateStats: () => void;
  invalidateReviews: () => void;
}

export function useStats(): UseStatsReturn {
  const [stats, setStats] = useState<Stats | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);

  const fetchStats = useCallback(async (force = false): Promise<Stats | null> => {
    try {
      setIsLoadingStats(true);
      if (force) apiCache.invalidate(CACHE_KEYS.STATS);
      
      const data = await apiCache.getOrFetch<Stats | null>(
        CACHE_KEYS.STATS,
        async () => {
          const response = await fetch('/api/stats');
          if (!response.ok) return null;
          return await response.json();
        },
        { ttl: CACHE_TTL.VERY_LONG } // Stats don't change often
      );
      
      setStats(data);
      return data;
    } catch (error) {
      console.error('Error fetching stats:', error);
      return null;
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  const fetchReviews = useCallback(async (force = false): Promise<Review[]> => {
    try {
      setIsLoadingReviews(true);
      if (force) apiCache.invalidate(CACHE_KEYS.REVIEWS);
      
      const data = await apiCache.getOrFetch<Review[]>(
        CACHE_KEYS.REVIEWS,
        async () => {
          const response = await fetch('/api/reviews');
          if (!response.ok) return [];
          const json = await response.json();
          return json.reviews || [];
        },
        { ttl: CACHE_TTL.LONG } // Reviews don't change often
      );
      
      setReviews(data);
      return data;
    } catch (error) {
      console.error('Error fetching reviews:', error);
      return [];
    } finally {
      setIsLoadingReviews(false);
    }
  }, []);

  const invalidateStats = useCallback(() => {
    apiCache.invalidate(CACHE_KEYS.STATS);
  }, []);

  const invalidateReviews = useCallback(() => {
    apiCache.invalidate(CACHE_KEYS.REVIEWS);
  }, []);

  return {
    stats,
    reviews,
    isLoadingStats,
    isLoadingReviews,
    fetchStats,
    fetchReviews,
    invalidateStats,
    invalidateReviews,
  };
}

