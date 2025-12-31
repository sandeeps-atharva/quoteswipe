'use client';

import { useEffect, useRef } from 'react';
import { Quote, Category } from '@/types/quotes';
import { CardTheme, FontStyle, BackgroundImage } from '@/lib/constants';
import { setToCache } from '@/lib/cache-utils';

interface UseCacheSyncOptions {
  isAppReady: boolean;
  quotes: Quote[];
  categories: Category[];
  cardTheme: CardTheme;
  fontStyle: FontStyle;
  backgroundImage: BackgroundImage;
}

/**
 * Hook to synchronize app state with session storage cache
 * Enables instant restoration when user navigates back
 */
export function useCacheSync({
  isAppReady,
  quotes,
  categories,
  cardTheme,
  fontStyle,
  backgroundImage,
}: UseCacheSyncOptions): void {
  // Track if initial sync is done to avoid unnecessary writes
  const hasSynced = useRef(false);

  // Sync card customization to cache
  useEffect(() => {
    if (!isAppReady) return;
    setToCache('cardTheme', cardTheme);
  }, [cardTheme, isAppReady]);

  useEffect(() => {
    if (!isAppReady) return;
    setToCache('fontStyle', fontStyle);
  }, [fontStyle, isAppReady]);

  useEffect(() => {
    if (!isAppReady) return;
    setToCache('backgroundImage', backgroundImage);
  }, [backgroundImage, isAppReady]);

  // Sync quotes and categories to cache
  useEffect(() => {
    if (!isAppReady || quotes.length === 0) return;
    setToCache('swipeQuotes', quotes);
    setToCache('swipeCategories', categories);
    hasSynced.current = true;
  }, [quotes, categories, isAppReady]);
}

/**
 * Initialize state from cache for instant display
 * Returns cached values or defaults
 */
export function getInitialCachedState<T>(
  cacheKey: string,
  defaultValue: T,
  duration = 60 * 60 * 1000 // 1 hour
): T {
  if (typeof window === 'undefined') return defaultValue;
  
  try {
    const cached = sessionStorage.getItem(`qs_cache_${cacheKey}`);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < duration) {
        return data;
      }
    }
  } catch {}
  
  return defaultValue;
}

