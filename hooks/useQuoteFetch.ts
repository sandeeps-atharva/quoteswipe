'use client';

import { useCallback, useRef } from 'react';
import { Quote, Category } from '@/types/quotes';
import { BackgroundImage } from '@/lib/constants';
import { getFromCache, setToCache, CACHE_DURATIONS } from '@/lib/cache-utils';

// Fisher-Yates shuffle
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

interface UseQuoteFetchOptions {
  quotes: Quote[];
  categories: Category[];
  selectedCategories: string[];
  currentIndex: number;
  isAuthenticated: boolean;
  isLoggingIn: React.MutableRefObject<boolean>;
  isDraggingRef: React.MutableRefObject<boolean>;
  isAnimatingRef: React.MutableRefObject<boolean>;
  currentIndexRef: React.MutableRefObject<number>;
  setQuotes: React.Dispatch<React.SetStateAction<Quote[]>>;
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  setTotalCategories: (total: number) => void;
  setCurrentIndex: (index: number) => void;
  setSwipeHistory: (history: any[]) => void;
  setDragOffset: (offset: { x: number; y: number }) => void;
  setSwipeDirection: (dir: 'left' | 'right' | null) => void;
  setIsDragging: (dragging: boolean) => void;
  setIsAnimating: (animating: boolean) => void;
  setIsLoadingQuotes: (loading: boolean) => void;
  setIsChangingCategories: (changing: boolean) => void;
}

export function useQuoteFetch(options: UseQuoteFetchOptions) {
  const {
    quotes,
    categories,
    selectedCategories,
    currentIndex,
    isAuthenticated,
    isLoggingIn,
    isDraggingRef,
    isAnimatingRef,
    currentIndexRef,
    setQuotes,
    setCategories,
    setTotalCategories,
    setCurrentIndex,
    setSwipeHistory,
    setDragOffset,
    setSwipeDirection,
    setIsDragging,
    setIsAnimating,
    setIsLoadingQuotes,
    setIsChangingCategories,
  } = options;

  const fetchQuotes = useCallback(async (isCategoryChange = false) => {
    const shouldPreserveQuote = isLoggingIn.current;
    const currentQuoteId = quotes[currentIndex]?.id;
    
    try {
      setIsLoadingQuotes(true);
      if (isCategoryChange && !shouldPreserveQuote) setIsChangingCategories(true);
      
      let categoriesKey = 'all';
      let url = '/api/quotes';
      
      if (selectedCategories.length > 0) {
        categoriesKey = selectedCategories.sort().join(',');
        url = `/api/quotes?categories=${encodeURIComponent(categoriesKey)}`;
      } else if (!isAuthenticated && categories.length > 0) {
        categoriesKey = categories[0].name;
        url = `/api/quotes?categories=${encodeURIComponent(categoriesKey)}`;
      }
      
      const cacheKey = `quotes_${categoriesKey}_${isAuthenticated ? 'auth' : 'guest'}`;
      
      const applyQuotes = (quotesData: Quote[]) => {
        setQuotes(quotesData);
        if (shouldPreserveQuote && currentQuoteId) {
          const preservedIndex = quotesData.findIndex(q => String(q.id) === String(currentQuoteId));
          if (preservedIndex !== -1) { setCurrentIndex(preservedIndex); return; }
        }
        setCurrentIndex(0);
        setSwipeHistory([]);
      };
      
      const resetDragState = () => {
        setDragOffset({ x: 0, y: 0 });
        setSwipeDirection(null);
        setIsDragging(false);
        setIsAnimating(false);
      };
      
      // Try cache first
      const cachedQuotes = getFromCache<Quote[]>(cacheKey, CACHE_DURATIONS.QUOTES);
      if (cachedQuotes && cachedQuotes.length > 0) {
        let quotesData = selectedCategories.length > 1 ? shuffleArray(cachedQuotes) : cachedQuotes;
        applyQuotes(quotesData);
        resetDragState();
        setIsLoadingQuotes(false);
        
        // Background refresh
        fetch(url).then(async (response) => {
          if (response.ok) {
            const data = await response.json();
            const freshQuotes = data.quotes || [];
            setToCache(cacheKey, freshQuotes);
            const canSafelyUpdate = freshQuotes.length !== cachedQuotes.length && 
              !isDraggingRef.current && !isAnimatingRef.current && currentIndexRef.current === 0;
            if (canSafelyUpdate) {
              setQuotes(selectedCategories.length > 1 ? shuffleArray(freshQuotes) : freshQuotes);
            }
          }
        }).catch(() => {});
        
        if (isCategoryChange && !shouldPreserveQuote) setTimeout(() => setIsChangingCategories(false), 150);
        return;
      }
      
      // Fetch from server
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        let quotesData = data.quotes || [];
        setToCache(cacheKey, quotesData);
        if (selectedCategories.length > 1) quotesData = shuffleArray(quotesData);
        if (isCategoryChange && !shouldPreserveQuote) await new Promise(r => setTimeout(r, 50));
        applyQuotes(quotesData);
        resetDragState();
      }
    } catch (error) {
      console.error('Fetch quotes error:', error);
    } finally {
      setIsLoadingQuotes(false);
      isLoggingIn.current = false;
      if (isCategoryChange && !shouldPreserveQuote) setTimeout(() => setIsChangingCategories(false), 200);
    }
  }, [quotes, currentIndex, selectedCategories, categories, isAuthenticated, options]);

  const fetchCategories = useCallback(async () => {
    try {
      const cacheKey = `categories_${isAuthenticated ? 'auth' : 'guest'}`;
      const cachedData = getFromCache<{ categories: Category[]; totalCategories: number }>(cacheKey, CACHE_DURATIONS.CATEGORIES);
      
      if (cachedData) {
        setCategories(cachedData.categories);
        setTotalCategories(cachedData.totalCategories);
        
        // Background refresh
        fetch('/api/categories', { credentials: 'include' }).then(async (response) => {
          if (response.ok) {
            const data = await response.json();
            const freshData = { categories: data.categories || [], totalCategories: data.totalCategories || data.categories?.length || 0 };
            setToCache(cacheKey, freshData);
            if (freshData.categories.length !== cachedData.categories.length) {
              setCategories(freshData.categories);
              setTotalCategories(freshData.totalCategories);
            }
          }
        }).catch(() => {});
        return;
      }
      
      const response = await fetch('/api/categories', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        const freshData = { categories: data.categories || [], totalCategories: data.totalCategories || data.categories?.length || 0 };
        setToCache(cacheKey, freshData);
        setCategories(freshData.categories);
        setTotalCategories(freshData.totalCategories);
      }
    } catch (error) {
      console.error('Fetch categories error:', error);
    }
  }, [isAuthenticated, setCategories, setTotalCategories]);

  return { fetchQuotes, fetchCategories };
}

