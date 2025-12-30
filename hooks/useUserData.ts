'use client';

import { useState, useCallback } from 'react';
import { Quote, UserQuote } from '@/types/quotes';
import { BackgroundImage } from '@/lib/constants';
import { createCustomBg } from './useCardStyle';

interface UseUserDataReturn {
  likedQuotes: Quote[];
  dislikedQuotes: Quote[];
  savedQuotes: Quote[];
  userQuotes: UserQuote[];
  savedQuoteBackgrounds: Record<string, BackgroundImage>;
  setLikedQuotes: React.Dispatch<React.SetStateAction<Quote[]>>;
  setDislikedQuotes: React.Dispatch<React.SetStateAction<Quote[]>>;
  setSavedQuotes: React.Dispatch<React.SetStateAction<Quote[]>>;
  setUserQuotes: React.Dispatch<React.SetStateAction<UserQuote[]>>;
  setSavedQuoteBackgrounds: React.Dispatch<React.SetStateAction<Record<string, BackgroundImage>>>;
  fetchUserData: () => Promise<void>;
  fetchUserQuotes: () => Promise<void>;
  likeQuote: (quote: Quote, isAuthenticated: boolean) => void;
  dislikeQuote: (quote: Quote, isAuthenticated: boolean) => void;
  saveQuote: (quote: Quote, customBackground: string | null, isAuthenticated: boolean) => void;
  unsaveQuote: (quoteId: string | number, isAuthenticated: boolean) => void;
  resetUserData: () => void;
}

export function useUserData(): UseUserDataReturn {
  const [likedQuotes, setLikedQuotes] = useState<Quote[]>([]);
  const [dislikedQuotes, setDislikedQuotes] = useState<Quote[]>([]);
  const [savedQuotes, setSavedQuotes] = useState<Quote[]>([]);
  const [userQuotes, setUserQuotes] = useState<UserQuote[]>([]);
  const [savedQuoteBackgrounds, setSavedQuoteBackgrounds] = useState<Record<string, BackgroundImage>>({});

  const fetchUserData = useCallback(async () => {
    try {
      const [likesRes, dislikesRes, savedRes] = await Promise.all([
        fetch('/api/user/likes'),
        fetch('/api/user/dislikes'),
        fetch('/api/user/saved'),
      ]);

      if (likesRes.ok) {
        const likesData = await likesRes.json();
        setLikedQuotes(likesData.quotes || []);
      }

      if (dislikesRes.ok) {
        const dislikesData = await dislikesRes.json();
        setDislikedQuotes(dislikesData.quotes || []);
      }

      if (savedRes.ok) {
        const savedData = await savedRes.json();
        const savedQuotesList = savedData.quotes || [];
        setSavedQuotes(savedQuotesList);
        
        // Populate savedQuoteBackgrounds from saved quotes with custom backgrounds
        const backgrounds: Record<string, BackgroundImage> = {};
        savedQuotesList.forEach((q: Quote) => {
          if (q.custom_background) {
            backgrounds[String(q.id)] = createCustomBg({
              id: `saved_custom_${q.id}`,
              name: 'Saved Background',
              url: q.custom_background,
            });
          }
        });
        if (Object.keys(backgrounds).length > 0) {
          setSavedQuoteBackgrounds(prev => ({ ...prev, ...backgrounds }));
        }
      }
    } catch (error) {
      console.error('Fetch user data error:', error);
    }
  }, []);

  const fetchUserQuotes = useCallback(async () => {
    try {
      const response = await fetch('/api/user/quotes', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setUserQuotes(data.quotes || []);
      }
    } catch (error) {
      console.error('Fetch user quotes error:', error);
    }
  }, []);

  const likeQuote = useCallback((quote: Quote, isAuthenticated: boolean) => {
    const alreadyLiked = likedQuotes.some(q => String(q.id) === String(quote.id));
    
    if (!alreadyLiked) {
      // Optimistic update
      setLikedQuotes(prev => [...prev, quote]);
      setDislikedQuotes(prev => prev.filter(q => String(q.id) !== String(quote.id)));
      
      // API call
      if (isAuthenticated) {
        fetch('/api/user/likes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quoteId: quote.id }),
        }).catch(console.error);
      }
    }
  }, [likedQuotes]);

  const dislikeQuote = useCallback((quote: Quote, isAuthenticated: boolean) => {
    const alreadyDisliked = dislikedQuotes.some(q => String(q.id) === String(quote.id));
    
    if (!alreadyDisliked) {
      // Optimistic update
      setDislikedQuotes(prev => [...prev, quote]);
      setLikedQuotes(prev => prev.filter(q => String(q.id) !== String(quote.id)));
      
      // API call
      if (isAuthenticated) {
        fetch('/api/user/dislikes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quoteId: quote.id }),
        }).catch(console.error);
      }
    }
  }, [dislikedQuotes]);

  const saveQuote = useCallback((quote: Quote, customBackground: string | null, isAuthenticated: boolean) => {
    // Optimistic update
    setSavedQuotes(prev => [...prev, quote]);
    
    // Store custom background
    if (customBackground) {
      const quoteIdStr = String(quote.id);
      setSavedQuoteBackgrounds(prev => ({
        ...prev,
        [quoteIdStr]: createCustomBg({
          id: `saved_custom_${quoteIdStr}`,
          name: 'Saved Background',
          url: customBackground,
        }),
      }));
    }
    
    // API call
    if (isAuthenticated) {
      fetch('/api/user/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteId: quote.id, customBackground }),
      }).catch(console.error);
    }
  }, []);

  const unsaveQuote = useCallback((quoteId: string | number, isAuthenticated: boolean) => {
    setSavedQuotes(prev => prev.filter(q => String(q.id) !== String(quoteId)));
    
    if (isAuthenticated) {
      fetch('/api/user/saved', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteId }),
      }).catch(console.error);
    }
  }, []);

  const resetUserData = useCallback(() => {
    setLikedQuotes([]);
    setDislikedQuotes([]);
    setSavedQuotes([]);
    setUserQuotes([]);
    setSavedQuoteBackgrounds({});
  }, []);

  return {
    likedQuotes,
    dislikedQuotes,
    savedQuotes,
    userQuotes,
    savedQuoteBackgrounds,
    setLikedQuotes,
    setDislikedQuotes,
    setSavedQuotes,
    setUserQuotes,
    setSavedQuoteBackgrounds,
    fetchUserData,
    fetchUserQuotes,
    likeQuote,
    dislikeQuote,
    saveQuote,
    unsaveQuote,
    resetUserData,
  };
}
