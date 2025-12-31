'use client';

import { useCallback, useRef } from 'react';
import { Quote } from '@/types/quotes';
import { canShowInstagramModal, markInstagramModalShown } from '@/lib/cache-utils';

interface SwipeState {
  currentIndex: number;
  swipeHistory: Array<{ index: number; direction: 'left' | 'right' }>;
  likedQuotes: Quote[];
  dislikedQuotes: Quote[];
  lastLikedQuote: Quote | null;
  swipeCount: number;
  authenticatedSwipeCount: number;
}

interface SwipeStateSetters {
  setCurrentIndex: (index: number | ((prev: number) => number)) => void;
  setSwipeHistory: (history: Array<{ index: number; direction: 'left' | 'right' }>) => void;
  setLikedQuotes: React.Dispatch<React.SetStateAction<Quote[]>>;
  setDislikedQuotes: React.Dispatch<React.SetStateAction<Quote[]>>;
  setSavedQuotes: React.Dispatch<React.SetStateAction<Quote[]>>;
  setLastLikedQuote: (quote: Quote | null) => void;
  setSwipeCount: (count: number) => void;
  setAuthenticatedSwipeCount: (count: number) => void;
  setQuotes: React.Dispatch<React.SetStateAction<Quote[]>>;
  setSwipeDirection: (dir: 'left' | 'right' | null) => void;
  setDragOffset: (offset: { x: number; y: number }) => void;
  setIsDragging: (dragging: boolean) => void;
  setIsAnimating: (animating: boolean) => void;
  setShowAuthModal: (show: boolean) => void;
  setShowInstagramModal: (show: boolean) => void;
}

interface UseSwipeActionsOptions {
  quotes: Quote[];
  state: SwipeState;
  setters: SwipeStateSetters;
  isAuthenticated: boolean;
  isDragging: boolean;
  isAnimating: boolean;
}

export function useSwipeActions({
  quotes,
  state,
  setters,
  isAuthenticated,
  isDragging,
  isAnimating,
}: UseSwipeActionsOptions) {
  const {
    currentIndex,
    swipeHistory,
    likedQuotes,
    dislikedQuotes,
    lastLikedQuote,
    swipeCount,
    authenticatedSwipeCount,
  } = state;

  const {
    setCurrentIndex,
    setSwipeHistory,
    setLikedQuotes,
    setDislikedQuotes,
    setSavedQuotes,
    setLastLikedQuote,
    setSwipeCount,
    setAuthenticatedSwipeCount,
    setQuotes,
    setSwipeDirection,
    setDragOffset,
    setIsDragging,
    setIsAnimating,
    setShowAuthModal,
    setShowInstagramModal,
  } = setters;

  const handleSwipe = useCallback((direction: 'left' | 'right') => {
    const currentQuote = quotes[currentIndex];

    if (direction === 'right' && currentQuote) {
      const alreadyLiked = likedQuotes.some(q => q.id === currentQuote.id);
      
      if (!alreadyLiked) {
        setLastLikedQuote(currentQuote);
        setLikedQuotes(prev => [...prev, currentQuote]);
        setDislikedQuotes(prev => prev.filter(q => q.id !== currentQuote.id));
        setQuotes(prev => prev.map(q => 
          q.id === currentQuote.id ? { ...q, likes_count: (q.likes_count || 0) + 1 } : q
        ));
        
        if (isAuthenticated) {
          fetch('/api/user/likes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quoteId: currentQuote.id }),
          }).catch(console.error);
        }
      } else {
        setLastLikedQuote(currentQuote);
      }
    } else if (direction === 'left' && currentQuote) {
      const alreadyDisliked = dislikedQuotes.some(q => q.id === currentQuote.id);
      
      if (!alreadyDisliked) {
        setDislikedQuotes(prev => [...prev, currentQuote]);
        setLikedQuotes(prev => prev.filter(q => q.id !== currentQuote.id));
        setQuotes(prev => prev.map(q => 
          q.id === currentQuote.id ? { ...q, dislikes_count: (q.dislikes_count || 0) + 1 } : q
        ));
        
        if (isAuthenticated) {
          fetch('/api/user/dislikes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quoteId: currentQuote.id }),
          }).catch(console.error);
        }
      }
      setLastLikedQuote(null);
    } else {
      setLastLikedQuote(null);
    }

    // Track swipe counts
    if (!isAuthenticated) {
      const newCount = swipeCount + 1;
      setSwipeCount(newCount);
      if (newCount >= 5) {
        setIsDragging(false);
        setDragOffset({ x: 0, y: 0 });
        setSwipeDirection(null);
        setShowAuthModal(true);
        return;
      }
    } else {
      const newAuthCount = authenticatedSwipeCount + 1;
      setAuthenticatedSwipeCount(newAuthCount);
      if (newAuthCount >= 10 && canShowInstagramModal()) {
        setIsDragging(false);
        setDragOffset({ x: 0, y: 0 });
        setSwipeDirection(null);
        setShowInstagramModal(true);
        markInstagramModalShown();
        setAuthenticatedSwipeCount(0);
        return;
      } else if (newAuthCount >= 10) {
        setAuthenticatedSwipeCount(0);
      }
    }

    setSwipeHistory([...swipeHistory, { index: currentIndex, direction }]);
    setSwipeDirection(direction);
    
    setTimeout(() => {
      if (currentIndex < quotes.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        setCurrentIndex(0);
        if (!isAuthenticated) {
          setLikedQuotes([]);
          setDislikedQuotes([]);
          setSavedQuotes([]);
        }
      }
      setDragOffset({ x: 0, y: 0 });
      setSwipeDirection(null);
    }, 300);
  }, [quotes, currentIndex, likedQuotes, dislikedQuotes, swipeHistory, swipeCount, authenticatedSwipeCount, isAuthenticated, setters]);

  const handleUndo = useCallback(() => {
    if (swipeHistory.length === 0) return;

    const lastSwipe = swipeHistory[swipeHistory.length - 1];
    const previousIndex = lastSwipe.index;
    const previousDirection = lastSwipe.direction;
    const newHistory = swipeHistory.slice(0, -1);

    if (lastLikedQuote && previousDirection === 'right') {
      setLikedQuotes(likedQuotes.filter(q => q.id !== lastLikedQuote.id));
      setLastLikedQuote(null);
    }

    if (!isAuthenticated && swipeCount > 0) {
      setSwipeCount(swipeCount - 1);
    } else if (isAuthenticated && authenticatedSwipeCount > 0) {
      setAuthenticatedSwipeCount(authenticatedSwipeCount - 1);
    }

    const reverseDirection = previousDirection === 'right' ? 'right' : 'left';
    setSwipeDirection(reverseDirection);
    const offsetX = previousDirection === 'right' ? 200 : -200;
    setDragOffset({ x: offsetX, y: 0 });
    
    setTimeout(() => {
      setCurrentIndex(previousIndex);
      setSwipeHistory(newHistory);
      setDragOffset({ x: 0, y: 0 });
      setSwipeDirection(null);
    }, 300);
  }, [swipeHistory, lastLikedQuote, likedQuotes, swipeCount, authenticatedSwipeCount, isAuthenticated, setters]);

  const handleLike = useCallback(() => {
    if (isDragging || isAnimating) return;
    setIsAnimating(true);
    setSwipeDirection('right');
    setDragOffset({ x: 300, y: 0 });
    setTimeout(() => {
      handleSwipe('right');
      setIsAnimating(false);
    }, 300);
  }, [isDragging, isAnimating, handleSwipe, setters]);

  const handleDislike = useCallback(() => {
    if (isDragging || isAnimating) return;
    setIsAnimating(true);
    setSwipeDirection('left');
    setDragOffset({ x: -300, y: 0 });
    setTimeout(() => {
      handleSwipe('left');
      setIsAnimating(false);
    }, 300);
  }, [isDragging, isAnimating, handleSwipe, setters]);

  return {
    handleSwipe,
    handleUndo,
    handleLike,
    handleDislike,
  };
}

