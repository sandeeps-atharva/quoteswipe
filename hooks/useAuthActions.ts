'use client';

import { useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { User, Category } from '@/types/quotes';
import { CARD_THEMES, FONT_STYLES, BACKGROUND_IMAGES, CardTheme, FontStyle, BackgroundImage } from '@/lib/constants';
import { clearUserCache, setToCache, CACHE_PREFIX } from '@/lib/cache-utils';
import { resolveBackground } from './useCardStyle';

interface AuthStateSetters {
  setIsAuthenticated: (auth: boolean) => void;
  setUser: (user: User | null) => void;
  setShowAuthModal: (show: boolean) => void;
  setSwipeCount: (count: number) => void;
  setAuthenticatedSwipeCount: (count: number) => void;
  setIsLoggingOut: (loading: boolean) => void;
  setIsSidebarOpen: (open: boolean) => void;
  setCurrentIndex: (index: number) => void;
  setLikedQuotes: React.Dispatch<React.SetStateAction<any[]>>;
  setDislikedQuotes: React.Dispatch<React.SetStateAction<any[]>>;
  setSavedQuotes: React.Dispatch<React.SetStateAction<any[]>>;
  setSelectedCategories: (categories: string[]) => void;
  setPreferencesLoaded: (loaded: boolean) => void;
  setCardTheme: (theme: CardTheme) => void;
  setFontStyle: (font: FontStyle) => void;
  setBackgroundImage: (bg: BackgroundImage) => void;
  setSavedQuoteBackgrounds: React.Dispatch<React.SetStateAction<Record<string, BackgroundImage>>>;
  setViewMode: (mode: 'swipe' | 'feed') => void;
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  setTotalCategories: (count: number) => void;
  setQuotes: React.Dispatch<React.SetStateAction<any[]>>;
  setShowOnboarding: (show: boolean) => void;
  setAllCategoriesForOnboarding: (categories: Category[]) => void;
}

interface UseAuthActionsOptions {
  setters: AuthStateSetters;
  fetchUserData: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchAllPreferences: () => Promise<void>;
  isLoadingPreferences: React.MutableRefObject<boolean>;
  isLoggingIn: React.MutableRefObject<boolean>;
}

export function useAuthActions({
  setters,
  fetchUserData,
  fetchCategories,
  fetchAllPreferences,
  isLoadingPreferences,
  isLoggingIn,
}: UseAuthActionsOptions) {
  const {
    setIsAuthenticated,
    setUser,
    setShowAuthModal,
    setSwipeCount,
    setAuthenticatedSwipeCount,
    setIsLoggingOut,
    setIsSidebarOpen,
    setCurrentIndex,
    setLikedQuotes,
    setDislikedQuotes,
    setSavedQuotes,
    setSelectedCategories,
    setPreferencesLoaded,
    setCardTheme,
    setFontStyle,
    setBackgroundImage,
    setSavedQuoteBackgrounds,
    setViewMode,
    setCategories,
    setTotalCategories,
    setQuotes,
    setShowOnboarding,
    setAllCategoriesForOnboarding,
  } = setters;

  const handleAuthSuccess = useCallback(async (user: User, isNewUser: boolean) => {
    isLoggingIn.current = true;
    setIsAuthenticated(true);
    setUser(user);
    setShowAuthModal(false);
    setSwipeCount(0);
    setAuthenticatedSwipeCount(0);
    
    try { sessionStorage.removeItem(CACHE_PREFIX + 'categories_guest'); } catch {}
    
    await Promise.all([fetchUserData(), fetchCategories(), ...(isNewUser ? [] : [fetchAllPreferences()])]);
    
    if (isNewUser) {
      isLoadingPreferences.current = false;
      isLoggingIn.current = false;
    }
  }, [setters, fetchUserData, fetchCategories, fetchAllPreferences, isLoadingPreferences, isLoggingIn]);

  const checkOnboarding = useCallback(async (needsOnboarding: boolean) => {
    if (needsOnboarding) {
      try {
        const res = await fetch('/api/categories?onboarding=true');
        if (res.ok) {
          const data = await res.json();
          setAllCategoriesForOnboarding(data.categories || []);
        }
      } catch {}
      setShowOnboarding(true);
    }
  }, [setAllCategoriesForOnboarding, setShowOnboarding]);

  const handleLogin = useCallback(async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Login failed');
    
    toast.success(`Welcome back, ${data.user.name}! 👋`);
    await handleAuthSuccess(data.user, false);
    await checkOnboarding(data.onboarding_complete === false);
  }, [handleAuthSuccess, checkOnboarding]);

  const handleRegister = useCallback(async (name: string, email: string, password: string) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Registration failed');
    
    toast.success(`Welcome to QuoteSwipe, ${data.user.name}! 🎉`);
    await handleAuthSuccess(data.user, true);
    await checkOnboarding(data.onboarding_complete === false);
  }, [handleAuthSuccess, checkOnboarding]);

  const handleGoogleSuccess = useCallback(async (googleUser: User) => {
    toast.success(`Welcome, ${googleUser.name}! 🎉`);
    await handleAuthSuccess(googleUser, false);
  }, [handleAuthSuccess]);

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      toast.success('You have been logged out. See you soon! 👋');
      clearUserCache();
      
      // Reset all state
      setIsAuthenticated(false);
      setUser(null);
      setIsSidebarOpen(false);
      setSwipeCount(0);
      setAuthenticatedSwipeCount(0);
      setCurrentIndex(0);
      setLikedQuotes([]);
      setDislikedQuotes([]);
      setSavedQuotes([]);
      setSelectedCategories([]);
      setPreferencesLoaded(false);
      setCardTheme(CARD_THEMES[0]);
      setFontStyle(FONT_STYLES[0]);
      setBackgroundImage(BACKGROUND_IMAGES[0]);
      setSavedQuoteBackgrounds({});
      setViewMode('swipe');
      
      // Fetch guest data in background
      fetch('/api/categories', { credentials: 'include' })
        .then(async (response) => {
          if (response.ok) {
            const data = await response.json();
            const newCategories = data.categories || [];
            setCategories(newCategories);
            setTotalCategories(data.totalCategories || newCategories.length || 0);
            setToCache('categories_guest', { categories: newCategories, totalCategories: data.totalCategories || newCategories.length || 0 });
            
            if (newCategories.length > 0) {
              const quotesResponse = await fetch(`/api/quotes?categories=${encodeURIComponent(newCategories[0].name)}`);
              if (quotesResponse.ok) {
                const quotesData = await quotesResponse.json();
                setQuotes(quotesData.quotes || []);
                setToCache(`quotes_${newCategories[0].name}_guest`, quotesData.quotes || []);
              }
            }
          }
        })
        .catch(console.error);
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout. Please try again.');
    } finally {
      setIsLoggingOut(false);
    }
  }, [setters]);

  return {
    handleLogin,
    handleRegister,
    handleGoogleSuccess,
    handleLogout,
  };
}

