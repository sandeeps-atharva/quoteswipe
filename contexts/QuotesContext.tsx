'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

interface Quote {
  id: string | number;
  text: string;
  author: string;
  category: string;
  category_icon?: string;
  likes_count?: number;
  dislikes_count?: number;
}

interface Category {
  id: string | number;
  name: string;
  icon: string;
  count: number;
}

interface User {
  id: string | number;
  name: string;
  email: string;
  role?: 'user' | 'admin';
  auth_provider?: 'google' | 'email';
}

interface UserQuote {
  id: string | number;
  text: string;
  author: string;
  theme_id?: string;
  font_id?: string;
  background_id?: string;
  category_id?: string | number;
  category?: string;
  category_icon?: string;
  is_public?: number | boolean;
  created_at?: string;
  custom_background?: string;
}

interface QuotesContextType {
  // Core data
  quotes: Quote[];
  categories: Category[];
  totalCategories: number;
  selectedCategories: string[];
  currentIndex: number;
  currentQuotePath: string; // Store the current URL path for restoration
  
  // User data
  isAuthenticated: boolean;
  user: User | null;
  likedQuotes: Quote[];
  dislikedQuotes: Quote[];
  savedQuotes: Quote[];
  userQuotes: UserQuote[];
  
  // Loading states
  isInitialized: boolean;
  isLoading: boolean;
  
  // Setters
  setQuotes: React.Dispatch<React.SetStateAction<Quote[]>>;
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  setTotalCategories: React.Dispatch<React.SetStateAction<number>>;
  setSelectedCategories: React.Dispatch<React.SetStateAction<string[]>>;
  setCurrentIndex: React.Dispatch<React.SetStateAction<number>>;
  setCurrentQuotePath: React.Dispatch<React.SetStateAction<string>>;
  setIsAuthenticated: React.Dispatch<React.SetStateAction<boolean>>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  setLikedQuotes: React.Dispatch<React.SetStateAction<Quote[]>>;
  setDislikedQuotes: React.Dispatch<React.SetStateAction<Quote[]>>;
  setSavedQuotes: React.Dispatch<React.SetStateAction<Quote[]>>;
  setUserQuotes: React.Dispatch<React.SetStateAction<UserQuote[]>>;
  
  // Methods
  initialize: () => Promise<void>;
  refreshQuotes: (categoryIds?: string[]) => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const QuotesContext = createContext<QuotesContextType | null>(null);

// Session storage keys
const STORAGE_KEYS = {
  quotes: 'qs_ctx_quotes',
  categories: 'qs_ctx_categories',
  selectedCategories: 'qs_ctx_selected_categories',
  currentIndex: 'qs_ctx_current_index',
  currentQuotePath: 'qs_ctx_current_path',
  user: 'qs_ctx_user',
  likedQuotes: 'qs_ctx_liked',
  dislikedQuotes: 'qs_ctx_disliked',
  savedQuotes: 'qs_ctx_saved',
  userQuotes: 'qs_ctx_user_quotes',
  timestamp: 'qs_ctx_timestamp',
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function getStoredData<T>(key: string): T | null {
  try {
    const data = sessionStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

function setStoredData<T>(key: string, data: T): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
}

function isCacheValid(): boolean {
  try {
    const timestamp = sessionStorage.getItem(STORAGE_KEYS.timestamp);
    if (!timestamp) return false;
    return Date.now() - parseInt(timestamp, 10) < CACHE_DURATION;
  } catch {
    return false;
  }
}

export function QuotesProvider({ children }: { children: React.ReactNode }) {
  // Core data
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [totalCategories, setTotalCategories] = useState(0);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentQuotePath, setCurrentQuotePath] = useState('');
  
  // User data
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [likedQuotes, setLikedQuotes] = useState<Quote[]>([]);
  const [dislikedQuotes, setDislikedQuotes] = useState<Quote[]>([]);
  const [savedQuotes, setSavedQuotes] = useState<Quote[]>([]);
  const [userQuotes, setUserQuotes] = useState<UserQuote[]>([]);
  
  // Loading states
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const initStarted = useRef(false);

  // Save state to sessionStorage whenever it changes
  useEffect(() => {
    if (!isInitialized) return;
    
    setStoredData(STORAGE_KEYS.quotes, quotes);
    setStoredData(STORAGE_KEYS.categories, { categories, totalCategories });
    setStoredData(STORAGE_KEYS.selectedCategories, selectedCategories);
    setStoredData(STORAGE_KEYS.currentIndex, currentIndex);
    setStoredData(STORAGE_KEYS.currentQuotePath, currentQuotePath);
    setStoredData(STORAGE_KEYS.user, { isAuthenticated, user });
    setStoredData(STORAGE_KEYS.likedQuotes, likedQuotes);
    setStoredData(STORAGE_KEYS.dislikedQuotes, dislikedQuotes);
    setStoredData(STORAGE_KEYS.savedQuotes, savedQuotes);
    setStoredData(STORAGE_KEYS.userQuotes, userQuotes);
    sessionStorage.setItem(STORAGE_KEYS.timestamp, Date.now().toString());
  }, [quotes, categories, totalCategories, selectedCategories, currentIndex, currentQuotePath,
      isAuthenticated, user, likedQuotes, dislikedQuotes, savedQuotes, userQuotes, isInitialized]);

  // Restore from sessionStorage on mount
  const restoreFromCache = useCallback(() => {
    if (!isCacheValid()) return false;
    
    const cachedQuotes = getStoredData<Quote[]>(STORAGE_KEYS.quotes);
    const cachedCategories = getStoredData<{ categories: Category[], totalCategories: number }>(STORAGE_KEYS.categories);
    const cachedSelectedCategories = getStoredData<string[]>(STORAGE_KEYS.selectedCategories);
    const cachedIndex = getStoredData<number>(STORAGE_KEYS.currentIndex);
    const cachedPath = getStoredData<string>(STORAGE_KEYS.currentQuotePath);
    const cachedUser = getStoredData<{ isAuthenticated: boolean, user: User | null }>(STORAGE_KEYS.user);
    const cachedLiked = getStoredData<Quote[]>(STORAGE_KEYS.likedQuotes);
    const cachedDisliked = getStoredData<Quote[]>(STORAGE_KEYS.dislikedQuotes);
    const cachedSaved = getStoredData<Quote[]>(STORAGE_KEYS.savedQuotes);
    const cachedUserQuotes = getStoredData<UserQuote[]>(STORAGE_KEYS.userQuotes);
    
    if (cachedQuotes && cachedQuotes.length > 0) {
      setQuotes(cachedQuotes);
      if (cachedCategories) {
        setCategories(cachedCategories.categories);
        setTotalCategories(cachedCategories.totalCategories);
      }
      if (cachedSelectedCategories) setSelectedCategories(cachedSelectedCategories);
      if (typeof cachedIndex === 'number') setCurrentIndex(cachedIndex);
      if (cachedPath) setCurrentQuotePath(cachedPath);
      if (cachedUser) {
        setIsAuthenticated(cachedUser.isAuthenticated);
        setUser(cachedUser.user);
      }
      if (cachedLiked) setLikedQuotes(cachedLiked);
      if (cachedDisliked) setDislikedQuotes(cachedDisliked);
      if (cachedSaved) setSavedQuotes(cachedSaved);
      if (cachedUserQuotes) setUserQuotes(cachedUserQuotes);
      
      return true;
    }
    
    return false;
  }, []);

  const initialize = useCallback(async () => {
    if (initStarted.current) return;
    initStarted.current = true;
    
    // Try to restore from cache first (instant display)
    const restored = restoreFromCache();
    if (restored) {
      setIsInitialized(true);
      // Refresh in background
      refreshInBackground();
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Check auth first
      const authResponse = await fetch('/api/auth/me');
      let isUserAuthenticated = false;
      let userData = null;
      
      if (authResponse.ok) {
        const data = await authResponse.json();
        isUserAuthenticated = true;
        userData = data.user;
      }
      
      setIsAuthenticated(isUserAuthenticated);
      setUser(userData);
      
      // Fetch categories
      const categoriesResponse = await fetch('/api/categories', { credentials: 'include' });
      if (categoriesResponse.ok) {
        const data = await categoriesResponse.json();
        setCategories(data.categories || []);
        setTotalCategories(data.totalCategories || data.categories?.length || 0);
      }
      
      // For authenticated users, fetch all data in parallel
      if (isUserAuthenticated) {
        const [allPrefsRes, likesRes, dislikesRes, savedRes, userQuotesRes] = await Promise.all([
          fetch('/api/user/all-preferences', { credentials: 'include' }),
          fetch('/api/user/likes', { credentials: 'include' }),
          fetch('/api/user/dislikes', { credentials: 'include' }),
          fetch('/api/user/saved', { credentials: 'include' }),
          fetch('/api/user/quotes', { credentials: 'include' }),
        ]);
        
        if (allPrefsRes.ok) {
          const data = await allPrefsRes.json();
          if (Array.isArray(data.selectedCategories)) {
            setSelectedCategories(data.selectedCategories);
          }
        }
        
        if (likesRes.ok) {
          const data = await likesRes.json();
          setLikedQuotes(data.quotes || []);
        }
        if (dislikesRes.ok) {
          const data = await dislikesRes.json();
          setDislikedQuotes(data.quotes || []);
        }
        if (savedRes.ok) {
          const data = await savedRes.json();
          setSavedQuotes(data.quotes || []);
        }
        if (userQuotesRes.ok) {
          const data = await userQuotesRes.json();
          setUserQuotes(data.quotes || []);
        }
      }
      
      setIsInitialized(true);
    } catch (error) {
      console.error('QuotesContext initialization error:', error);
      setIsInitialized(true);
    } finally {
      setIsLoading(false);
    }
  }, [restoreFromCache]);

  const refreshInBackground = useCallback(async () => {
    try {
      // Silent refresh without loading state
      const authResponse = await fetch('/api/auth/me');
      
      if (authResponse.ok) {
        const data = await authResponse.json();
        setIsAuthenticated(true);
        setUser(data.user);
        
        // Refresh user data
        const [likesRes, dislikesRes, savedRes, userQuotesRes] = await Promise.all([
          fetch('/api/user/likes', { credentials: 'include' }),
          fetch('/api/user/dislikes', { credentials: 'include' }),
          fetch('/api/user/saved', { credentials: 'include' }),
          fetch('/api/user/quotes', { credentials: 'include' }),
        ]);
        
        if (likesRes.ok) setLikedQuotes((await likesRes.json()).quotes || []);
        if (dislikesRes.ok) setDislikedQuotes((await dislikesRes.json()).quotes || []);
        if (savedRes.ok) setSavedQuotes((await savedRes.json()).quotes || []);
        if (userQuotesRes.ok) setUserQuotes((await userQuotesRes.json()).quotes || []);
      }
    } catch {
      // Ignore background refresh errors
    }
  }, []);

  const refreshQuotes = useCallback(async (categoryIds?: string[]) => {
    const cats = categoryIds || selectedCategories;
    let url = '/api/quotes';
    
    if (cats.length > 0) {
      url = `/api/quotes?categories=${encodeURIComponent(cats.join(','))}`;
    }
    
    try {
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setQuotes(data.quotes || []);
        setCurrentIndex(0);
      }
    } catch (error) {
      console.error('Failed to refresh quotes:', error);
    }
  }, [selectedCategories]);

  const refreshUserData = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const [likesRes, dislikesRes, savedRes, userQuotesRes] = await Promise.all([
        fetch('/api/user/likes', { credentials: 'include' }),
        fetch('/api/user/dislikes', { credentials: 'include' }),
        fetch('/api/user/saved', { credentials: 'include' }),
        fetch('/api/user/quotes', { credentials: 'include' }),
      ]);
      
      if (likesRes.ok) setLikedQuotes((await likesRes.json()).quotes || []);
      if (dislikesRes.ok) setDislikedQuotes((await dislikesRes.json()).quotes || []);
      if (savedRes.ok) setSavedQuotes((await savedRes.json()).quotes || []);
      if (userQuotesRes.ok) setUserQuotes((await userQuotesRes.json()).quotes || []);
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  }, [isAuthenticated]);

  // Initialize on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <QuotesContext.Provider value={{
      quotes,
      categories,
      totalCategories,
      selectedCategories,
      currentIndex,
      currentQuotePath,
      isAuthenticated,
      user,
      likedQuotes,
      dislikedQuotes,
      savedQuotes,
      userQuotes,
      isInitialized,
      isLoading,
      setQuotes,
      setCategories,
      setTotalCategories,
      setSelectedCategories,
      setCurrentIndex,
      setCurrentQuotePath,
      setIsAuthenticated,
      setUser,
      setLikedQuotes,
      setDislikedQuotes,
      setSavedQuotes,
      setUserQuotes,
      initialize,
      refreshQuotes,
      refreshUserData,
    }}>
      {children}
    </QuotesContext.Provider>
  );
}

export function useQuotes() {
  const context = useContext(QuotesContext);
  if (!context) {
    throw new Error('useQuotes must be used within a QuotesProvider');
  }
  return context;
}

