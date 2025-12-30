/**
 * Client-side cache utilities for rarely-changing data
 * Uses sessionStorage for session-based caching
 */

export const CACHE_PREFIX = 'qs_cache_';

// Cache durations
export const CACHE_DURATIONS = {
  QUOTES: 5 * 60 * 1000,      // 5 minutes
  CATEGORIES: 10 * 60 * 1000, // 10 minutes
  PREFERENCES: 60 * 60 * 1000, // 1 hour
  DEFAULT: 60 * 60 * 1000,    // 1 hour
} as const;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * Get data from sessionStorage cache
 */
export function getFromCache<T>(key: string, maxAge: number = CACHE_DURATIONS.DEFAULT): T | null {
  try {
    const cached = sessionStorage.getItem(CACHE_PREFIX + key);
    if (!cached) return null;
    
    const entry: CacheEntry<T> = JSON.parse(cached);
    if (Date.now() - entry.timestamp > maxAge) {
      sessionStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

/**
 * Store data in sessionStorage cache
 */
export function setToCache<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() };
    sessionStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // Ignore storage errors (quota exceeded, etc.)
  }
}

/**
 * Remove specific key from cache
 */
export function removeFromCache(key: string): void {
  try {
    sessionStorage.removeItem(CACHE_PREFIX + key);
  } catch {
    // Ignore errors
  }
}

/**
 * Clear all user-specific cache entries (e.g., on logout)
 */
export function clearUserCache(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(CACHE_PREFIX + 'quotes_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => sessionStorage.removeItem(key));
  } catch {
    // Ignore errors
  }
}

/**
 * Clear all cache entries
 */
export function clearAllCache(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => sessionStorage.removeItem(key));
  } catch {
    // Ignore errors
  }
}

// Instagram modal cooldown helpers
const INSTAGRAM_MODAL_KEY = 'qs_instagram_modal_last_shown';
const INSTAGRAM_MODAL_COOLDOWN = 2 * 24 * 60 * 60 * 1000; // 2 days

export function canShowInstagramModal(): boolean {
  try {
    const lastShown = localStorage.getItem(INSTAGRAM_MODAL_KEY);
    if (!lastShown) return true;
    
    const lastShownTime = parseInt(lastShown, 10);
    return Date.now() - lastShownTime >= INSTAGRAM_MODAL_COOLDOWN;
  } catch {
    return true;
  }
}

export function markInstagramModalShown(): void {
  try {
    localStorage.setItem(INSTAGRAM_MODAL_KEY, Date.now().toString());
  } catch {
    // Ignore storage errors
  }
}

