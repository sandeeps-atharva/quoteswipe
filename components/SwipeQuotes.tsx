'use client';

import { useState, useRef, useEffect, useCallback, lazy, Suspense } from 'react';
import { Menu, Info, Mail, Shield, MessageSquare, Search, Palette, Moon, Sun, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';
import Sidebar from './Sidebar';
import QuoteCard from './QuoteCard';
import ControlButtons, { ActionButtons } from './ControlButtons';
import LanguageSelector from './LanguageSelector';
import { useVisitorTracking } from '@/hooks/useVisitorTracking';
import { useTheme } from '@/contexts/ThemeContext';
import { CARD_THEMES, FONT_STYLES, BACKGROUND_IMAGES, CardTheme, FontStyle, BackgroundImage } from '@/lib/constants';
import { isQuotePublic } from '@/lib/helpers';

// Lazy load modals for better initial bundle size
const AuthModal = lazy(() => import('./AuthModal'));
const ShareModal = lazy(() => import('./ShareModal'));
const InstagramFollowModal = lazy(() => import('./InstagramFollowModal'));
const SearchModal = lazy(() => import('./SearchModal'));
const CardCustomization = lazy(() => import('./CardCustomization'));
const CreateQuoteModal = lazy(() => import('./CreateQuoteModal'));
const CategoryOnboarding = lazy(() => import('./CategoryOnboarding'));
const SaveQuoteModal = lazy(() => import('./SaveQuoteModal'));

// Lazy load views for bottom navigation
const SavedQuotesView = lazy(() => import('./SavedQuotesView'));
const MyQuotesView = lazy(() => import('./MyQuotesView'));
const LikedQuotesView = lazy(() => import('./LikedQuotesView'));
const SkippedQuotesView = lazy(() => import('./SkippedQuotesView'));
const ProfileView = lazy(() => import('./ProfileView'));

// Bottom Navigation Bar
import BottomNavBar, { NavTab } from './BottomNavBar';
import OptionsMenu from './OptionsMenu';

// Modal loading fallback
const ModalLoader = () => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
    </div>
  </div>
);

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

// Client-side cache utilities for rarely-changing data
const CACHE_PREFIX = 'qs_cache_';
const QUOTES_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const CATEGORIES_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

// Instagram modal cooldown (show once every 2 days)
const INSTAGRAM_MODAL_KEY = 'qs_instagram_modal_last_shown';
const INSTAGRAM_MODAL_COOLDOWN = 2 * 24 * 60 * 60 * 1000; // 2 days in milliseconds

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

function getFromCache<T>(key: string, maxAge: number): T | null {
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

function setToCache<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() };
    sessionStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // Ignore storage errors (quota exceeded, etc.)
  }
}

function clearUserCache(): void {
  try {
    // Clear user-specific cache on logout
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

// Instagram modal cooldown helpers
function canShowInstagramModal(): boolean {
  try {
    const lastShown = localStorage.getItem(INSTAGRAM_MODAL_KEY);
    if (!lastShown) return true;
    
    const lastShownTime = parseInt(lastShown, 10);
    return Date.now() - lastShownTime >= INSTAGRAM_MODAL_COOLDOWN;
  } catch {
    return true; // Show modal if localStorage fails
  }
}

function markInstagramModalShown(): void {
  try {
    localStorage.setItem(INSTAGRAM_MODAL_KEY, Date.now().toString());
  } catch {
    // Ignore storage errors
  }
}

export default function SwipeQuotes() {
  // Track visitor on page load
  useVisitorTracking();
  
  // Theme toggle with user sync
  const { theme, toggleTheme, setIsAuthenticated: setThemeAuth } = useTheme();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showInstagramModal, setShowInstagramModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showSaveQuoteModal, setShowSaveQuoteModal] = useState(false);
  const [quoteToSave, setQuoteToSave] = useState<Quote | null>(null);
  const [activeNavTab, setActiveNavTab] = useState<NavTab>('feed'); // Bottom nav active tab
  const [swipeCount, setSwipeCount] = useState(0); // For unauthenticated users
  const [authenticatedSwipeCount, setAuthenticatedSwipeCount] = useState(0); // For authenticated users
  // Restore quotes, categories, and index from cache for instant display
  const [quotes, setQuotes] = useState<Quote[]>(() => {
    const cached = getFromCache<Quote[]>('swipeQuotes', 60 * 60 * 1000);
    return cached || [];
  });
  const [categories, setCategories] = useState<Category[]>(() => {
    const cached = getFromCache<Category[]>('swipeCategories', 60 * 60 * 1000);
    return cached || [];
  });
  const [totalCategories, setTotalCategories] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(() => {
    const cached = getFromCache<number>('currentQuoteIndex', 60 * 60 * 1000);
    return cached || 0;
  });
  const [swipeHistory, setSwipeHistory] = useState<Array<{ index: number; direction: 'left' | 'right' }>>([]); // Track previous indices and directions
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false); // For programmatic animations
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isLoadingQuotes, setIsLoadingQuotes] = useState(false);
  const [isChangingCategories, setIsChangingCategories] = useState(false);
  const [likedQuotes, setLikedQuotes] = useState<Quote[]>([]);
  const [dislikedQuotes, setDislikedQuotes] = useState<Quote[]>([]);
  const [savedQuotes, setSavedQuotes] = useState<Quote[]>([]);
  const [lastLikedQuote, setLastLikedQuote] = useState<Quote | null>(null);
  const startPos = useRef({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const [isAppReady, setIsAppReady] = useState(false); // Prevent flickering - show content only when ready
  const isInitialLoad = useRef(true);
  const isRestoringFromUrl = useRef(false);
  const isLoadingPreferences = useRef(false); // Prevent saving while loading preferences
  const [preferencesLoaded, setPreferencesLoaded] = useState(false); // Track if preferences have been loaded
  const initStarted = useRef(false); // Prevent double initialization
  
  // Navigation state: prevents category change from triggering a refetch
  // when navigating to a specific quote from sidebar (liked/saved/created)
  const isManuallyNavigating = useRef(false);
  
  // Login state: prevents resetting currentIndex when user logs in
  // (preserves the quote they were viewing)
  const isLoggingIn = useRef(false);
  
  // Card Customization - restore from cache immediately for instant display
  const [showCustomizationModal, setShowCustomizationModal] = useState(false);
  const [cardTheme, setCardTheme] = useState<CardTheme>(() => {
    const cached = getFromCache<CardTheme>('cardTheme', 60 * 60 * 1000); // 1 hour
    return cached || CARD_THEMES[0];
  });
  const [fontStyle, setFontStyle] = useState<FontStyle>(() => {
    const cached = getFromCache<FontStyle>('fontStyle', 60 * 60 * 1000);
    return cached || FONT_STYLES[0];
  });
  const [backgroundImage, setBackgroundImage] = useState<BackgroundImage>(() => {
    const cached = getFromCache<BackgroundImage>('backgroundImage', 60 * 60 * 1000);
    return cached || BACKGROUND_IMAGES[0];
  });
  
  // Per-quote custom backgrounds (for saved quotes with custom backgrounds)
  // This allows individual quotes to have their own background without affecting others
  const [savedQuoteBackgrounds, setSavedQuoteBackgrounds] = useState<Record<string, BackgroundImage>>({});
  
  // User Quotes
  const [showCreateQuoteModal, setShowCreateQuoteModal] = useState(false);
  const [userQuotes, setUserQuotes] = useState<UserQuote[]>([]);
  const [editingQuote, setEditingQuote] = useState<UserQuote | null>(null);
  const [viewingUserQuote, setViewingUserQuote] = useState<UserQuote | null>(null);
  
  // Category Onboarding for new users
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [allCategoriesForOnboarding, setAllCategoriesForOnboarding] = useState<Category[]>([]);
  
  // Quote to share (can be either regular quote or user quote)
  const [shareQuote, setShareQuote] = useState<{
    id: number | string;
    text: string;
    author: string;
    category: string;
    category_icon?: string;
    likes_count?: number;
    isUserQuote?: boolean;
    is_public?: number | boolean;
    custom_background?: string;
  } | null>(null);
  
  // Pre-generated image for sharing (used when sharing from viewing modal)
  const [preGeneratedShareImage, setPreGeneratedShareImage] = useState<string | null>(null);

  // Sync authentication state with theme context for user-specific theme
  useEffect(() => {
    setThemeAuth(isAuthenticated);
  }, [isAuthenticated, setThemeAuth]);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // URL restoration on navigation back - restore URL from cache immediately
  useEffect(() => {
    // Only restore if we're on root URL and have cached data
    if (window.location.pathname === '/' && quotes.length > 0) {
      const cachedPath = getFromCache<string>('currentQuotePath', 60 * 60 * 1000);
      if (cachedPath && cachedPath.includes('/quote/')) {
        window.history.replaceState({ index: currentIndex }, '', cachedPath);
      }
    }
  }, []); // Run only once on mount

  // Single initialization on mount - prevents multiple fetches and flickering
  useEffect(() => {
    if (initStarted.current) return;
    initStarted.current = true;
    
    const initializeApp = async () => {
      try {
        // Check URL for quote ID (regular quotes) - supports alphanumeric IDs
        const pathMatch = window.location.pathname.match(/^\/quote\/([a-zA-Z0-9_-]+)$/);
        const urlParams = new URLSearchParams(window.location.search);
        const quoteIdParam = urlParams.get('quote');
        
        // Check URL for user quote ID - supports alphanumeric IDs
        const userQuotePathMatch = window.location.pathname.match(/^\/user-quote\/([a-zA-Z0-9_-]+)$/);
        const userQuoteIdParam = urlParams.get('user_quote');
        
        // Convert query param to path format for regular quotes
        if (quoteIdParam && !pathMatch) {
          window.history.replaceState({ quoteId: quoteIdParam }, '', `/quote/${quoteIdParam}`);
          }
        
        // Convert query param to path format for user quotes
        if (userQuoteIdParam && !userQuotePathMatch) {
          window.history.replaceState({ userQuoteId: userQuoteIdParam }, '', `/user-quote/${userQuoteIdParam}`);
        }
        
        if (pathMatch || quoteIdParam || userQuotePathMatch || userQuoteIdParam) {
          isInitialLoad.current = true;
          isRestoringFromUrl.current = true;
        }
        
        // FAST PATH: If quotes are already loaded from cache, skip heavy initialization
        // This provides instant display when navigating back
        const hasCachedBackground = getFromCache<BackgroundImage>('backgroundImage', 60 * 60 * 1000);
        if (quotes.length > 0 && hasCachedBackground) {
          // Just verify auth status quickly
          const authResponse = await fetch('/api/auth/me');
          if (authResponse.ok) {
            const data = await authResponse.json();
            setIsAuthenticated(true);
            setUser(data.user);
          }
          setPreferencesLoaded(true);
          setIsAppReady(true);
          return; // Skip full initialization
        }
        
        // OPTIMIZATION: Fetch auth AND categories in PARALLEL (saves ~200-500ms)
        // The categories API uses auth cookie, which is already set from previous session
        const [authResponse, categoriesResponse] = await Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/categories', { credentials: 'include' }),
        ]);
        
        let isUserAuthenticated = false;
        let userData = null;
        
        if (authResponse.ok) {
          const data = await authResponse.json();
          isUserAuthenticated = true;
          userData = data.user;
        }
        
        // Batch state update for auth
        setIsAuthenticated(isUserAuthenticated);
        setUser(userData);
        
        // Process categories response
        let categoriesData: Category[] = [];
        let totalCats = 0;
        
        if (categoriesResponse.ok) {
          const data = await categoriesResponse.json();
          categoriesData = data.categories || [];
          totalCats = data.totalCategories || categoriesData.length;
          setCategories(categoriesData);
          setTotalCategories(totalCats);
          setToCache(`categories_${isUserAuthenticated ? 'auth' : 'guest'}`, {
            categories: categoriesData,
            totalCategories: totalCats,
          });
        }
        
        // For authenticated users, fetch all preferences + user data in parallel (optimized)
        if (isUserAuthenticated) {
          isLoadingPreferences.current = true;
          
          // Combined API reduces 6 calls to 5 (preferences + card-style merged)
          const [allPrefsRes, likesRes, dislikesRes, savedRes, userQuotesRes] = await Promise.all([
            fetch('/api/user/all-preferences', { credentials: 'include' }),
            fetch('/api/user/likes', { credentials: 'include' }),
            fetch('/api/user/dislikes', { credentials: 'include' }),
            fetch('/api/user/saved', { credentials: 'include' }),
            fetch('/api/user/quotes', { credentials: 'include' }),
          ]);
          
          // Handle combined preferences (categories + card style)
          if (allPrefsRes.ok) {
            const data = await allPrefsRes.json();
            
            // Apply categories
            if (Array.isArray(data.selectedCategories)) {
              setSelectedCategories(data.selectedCategories);
            }
            
            // Apply card style
            const theme = CARD_THEMES.find(t => t.id === data.themeId);
            const font = FONT_STYLES.find(f => f.id === data.fontId);
            setCardTheme(theme || CARD_THEMES[0]);
            setFontStyle(font || FONT_STYLES[0]);
            
            // Resolve background (reuse helper defined later in component)
            const bgId = data.backgroundId;
            const customBgs = data.customBackgrounds || [];
            let bg: BackgroundImage = BACKGROUND_IMAGES[0];
            
            if (bgId && bgId !== 'none') {
              if (bgId === 'custom' || bgId.startsWith('custom_')) {
                const serverImg = customBgs.find((img: { id: string }) => img.id === bgId);
                if (serverImg) {
                  bg = {
                    id: serverImg.id, name: serverImg.name, url: serverImg.url, thumbnail: serverImg.url,
                    overlay: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.55) 100%)',
                    textColor: '#ffffff', authorColor: '#e5e5e5',
                    categoryBg: 'rgba(255,255,255,0.15)', categoryText: '#ffffff',
                  };
                } else {
                  // Fallback to localStorage
                  try {
                    const localJson = localStorage.getItem('quoteswipe_custom_images');
                    if (localJson) {
                      const localImgs = JSON.parse(localJson);
                      const localImg = localImgs.find((img: { id: string }) => img.id === bgId);
                      if (localImg) {
                        bg = {
                          id: localImg.id, name: localImg.name, url: localImg.url, thumbnail: localImg.url,
                          overlay: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.55) 100%)',
                          textColor: '#ffffff', authorColor: '#e5e5e5',
                          categoryBg: 'rgba(255,255,255,0.15)', categoryText: '#ffffff',
                        };
                      }
                    }
                  } catch {}
                }
              } else {
                bg = BACKGROUND_IMAGES.find(b => b.id === bgId) || BACKGROUND_IMAGES[0];
              }
            }
            setBackgroundImage(bg);
          }
          
          // Handle user data
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
            setSavedQuotes(savedData.quotes || []);
          }
          if (userQuotesRes.ok) {
            const userQuotesData = await userQuotesRes.json();
            setUserQuotes(userQuotesData.quotes || []);
          }
          
          setPreferencesLoaded(true);
          setTimeout(() => { isLoadingPreferences.current = false; }, 100);
        } else {
          // For guests, mark preferences as loaded immediately
          // Note: Guests only get 1 category (limited by API) and no onboarding
          setPreferencesLoaded(true);
        }
        
        // App is ready to show
        setIsAppReady(true);
        
      } catch (error) {
        console.error('App initialization error:', error);
        setIsAppReady(true); // Show app even on error
        setPreferencesLoaded(true);
      }
    };
    
    initializeApp();
  }, []);

  // Refetch categories only when auth changes AFTER initial load
  useEffect(() => {
    if (!isAppReady) return; // Skip during initial load
    fetchCategories();
  }, [isAuthenticated]);

  // Cache card style for instant restoration on navigation back
  useEffect(() => {
    if (!isAppReady) return; // Only cache after initial load
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

  // Cache quotes and index for instant restoration
  useEffect(() => {
    if (!isAppReady || quotes.length === 0) return;
    setToCache('swipeQuotes', quotes);
    setToCache('swipeCategories', categories);
  }, [quotes, categories, isAppReady]);

  useEffect(() => {
    if (!isAppReady) return;
    setToCache('currentQuoteIndex', currentIndex);
    // Also cache the current URL path for navigation restoration
    const path = window.location.pathname;
    if (path !== '/' && path.includes('/quote/')) {
      setToCache('currentQuotePath', path);
    }
  }, [currentIndex, isAppReady]);

  // Save user preferences when selectedCategories changes (debounced)
  useEffect(() => {
    // Only save if authenticated, not currently loading, and we've loaded preferences at least once
    if (isAuthenticated && !isLoadingPreferences.current && preferencesLoaded) {
      // Debounce save to avoid too many API calls
      const timeoutId = setTimeout(() => {
        saveUserPreferences(selectedCategories);
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [selectedCategories, isAuthenticated, preferencesLoaded]);

  // Fetch quotes when categories change (after app is ready)
  useEffect(() => {
    // Skip if we're manually navigating to a quote (prevents overwriting the navigated quote)
    if (isManuallyNavigating.current) {
      isManuallyNavigating.current = false;
      return;
    }
    
    // Wait for app to be ready
    if (!isAppReady) return;
    
    // Wait for categories to be loaded before fetching quotes
    if (!isAuthenticated && categories.length === 0) return;
    
    // For authenticated users, wait until preferences have been loaded
    if (isAuthenticated && !preferencesLoaded) return;
    
    fetchQuotes(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategories, isAppReady]);

  // Find and set quote index when quotes are loaded from URL (on reload)
  useEffect(() => {
    if (!isAppReady || quotes.length === 0) return;
    
    // Check if URL is in /quote/[id] format (regular quotes) - supports alphanumeric IDs
    const pathMatch = window.location.pathname.match(/^\/quote\/([a-zA-Z0-9_-]+)$/);
    const quoteIdFromPath = pathMatch ? pathMatch[1] : null;
    
    // Check if URL is in /user-quote/[id] format (user quotes)
    const userQuotePathMatch = window.location.pathname.match(/^\/user-quote\/([a-zA-Z0-9_-]+)$/);
    const userQuoteIdFromPath = userQuotePathMatch ? userQuotePathMatch[1] : null;
    
    // Also check query parameters for backward compatibility
    const urlParams = new URLSearchParams(window.location.search);
    const quoteIdParam = urlParams.get('quote');
    const quoteIdFromQuery = quoteIdParam || null;
    const userQuoteIdParam = urlParams.get('user_quote');
    
    // Determine if this is a user quote
    const isUserQuote = !!(userQuotePathMatch || userQuoteIdParam);
    const userQuoteId = userQuoteIdFromPath || userQuoteIdParam;
    const quoteId = quoteIdFromPath || quoteIdFromQuery;
    
    if ((quoteId || userQuoteId) && isRestoringFromUrl.current) {
      const filteredQuotes = getFilteredQuotes();
      let quoteIndex = -1;
      
      if (isUserQuote && userQuoteId) {
        // Find user quote by matching `user_${id}` format
        quoteIndex = filteredQuotes.findIndex(q => String(q.id) === `user_${userQuoteId}`);
      } else if (quoteId) {
        // Find regular quote by ID (compare as strings to handle both number and string IDs)
        quoteIndex = filteredQuotes.findIndex(q => String(q.id) === String(quoteId));
      }
      
      if (quoteIndex !== -1 && currentIndex !== quoteIndex) {
        setCurrentIndex(quoteIndex);
        // Update URL to match the quote type
        if (isUserQuote && userQuoteId) {
          window.history.replaceState({ userQuoteId, index: quoteIndex }, '', `/user-quote/${userQuoteId}`);
        } else if (quoteId) {
        const newPath = `/quote/${quoteId}`;
          if (!pathMatch || pathMatch[1] !== String(quoteId) || quoteIdParam) {
          window.history.replaceState({ quoteId, index: quoteIndex }, '', newPath);
          }
        }
      } else if (quoteIndex === -1) {
        // Quote not found, redirect to first quote
        const filteredQuotes = getFilteredQuotes();
        if (filteredQuotes.length > 0) {
          const firstQuote = filteredQuotes[0];
          const firstQuoteId = firstQuote.id;
          const isFirstUserQuote = String(firstQuoteId).startsWith('user_');
          if (isFirstUserQuote) {
            const cleanId = String(firstQuoteId).replace('user_', '');
            window.history.replaceState({ userQuoteId: cleanId, index: 0 }, '', `/user-quote/${cleanId}`);
          } else {
            window.history.replaceState({ quoteId: firstQuoteId, index: 0 }, '', `/quote/${firstQuoteId}`);
          }
        }
        setCurrentIndex(0);
      }
      
      // Mark restoration complete
      isRestoringFromUrl.current = false;
      isInitialLoad.current = false;
    } else if (!quoteId && !userQuoteId && isInitialLoad.current) {
      // No quote ID in URL (user visited root), update URL with current quote
      const filteredQuotes = getFilteredQuotes();
      if (filteredQuotes[currentIndex]) {
        const currentQuote = filteredQuotes[currentIndex];
        const currentQuoteId = currentQuote.id;
        const isCurrentUserQuote = String(currentQuoteId).startsWith('user_');
        if (isCurrentUserQuote) {
          const cleanId = String(currentQuoteId).replace('user_', '');
          window.history.replaceState({ userQuoteId: cleanId, index: currentIndex }, '', `/user-quote/${cleanId}`);
        } else {
          window.history.replaceState({ quoteId: currentQuoteId, index: currentIndex }, '', `/quote/${currentQuoteId}`);
        }
      }
      isInitialLoad.current = false;
    }
  }, [quotes, isAppReady, currentIndex]);

  // Update URL when quote changes (but not on initial load or when restoring from URL)
  useEffect(() => {
    if (!isAppReady || isInitialLoad.current || isRestoringFromUrl.current) return;
    
    const filteredQuotes = getFilteredQuotes();
    if (filteredQuotes[currentIndex]) {
      const quoteId = filteredQuotes[currentIndex].id;
      const isUserQuote = String(quoteId).startsWith('user_');
      
      // Check current URL to see if it needs updating
      const currentPath = window.location.pathname;
      let needsUpdate = false;
      let newPath = '';
      
      if (isUserQuote) {
        const cleanId = String(quoteId).replace('user_', '');
        newPath = `/user-quote/${cleanId}`;
        needsUpdate = currentPath !== newPath;
        if (needsUpdate) {
          window.history.pushState({ userQuoteId: cleanId, index: currentIndex }, '', newPath);
        }
      } else {
        newPath = `/quote/${quoteId}`;
        needsUpdate = currentPath !== newPath;
        if (needsUpdate) {
          window.history.pushState({ quoteId, index: currentIndex }, '', newPath);
        }
      }
    }
  }, [currentIndex, isAppReady]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.index !== undefined) {
        setCurrentIndex(event.state.index);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setIsAuthenticated(true);
        setUser(data.user);
        fetchUserData();
        // Load user's saved category preferences
        fetchUserPreferences();
        
        // Check if user needs onboarding (not completed yet)
        if (data.onboarding_complete === false) {
          // Fetch all categories for onboarding
          try {
            const onboardingCatsRes = await fetch('/api/categories?onboarding=true');
            if (onboardingCatsRes.ok) {
              const onboardingData = await onboardingCatsRes.json();
              setAllCategoriesForOnboarding(onboardingData.categories || []);
            }
          } catch {}
          setShowOnboarding(true);
        }
      } else {
        // Explicitly set to false if not authenticated
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setIsAuthenticated(false);
      setUser(null);
    }
  };

  const fetchUserData = async () => {
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
        setSavedQuotes(savedData.quotes || []);
      }
    } catch (error) {
      console.error('Fetch user data error:', error);
    }
  };

  // Helper: Create custom BackgroundImage object
  const createCustomBg = (img: { id: string; name: string; url: string }): BackgroundImage => ({
    id: img.id,
    name: img.name,
    url: img.url,
    thumbnail: img.url,
    overlay: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.55) 100%)',
    textColor: '#ffffff',
    authorColor: '#e5e5e5',
    categoryBg: 'rgba(255,255,255,0.15)',
    categoryText: '#ffffff',
  });

  // Helper: Resolve background ID to BackgroundImage object
  const resolveBackground = (bgId: string | undefined, serverBgs: Array<{ id: string; url: string; name: string }>): BackgroundImage => {
    if (!bgId || bgId === 'none') return BACKGROUND_IMAGES[0];

    // Check for custom background
    if (bgId === 'custom' || bgId.startsWith('custom_')) {
      // Try server-provided backgrounds first
      const serverImg = serverBgs.find(img => img.id === bgId);
      if (serverImg) return createCustomBg(serverImg);

      // Fallback to localStorage
      try {
        const localJson = localStorage.getItem('quoteswipe_custom_images');
        if (localJson) {
          const localImgs = JSON.parse(localJson);
          const localImg = localImgs.find((img: { id: string }) => img.id === bgId);
          if (localImg) return createCustomBg(localImg);
        }
        // Legacy single image
        const legacyUrl = localStorage.getItem('quoteswipe_custom_bg');
        if (legacyUrl && bgId === 'custom') {
          return createCustomBg({ id: 'custom', name: 'My Photo', url: legacyUrl });
        }
      } catch (e) {
        console.error('Failed to load custom background:', e);
      }
    }

    return BACKGROUND_IMAGES.find(b => b.id === bgId) || BACKGROUND_IMAGES[0];
  };

  // Fetch ALL user preferences in single optimized call (categories + card style)
  const fetchAllPreferences = async () => {
    try {
      isLoadingPreferences.current = true;
      const response = await fetch('/api/user/all-preferences', { credentials: 'include' });
      
      if (response.ok) {
        const data = await response.json();
        
        // Apply category preferences
        if (Array.isArray(data.selectedCategories)) {
          setSelectedCategories(data.selectedCategories);
        }
        
        // Apply card style preferences
        const theme = CARD_THEMES.find(t => t.id === data.themeId);
        const font = FONT_STYLES.find(f => f.id === data.fontId);
        const bg = resolveBackground(data.backgroundId, data.customBackgrounds || []);
        
        setCardTheme(theme || CARD_THEMES[0]);
        setFontStyle(font || FONT_STYLES[0]);
        setBackgroundImage(bg);
      }
      
      setPreferencesLoaded(true);
    } catch (error) {
      console.error('Fetch all preferences error:', error);
      setPreferencesLoaded(true);
    } finally {
      setTimeout(() => { isLoadingPreferences.current = false; }, 300);
    }
  };

  // Legacy wrapper - kept for backward compatibility
  const fetchCardStyle = async () => fetchAllPreferences();

  // Fetch user's created quotes
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

  // Save user's card style preferences (uses combined API)
  const saveCardStyle = async (themeToSave?: CardTheme, fontToSave?: FontStyle, bgToSave?: BackgroundImage) => {
    try {
      const response = await fetch('/api/user/all-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          themeId: themeToSave?.id || cardTheme.id,
          fontId: fontToSave?.id || fontStyle.id,
          backgroundId: bgToSave?.id || backgroundImage.id,
        }),
      });
      if (!response.ok) throw new Error('Failed to save card style');
    } catch (error) {
      console.error('Save card style error:', error);
      throw error;
    }
  };

  // Legacy wrapper - kept for backward compatibility  
  const fetchUserPreferences = async () => fetchAllPreferences();

  // Save category preferences (uses combined API)
  const saveUserPreferences = async (categories: string[]) => {
    if (!isAuthenticated || isLoadingPreferences.current) return;
    
    try {
      await fetch('/api/user/all-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ selectedCategories: categories }),
      });
    } catch (error) {
      console.error('Save user preferences error:', error);
    }
  };

  // Shuffle array function (Fisher-Yates algorithm)
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const fetchQuotes = async (isCategoryChange = false) => {
    // Check if we should preserve the current quote (during login)
    const shouldPreserveQuote = isLoggingIn.current;
    const currentQuoteId = quotes[currentIndex]?.id;
    
    try {
      setIsLoadingQuotes(true);
      if (isCategoryChange && !shouldPreserveQuote) {
        setIsChangingCategories(true);
      }
      
      // Build cache key and URL
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
      
      // Helper to set quotes and optionally preserve current position
      const applyQuotes = (quotesData: Quote[]) => {
        setQuotes(quotesData);
        
        if (shouldPreserveQuote && currentQuoteId) {
          // Try to find the same quote in the new array
          const preservedIndex = quotesData.findIndex(q => String(q.id) === String(currentQuoteId));
          if (preservedIndex !== -1) {
            setCurrentIndex(preservedIndex);
            return; // Keep current position
          }
        }
        
        // Reset to first quote
        setCurrentIndex(0);
        setSwipeHistory([]);
      };
      
      // Try to get from cache first (instant display)
      const cachedQuotes = getFromCache<Quote[]>(cacheKey, QUOTES_CACHE_DURATION);
      if (cachedQuotes && cachedQuotes.length > 0) {
        let quotesData = cachedQuotes;
        if (selectedCategories.length > 1) {
          quotesData = shuffleArray(quotesData);
        }
        applyQuotes(quotesData);
        setDragOffset({ x: 0, y: 0 });
        setSwipeDirection(null);
        setIsDragging(false);
        setIsAnimating(false);
        setIsLoadingQuotes(false);
        
        // Fetch fresh data in background (stale-while-revalidate pattern)
        fetch(url).then(async (response) => {
          if (response.ok) {
            const data = await response.json();
            const freshQuotes = data.quotes || [];
            setToCache(cacheKey, freshQuotes);
            // Only update if:
            // 1. Data changed significantly
            // 2. User is not currently interacting (dragging/animating)
            // 3. User is still at index 0 (hasn't swiped yet)
            const canSafelyUpdate = 
              freshQuotes.length !== cachedQuotes.length && 
              !isDraggingRef.current && 
              !isAnimatingRef.current &&
              currentIndexRef.current === 0;
            if (canSafelyUpdate) {
              setQuotes(selectedCategories.length > 1 ? shuffleArray(freshQuotes) : freshQuotes);
            }
          }
        }).catch(() => {});
        
        if (isCategoryChange && !shouldPreserveQuote) {
          setTimeout(() => setIsChangingCategories(false), 150);
        }
        return;
      }
      
      // No cache - fetch from server
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        let quotesData = data.quotes || [];
        
        // Cache the response
        setToCache(cacheKey, quotesData);
        
        // Shuffle quotes if multiple categories are selected
        if (selectedCategories.length > 1) {
          quotesData = shuffleArray(quotesData);
        }
        
        // Shorter delay since we already have loading state
        if (isCategoryChange && !shouldPreserveQuote) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        applyQuotes(quotesData);
        setDragOffset({ x: 0, y: 0 });
        setSwipeDirection(null);
        setIsDragging(false);
        setIsAnimating(false);
      }
    } catch (error) {
      console.error('Fetch quotes error:', error);
    } finally {
      setIsLoadingQuotes(false);
      isLoggingIn.current = false; // Reset login flag
      if (isCategoryChange && !shouldPreserveQuote) {
        setTimeout(() => setIsChangingCategories(false), 200);
      }
    }
  };

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(category)) {
        // Remove this category
        return prev.filter(c => c !== category);
      } else {
        // Add this category
        return [...prev, category];
      }
    });
  };

  const fetchCategories = async () => {
    try {
      const cacheKey = `categories_${isAuthenticated ? 'auth' : 'guest'}`;
      
      // Try cache first for instant display
      const cachedData = getFromCache<{ categories: Category[]; totalCategories: number }>(
        cacheKey,
        CATEGORIES_CACHE_DURATION
      );
      
      if (cachedData) {
        setCategories(cachedData.categories);
        setTotalCategories(cachedData.totalCategories);
        
        // Fetch fresh data in background
        fetch('/api/categories', { credentials: 'include' }).then(async (response) => {
          if (response.ok) {
            const data = await response.json();
            const freshData = {
              categories: data.categories || [],
              totalCategories: data.totalCategories || data.categories?.length || 0,
            };
            setToCache(cacheKey, freshData);
            // Update if different
            if (freshData.categories.length !== cachedData.categories.length) {
              setCategories(freshData.categories);
              setTotalCategories(freshData.totalCategories);
            }
          }
        }).catch(() => {});
        return;
      }
      
      // No cache - fetch from server
      const response = await fetch('/api/categories', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        const freshData = {
          categories: data.categories || [],
          totalCategories: data.totalCategories || data.categories?.length || 0,
        };
        setToCache(cacheKey, freshData);
        setCategories(freshData.categories);
        setTotalCategories(freshData.totalCategories);
      }
    } catch (error) {
      console.error('Fetch categories error:', error);
    }
  };

  const handleLogin = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }

    // Set flag to preserve current quote during login transition
    isLoggingIn.current = true;
    
    setIsAuthenticated(true);
    setUser(data.user);
    setShowAuthModal(false);
    setSwipeCount(0);
    setAuthenticatedSwipeCount(0); // Reset authenticated swipe count on login
    
    // Clear guest category cache to force fresh fetch with all categories
    try {
      sessionStorage.removeItem(CACHE_PREFIX + 'categories_guest');
    } catch {}
    
    await fetchUserData();
    // Refetch categories to show all categories for authenticated users
    await fetchCategories();
    // Load user's saved category preferences (this will trigger fetchQuotes with isLoggingIn=true)
    await fetchUserPreferences();
    
    // Check if user needs onboarding (not completed yet)
    if (data.onboarding_complete === false) {
      // Fetch all categories for onboarding
      try {
        const onboardingCatsRes = await fetch('/api/categories?onboarding=true');
        if (onboardingCatsRes.ok) {
          const onboardingData = await onboardingCatsRes.json();
          setAllCategoriesForOnboarding(onboardingData.categories || []);
        }
      } catch {}
      setShowOnboarding(true);
    }
    
    // Show success toast
    toast.success(`Welcome back, ${data.user.name}! 👋`);
  };

  const handleRegister = async (name: string, email: string, password: string) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Registration failed');
    }

    // Set flag to preserve current quote during registration transition
    isLoggingIn.current = true;
    
    setIsAuthenticated(true);
    setUser(data.user);
    setShowAuthModal(false);
    setSwipeCount(0);
    setAuthenticatedSwipeCount(0); // Reset authenticated swipe count on login
    
    // Clear guest category cache to force fresh fetch with all categories
    try {
      sessionStorage.removeItem(CACHE_PREFIX + 'categories_guest');
    } catch {}
    
    await fetchUserData();
    // Refetch categories to show all categories for authenticated users
    await fetchCategories();
    // New users won't have preferences yet, but set the flag to allow saving
    isLoadingPreferences.current = false;
    isLoggingIn.current = false; // Reset since no preferences fetch for new users
    
    // Show onboarding for new users
    if (data.onboarding_complete === false) {
      // Fetch all categories for onboarding
      try {
        const onboardingCatsRes = await fetch('/api/categories?onboarding=true');
        if (onboardingCatsRes.ok) {
          const onboardingData = await onboardingCatsRes.json();
          setAllCategoriesForOnboarding(onboardingData.categories || []);
        }
      } catch {}
      setShowOnboarding(true);
      toast.success(`Welcome to QuoteSwipe, ${data.user.name}! 🎉`);
    } else {
      // Show success toast
      toast.success(`Welcome to QuoteSwipe, ${data.user.name}! 🎉`);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      
      // Clear user-specific cache on logout
      clearUserCache();
      
      setIsAuthenticated(false);
      setUser(null);
      setIsSidebarOpen(false);
      setSwipeCount(0);
      setAuthenticatedSwipeCount(0);
      setCurrentIndex(0);
      setLikedQuotes([]);
      setDislikedQuotes([]);
      setSavedQuotes([]);
      // Reset selected categories - they may not be available for non-auth users
      setSelectedCategories([]);
      // Reset preferences loaded flag
      setPreferencesLoaded(false);
      // Reset card customization to defaults
      setCardTheme(CARD_THEMES[0]);
      setFontStyle(FONT_STYLES[0]);
      
      // Refetch categories and then quotes for non-authenticated user
      const response = await fetch('/api/categories', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        const newCategories = data.categories || [];
        setCategories(newCategories);
        setTotalCategories(data.totalCategories || newCategories.length || 0);
        
        // Cache the new categories
        setToCache('categories_guest', {
          categories: newCategories,
          totalCategories: data.totalCategories || newCategories.length || 0,
        });
        
        // Fetch quotes for the first available category
        if (newCategories.length > 0) {
          const quotesResponse = await fetch(`/api/quotes?categories=${encodeURIComponent(newCategories[0].name)}`);
          if (quotesResponse.ok) {
            const quotesData = await quotesResponse.json();
            setQuotes(quotesData.quotes || []);
            // Cache the quotes
            setToCache(`quotes_${newCategories[0].name}_guest`, quotesData.quotes || []);
          }
        }
      }
      
      // Show success toast
      toast.success('You have been logged out. See you soon! 👋');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout. Please try again.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const getFilteredQuotes = useCallback(() => {
    return quotes;
  }, [quotes]);

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Don't allow dragging if auth modal is open
    if (showAuthModal) return;
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    startPos.current = { x: clientX, y: clientY };
  };

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || showAuthModal) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const deltaX = clientX - startPos.current.x;
    const deltaY = clientY - startPos.current.y;
    setDragOffset({ x: deltaX, y: deltaY });

    // Set swipe direction for button animation - lower threshold for mobile
    const animationThreshold = isMobile ? 30 : 50;
    if (Math.abs(deltaX) > animationThreshold) {
      setSwipeDirection(deltaX > 0 ? 'right' : 'left');
    } else {
      setSwipeDirection(null);
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    // Lower threshold for mobile devices (60px) vs desktop (120px)
    const swipeThreshold = isMobile ? 60 : 120;
    if (Math.abs(dragOffset.x) > swipeThreshold) {
      handleSwipe(dragOffset.x > 0 ? 'right' : 'left');
    } else {
      setDragOffset({ x: 0, y: 0 });
      setSwipeDirection(null);
    }
  };

  const handleSwipe = (direction: 'left' | 'right') => {
    const filteredQuotes = getFilteredQuotes();
    const currentQuote = filteredQuotes[currentIndex];

    if (direction === 'right' && currentQuote) {
      // Check if user already liked this quote
      const alreadyLiked = likedQuotes.some(q => q.id === currentQuote.id);
      
      if (!alreadyLiked) {
        setLastLikedQuote(currentQuote);
        
        // OPTIMISTIC UPDATE: Update UI immediately
        setLikedQuotes(prev => [...prev, currentQuote]);
        setDislikedQuotes(prev => prev.filter(q => q.id !== currentQuote.id));
        setQuotes(prev => prev.map(q => 
          q.id === currentQuote.id 
            ? { ...q, likes_count: (q.likes_count || 0) + 1 }
            : q
        ));
        
        // API call in background (fire and forget)
        if (isAuthenticated) {
          fetch('/api/user/likes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quoteId: currentQuote.id }),
          }).catch(error => {
            console.error('Like quote error:', error);
            // Silently fail - UI already updated
          });
        }
      } else {
        // Already liked - just set as last liked for undo tracking
        setLastLikedQuote(currentQuote);
      }
    } else if (direction === 'left' && currentQuote) {
      // Check if user already disliked this quote
      const alreadyDisliked = dislikedQuotes.some(q => q.id === currentQuote.id);
      
      if (!alreadyDisliked) {
        // OPTIMISTIC UPDATE: Update UI immediately
        setDislikedQuotes(prev => [...prev, currentQuote]);
        setLikedQuotes(prev => prev.filter(q => q.id !== currentQuote.id));
        setQuotes(prev => prev.map(q => 
          q.id === currentQuote.id 
            ? { ...q, dislikes_count: (q.dislikes_count || 0) + 1 }
            : q
        ));
        
        // API call in background (fire and forget)
        if (isAuthenticated) {
          fetch('/api/user/dislikes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quoteId: currentQuote.id }),
          }).catch(error => {
            console.error('Dislike quote error:', error);
            // Silently fail - UI already updated
          });
        }
      }
      setLastLikedQuote(null);
    } else {
      setLastLikedQuote(null);
    }

    // Track swipe counts
    if (!isAuthenticated) {
      // Increment swipe count for unauthenticated users
      const newCount = swipeCount + 1;
      setSwipeCount(newCount);

      // Show auth modal after 5 swipes
      if (newCount >= 5) {
        // Reset drag state before opening modal
        setIsDragging(false);
        setDragOffset({ x: 0, y: 0 });
        setSwipeDirection(null);
        setShowAuthModal(true);
        return;
      }
    } else {
      // Increment swipe count for authenticated users
      const newAuthCount = authenticatedSwipeCount + 1;
      setAuthenticatedSwipeCount(newAuthCount);

      // Show Instagram follow modal after 10 swipes (only if 2 days have passed)
      if (newAuthCount >= 10 && canShowInstagramModal()) {
        // Reset drag state before opening modal
        setIsDragging(false);
        setDragOffset({ x: 0, y: 0 });
        setSwipeDirection(null);
        setShowInstagramModal(true);
        markInstagramModalShown(); // Mark as shown for 2-day cooldown
        // Reset count after showing modal
        setAuthenticatedSwipeCount(0);
        return;
      } else if (newAuthCount >= 10) {
        // Reset count even if modal not shown (cooldown active)
        setAuthenticatedSwipeCount(0);
      }
    }

    // Add current index and direction to history before moving forward
    setSwipeHistory([...swipeHistory, { index: currentIndex, direction }]);

    setSwipeDirection(direction);
    setTimeout(() => {
      if (currentIndex < filteredQuotes.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        setCurrentIndex(0);
        if (!isAuthenticated) {
          // Reset local tracking for guest users when looping
          setLikedQuotes([]);
          setDislikedQuotes([]);
          setSavedQuotes([]);
        }
      }
      setDragOffset({ x: 0, y: 0 });
      setSwipeDirection(null);
    }, 300);
  };

  const handleUndo = async () => {
    if (swipeHistory.length === 0) return;

    const filteredQuotes = getFilteredQuotes();
    const lastSwipe = swipeHistory[swipeHistory.length - 1];
    const previousIndex = lastSwipe.index;
    const previousDirection = lastSwipe.direction;
    const newHistory = swipeHistory.slice(0, -1);

    // Remove last liked quote if it was liked (swiped right)
    if (lastLikedQuote && previousDirection === 'right') {
      setLikedQuotes(likedQuotes.filter(q => q.id !== lastLikedQuote.id));
      
      // If authenticated, remove like from database
      if (isAuthenticated) {
        try {
          // Note: We'd need a DELETE endpoint for this, but for now we'll just update the UI
          // The like will remain in DB but won't show in UI
          // You can add DELETE /api/user/likes/:quoteId endpoint if needed
        } catch (error) {
          console.error('Error removing like:', error);
        }
      }
      setLastLikedQuote(null);
    }

    // Decrement swipe count
    if (!isAuthenticated && swipeCount > 0) {
      setSwipeCount(swipeCount - 1);
    } else if (isAuthenticated && authenticatedSwipeCount > 0) {
      setAuthenticatedSwipeCount(authenticatedSwipeCount - 1);
    }

    // Animate undo with reverse swipe direction
    // If swiped right, card comes back from right
    // If swiped left, card comes back from left
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
  };

  const handleLike = () => {
    // Prevent multiple clicks during animation
    if (isDragging || isAnimating) return;
    
    setIsAnimating(true);
    setSwipeDirection('right');
    
    // Set the target drag offset - CSS transition will animate smoothly
    setDragOffset({ x: 300, y: 0 });
    
    // After animation completes, trigger swipe
    setTimeout(() => {
      handleSwipe('right');
      setIsAnimating(false);
    }, 300);
  };

  const handleDislike = () => {
    // Prevent multiple clicks during animation
    if (isDragging || isAnimating) return;
    
    setIsAnimating(true);
    setSwipeDirection('left');
    
    // Set the target drag offset - CSS transition will animate smoothly
    setDragOffset({ x: -300, y: 0 });
    
    // After animation completes, trigger swipe
    setTimeout(() => {
      handleSwipe('left');
      setIsAnimating(false);
    }, 300);
  };

  const handleSave = () => {
    // Prevent multiple clicks during animation
    if (isDragging || isAnimating) return;
    
    const filteredQuotes = getFilteredQuotes();
    const currentQuote = filteredQuotes[currentIndex];

    if (currentQuote) {
      // Open save modal to ask about customization
      setQuoteToSave(currentQuote);
      setShowSaveQuoteModal(true);
    }
  };

  // Called from SaveQuoteModal after user confirms save
  const handleConfirmSave = useCallback((customBackground: string | null, fontId?: string) => {
    if (!quoteToSave) return;
    
    // Start the visual animation
    setIsAnimating(true);
    setSwipeDirection('right');
    setDragOffset({ x: 300, y: 0 });
    
    // OPTIMISTIC UPDATE: Update UI immediately
    setSavedQuotes(prev => [...prev, quoteToSave]);
    
    // API call in background (fire and forget)
    if (isAuthenticated) {
      fetch('/api/user/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          quoteId: quoteToSave.id,
          customBackground: customBackground 
        }),
      }).catch(error => {
        console.error('Save quote error:', error);
        // Silently fail - UI already updated
      });
    }
    
    // After animation completes, move to next quote
    setTimeout(() => {
      handleSwipe('right');
      setIsAnimating(false);
    }, 300);
    
    // Clear the quote to save
    setQuoteToSave(null);
    
    // Show success toast - clarify that background is saved only for this quote
    if (customBackground) {
      toast.success('Quote saved with custom background! 🖼️');
    } else {
      toast.success('Quote saved! 🔖');
    }
  }, [quoteToSave, isAuthenticated, handleSwipe]);

  const handleShare = () => {
    const filteredQuotes = getFilteredQuotes();
    const currentQuote = filteredQuotes[currentIndex];

    if (!currentQuote) return;

    // Set the quote to share
    setShareQuote({
      id: currentQuote.id,
      text: currentQuote.text,
      author: currentQuote.author,
      category: currentQuote.category,
      category_icon: currentQuote.category_icon,
      likes_count: currentQuote.likes_count,
      isUserQuote: false,
    });
    setShowShareModal(true);
  };
  
  // Handle share for user-created quotes
  const handleShareUserQuote = (quote: UserQuote) => {
    setShareQuote({
      id: `user_${quote.id}`,
      text: quote.text,
      author: quote.author,
      category: quote.category || 'Personal',
      category_icon: quote.category_icon || '✨',
      isUserQuote: true,
      is_public: quote.is_public,
      custom_background: quote.custom_background || undefined,
    });
    setShowShareModal(true);
  };

  // Build URL path for a quote (handles both regular and user quotes)
  const getQuotePath = useCallback((id: string | number): string => {
    const idStr = String(id);
    return idStr.startsWith('user_') 
      ? `/user-quote/${idStr.replace('user_', '')}` 
      : `/quote/${idStr}`;
  }, []);

  // Add category to selection without triggering a refetch
  const addCategoryWithoutRefetch = useCallback((category: string) => {
    if (!selectedCategories.includes(category)) {
      isManuallyNavigating.current = true;
      setSelectedCategories(prev => [...prev, category]);
    }
  }, [selectedCategories]);

  // Navigate to a specific quote and update UI state
  const navigateToQuote = useCallback((quote: Quote, index: number) => {
    setCurrentIndex(index);
    window.history.pushState({}, '', getQuotePath(quote.id));
  }, [getQuotePath]);

  // Handle navigation to a specific quote from sidebar (liked/saved/created quotes)
  const handleQuoteNavigation = useCallback(async (quoteId: string | number, category?: string, customBackground?: string | null) => {
    const quoteIdStr = String(quoteId);
    
    // If quote has a saved custom background, store it for THIS quote only (not globally)
    if (customBackground) {
      const quoteBackground: BackgroundImage = {
        id: `saved_custom_${quoteIdStr}`,
        name: 'Saved Background',
        url: customBackground,
        thumbnail: customBackground,
        overlay: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.55) 100%)',
        textColor: '#ffffff',
        authorColor: '#e5e5e5',
        categoryBg: 'rgba(255,255,255,0.15)',
        categoryText: '#ffffff',
      };
      // Store per-quote background - doesn't affect other quotes
      setSavedQuoteBackgrounds(prev => ({
        ...prev,
        [quoteIdStr]: quoteBackground
      }));
    }
    
    // 1. Check if quote exists in current feed
    const existingIndex = quotes.findIndex(q => String(q.id) === quoteIdStr);
    if (existingIndex !== -1) {
      navigateToQuote(quotes[existingIndex], existingIndex);
      return;
    }
    
    // 2. Fetch the specific quote directly
    setIsLoadingQuotes(true);
    
    try {
      const response = await fetch(`/api/quotes/${quoteId}`);
      if (response.ok) {
        const { quote } = await response.json();
        if (quote) {
          // Add to feed (avoid duplicates)
          setQuotes(prev => {
            const exists = prev.some(q => String(q.id) === String(quote.id));
            return exists ? prev : [quote, ...prev];
          });
          navigateToQuote(quote, 0);
          
          // Include category in filter (without triggering refetch)
          if (category) addCategoryWithoutRefetch(category);
          
          setIsLoadingQuotes(false);
          return;
        }
      }
      
      // 3. Fallback: Fetch quotes with category included
      if (category) {
        addCategoryWithoutRefetch(category);
        
        const categoriesForFetch = selectedCategories.includes(category)
          ? selectedCategories
          : [...selectedCategories, category];
        
        const quotesResponse = await fetch(`/api/quotes?categories=${categoriesForFetch.join(',')}`);
        if (quotesResponse.ok) {
          const { quotes: fetchedQuotes = [] } = await quotesResponse.json();
          setQuotes(fetchedQuotes);
          
          const foundIndex = fetchedQuotes.findIndex((q: Quote) => String(q.id) === quoteIdStr);
          if (foundIndex !== -1) {
            navigateToQuote(fetchedQuotes[foundIndex], foundIndex);
          }
        }
      }
    } catch (error) {
      console.error('Quote navigation error:', error);
      toast.error('Failed to load quote');
    } finally {
      setIsLoadingQuotes(false);
    }
  }, [quotes, selectedCategories, navigateToQuote, addCategoryWithoutRefetch]);

  // Use refs to track state for event handlers to avoid re-attaching listeners
  const isDraggingRef = useRef(isDragging);
  const dragOffsetRef = useRef(dragOffset);
  const handleSwipeRef = useRef(handleSwipe);
  const isMobileRef = useRef(isMobile);
  const isAnimatingRef = useRef(isAnimating);
  const currentIndexRef = useRef(currentIndex);
  
  // Keep refs in sync with state
  useEffect(() => {
    isDraggingRef.current = isDragging;
    dragOffsetRef.current = dragOffset;
    handleSwipeRef.current = handleSwipe;
    isMobileRef.current = isMobile;
    isAnimatingRef.current = isAnimating;
    currentIndexRef.current = currentIndex;
  });

  useEffect(() => {
    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        setIsDragging(false);
        // Lower threshold for mobile devices (60px) vs desktop (120px)
        const swipeThreshold = isMobileRef.current ? 60 : 120;
        if (Math.abs(dragOffsetRef.current.x) > swipeThreshold) {
          handleSwipeRef.current(dragOffsetRef.current.x > 0 ? 'right' : 'left');
        } else {
          setDragOffset({ x: 0, y: 0 });
          setSwipeDirection(null);
        }
      }
    };
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchend', handleMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, []); // Empty deps - all values accessed via refs

  // Reset drag state when modals open
  useEffect(() => {
    if (showAuthModal || showInstagramModal) {
      setIsDragging(false);
      setDragOffset({ x: 0, y: 0 });
      setSwipeDirection(null);
    }
  }, [showAuthModal, showInstagramModal]);

  const filteredQuotes = getFilteredQuotes();
  const currentQuote = filteredQuotes[currentIndex];
  const progress = filteredQuotes.length > 0 
    ? ((currentIndex + 1) / filteredQuotes.length) * 100 
    : 0;

  // Show loading state until app is ready to prevent flickering
  if (!isAppReady) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          {/* Logo with spinning ring */}
          <div className="relative w-24 h-24 mx-auto mb-6">
            {/* Spinning ring */}
            <div 
              className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 border-r-purple-500"
              style={{ animation: 'spin 1s linear infinite' }}
            />
            
            {/* Second ring (slower, opposite) */}
            <div 
              className="absolute inset-2 rounded-full border-4 border-transparent border-b-pink-500 border-l-purple-500"
              style={{ animation: 'spin 1.5s linear infinite reverse' }}
            />
            
            {/* Logo in center */}
            <div 
              className="absolute inset-4 flex items-center justify-center"
              style={{ animation: 'logoPulse 2s ease-in-out infinite' }}
            >
              <Image 
                src="/logo.svg" 
                alt="QuoteSwipe" 
                width={64}
                height={64}
                priority
              />
        </div>
          </div>
          
          {/* Loading text */}
          <p className="text-sm text-gray-400 dark:text-gray-500">Loading...</p>
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes logoPulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(0.95); opacity: 0.8; }
          }
        `}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-pink-50 dark:from-gray-900 dark:via-indigo-950 dark:to-pink-950 flex overflow-hidden">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isAuthenticated={isAuthenticated}
        user={user}
        likedCount={likedQuotes.length}
        savedCount={savedQuotes.length}
        dislikedCount={dislikedQuotes.length}
        viewedCount={currentIndex + 1}
        categories={categories}
        totalCategories={totalCategories}
        selectedCategories={selectedCategories}
        onCategoryToggle={handleCategoryToggle}
        onLoginClick={() => setShowAuthModal(true)}
        onLogout={handleLogout}
        isLoggingOut={isLoggingOut}
        onSavedQuoteDelete={(quoteId: string | number) => {
          setSavedQuotes(savedQuotes.filter(q => String(q.id) !== String(quoteId)));
        }}
        onQuoteClick={handleQuoteNavigation}
        onCustomizeClick={() => setShowCustomizationModal(true)}
        onCreateQuoteClick={() => {
          setEditingQuote(null);
          setShowCreateQuoteModal(true);
        }}
        onEditQuoteClick={(quote) => {
          setEditingQuote(quote);
          setShowCreateQuoteModal(true);
        }}
        onViewQuoteClick={(quote) => {
          setViewingUserQuote(quote);
        }}
        userQuotes={userQuotes}
        onUserQuoteDelete={(quoteId: string | number) => {
          setUserQuotes(userQuotes.filter(q => String(q.id) !== String(quoteId)));
        }}
        onRefreshUserQuotes={fetchUserQuotes}
        onLikedClick={() => setActiveNavTab('liked')}
        onSkippedClick={() => setActiveNavTab('skipped')}
        onProfileClick={() => setActiveNavTab('profile')}
      />

      {/* Options Menu (Bottom Sheet) */}
      <OptionsMenu
        isOpen={showOptionsMenu}
        onClose={() => setShowOptionsMenu(false)}
        isAuthenticated={isAuthenticated}
        userName={user?.name}
        likedCount={likedQuotes.length}
        skippedCount={dislikedQuotes.length}
        isAdmin={user?.role === 'admin'}
        onProfileClick={() => setActiveNavTab('profile')}
        onLikedClick={() => setActiveNavTab('liked')}
        onSkippedClick={() => setActiveNavTab('skipped')}
        onCustomizeClick={() => setShowCustomizationModal(true)}
        onCategoriesClick={() => setIsSidebarOpen(true)}
        onLoginClick={() => setShowAuthModal(true)}
        onLogoutClick={handleLogout}
      />

      {/* Category Onboarding for newly signed-up users */}
      {showOnboarding && allCategoriesForOnboarding.length > 0 && isAuthenticated && (
        <Suspense fallback={<ModalLoader />}>
          <CategoryOnboarding
            categories={allCategoriesForOnboarding}
            onComplete={async (selected) => {
              setSelectedCategories(selected);
              setShowOnboarding(false);
              
              // Save to database and mark onboarding complete
              try {
                await fetch('/api/user/all-preferences', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                    selectedCategories: selected,
                    markOnboardingComplete: true 
                  }),
                });
              } catch (err) {
                console.error('Failed to save onboarding preferences:', err);
              }
              
              // Fetch quotes with selected categories
              fetchQuotes(true);
              toast.success(`Great choices! Showing ${selected.length} categories 🎉`);
            }}
            onSkip={async () => {
              setShowOnboarding(false);
              
              // Mark onboarding complete in database (no categories selected = show all)
              try {
                await fetch('/api/user/all-preferences', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ markOnboardingComplete: true }),
                });
              } catch (err) {
                console.error('Failed to mark onboarding complete:', err);
              }
              
              toast('Explore all categories!', { icon: '🌟' });
            }}
          />
        </Suspense>
      )}

      {/* Lazy-loaded modals wrapped in Suspense for better performance */}
      {showAuthModal && (
        <Suspense fallback={<ModalLoader />}>
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLogin={handleLogin}
        onRegister={handleRegister}
        onGoogleSuccess={async (googleUser) => {
          // Set flag to preserve current quote during login transition
          isLoggingIn.current = true;
          
          setIsAuthenticated(true);
          setUser(googleUser);
          setShowAuthModal(false);
          setSwipeCount(0);
          setAuthenticatedSwipeCount(0);
          
          // Clear guest category cache to force fresh fetch with all categories
          try {
            sessionStorage.removeItem(CACHE_PREFIX + 'categories_guest');
          } catch {}
          
          await fetchUserData();
          await fetchCardStyle();
          await fetchCategories();
          // Load user's saved category preferences (this will trigger fetchQuotes with isLoggingIn=true)
          await fetchUserPreferences();
          
          // Show success toast
          toast.success(`Welcome, ${googleUser.name}! 🎉`);
        }}
        swipeCount={swipeCount}
      />
        </Suspense>
      )}

      {showShareModal && shareQuote && (
        <Suspense fallback={<ModalLoader />}>
        <ShareModal
          isOpen={showShareModal}
            onClose={() => {
              setShowShareModal(false);
              setShareQuote(null);
              setPreGeneratedShareImage(null); // Clear pre-generated image
            }}
            quote={shareQuote}
            preGeneratedImage={preGeneratedShareImage}
            cardTheme={cardTheme}
            fontStyle={fontStyle}
            backgroundImage={
              // Use quote's custom background if available, or per-quote saved background, or global
              shareQuote.custom_background
                ? {
                    id: `share_custom_${shareQuote.id}`,
                    name: 'Custom Background',
                    url: shareQuote.custom_background,
                    thumbnail: shareQuote.custom_background,
                    overlay: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.55) 100%)',
                    textColor: '#ffffff',
                    authorColor: '#e5e5e5',
                    categoryBg: 'rgba(255,255,255,0.15)',
                    categoryText: '#ffffff',
                  }
                : savedQuoteBackgrounds[String(shareQuote.id)] || backgroundImage
            }
          />
        </Suspense>
      )}

      {showSaveQuoteModal && quoteToSave && (
        <Suspense fallback={<ModalLoader />}>
          <SaveQuoteModal
            isOpen={showSaveQuoteModal}
            onClose={() => {
              setShowSaveQuoteModal(false);
              setQuoteToSave(null);
            }}
            quote={quoteToSave}
            currentBackground={backgroundImage}
            currentFont={fontStyle}
            onSave={handleConfirmSave}
            isAuthenticated={isAuthenticated}
          />
        </Suspense>
      )}

      {showInstagramModal && (
        <Suspense fallback={<ModalLoader />}>
      <InstagramFollowModal
        isOpen={showInstagramModal}
        onClose={() => setShowInstagramModal(false)}
        onFollow={() => {
          // Optional: Track follow event
          console.log('User followed on Instagram');
        }}
      />
        </Suspense>
      )}

      {showCustomizationModal && (
        <Suspense fallback={<ModalLoader />}>
          <CardCustomization
            isOpen={showCustomizationModal}
            onClose={() => setShowCustomizationModal(false)}
            currentTheme={cardTheme}
            currentFont={fontStyle}
            currentBackground={backgroundImage}
            onThemeChange={setCardTheme}
            onFontChange={setFontStyle}
            onBackgroundChange={setBackgroundImage}
            onSave={saveCardStyle}
            isAuthenticated={isAuthenticated}
          />
        </Suspense>
      )}

      {showSearchModal && (
        <Suspense fallback={<ModalLoader />}>
      <SearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
            onQuoteSelect={(quoteId: string | number, category?: string) => {
              // Close modal first for better UX
              setShowSearchModal(false);
              // Use the same navigation handler as sidebar
              handleQuoteNavigation(quoteId, category);
            }}
          />
        </Suspense>
      )}

      {showCreateQuoteModal && (
        <Suspense fallback={<ModalLoader />}>
          <CreateQuoteModal
            isOpen={showCreateQuoteModal}
            onClose={() => {
              setShowCreateQuoteModal(false);
              setEditingQuote(null);
            }}
            onSuccess={(quote, cacheInvalidated) => {
              if (editingQuote) {
                // Update existing quote (compare as strings)
                setUserQuotes(userQuotes.map(q => String(q.id) === String(quote.id) ? quote : q));
              } else {
                // Add new quote
                setUserQuotes([quote, ...userQuotes]);
              }
              toast.success(editingQuote ? 'Quote updated!' : 'Quote created!');
              
              // If server cache was invalidated (public quote), clear client cache and refetch
              if (cacheInvalidated) {
                // Clear client-side quotes cache
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
                  // Ignore storage errors
                }
                
                // Refetch quotes to include the new public quote
                fetchQuotes(true);
                toast.success(quote.is_public ? 'Your quote is now public!' : 'Quote visibility updated!', { icon: '🌍' });
              }
            }}
            categories={categories}
            editQuote={editingQuote}
          />
        </Suspense>
      )}

      {/* View User Quote Modal */}
      {viewingUserQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setViewingUserQuote(null)}
          />
          
          {/* Quote Card Container */}
          <div className="relative w-full max-w-md animate-in zoom-in-95 duration-200">
            {/* Close button */}
            <button
              onClick={() => setViewingUserQuote(null)}
              className="absolute -top-12 right-0 flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-full text-sm font-medium transition-all"
            >
              <span>Close</span>
              <span className="text-lg">×</span>
            </button>
            
            {/* Action buttons */}
            <div className="absolute -top-12 left-0 flex items-center gap-2">
              <button
                onClick={() => {
                  setEditingQuote(viewingUserQuote);
                  setViewingUserQuote(null);
                  setShowCreateQuoteModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-full text-sm font-medium transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                Edit
              </button>
              <button
                onClick={async () => {
                  const quoteToShare = viewingUserQuote;
                  
                  // Generate image first while quote card is still visible
                  try {
                    const { toPng } = await import('html-to-image');
                    // Find the actual QuoteCard element (not the wrapper) - it has data-quote-id without "user_" prefix
                    const quoteCardElement = document.querySelector(`[data-quote-id="${quoteToShare.id}"][data-quote-card="true"]`) as HTMLElement;
                    
                    if (quoteCardElement) {
                      // Wait for any animations to complete
                      await new Promise(resolve => setTimeout(resolve, 100));
                      
                      // Store original styles
                      const originalTransform = quoteCardElement.style.transform;
                      const originalTransition = quoteCardElement.style.transition;
                      
                      // Hide elements marked with data-hide-on-download (like category)
                      const hideElements = quoteCardElement.querySelectorAll('[data-hide-on-download="true"]') as NodeListOf<HTMLElement>;
                      hideElements.forEach(el => el.style.display = 'none');
                      
                      // Reset transform for clean capture
                      quoteCardElement.style.transform = 'none';
                      quoteCardElement.style.transition = 'none';
                      
                      // Wait for style update
                      await new Promise(resolve => setTimeout(resolve, 50));
                      
                      const dataUrl = await toPng(quoteCardElement, {
                        quality: 1.0,
                        pixelRatio: 3,
                        cacheBust: true,
                        width: quoteCardElement.offsetWidth,
                        height: quoteCardElement.offsetHeight,
                        style: {
                          borderRadius: '0px',
                          overflow: 'hidden',
                        },
                      });
                      
                      // Restore hidden elements
                      hideElements.forEach(el => el.style.display = '');
                      
                      // Restore original styles
                      quoteCardElement.style.transform = originalTransform;
                      quoteCardElement.style.transition = originalTransition;
                      
                      setPreGeneratedShareImage(dataUrl);
              }
            } catch (error) {
                    console.error('Error pre-generating image:', error);
                  }
                  
                  // Close viewing screen
                  setViewingUserQuote(null);
                  
                  // Open share modal
                  handleShareUserQuote(quoteToShare);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white rounded-full text-sm font-medium transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>
                Share
              </button>
            </div>
            
            {/* Quote Card */}
            <div 
              className="aspect-[4/5] overflow-hidden shadow-2xl flex items-center justify-center"
              style={{ borderRadius: '24px' }}
            >
              <QuoteCard
                quote={{
                  id: viewingUserQuote.id,
                  text: viewingUserQuote.text,
                  author: viewingUserQuote.author,
                  category: viewingUserQuote.category || 'Personal',
                  category_icon: viewingUserQuote.category_icon || '✨',
                }}
                index={0}
                currentIndex={0}
                dragOffset={{ x: 0, y: 0 }}
                swipeDirection={null}
                isDragging={false}
                isAnimating={false}
                totalQuotes={1}
                onDragStart={() => {}}
                onDragMove={() => {}}
                cardTheme={cardTheme}
                fontStyle={fontStyle}
                backgroundImage={viewingUserQuote.custom_background ? {
                  id: 'user_custom',
                  name: 'Custom',
                  url: viewingUserQuote.custom_background,
                  thumbnail: viewingUserQuote.custom_background,
                  overlay: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.55) 100%)',
                  textColor: '#ffffff',
                  authorColor: '#e5e5e5',
                  categoryBg: 'rgba(255,255,255,0.15)',
                  categoryText: '#ffffff',
                } : backgroundImage}
              />
            </div>
            
            {/* Quote info */}
            <div className="mt-4 text-center">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                isQuotePublic(viewingUserQuote.is_public)
                  ? 'bg-green-500/20 text-green-300' 
                  : 'bg-gray-500/20 text-gray-300'
              }`}>
                {isQuotePublic(viewingUserQuote.is_public) ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
                    Public - Visible to everyone
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    Private - Only you can see
                  </>
                )}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content - Hidden when other views are active */}
      <div className={`flex-1 flex flex-col items-center justify-center p-4 pb-20 sm:pb-20 relative ${activeNavTab !== 'feed' ? 'hidden' : ''}`}>
        {/* Top Header - Full Width Rounded Bar */}
        <div className="fixed top-2 left-2 right-2 sm:top-3 sm:left-3 sm:right-3 z-30 flex items-center justify-between px-2 py-1.5 sm:px-3 sm:py-2 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl sm:rounded-3xl shadow-lg border border-gray-200/50 dark:border-gray-700/50">
          {/* Left Group - All icons on desktop, Menu & Search on mobile */}
          <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => setIsSidebarOpen(true)}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 active:scale-95 transition-all"
              title="Menu"
          >
              <Menu size={16} className="sm:w-[18px] sm:h-[18px] text-gray-700 dark:text-gray-300" />
          </button>
          
          <button
            onClick={() => setShowSearchModal(true)}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 active:scale-95 transition-all"
              title="Search"
          >
              <Search size={14} className="sm:w-4 sm:h-4 text-gray-700 dark:text-gray-300" />
          </button>
          
            {/* Dark Mode - Hidden on mobile, shown on desktop */}
            <button
              onClick={toggleTheme}
              className={`hidden sm:flex w-9 h-9 rounded-full items-center justify-center active:scale-95 transition-all ${
                theme === 'dark' 
                  ? 'bg-yellow-100 dark:bg-yellow-900/30 hover:bg-yellow-200 dark:hover:bg-yellow-900/50' 
                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {theme === 'dark' ? (
                <Sun size={16} className="text-yellow-600 dark:text-yellow-400" />
              ) : (
                <Moon size={16} className="text-gray-600 dark:text-gray-400" />
              )}
            </button>
            
            {/* Language - Hidden on mobile, shown on desktop */}
            <div className="hidden sm:block">
          <LanguageSelector compact />
        </div>
                </div>
          
          {/* Center - Categories (mobile only) */}
          <div className="sm:hidden">
            {selectedCategories.length > 0 ? (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="h-7 px-2.5 rounded-full bg-gradient-to-r from-blue-500/10 to-pink-500/10 dark:from-blue-500/20 dark:to-pink-500/20 border border-blue-200/50 dark:border-blue-700/50 flex items-center gap-1.5 hover:from-blue-500/20 hover:to-pink-500/20 active:scale-95 transition-all"
                title="Manage categories"
              >
                <span className="flex items-center">
                  {selectedCategories.slice(0, 3).map((catName) => {
                    const cat = categories.find(c => c.name === catName);
                    return cat ? (
                      <span key={catName} className="text-xs leading-none">{cat.icon}</span>
              ) : null;
            })}
                </span>
                <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300">
                  {selectedCategories.length === 1 
                    ? categories.find(c => c.name === selectedCategories[0])?.name?.slice(0, 8) 
                    : `${selectedCategories.length}`}
                </span>
              </button>
            ) : (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="h-7 px-2.5 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center gap-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 active:scale-95 transition-all"
                title="Select categories"
              >
                <span className="text-xs">📚</span>
                <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">All</span>
              </button>
            )}
              </div>
          
          {/* Right Group - Theme & Language on mobile, Categories on desktop */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Mobile only - Theme & Language */}
            <button
              onClick={toggleTheme}
              className={`sm:hidden w-8 h-8 rounded-full flex items-center justify-center active:scale-95 transition-all ${
                theme === 'dark' 
                  ? 'bg-yellow-100 dark:bg-yellow-900/30 hover:bg-yellow-200 dark:hover:bg-yellow-900/50' 
                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {theme === 'dark' ? (
                <Sun size={14} className="text-yellow-600 dark:text-yellow-400" />
              ) : (
                <Moon size={14} className="text-gray-600 dark:text-gray-400" />
              )}
            </button>
            
            <div className="sm:hidden">
              <LanguageSelector compact />
          </div>
            
            {/* Desktop only - Categories */}
            <div className="hidden sm:block">
              {selectedCategories.length > 0 ? (
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="h-8 px-3 rounded-full bg-gradient-to-r from-blue-500/10 to-pink-500/10 dark:from-blue-500/20 dark:to-pink-500/20 border border-blue-200/50 dark:border-blue-700/50 flex items-center gap-2 hover:from-blue-500/20 hover:to-pink-500/20 active:scale-95 transition-all"
                  title="Manage categories"
                >
                  <span className="flex items-center gap-0.5">
                    {selectedCategories.slice(0, 4).map((catName) => {
                      const cat = categories.find(c => c.name === catName);
                      return cat ? (
                        <span key={catName} className="text-sm leading-none">{cat.icon}</span>
                      ) : null;
                    })}
                  </span>
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {selectedCategories.length === 1 
                      ? categories.find(c => c.name === selectedCategories[0])?.name 
                      : `${selectedCategories.length} categories`}
                  </span>
                </button>
              ) : (
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="h-8 px-3 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center gap-2 hover:bg-gray-200 dark:hover:bg-gray-600 active:scale-95 transition-all"
                  title="Select categories"
                >
                  <span className="text-sm">📚</span>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">All quotes</span>
                </button>
              )}
            </div>
          </div>
        </div>
        {/* Progress Bar */}
        <div className="fixed top-0 left-0 right-0 h-[2px] bg-white/30 backdrop-blur-sm z-50">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-pink-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Card Stack - 4:5 aspect ratio container for Instagram-perfect cards */}
        <div 
          className={`relative w-full max-w-[280px] sm:max-w-[320px] md:max-w-[380px] lg:max-w-[420px] xl:max-w-[450px] mx-auto aspect-[4/5] mb-4 sm:mb-6 md:mb-8 mt-14 sm:mt-16 md:mt-12 lg:mt-8 px-2 sm:px-4 md:px-0 transition-opacity duration-300 ${
            isChangingCategories ? 'opacity-0' : 'opacity-100'
          }`}
          key={`cards-${selectedCategories.join(',')}`}
        >
          {filteredQuotes
            .map((quote, index) => ({ quote, index }))
            .filter(({ index }) => {
              // Only render cards that are visible (current, next, previous)
              const offset = index - currentIndex;
              return offset >= 0 && offset <= 2;
            })
            .map(({ quote, index }) => {
              // Use per-quote custom background if available, otherwise use global background
              const quoteIdStr = String(quote.id);
              const quoteBackground = savedQuoteBackgrounds[quoteIdStr] || backgroundImage;
              
              return (
                <QuoteCard
                  key={quote.id}
                  quote={quote}
                  index={index}
                  currentIndex={currentIndex}
                  dragOffset={dragOffset}
                  swipeDirection={swipeDirection}
                  isDragging={isDragging}
                  isAnimating={isAnimating}
                  totalQuotes={filteredQuotes.length}
                  onDragStart={handleDragStart}
                  onDragMove={handleDragMove}
                  cardTheme={cardTheme}
                  fontStyle={fontStyle}
                  backgroundImage={quoteBackground}
                />
              );
            })}
        </div>

        {/* Control Buttons */}
        <ControlButtons
          onLike={handleLike}
          onDislike={handleDislike}
          onSave={handleSave}
          onShare={handleShare}
          onUndo={handleUndo}
          canUndo={swipeHistory.length > 0}
          swipeDirection={isDragging && !isAnimating ? swipeDirection : null}
          isAnimating={isDragging && !isAnimating && Math.abs(dragOffset.x) > (isMobile ? 30 : 50)}
        />

        {/* Action Buttons (Like/Dislike with arrows) */}
        <ActionButtons
          onLike={handleLike}
          onDislike={handleDislike}
          swipeDirection={isAnimating && !isDragging ? swipeDirection : null}
          isAnimating={isAnimating && !isDragging}
        />
        {/* Quick Links Footer */}
        <nav className="flex items-center justify-center gap-1 mt-3 sm:mt-4">
            <Link 
              href="/about" 
            className="text-xs text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
            About
            </Link>
          <span className="text-gray-300 dark:text-gray-600">•</span>
            <Link 
              href="/contact" 
            className="text-xs text-gray-400 dark:text-gray-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            >
            Contact
            </Link>
          <span className="text-gray-300 dark:text-gray-600">•</span>
            <Link 
              href="/privacy-policy" 
            className="text-xs text-gray-400 dark:text-gray-500 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
            >
            Privacy
            </Link>
          <span className="text-gray-300 dark:text-gray-600">•</span>
            <Link 
              href="/feedback" 
            className="text-xs text-gray-400 dark:text-gray-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
            >
            Feedback
            </Link>
          </nav>
      </div>

      {/* Bottom Navigation Bar - Visible on all screens */}
      <BottomNavBar
        activeTab={activeNavTab}
        onTabChange={(tab) => {
          if (tab === 'create') {
            setEditingQuote(null);
            setShowCreateQuoteModal(true);
          } else {
            setActiveNavTab(tab);
          }
        }}
        savedCount={savedQuotes.length}
        myQuotesCount={userQuotes.length}
        isAuthenticated={isAuthenticated}
        onLoginRequired={() => setShowAuthModal(true)}
        onMenuClick={() => setShowOptionsMenu(true)}
        hidden={
          isSidebarOpen ||
          showAuthModal ||
          showShareModal ||
          showInstagramModal ||
          showSearchModal ||
          showSaveQuoteModal ||
          showCustomizationModal ||
          showCreateQuoteModal ||
          showOnboarding ||
          viewingUserQuote !== null
        }
      />

      {/* Liked Quotes View - Full Screen */}
      {activeNavTab === 'liked' && isAuthenticated && (
        <Suspense fallback={<ModalLoader />}>
          <LikedQuotesView
            onBack={() => setActiveNavTab('feed')}
            onQuoteClick={(quoteId, category) => {
              setActiveNavTab('feed');
              handleQuoteNavigation(quoteId, category);
            }}
            onShareQuote={(quote) => {
              setShareQuote({
                id: quote.id,
                text: quote.text,
                author: quote.author,
                category: quote.category,
                category_icon: quote.category_icon,
                isUserQuote: false,
              });
              setShowShareModal(true);
            }}
          />
        </Suspense>
      )}

      {/* Saved Quotes View - Full Screen */}
      {activeNavTab === 'saved' && isAuthenticated && (
        <Suspense fallback={<ModalLoader />}>
          <SavedQuotesView
            onBack={() => setActiveNavTab('feed')}
            onQuoteClick={(quoteId, category, customBackground) => {
              setActiveNavTab('feed');
              handleQuoteNavigation(quoteId, category, customBackground);
            }}
            onShareQuote={(quote) => {
              setShareQuote({
                id: quote.id,
                text: quote.text,
                author: quote.author,
                category: quote.category,
                category_icon: quote.category_icon,
                isUserQuote: false,
                custom_background: quote.custom_background || undefined,
              });
              setShowShareModal(true);
            }}
            onDeleteQuote={(quoteId) => {
              setSavedQuotes(savedQuotes.filter(q => String(q.id) !== String(quoteId)));
            }}
          />
        </Suspense>
      )}

      {/* Skipped Quotes View - Full Screen */}
      {activeNavTab === 'skipped' && isAuthenticated && (
        <Suspense fallback={<ModalLoader />}>
          <SkippedQuotesView
            onBack={() => setActiveNavTab('feed')}
            onQuoteClick={(quoteId, category) => {
              setActiveNavTab('feed');
              handleQuoteNavigation(quoteId, category);
            }}
            onShareQuote={(quote) => {
              setShareQuote({
                id: quote.id,
                text: quote.text,
                author: quote.author,
                category: quote.category,
                category_icon: quote.category_icon,
                isUserQuote: false,
              });
              setShowShareModal(true);
            }}
          />
        </Suspense>
      )}

      {/* My Quotes View - Full Screen */}
      {activeNavTab === 'myquotes' && isAuthenticated && (
        <Suspense fallback={<ModalLoader />}>
          <MyQuotesView
            onBack={() => setActiveNavTab('feed')}
            onCreateQuote={() => {
              setEditingQuote(null);
              setShowCreateQuoteModal(true);
            }}
            onEditQuote={(quote) => {
              setEditingQuote(quote);
              setShowCreateQuoteModal(true);
            }}
            onShareQuote={(quote) => {
              setShareQuote({
                id: `user_${quote.id}`,
                text: quote.text,
                author: quote.author,
                category: quote.category || 'Personal',
                category_icon: quote.category_icon || '✨',
                isUserQuote: true,
                is_public: quote.is_public,
                custom_background: quote.custom_background || undefined,
              });
              setShowShareModal(true);
            }}
            onViewQuote={(quote) => {
              setViewingUserQuote(quote);
            }}
            quotes={userQuotes}
            onRefresh={fetchUserQuotes}
            onDeleteQuote={(quoteId) => {
              setUserQuotes(userQuotes.filter(q => String(q.id) !== String(quoteId)));
            }}
          />
        </Suspense>
      )}

      {/* Profile View - Full Screen */}
      {activeNavTab === 'profile' && isAuthenticated && (
        <Suspense fallback={<ModalLoader />}>
          <ProfileView
            onBack={() => setActiveNavTab('feed')}
            onCreateQuote={() => {
              setEditingQuote(null);
              setShowCreateQuoteModal(true);
            }}
            onLogout={handleLogout}
            likedCount={likedQuotes.length}
            savedCount={savedQuotes.length}
            skippedCount={dislikedQuotes.length}
            myQuotesCount={userQuotes.length}
            isLoggingOut={isLoggingOut}
          />
        </Suspense>
      )}
    </div>
  );
}

