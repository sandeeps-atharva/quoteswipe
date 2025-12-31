'use client';

import { useEffect, useRef, useCallback } from 'react';
import { Quote } from '@/types/quotes';
import { getFromCache, setToCache } from '@/lib/cache-utils';

// Regex patterns for URL matching
const QUOTE_PATH_REGEX = /^\/quote\/([a-zA-Z0-9_-]+)$/;
const USER_QUOTE_PATH_REGEX = /^\/user-quote\/([a-zA-Z0-9_-]+)$/;

interface UrlState {
  quoteId: string | null;
  userQuoteId: string | null;
  isUserQuote: boolean;
}

interface UseQuoteUrlOptions {
  quotes: Quote[];
  currentIndex: number;
  isAppReady: boolean;
  onIndexChange: (index: number) => void;
}

interface UseQuoteUrlReturn {
  isRestoringFromUrl: React.MutableRefObject<boolean>;
  isInitialLoad: React.MutableRefObject<boolean>;
  getQuotePath: (id: string | number) => string;
  parseCurrentUrl: () => UrlState;
  updateUrlForQuote: (quote: Quote, index: number, useReplace?: boolean) => void;
}

/**
 * Hook for managing quote URLs and browser history
 * Handles URL parsing, restoration, and updates
 */
export function useQuoteUrl({
  quotes,
  currentIndex,
  isAppReady,
  onIndexChange,
}: UseQuoteUrlOptions): UseQuoteUrlReturn {
  const isRestoringFromUrl = useRef(false);
  const isInitialLoad = useRef(true);

  /**
   * Parse the current URL and extract quote/user quote ID
   */
  const parseCurrentUrl = useCallback((): UrlState => {
    const pathname = window.location.pathname;
    const urlParams = new URLSearchParams(window.location.search);

    // Check path-based URLs
    const pathMatch = pathname.match(QUOTE_PATH_REGEX);
    const userQuotePathMatch = pathname.match(USER_QUOTE_PATH_REGEX);

    // Check query param URLs (backward compatibility)
    const quoteIdParam = urlParams.get('quote');
    const userQuoteIdParam = urlParams.get('user_quote');

    const quoteId = pathMatch?.[1] || quoteIdParam;
    const userQuoteId = userQuotePathMatch?.[1] || userQuoteIdParam;

    return {
      quoteId,
      userQuoteId,
      isUserQuote: !!(userQuotePathMatch || userQuoteIdParam),
    };
  }, []);

  /**
   * Get the URL path for a quote
   */
  const getQuotePath = useCallback((id: string | number): string => {
    const idStr = String(id);
    return idStr.startsWith('user_')
      ? `/user-quote/${idStr.replace('user_', '')}`
      : `/quote/${idStr}`;
  }, []);

  /**
   * Update the URL to reflect the current quote
   */
  const updateUrlForQuote = useCallback(
    (quote: Quote, index: number, useReplace = false) => {
      const quoteId = quote.id;
      const isUserQuote = String(quoteId).startsWith('user_');
      const newPath = getQuotePath(quoteId);

      const state = isUserQuote
        ? { userQuoteId: String(quoteId).replace('user_', ''), index }
        : { quoteId, index };

      if (useReplace) {
        window.history.replaceState(state, '', newPath);
      } else {
        const currentPath = window.location.pathname;
        if (currentPath !== newPath) {
          window.history.pushState(state, '', newPath);
        }
      }
    },
    [getQuotePath]
  );

  // Restore URL from cache on mount
  useEffect(() => {
    if (window.location.pathname === '/' && quotes.length > 0) {
      const cachedPath = getFromCache<string>('currentQuotePath', 60 * 60 * 1000);
      if (cachedPath && cachedPath.includes('/quote/')) {
        window.history.replaceState({ index: currentIndex }, '', cachedPath);
      }
    }
  }, []); // Run only once on mount

  // Initialize URL state on first load
  useEffect(() => {
    const { quoteId, userQuoteId } = parseCurrentUrl();

    // Convert query params to path format
    if (quoteId && !window.location.pathname.match(QUOTE_PATH_REGEX)) {
      window.history.replaceState({ quoteId }, '', `/quote/${quoteId}`);
    }
    if (userQuoteId && !window.location.pathname.match(USER_QUOTE_PATH_REGEX)) {
      window.history.replaceState({ userQuoteId }, '', `/user-quote/${userQuoteId}`);
    }

    if (quoteId || userQuoteId) {
      isInitialLoad.current = true;
      isRestoringFromUrl.current = true;
    }
  }, []); // Run only once on mount

  // Find and set quote index when quotes are loaded from URL
  useEffect(() => {
    if (!isAppReady || quotes.length === 0) return;

    const { quoteId, userQuoteId, isUserQuote } = parseCurrentUrl();

    if ((quoteId || userQuoteId) && isRestoringFromUrl.current) {
      let quoteIndex = -1;

      if (isUserQuote && userQuoteId) {
        quoteIndex = quotes.findIndex((q) => String(q.id) === `user_${userQuoteId}`);
      } else if (quoteId) {
        quoteIndex = quotes.findIndex((q) => String(q.id) === String(quoteId));
      }

      if (quoteIndex !== -1 && currentIndex !== quoteIndex) {
        onIndexChange(quoteIndex);
        const quote = quotes[quoteIndex];
        updateUrlForQuote(quote, quoteIndex, true);
      } else if (quoteIndex === -1 && quotes.length > 0) {
        // Quote not found, redirect to first quote
        onIndexChange(0);
        updateUrlForQuote(quotes[0], 0, true);
      }

      isRestoringFromUrl.current = false;
      isInitialLoad.current = false;
    } else if (!quoteId && !userQuoteId && isInitialLoad.current) {
      // No quote ID in URL, update URL with current quote
      if (quotes[currentIndex]) {
        updateUrlForQuote(quotes[currentIndex], currentIndex, true);
      }
      isInitialLoad.current = false;
    }
  }, [quotes, isAppReady, currentIndex, parseCurrentUrl, updateUrlForQuote, onIndexChange]);

  // Update URL when quote changes
  useEffect(() => {
    if (!isAppReady || isInitialLoad.current || isRestoringFromUrl.current) return;

    if (quotes[currentIndex]) {
      updateUrlForQuote(quotes[currentIndex], currentIndex, false);
    }
  }, [currentIndex, isAppReady, quotes, updateUrlForQuote]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state?.index !== undefined) {
        onIndexChange(event.state.index);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [onIndexChange]);

  // Cache current index and path
  useEffect(() => {
    if (!isAppReady) return;
    setToCache('currentQuoteIndex', currentIndex);
    const path = window.location.pathname;
    if (path !== '/' && (path.includes('/quote/') || path.includes('/user-quote/'))) {
      setToCache('currentQuotePath', path);
    }
  }, [currentIndex, isAppReady]);

  return {
    isRestoringFromUrl,
    isInitialLoad,
    getQuotePath,
    parseCurrentUrl,
    updateUrlForQuote,
  };
}

