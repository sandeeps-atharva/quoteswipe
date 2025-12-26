'use client';

import { useState, useCallback, useEffect } from 'react';
import { apiCache, CACHE_KEYS, CACHE_TTL } from '@/lib/api-cache';

// Types
interface Quote {
  _id: string;
  text: string;
  author: string;
  category?: string;
  [key: string]: unknown;
}

interface UserPreferences {
  preferredCategories: string[];
  language: string;
  [key: string]: unknown;
}

interface UseUserDataReturn {
  likes: string[];
  dislikes: string[];
  saved: string[];
  preferences: UserPreferences | null;
  userQuotes: Quote[];
  isLoading: boolean;
  
  // Fetch functions
  fetchLikes: (force?: boolean) => Promise<string[]>;
  fetchDislikes: (force?: boolean) => Promise<string[]>;
  fetchSaved: (force?: boolean) => Promise<string[]>;
  fetchPreferences: (force?: boolean) => Promise<UserPreferences | null>;
  fetchUserQuotes: (force?: boolean) => Promise<Quote[]>;
  fetchAll: (force?: boolean) => Promise<void>;
  
  // Update functions
  addLike: (quoteId: string) => void;
  removeLike: (quoteId: string) => void;
  addDislike: (quoteId: string) => void;
  removeDislike: (quoteId: string) => void;
  addSaved: (quoteId: string) => void;
  removeSaved: (quoteId: string) => void;
  
  // Invalidate cache
  invalidateAll: () => void;
}

export function useUserData(isAuthenticated: boolean): UseUserDataReturn {
  const [likes, setLikes] = useState<string[]>([]);
  const [dislikes, setDislikes] = useState<string[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [userQuotes, setUserQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLikes = useCallback(async (force = false): Promise<string[]> => {
    if (!isAuthenticated) return [];
    
    try {
      if (force) apiCache.invalidate(CACHE_KEYS.USER_LIKES);
      
      const data = await apiCache.getOrFetch<string[]>(
        CACHE_KEYS.USER_LIKES,
        async () => {
          const response = await fetch('/api/user/likes');
          if (!response.ok) return [];
          const json = await response.json();
          return json.likes || [];
        },
        { ttl: CACHE_TTL.MEDIUM, sensitive: true }
      );
      
      setLikes(data);
      return data;
    } catch (error) {
      console.error('Error fetching likes:', error);
      return [];
    }
  }, [isAuthenticated]);

  const fetchDislikes = useCallback(async (force = false): Promise<string[]> => {
    if (!isAuthenticated) return [];
    
    try {
      if (force) apiCache.invalidate(CACHE_KEYS.USER_DISLIKES);
      
      const data = await apiCache.getOrFetch<string[]>(
        CACHE_KEYS.USER_DISLIKES,
        async () => {
          const response = await fetch('/api/user/dislikes');
          if (!response.ok) return [];
          const json = await response.json();
          return json.dislikes || [];
        },
        { ttl: CACHE_TTL.MEDIUM, sensitive: true }
      );
      
      setDislikes(data);
      return data;
    } catch (error) {
      console.error('Error fetching dislikes:', error);
      return [];
    }
  }, [isAuthenticated]);

  const fetchSaved = useCallback(async (force = false): Promise<string[]> => {
    if (!isAuthenticated) return [];
    
    try {
      if (force) apiCache.invalidate(CACHE_KEYS.USER_SAVED);
      
      const data = await apiCache.getOrFetch<string[]>(
        CACHE_KEYS.USER_SAVED,
        async () => {
          const response = await fetch('/api/user/saved');
          if (!response.ok) return [];
          const json = await response.json();
          return json.savedQuotes || [];
        },
        { ttl: CACHE_TTL.MEDIUM, sensitive: true }
      );
      
      setSaved(data);
      return data;
    } catch (error) {
      console.error('Error fetching saved:', error);
      return [];
    }
  }, [isAuthenticated]);

  const fetchPreferences = useCallback(async (force = false): Promise<UserPreferences | null> => {
    if (!isAuthenticated) return null;
    
    try {
      if (force) apiCache.invalidate(CACHE_KEYS.USER_PREFERENCES);
      
      const data = await apiCache.getOrFetch<UserPreferences | null>(
        CACHE_KEYS.USER_PREFERENCES,
        async () => {
          const response = await fetch('/api/user/all-preferences', { credentials: 'include' });
          if (!response.ok) return null;
          return await response.json();
        },
        { ttl: CACHE_TTL.MEDIUM, sensitive: true }
      );
      
      setPreferences(data);
      return data;
    } catch (error) {
      console.error('Error fetching preferences:', error);
      return null;
    }
  }, [isAuthenticated]);

  const fetchUserQuotes = useCallback(async (force = false): Promise<Quote[]> => {
    if (!isAuthenticated) return [];
    
    try {
      if (force) apiCache.invalidate(CACHE_KEYS.USER_QUOTES);
      
      const data = await apiCache.getOrFetch<Quote[]>(
        CACHE_KEYS.USER_QUOTES,
        async () => {
          const response = await fetch('/api/user/quotes', { credentials: 'include' });
          if (!response.ok) return [];
          const json = await response.json();
          return json.quotes || [];
        },
        { ttl: CACHE_TTL.MEDIUM, sensitive: true }
      );
      
      setUserQuotes(data);
      return data;
    } catch (error) {
      console.error('Error fetching user quotes:', error);
      return [];
    }
  }, [isAuthenticated]);

  const fetchAll = useCallback(async (force = false) => {
    if (!isAuthenticated) return;
    
    setIsLoading(true);
    try {
      await Promise.all([
        fetchLikes(force),
        fetchDislikes(force),
        fetchSaved(force),
        fetchPreferences(force),
        fetchUserQuotes(force),
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, fetchLikes, fetchDislikes, fetchSaved, fetchPreferences, fetchUserQuotes]);

  // Optimistic updates
  const addLike = useCallback((quoteId: string) => {
    setLikes(prev => [...prev, quoteId]);
    apiCache.update<string[]>(CACHE_KEYS.USER_LIKES, (current) => 
      current ? [...current, quoteId] : [quoteId]
    );
  }, []);

  const removeLike = useCallback((quoteId: string) => {
    setLikes(prev => prev.filter(id => id !== quoteId));
    apiCache.update<string[]>(CACHE_KEYS.USER_LIKES, (current) => 
      current ? current.filter(id => id !== quoteId) : []
    );
  }, []);

  const addDislike = useCallback((quoteId: string) => {
    setDislikes(prev => [...prev, quoteId]);
    apiCache.update<string[]>(CACHE_KEYS.USER_DISLIKES, (current) => 
      current ? [...current, quoteId] : [quoteId]
    );
  }, []);

  const removeDislike = useCallback((quoteId: string) => {
    setDislikes(prev => prev.filter(id => id !== quoteId));
    apiCache.update<string[]>(CACHE_KEYS.USER_DISLIKES, (current) => 
      current ? current.filter(id => id !== quoteId) : []
    );
  }, []);

  const addSaved = useCallback((quoteId: string) => {
    setSaved(prev => [...prev, quoteId]);
    apiCache.update<string[]>(CACHE_KEYS.USER_SAVED, (current) => 
      current ? [...current, quoteId] : [quoteId]
    );
  }, []);

  const removeSaved = useCallback((quoteId: string) => {
    setSaved(prev => prev.filter(id => id !== quoteId));
    apiCache.update<string[]>(CACHE_KEYS.USER_SAVED, (current) => 
      current ? current.filter(id => id !== quoteId) : []
    );
  }, []);

  const invalidateAll = useCallback(() => {
    apiCache.invalidate(CACHE_KEYS.USER_LIKES);
    apiCache.invalidate(CACHE_KEYS.USER_DISLIKES);
    apiCache.invalidate(CACHE_KEYS.USER_SAVED);
    apiCache.invalidate(CACHE_KEYS.USER_PREFERENCES);
    apiCache.invalidate(CACHE_KEYS.USER_QUOTES);
    setLikes([]);
    setDislikes([]);
    setSaved([]);
    setPreferences(null);
    setUserQuotes([]);
  }, []);

  return {
    likes,
    dislikes,
    saved,
    preferences,
    userQuotes,
    isLoading,
    fetchLikes,
    fetchDislikes,
    fetchSaved,
    fetchPreferences,
    fetchUserQuotes,
    fetchAll,
    addLike,
    removeLike,
    addDislike,
    removeDislike,
    addSaved,
    removeSaved,
    invalidateAll,
  };
}

