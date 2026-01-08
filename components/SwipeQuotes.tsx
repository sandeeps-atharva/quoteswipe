'use client';

import { useState, useRef, useEffect, useCallback, lazy, Suspense } from 'react';
import toast from 'react-hot-toast';

// Types
import { Quote, Category, User, UserQuote, ShareQuote } from '@/types/quotes';

// Components
import Sidebar, { ViewMode } from './Sidebar';
import QuoteCard from './QuoteCard';
import FeedView from './FeedView';
import ControlButtons, { ActionButtons } from './ControlButtons';
import BottomNavBar, { NavTab, CreateType } from './BottomNavBar';
import OptionsMenu from './OptionsMenu';
import Header from './Header';
import FooterLinks from './FooterLinks';
import { ModalLoader, AppLoader, NavigationLoader } from './ThematicLoader';

// Hooks
import { useVisitorTracking } from '@/hooks/useVisitorTracking';
import { useTheme } from '@/contexts/ThemeContext';
import { useCacheSync } from '@/hooks/useCacheSync';
import { useBackgroundsSafe } from '@/contexts/BackgroundsContext';

// Constants & Utilities
import { CARD_THEMES, FONT_STYLES, BACKGROUND_IMAGES, CardTheme, FontStyle, BackgroundImage, getRandomBackgroundForQuote } from '@/lib/constants';
import { 
  getFromCache, 
  setToCache, 
  clearUserCache, 
  canShowInstagramModal, 
  markInstagramModalShown,
  CACHE_DURATIONS,
  CACHE_PREFIX
} from '@/lib/cache-utils';
import { createCustomBg, resolveBackground } from '@/hooks/useCardStyle';

// Lazy load modals for better initial bundle size
const AuthModal = lazy(() => import('./AuthModal'));
const ShareModal = lazy(() => import('./ShareModal'));
const InstagramFollowModal = lazy(() => import('./InstagramFollowModal'));
const SearchModal = lazy(() => import('./SearchModal'));
const CardCustomization = lazy(() => import('./CardCustomization'));
const CreateQuoteModal = lazy(() => import('./CreateQuoteModal'));
const CategoryOnboarding = lazy(() => import('./CategoryOnboarding'));
const SaveQuoteModal = lazy(() => import('./SaveQuoteModal'));
const ViewUserQuoteModal = lazy(() => import('./ViewUserQuoteModal'));
const EditBackgroundModal = lazy(() => import('./EditBackgroundModal'));
const QuoteReelModal = lazy(() => import('./QuoteReelModal'));

// Lazy load views for bottom navigation
const SavedQuotesView = lazy(() => import('./SavedQuotesView'));
const MyQuotesView = lazy(() => import('./MyQuotesView'));
const LikedQuotesView = lazy(() => import('./LikedQuotesView'));
const SkippedQuotesView = lazy(() => import('./SkippedQuotesView'));
const ProfileView = lazy(() => import('./ProfileView'));

// Cache duration constants (imported from cache-utils)
const QUOTES_CACHE_DURATION = CACHE_DURATIONS.QUOTES;
const CATEGORIES_CACHE_DURATION = CACHE_DURATIONS.CATEGORIES;

// Interface for swipe history tracking (used for undo functionality)
interface SwipeHistoryItem {
  index: number;
  direction: 'left' | 'right';
  quote: Quote;
  wasNewAction: boolean; // true if this was a new like/dislike (not already existing)
  backgroundUrl?: string | null; // Store the background for restoration
}

export default function SwipeQuotes() {
  // Track visitor on page load
  useVisitorTracking();
  
  // Theme toggle with user sync
  const { theme, toggleTheme, setIsAuthenticated: setThemeAuth } = useTheme();
  
  // Backgrounds context for prefetching after login
  const backgroundsContext = useBackgroundsSafe();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('swipe');
  const [feedTargetQuoteId, setFeedTargetQuoteId] = useState<string | number | null>(null);
  const [feedTargetQuoteBackground, setFeedTargetQuoteBackground] = useState<BackgroundImage | null>(null);
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
  const [showEditBackgroundModal, setShowEditBackgroundModal] = useState(false);
  const [quoteToEditBg, setQuoteToEditBg] = useState<Quote | null>(null);
  const [showQuoteReelModal, setShowQuoteReelModal] = useState(false);
  const [reelQuote, setReelQuote] = useState<Quote | null>(null); // Quote for reel, null for empty reel
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
  // Enhanced swipe history for undo functionality (supports multiple undos)
  const [swipeHistory, setSwipeHistory] = useState<SwipeHistoryItem[]>([]);
  const [isUndoing, setIsUndoing] = useState(false); // Animation state for undo
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false); // For programmatic animations
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isLoadingQuotes, setIsLoadingQuotes] = useState(false);
  const [isChangingCategories, setIsChangingCategories] = useState(false);
  const [isNavigatingToQuote, setIsNavigatingToQuote] = useState(false); // Show loader when navigating from other screens
  const [isLoadingUserData, setIsLoadingUserData] = useState(false); // Show syncing indicator after login
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
  
  // Pagination state for efficient quote loading
  const QUOTES_PAGE_SIZE = 50; // Fetch 50 quotes at a time
  const PREFETCH_THRESHOLD = 10; // Prefetch when 10 quotes away from end
  const [quotesOffset, setQuotesOffset] = useState(0);
  const [hasMoreQuotes, setHasMoreQuotes] = useState(true);
  const [totalQuotes, setTotalQuotes] = useState(0);
  const isFetchingMore = useRef(false);
  const fetchAbortController = useRef<AbortController | null>(null);
  
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
  const [shareQuote, setShareQuote] = useState<ShareQuote | null>(null);
  
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

  // Single initialization on mount - OPTIMIZED: Uses single API call
  useEffect(() => {
    if (initStarted.current) return;
    initStarted.current = true;
    
    const initializeApp = async () => {
      const startTime = performance.now();
      
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
          console.log(`[App] Fast path init: ${(performance.now() - startTime).toFixed(0)}ms`);
          return;
        }
        
        // ====================================================================
        // OPTIMIZED: Single API call replaces 7+ separate calls!
        // This reduces initial load time from 2-4s to 0.5-1s
        // ====================================================================
        const initialDataResponse = await fetch('/api/initial-data?limit=20', {
          credentials: 'include',
        });
        
        if (initialDataResponse.ok) {
          const data = await initialDataResponse.json();
          
          // --- AUTH ---
          const isUserAuthenticated = data.isAuthenticated;
          setIsAuthenticated(isUserAuthenticated);
          setUser(data.user);
          
          // --- CATEGORIES ---
          const categoriesData = data.categories || [];
          setCategories(categoriesData);
          setTotalCategories(data.totalCategories || categoriesData.length);
          setToCache(`categories_${isUserAuthenticated ? 'auth' : 'guest'}`, {
            categories: categoriesData,
            totalCategories: data.totalCategories,
          });
          
          // --- QUOTES (already loaded!) ---
          if (data.quotes && data.quotes.length > 0) {
            setQuotes(data.quotes);
            setToCache('swipeQuotes', data.quotes);
          }
          
          // --- USER PREFERENCES (if authenticated) ---
          if (isUserAuthenticated && data.preferences) {
            isLoadingPreferences.current = true;
            
            // Apply selected categories
            if (Array.isArray(data.preferences.selectedCategories)) {
              setSelectedCategories(data.preferences.selectedCategories);
            }
            
            // Apply card style
            const theme = CARD_THEMES.find(t => t.id === data.preferences.themeId);
            const font = FONT_STYLES.find(f => f.id === data.preferences.fontId);
            setCardTheme(theme || CARD_THEMES[0]);
            setFontStyle(font || FONT_STYLES[0]);
            
            // Resolve background
            const bgId = data.preferences.backgroundId;
            const customBgs = data.preferences.customBackgrounds || [];
            let bg: BackgroundImage = BACKGROUND_IMAGES[0];
            
            if (bgId && bgId !== 'none') {
              if (bgId === 'custom' || bgId.startsWith('custom_')) {
                const serverImg = customBgs.find((img: { id: string }) => img.id === bgId);
                if (serverImg) {
                  bg = createCustomBg({ id: serverImg.id, name: serverImg.name, url: serverImg.url });
                } else {
                  // Fallback to localStorage
                  try {
                    const localJson = localStorage.getItem('quoteswipe_custom_images');
                    if (localJson) {
                      const localImgs = JSON.parse(localJson);
                      const localImg = localImgs.find((img: { id: string }) => img.id === bgId);
                      if (localImg) {
                        bg = createCustomBg({ id: localImg.id, name: localImg.name, url: localImg.url });
                      }
                    }
                  } catch {}
                }
              } else {
                bg = BACKGROUND_IMAGES.find(b => b.id === bgId) || BACKGROUND_IMAGES[0];
              }
            }
            setBackgroundImage(bg);
            
            // Fetch additional user data in background (likes, saves, user quotes)
            // This runs AFTER the app is ready, so it doesn't block initial render
            Promise.all([
              fetch('/api/user/likes', { credentials: 'include' }),
              fetch('/api/user/dislikes', { credentials: 'include' }),
              fetch('/api/user/saved', { credentials: 'include' }),
              fetch('/api/user/quotes', { credentials: 'include' }),
            ]).then(async ([likesRes, dislikesRes, savedRes, userQuotesRes]) => {
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
                savedQuotesList.forEach((q: any) => {
                  if (q.custom_background) {
                    backgrounds[String(q.id)] = createCustomBg({ id: `saved_custom_${q.id}`, name: 'Saved Background', url: q.custom_background });
                  }
                });
                if (Object.keys(backgrounds).length > 0) {
                  setSavedQuoteBackgrounds(prev => ({ ...prev, ...backgrounds }));
                }
              }
              if (userQuotesRes.ok) {
                const userQuotesData = await userQuotesRes.json();
                setUserQuotes(userQuotesData.quotes || []);
              }
            }).catch(console.error);
            
            setTimeout(() => { isLoadingPreferences.current = false; }, 100);
          }
          
          setPreferencesLoaded(true);
          
          // Check onboarding
          if (isUserAuthenticated && !data.onboardingComplete) {
            setAllCategoriesForOnboarding(categoriesData);
            setShowOnboarding(true);
          }
          
          console.log(`[App] Optimized init: ${(performance.now() - startTime).toFixed(0)}ms`);
        } else {
          // Fallback to old method if new endpoint fails
          console.warn('[App] initial-data failed, falling back to legacy init');
          const [authResponse, categoriesResponse] = await Promise.all([
            fetch('/api/auth/me'),
            fetch('/api/categories', { credentials: 'include' }),
          ]);
          
          if (authResponse.ok) {
            const data = await authResponse.json();
            setIsAuthenticated(true);
            setUser(data.user);
          }
          
          if (categoriesResponse.ok) {
            const data = await categoriesResponse.json();
            setCategories(data.categories || []);
            setTotalCategories(data.totalCategories || 0);
          }
          
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

  // Sync state to cache for instant restoration on navigation back
  useCacheSync({
    isAppReady,
    quotes,
    categories,
    cardTheme,
    fontStyle,
    backgroundImage,
  });

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
        const savedQuotesList = savedData.quotes || [];
        setSavedQuotes(savedQuotesList);
        
        // Populate savedQuoteBackgrounds from saved quotes with custom backgrounds
        const backgrounds: Record<string, BackgroundImage> = {};
        savedQuotesList.forEach((q: any) => {
          if (q.custom_background) {
            backgrounds[String(q.id)] = createCustomBg({ id: `saved_custom_${q.id}`, name: 'Saved Background', url: q.custom_background });
          }
        });
        if (Object.keys(backgrounds).length > 0) {
          setSavedQuoteBackgrounds(prev => ({ ...prev, ...backgrounds }));
        }
      }
    } catch (error) {
      console.error('Fetch user data error:', error);
    }
  };

  // Fetch ALL user preferences in single optimized call (categories + card style)
  // Note: createCustomBg and resolveBackground are imported from @/hooks/useCardStyle
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
    
    // Cancel any in-flight request when category changes
    if (isCategoryChange && fetchAbortController.current) {
      fetchAbortController.current.abort();
    }
    fetchAbortController.current = new AbortController();
    
    try {
      setIsLoadingQuotes(true);
      if (isCategoryChange && !shouldPreserveQuote) {
        setIsChangingCategories(true);
        // Reset pagination state on category change
        setQuotesOffset(0);
        setHasMoreQuotes(true);
        setTotalQuotes(0);
      }
      
      // Build cache key and URL with pagination
      let categoriesKey = 'all';
      let baseUrl = '/api/quotes';
      
      if (selectedCategories.length > 0) {
        categoriesKey = selectedCategories.sort().join(',');
        baseUrl = `/api/quotes?categories=${encodeURIComponent(categoriesKey)}`;
      } else if (!isAuthenticated && categories.length > 0) {
        categoriesKey = categories[0].name;
        baseUrl = `/api/quotes?categories=${encodeURIComponent(categoriesKey)}`;
      }
      
      // Add pagination parameters
      const separator = baseUrl.includes('?') ? '&' : '?';
      const url = `${baseUrl}${separator}limit=${QUOTES_PAGE_SIZE}&offset=0`;
      const cacheKey = `quotes_${categoriesKey}_${isAuthenticated ? 'auth' : 'guest'}_page0`;
      
      // Helper to set quotes and optionally preserve current position
      const applyQuotes = (quotesData: Quote[], total: number) => {
        setQuotes(quotesData);
        setTotalQuotes(total);
        setHasMoreQuotes(quotesData.length < total);
        setQuotesOffset(quotesData.length);
        
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
      const cachedData = getFromCache<{ quotes: Quote[]; total: number }>(cacheKey, QUOTES_CACHE_DURATION);
      if (cachedData && cachedData.quotes && cachedData.quotes.length > 0) {
        let quotesData = cachedData.quotes;
        if (selectedCategories.length > 1) {
          quotesData = shuffleArray(quotesData);
        }
        applyQuotes(quotesData, cachedData.total);
        setDragOffset({ x: 0, y: 0 });
        setSwipeDirection(null);
        setIsDragging(false);
        setIsAnimating(false);
        setIsLoadingQuotes(false);
        
        // Fetch fresh data in background (stale-while-revalidate pattern)
        fetch(url, { signal: fetchAbortController.current?.signal }).then(async (response) => {
          if (response.ok) {
            const data = await response.json();
            const freshQuotes = data.quotes || [];
            const total = data.pagination?.total || freshQuotes.length;
            setToCache(cacheKey, { quotes: freshQuotes, total });
            // Only update if user hasn't swiped yet
            const canSafelyUpdate = 
              !isDraggingRef.current && 
              !isAnimatingRef.current &&
              currentIndexRef.current === 0;
            if (canSafelyUpdate && freshQuotes.length !== cachedData.quotes.length) {
              setQuotes(selectedCategories.length > 1 ? shuffleArray(freshQuotes) : freshQuotes);
              setTotalQuotes(total);
              setHasMoreQuotes(freshQuotes.length < total);
              setQuotesOffset(freshQuotes.length);
            }
          }
        }).catch((e) => {
          if (e.name !== 'AbortError') console.error('Background fetch error:', e);
        });
        
        if (isCategoryChange && !shouldPreserveQuote) {
          setTimeout(() => setIsChangingCategories(false), 150);
        }
        return;
      }
      
      // No cache - fetch from server with pagination
      const response = await fetch(url, { signal: fetchAbortController.current.signal });
      if (response.ok) {
        const data = await response.json();
        let quotesData = data.quotes || [];
        const total = data.pagination?.total || quotesData.length;
        
        // Cache the response
        setToCache(cacheKey, { quotes: quotesData, total });
        
        // Shuffle quotes if multiple categories are selected
        if (selectedCategories.length > 1) {
          quotesData = shuffleArray(quotesData);
        }
        
        // Shorter delay since we already have loading state
        if (isCategoryChange && !shouldPreserveQuote) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        applyQuotes(quotesData, total);
        setDragOffset({ x: 0, y: 0 });
        setSwipeDirection(null);
        setIsDragging(false);
        setIsAnimating(false);
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Fetch quotes error:', error);
      }
    } finally {
      setIsLoadingQuotes(false);
      isLoggingIn.current = false; // Reset login flag
      if (isCategoryChange && !shouldPreserveQuote) {
        setTimeout(() => setIsChangingCategories(false), 200);
      }
    }
  };

  // Fetch more quotes when approaching end (infinite scroll)
  const fetchMoreQuotes = useCallback(async () => {
    // Prevent duplicate fetches
    if (isFetchingMore.current || !hasMoreQuotes || isLoadingQuotes) return;
    
    isFetchingMore.current = true;
    
    try {
      // Build URL with current offset
      let categoriesKey = 'all';
      let baseUrl = '/api/quotes';
      
      if (selectedCategories.length > 0) {
        categoriesKey = selectedCategories.sort().join(',');
        baseUrl = `/api/quotes?categories=${encodeURIComponent(categoriesKey)}`;
      } else if (!isAuthenticated && categories.length > 0) {
        categoriesKey = categories[0].name;
        baseUrl = `/api/quotes?categories=${encodeURIComponent(categoriesKey)}`;
      }
      
      const separator = baseUrl.includes('?') ? '&' : '?';
      const url = `${baseUrl}${separator}limit=${QUOTES_PAGE_SIZE}&offset=${quotesOffset}`;
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        const newQuotes = data.quotes || [];
        const total = data.pagination?.total || (quotesOffset + newQuotes.length);
        
        if (newQuotes.length > 0) {
          // Filter out duplicates (by quote ID)
          const existingIds = new Set(quotes.map(q => String(q.id)));
          const uniqueNewQuotes = newQuotes.filter((q: Quote) => !existingIds.has(String(q.id)));
          
          if (uniqueNewQuotes.length > 0) {
            // Shuffle new quotes if multiple categories
            const processedQuotes = selectedCategories.length > 1 
              ? shuffleArray(uniqueNewQuotes) 
              : uniqueNewQuotes;
            
            // Append to existing quotes
            setQuotes(prev => [...prev, ...processedQuotes]);
            setQuotesOffset(prev => prev + processedQuotes.length);
          }
          
          setHasMoreQuotes(quotesOffset + newQuotes.length < total);
          setTotalQuotes(total);
        } else {
          setHasMoreQuotes(false);
        }
      }
    } catch (error) {
      console.error('Fetch more quotes error:', error);
    } finally {
      isFetchingMore.current = false;
    }
  }, [quotesOffset, hasMoreQuotes, isLoadingQuotes, selectedCategories, isAuthenticated, categories, quotes]);

  // Prefetch more quotes when user approaches end (infinite scroll)
  useEffect(() => {
    if (!isAppReady || quotes.length === 0 || !hasMoreQuotes) return;
    
    // Calculate remaining quotes
    const remainingQuotes = quotes.length - currentIndex - 1;
    
    // Prefetch when approaching end
    if (remainingQuotes <= PREFETCH_THRESHOLD) {
      fetchMoreQuotes();
    }
  }, [currentIndex, quotes.length, isAppReady, hasMoreQuotes, fetchMoreQuotes]);

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

  // Handle multiple category toggle (for group selection)
  const handleMultipleCategoryToggle = useCallback((categoryNames: string[], select: boolean) => {
    setSelectedCategories(prev => {
      if (select) {
        // Add all categories that aren't already selected
        const newCategories = categoryNames.filter(name => !prev.includes(name));
        return [...prev, ...newCategories];
      } else {
        // Remove all specified categories
        return prev.filter(name => !categoryNames.includes(name));
      }
    });
  }, []);

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
    
    // ✅ Update state and close modal IMMEDIATELY
    setIsAuthenticated(true);
    setUser(data.user);
    setShowAuthModal(false);
    setSwipeCount(0);
    setAuthenticatedSwipeCount(0);
    
    // ✅ Show toast IMMEDIATELY (after modal closes)
    toast.success(`Welcome back, ${data.user.name}! 👋`);
    
    // Clear guest category cache
    try {
      sessionStorage.removeItem(CACHE_PREFIX + 'categories_guest');
    } catch {}
    
    // ✅ Show syncing indicator while fetching user data
    setIsLoadingUserData(true);
    
    // ✅ Fetch data in BACKGROUND (non-blocking) - don't await
    // Also prefetch user's custom backgrounds for instant customization
    Promise.all([
      fetchUserData(),
      fetchCategories(),
      fetchAllPreferences(),
      backgroundsContext?.ensureLoaded(), // Prefetch custom backgrounds
    ]).then(() => {
      // ✅ Hide syncing indicator when data is loaded
      setIsLoadingUserData(false);
      
      // Check if user needs onboarding after data is loaded
      if (data.onboarding_complete === false) {
        fetch('/api/categories?onboarding=true')
          .then(res => res.ok ? res.json() : null)
          .then(onboardingData => {
            if (onboardingData?.categories) {
              setAllCategoriesForOnboarding(onboardingData.categories);
              setShowOnboarding(true);
            }
          })
          .catch(() => {});
      }
    }).catch((error) => {
      console.error(error);
      setIsLoadingUserData(false); // Hide on error too
    });
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
    
    // ✅ Update state and close modal IMMEDIATELY
    setIsAuthenticated(true);
    setUser(data.user);
    setShowAuthModal(false);
    setSwipeCount(0);
    setAuthenticatedSwipeCount(0);
    
    // ✅ Show toast IMMEDIATELY (after modal closes)
    toast.success(`Welcome to QuoteSwipe, ${data.user.name}! 🎉`);
    
    // Clear guest category cache
    try {
      sessionStorage.removeItem(CACHE_PREFIX + 'categories_guest');
    } catch {}
    
    // ✅ Show syncing indicator while fetching user data
    setIsLoadingUserData(true);
    
    // ✅ Fetch data in BACKGROUND (non-blocking) - don't await
    // Also prefetch user's custom backgrounds for instant customization
    Promise.all([
      fetchUserData(), 
      fetchCategories(),
      backgroundsContext?.ensureLoaded(), // Prefetch custom backgrounds
    ])
      .then(() => {
        isLoadingPreferences.current = false;
        isLoggingIn.current = false;
        setIsLoadingUserData(false); // ✅ Hide syncing indicator
        
        // Show onboarding for new users
        if (data.onboarding_complete === false) {
          fetch('/api/categories?onboarding=true')
            .then(res => res.ok ? res.json() : null)
            .then(onboardingData => {
              if (onboardingData?.categories) {
                setAllCategoriesForOnboarding(onboardingData.categories);
                setShowOnboarding(true);
              }
            })
            .catch(() => {});
        }
      })
      .catch((error) => {
        console.error(error);
        setIsLoadingUserData(false); // Hide on error too
      });
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      
      // ✅ Show toast IMMEDIATELY after successful logout
      toast.success('You have been logged out. See you soon! 👋');
      
      // Clear user-specific cache on logout
      clearUserCache();
      
      // Reset all user state immediately
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
      setBackgroundImage(BACKGROUND_IMAGES[0]); // Reset to 'none' so random BGs are used
      setSavedQuoteBackgrounds({}); // Clear saved quote backgrounds
      setViewMode('swipe'); // Reset to swipe mode on logout
      
      // ✅ Fetch guest data in BACKGROUND (non-blocking)
      // Using .then() instead of await so it doesn't block
      fetch('/api/categories', { credentials: 'include' })
        .then(async (response) => {
          if (response.ok) {
            const data = await response.json();
            const newCategories = data.categories || [];
            setCategories(newCategories);
            setTotalCategories(data.totalCategories || newCategories.length || 0);
            
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

    // Calculate the actual displayed background URL (same logic as rendering)
    const getDisplayedBackgroundUrl = (quote: Quote): string | null => {
      const quoteIdStr = String(quote.id);
      
      // Priority 1: Saved custom background for this specific quote
      if (savedQuoteBackgrounds[quoteIdStr]?.url) {
        return savedQuoteBackgrounds[quoteIdStr].url;
      }
      
      // Priority 2: Quote's own custom_background
      if (quote.custom_background) {
        return quote.custom_background;
      }
      
      // Priority 3: User-selected global background (if not 'none')
      if (backgroundImage && backgroundImage.id !== 'none' && backgroundImage.url) {
        return backgroundImage.url;
      }
      
      // Priority 4: Random background for this quote
      const randomBg = getRandomBackgroundForQuote(quote.id);
      return randomBg?.url || null;
    };

    if (direction === 'right' && currentQuote) {
      // Check if user already liked this quote
      const alreadyLiked = likedQuotes.some(q => q.id === currentQuote.id);
      
      if (!alreadyLiked) {
        setLastLikedQuote(currentQuote);
        
        // Get the actual displayed background
        const displayedBgUrl = getDisplayedBackgroundUrl(currentQuote);
        
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
            body: JSON.stringify({ 
              quoteId: currentQuote.id,
              customBackground: displayedBgUrl 
            }),
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
        // Get the actual displayed background
        const displayedBgUrl = getDisplayedBackgroundUrl(currentQuote);
        
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
            body: JSON.stringify({ 
              quoteId: currentQuote.id,
              customBackground: displayedBgUrl 
            }),
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

    // Add current index, direction, and quote to history before moving forward
    // This enables proper undo functionality with all necessary data
    const alreadyLikedBefore = direction === 'right' && likedQuotes.some(q => q.id === currentQuote?.id);
    const alreadyDislikedBefore = direction === 'left' && dislikedQuotes.some(q => q.id === currentQuote?.id);
    const wasNewAction = direction === 'right' ? !alreadyLikedBefore : !alreadyDislikedBefore;
    
    if (currentQuote) {
      const historyItem: SwipeHistoryItem = {
        index: currentIndex,
        direction,
        quote: currentQuote,
        wasNewAction,
        backgroundUrl: getDisplayedBackgroundUrl(currentQuote),
      };
      setSwipeHistory(prev => [...prev, historyItem]);
    }

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

  const handleUndo = () => {
    if (swipeHistory.length === 0 || isUndoing) return;

    setIsUndoing(true);
    
    const lastSwipe = swipeHistory[swipeHistory.length - 1];
    const { index: previousIndex, direction: previousDirection, quote: previousQuote, wasNewAction } = lastSwipe;
    const newHistory = swipeHistory.slice(0, -1);

    // OPTIMISTIC UPDATE: Update UI immediately, API calls in background
    if (previousDirection === 'right' && wasNewAction) {
      // Was a new like - remove it from UI immediately
      setLikedQuotes(prev => prev.filter(q => q.id !== previousQuote.id));
      
      // Revert the likes count
      setQuotes(prev => prev.map(q => 
        q.id === previousQuote.id 
          ? { ...q, likes_count: Math.max(0, (q.likes_count || 1) - 1) }
          : q
      ));
      
      // Clear last liked quote if it was the one being undone
      if (lastLikedQuote?.id === previousQuote.id) {
        setLastLikedQuote(null);
      }
      
      // Remove like from database (fire and forget - don't block UI)
      if (isAuthenticated) {
        fetch('/api/user/likes', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quoteId: previousQuote.id }),
        }).catch(error => {
          console.error('Error removing like:', error);
          // Silently fail - UI already updated
        });
      }
    } else if (previousDirection === 'left' && wasNewAction) {
      // Was a new dislike - remove it from UI immediately
      setDislikedQuotes(prev => prev.filter(q => q.id !== previousQuote.id));
      
      // Revert the dislikes count
      setQuotes(prev => prev.map(q => 
        q.id === previousQuote.id 
          ? { ...q, dislikes_count: Math.max(0, (q.dislikes_count || 1) - 1) }
          : q
      ));
      
      // Remove dislike from database (fire and forget - don't block UI)
      if (isAuthenticated) {
        fetch('/api/user/dislikes', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quoteId: previousQuote.id }),
        }).catch(error => {
          console.error('Error removing dislike:', error);
          // Silently fail - UI already updated
        });
      }
    }

    // Decrement swipe count
    if (!isAuthenticated && swipeCount > 0) {
      setSwipeCount(prev => prev - 1);
    } else if (isAuthenticated && authenticatedSwipeCount > 0) {
      setAuthenticatedSwipeCount(prev => prev - 1);
    }

    // Update history immediately
    setSwipeHistory(newHistory);

    // ANIMATION: Card slides back from where it was swiped
    // Step 1: Set index to previous quote & position it off-screen
    setCurrentIndex(previousIndex);
    const startOffsetX = previousDirection === 'right' ? 400 : -400;
    setDragOffset({ x: startOffsetX, y: 0 });
    setSwipeDirection(previousDirection);
    
    // Step 2: Animate the card back to center (use requestAnimationFrame for smooth start)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setDragOffset({ x: 0, y: 0 });
        
        // Step 3: Clear animation state after transition completes
        setTimeout(() => {
          setSwipeDirection(null);
          setIsUndoing(false);
        }, 350);
      });
    });
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
    
    // OPTIMISTIC UPDATE: Update UI immediately
    setSavedQuotes(prev => [...prev, quoteToSave]);
    
    // Store custom background in savedQuoteBackgrounds for use when navigating from anywhere
    if (customBackground) {
      const quoteIdStr = String(quoteToSave.id);
      setSavedQuoteBackgrounds(prev => ({
        ...prev,
        [quoteIdStr]: createCustomBg({ id: `saved_custom_${quoteIdStr}`, name: 'Saved Background', url: customBackground })
      }));
    }
    
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
    
    // Only animate and move to next quote in Swipe mode
    if (viewMode === 'swipe') {
      // Start the visual animation
      setIsAnimating(true);
      setSwipeDirection('right');
      setDragOffset({ x: 300, y: 0 });
      
      // After animation completes, move to next quote
      setTimeout(() => {
        handleSwipe('right');
        setIsAnimating(false);
      }, 300);
    }
    
    // Clear the quote to save
    setQuoteToSave(null);
    
    // Show success toast - clarify that background is saved only for this quote
    if (customBackground) {
      toast.success('Quote saved with custom background! 🖼️');
    } else {
      toast.success('Quote saved! 🔖');
    }
  }, [quoteToSave, isAuthenticated, handleSwipe, viewMode]);

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

  // Handle edit background for current quote
  const handleEditBackground = () => {
    const filteredQuotes = getFilteredQuotes();
    const currentQuote = filteredQuotes[currentIndex];
    
    if (!currentQuote) return;
    
    setQuoteToEditBg(currentQuote);
    setShowEditBackgroundModal(true);
  };

  // Handle create reel with current quote (from control buttons)
  const handleCreateReel = () => {
    const filteredQuotes = getFilteredQuotes();
    const currentQuote = filteredQuotes[currentIndex];
    setReelQuote(currentQuote || null);
    setShowQuoteReelModal(true);
  };

  // Desktop keyboard shortcuts for navigation and undo
  useEffect(() => {
    // Only enable on desktop
    if (isMobile) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts if user is typing in an input/textarea
      const activeElement = document.activeElement;
      const isTyping = activeElement?.tagName === 'INPUT' || 
                       activeElement?.tagName === 'TEXTAREA' ||
                       activeElement?.getAttribute('contenteditable') === 'true';
      
      if (isTyping) return;
      
      // Check if any modal or view is open
      const anyModalOpen = showAuthModal || showShareModal || showInstagramModal || 
                          showSearchModal || showSaveQuoteModal || showCustomizationModal ||
                          showCreateQuoteModal || showEditBackgroundModal || showQuoteReelModal ||
                          showOnboarding || viewingUserQuote !== null || isSidebarOpen;
      
      // Only work in feed tab with swipe view
      const isSwipeView = activeNavTab === 'feed' && viewMode === 'swipe';
      
      if (anyModalOpen || !isSwipeView) return;
      
      // Prevent during animations
      if (isDragging || isAnimating || isUndoing) return;
      
      switch (e.key.toLowerCase()) {
        // Undo: Z, Ctrl+Z, Backspace
        case 'z':
          if (swipeHistory.length > 0) {
            e.preventDefault();
            handleUndo();
          }
          break;
        case 'backspace':
          if (swipeHistory.length > 0) {
            e.preventDefault();
            handleUndo();
          }
          break;
          
        // Like: Right Arrow, D, L
        case 'arrowright':
        case 'd':
        case 'l':
          e.preventDefault();
          handleLike();
          break;
          
        // Skip/Dislike: Left Arrow, A, X
        case 'arrowleft':
        case 'a':
        case 'x':
          e.preventDefault();
          handleDislike();
          break;
          
        // Save: S
        case 's':
          if (!e.ctrlKey && !e.metaKey) { // Don't interfere with Ctrl+S
            e.preventDefault();
            handleSave();
          }
          break;
          
        // Edit Background: E
        case 'e':
          e.preventDefault();
          handleEditBackground();
          break;
          
        // Share: Enter or Spacebar
        case 'enter':
        case ' ':
          e.preventDefault();
          const filteredQuotes = getFilteredQuotes();
          const currentQuote = filteredQuotes[currentIndex];
          if (currentQuote) {
            setShareQuote({
              id: currentQuote.id,
              text: currentQuote.text,
              author: currentQuote.author,
              category: currentQuote.category,
              category_icon: currentQuote.category_icon,
              isUserQuote: false,
              custom_background: currentQuote.custom_background || undefined,
            });
            setShowShareModal(true);
          }
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isMobile, 
    showAuthModal, showShareModal, showInstagramModal, showSearchModal,
    showSaveQuoteModal, showCustomizationModal, showCreateQuoteModal,
    showEditBackgroundModal, showQuoteReelModal, showOnboarding,
    viewingUserQuote, isSidebarOpen, activeNavTab, viewMode,
    isDragging, isAnimating, isUndoing, swipeHistory, currentIndex,
    handleUndo, handleLike, handleDislike, handleSave, handleEditBackground,
    getFilteredQuotes
  ]);

  // Handle applying new background to a specific quote
  const handleApplyBackground = useCallback((newBackground: BackgroundImage) => {
    if (!quoteToEditBg) return;
    
    const quoteIdStr = String(quoteToEditBg.id);
    
    // Update the per-quote background
    setSavedQuoteBackgrounds(prev => ({
      ...prev,
      [quoteIdStr]: newBackground,
    }));
  }, [quoteToEditBg]);

  // Feed View Handlers - Simple actions without swipe animation
  // Helper to get the actual displayed background for a quote (feed view)
  const getQuoteDisplayedBackground = useCallback((quote: Quote): string | null => {
    const quoteIdStr = String(quote.id);
    
    // Priority 1: Saved custom background for this specific quote
    if (savedQuoteBackgrounds[quoteIdStr]?.url) {
      return savedQuoteBackgrounds[quoteIdStr].url;
    }
    
    // Priority 2: Quote's own custom_background
    if (quote.custom_background) {
      return quote.custom_background;
    }
    
    // Priority 3: User-selected global background (if not 'none')
    if (backgroundImage && backgroundImage.id !== 'none' && backgroundImage.url) {
      return backgroundImage.url;
    }
    
    // Priority 4: Random background for this quote
    const randomBg = getRandomBackgroundForQuote(quote.id);
    return randomBg?.url || null;
  }, [savedQuoteBackgrounds, backgroundImage]);

  const handleLikeQuote = useCallback((quote: Quote) => {
    const alreadyLiked = likedQuotes.some(q => String(q.id) === String(quote.id));
    
    if (!alreadyLiked) {
      // Get the actual displayed background for this quote
      const displayedBgUrl = getQuoteDisplayedBackground(quote);
      
      // Optimistic update
      setLikedQuotes(prev => [...prev, quote]);
      setQuotes(prev => prev.map(q => 
        String(q.id) === String(quote.id) 
          ? { ...q, likes_count: (q.likes_count || 0) + 1 } 
          : q
      ));
      
      // Remove from dislikes if present
      setDislikedQuotes(prev => prev.filter(q => String(q.id) !== String(quote.id)));
      
      // API call
      if (isAuthenticated) {
        fetch('/api/user/likes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            quoteId: quote.id,
            customBackground: displayedBgUrl 
          }),
        }).catch(console.error);
      }
      
      toast.success('Liked! ❤️', { duration: 1500 });
    } else {
      toast('Already liked!', { icon: '❤️', duration: 1500 });
    }
  }, [likedQuotes, isAuthenticated, getQuoteDisplayedBackground]);

  const handleDislikeQuote = useCallback((quote: Quote) => {
    const alreadyDisliked = dislikedQuotes.some(q => String(q.id) === String(quote.id));
    
    if (!alreadyDisliked) {
      // Get the actual displayed background for this quote
      const displayedBgUrl = getQuoteDisplayedBackground(quote);
      
      // Optimistic update
      setDislikedQuotes(prev => [...prev, quote]);
      setQuotes(prev => prev.map(q => 
        String(q.id) === String(quote.id) 
          ? { ...q, dislikes_count: (q.dislikes_count || 0) + 1 } 
          : q
      ));
      
      // Remove from likes if present
      setLikedQuotes(prev => prev.filter(q => String(q.id) !== String(quote.id)));
      
      // API call
      if (isAuthenticated) {
        fetch('/api/user/dislikes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            quoteId: quote.id,
            customBackground: displayedBgUrl 
          }),
        }).catch(console.error);
      }
      
      toast('Skipped 👎', { duration: 1500 });
    }
  }, [dislikedQuotes, isAuthenticated, getQuoteDisplayedBackground]);

  const handleSaveQuote = useCallback((quote: Quote) => {
    const alreadySaved = savedQuotes.some(q => String(q.id) === String(quote.id));
    
    if (!alreadySaved) {
      // Optimistic update
      setSavedQuotes(prev => [...prev, quote]);
      
      // API call
      if (isAuthenticated) {
        fetch('/api/user/saved', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quoteId: quote.id }),
        }).catch(console.error);
      }
      
      toast.success('Saved! 🔖', { duration: 1500 });
    } else {
      // Unsave
      setSavedQuotes(prev => prev.filter(q => String(q.id) !== String(quote.id)));
      
      if (isAuthenticated) {
        fetch('/api/user/saved', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quoteId: quote.id }),
        }).catch(console.error);
      }
      
      toast('Removed from saved', { icon: '🔖', duration: 1500 });
    }
  }, [savedQuotes, isAuthenticated]);
  
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
      background_id: quote.background_id,
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
    // Show loading overlay for better UX
    setIsNavigatingToQuote(true);
    
    const quoteIdStr = String(quoteId);
    
    // Priority for background:
    // 1. Already saved background in savedQuoteBackgrounds (from saved quotes with custom bg)
    // 2. Explicitly passed customBackground (when clicking from saved quotes view)
    // 3. Random background based on quote ID
    let quoteBackground: BackgroundImage;
    
    // First check if we already have a saved background for this quote
    if (savedQuoteBackgrounds[quoteIdStr]) {
      quoteBackground = savedQuoteBackgrounds[quoteIdStr];
    } else if (customBackground) {
      // Use explicitly passed custom background
      quoteBackground = createCustomBg({ id: `saved_custom_${quoteIdStr}`, name: 'Saved Background', url: customBackground });
      // Store for future use
      setSavedQuoteBackgrounds(prev => ({
        ...prev,
        [quoteIdStr]: quoteBackground
      }));
    } else {
      // Generate consistent random background for this quote
      quoteBackground = getRandomBackgroundForQuote(quoteId);
    }
    
    // 1. Check if quote exists in current feed
    const existingIndex = quotes.findIndex(q => String(q.id) === quoteIdStr);
    if (existingIndex !== -1) {
      if (viewMode === 'swipe') {
        navigateToQuote(quotes[existingIndex], existingIndex);
      } else {
        // For Feed View - move the quote to top and set as target
        const targetQuote = quotes[existingIndex];
        // Move target quote to top
        setQuotes(prev => {
          const filtered = prev.filter(q => String(q.id) !== quoteIdStr);
          return [targetQuote, ...filtered];
        });
        setFeedTargetQuoteId(quoteId);
        setFeedTargetQuoteBackground(quoteBackground);
      }
      // Small delay to ensure smooth transition
      setTimeout(() => setIsNavigatingToQuote(false), 300);
      return;
    }
    
    // 2. Fetch the specific quote directly
    setIsLoadingQuotes(true);
    
    // Check if this is a user quote (created quote)
    const isUserQuote = quoteIdStr.startsWith('user_');
    const actualQuoteId = isUserQuote ? quoteIdStr.replace('user_', '') : quoteIdStr;
    
    try {
      // Use different API endpoint for user quotes
      const apiUrl = isUserQuote 
        ? `/api/user/quotes/${actualQuoteId}`
        : `/api/quotes/${quoteId}`;
      
      const response = await fetch(apiUrl);
      if (response.ok) {
        const { quote: fetchedQuote } = await response.json();
        if (fetchedQuote) {
          // For user quotes, add the user_ prefix to match the feed format
          const quote = isUserQuote 
            ? { ...fetchedQuote, id: `user_${fetchedQuote.id}` }
            : fetchedQuote;
          
          if (viewMode === 'swipe') {
            // Add to feed and navigate
            setQuotes(prev => {
              const exists = prev.some(q => String(q.id) === String(quote.id));
              return exists ? prev : [quote, ...prev];
            });
            navigateToQuote(quote, 0);
          } else {
            // For Feed View - add quote at TOP and set as target
            setQuotes(prev => {
              const filtered = prev.filter(q => String(q.id) !== String(quote.id));
              return [quote, ...filtered];
            });
            setFeedTargetQuoteId(quote.id);
            setFeedTargetQuoteBackground(quoteBackground);
          }
          
          // Include category in filter (without triggering refetch)
          if (category) addCategoryWithoutRefetch(category);
          
          setIsLoadingQuotes(false);
          setTimeout(() => setIsNavigatingToQuote(false), 300);
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
          
          const foundIndex = fetchedQuotes.findIndex((q: Quote) => String(q.id) === quoteIdStr);
          if (foundIndex !== -1) {
            const targetQuote = fetchedQuotes[foundIndex];
            
            if (viewMode === 'swipe') {
              setQuotes(fetchedQuotes);
              navigateToQuote(targetQuote, foundIndex);
            } else {
              // For Feed View - put target quote at top
              const otherQuotes = fetchedQuotes.filter((_: Quote, i: number) => i !== foundIndex);
              setQuotes([targetQuote, ...otherQuotes]);
              setFeedTargetQuoteId(quoteId);
              setFeedTargetQuoteBackground(quoteBackground);
            }
          } else {
            setQuotes(fetchedQuotes);
          }
        }
      }
    } catch (error) {
      console.error('Quote navigation error:', error);
      toast.error('Failed to load quote');
    } finally {
      setIsLoadingQuotes(false);
      setTimeout(() => setIsNavigatingToQuote(false), 300);
    }
  }, [quotes, selectedCategories, navigateToQuote, addCategoryWithoutRefetch, viewMode, savedQuoteBackgrounds]);

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
    return <AppLoader />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/50 via-orange-50/30 to-rose-50/50 dark:from-stone-950 dark:via-stone-900 dark:to-stone-950 flex overflow-hidden">
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
        onMultipleCategoryToggle={handleMultipleCategoryToggle}
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
        viewMode={viewMode}
        onViewModeChange={(mode) => {
          setViewMode(mode);
          setIsSidebarOpen(false);
        }}
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
        onGoogleSuccess={(googleUser) => {
          // Set flag to preserve current quote during login transition
          isLoggingIn.current = true;
          
          // ✅ Update state and close modal IMMEDIATELY
          setIsAuthenticated(true);
          setUser(googleUser);
          setShowAuthModal(false);
          setSwipeCount(0);
          setAuthenticatedSwipeCount(0);
          
          // ✅ Show toast IMMEDIATELY
          toast.success(`Welcome, ${googleUser.name}! 🎉`);
          
          // Clear guest category cache
          try {
            sessionStorage.removeItem(CACHE_PREFIX + 'categories_guest');
          } catch {}
          
          // ✅ Show syncing indicator while fetching user data
          setIsLoadingUserData(true);
          
          // ✅ Fetch data in BACKGROUND (non-blocking)
          // Also prefetch user's custom backgrounds for instant customization
          Promise.all([
            fetchUserData(), 
            fetchAllPreferences(), 
            fetchCategories(),
            backgroundsContext?.ensureLoaded(), // Prefetch custom backgrounds
          ])
            .then(() => {
              setIsLoadingUserData(false); // ✅ Hide syncing indicator
            })
            .catch((error) => {
              console.error(error);
              setIsLoadingUserData(false); // Hide on error too
            });
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
              // Use quote's custom background if available, or preset background, or per-quote saved background, or global
              shareQuote.custom_background
                ? createCustomBg({ id: `share_custom_${shareQuote.id}`, name: 'Custom Background', url: shareQuote.custom_background })
                : shareQuote.background_id
                  ? BACKGROUND_IMAGES.find(bg => bg.id === shareQuote.background_id) || backgroundImage
                  : savedQuoteBackgrounds[String(shareQuote.id)] || (backgroundImage && backgroundImage.id !== 'none' ? backgroundImage : getRandomBackgroundForQuote(shareQuote.id))
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

      {/* Edit Background Modal - For editing background of current quote only */}
      {showEditBackgroundModal && quoteToEditBg && (
        <Suspense fallback={<ModalLoader />}>
          <EditBackgroundModal
            isOpen={showEditBackgroundModal}
            onClose={() => {
              setShowEditBackgroundModal(false);
              setQuoteToEditBg(null);
            }}
            quote={quoteToEditBg}
            currentBackground={
              savedQuoteBackgrounds[String(quoteToEditBg.id)] || 
              (backgroundImage.id !== 'none' ? backgroundImage : getRandomBackgroundForQuote(quoteToEditBg.id))
            }
            onApply={handleApplyBackground}
            isAuthenticated={isAuthenticated}
          />
        </Suspense>
      )}

      {/* Quote Reel Modal - For creating video reels with or without quote */}
      {showQuoteReelModal && (
        <Suspense fallback={<ModalLoader />}>
          <QuoteReelModal
            isOpen={showQuoteReelModal}
            onClose={() => {
              setShowQuoteReelModal(false);
              setReelQuote(null);
            }}
            quote={reelQuote}
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
        <Suspense fallback={<ModalLoader />}>
          <ViewUserQuoteModal
            quote={viewingUserQuote}
            onClose={() => setViewingUserQuote(null)}
            onEdit={(quote) => {
              setEditingQuote(quote);
              setViewingUserQuote(null);
              setShowCreateQuoteModal(true);
            }}
            onShare={(quote) => {
              setViewingUserQuote(null);
              handleShareUserQuote(quote);
            }}
            cardTheme={cardTheme}
            fontStyle={fontStyle}
            backgroundImage={backgroundImage}
          />
        </Suspense>
      )}

      {/* Main Content - Hidden when other views are active */}
      <div className={`flex-1 flex flex-col items-center justify-center p-4 pb-20 sm:pb-20 relative ${activeNavTab !== 'feed' ? 'hidden' : ''}`}>
        {/* Top Header */}
        <Header
          theme={theme}
          toggleTheme={toggleTheme}
          isAuthenticated={isAuthenticated}
          categories={categories}
          selectedCategories={selectedCategories}
          onMenuClick={() => setIsSidebarOpen(true)}
          onSearchClick={() => setShowSearchModal(true)}
          onCategoriesClick={() => setIsSidebarOpen(true)}
          isLoadingUserData={isLoadingUserData}
        />
        {/* Progress Bar */}
        <div className="fixed top-0 left-0 right-0 h-[2px] bg-white/30 backdrop-blur-sm z-50">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Conditional View: Swipe or Feed */}
        {viewMode === 'swipe' ? (
          <>
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
                  // Use per-quote custom background if available, otherwise random
                  const quoteIdStr = String(quote.id);
                  let quoteBackground: BackgroundImage;
                  
                  if (savedQuoteBackgrounds[quoteIdStr]) {
                    // First priority: saved custom background
                    quoteBackground = savedQuoteBackgrounds[quoteIdStr];
                  } else if (backgroundImage && backgroundImage.id !== 'none' && backgroundImage.url) {
                    // Second priority: user-selected global background
                    quoteBackground = backgroundImage;
                  } else {
                    // Third priority: seeded random background
                    quoteBackground = getRandomBackgroundForQuote(quote.id);
                  }
                  
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
                      isUndoing={isUndoing}
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
              onEdit={handleEditBackground}
              onCreateReel={handleCreateReel}
              canUndo={swipeHistory.length > 0}
              isUndoing={isUndoing}
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
            <FooterLinks />
          </>
        ) : (
          /* Feed View - Instagram-style scrolling */
          <FeedView
            quotes={filteredQuotes}
            likedQuoteIds={new Set(likedQuotes.map(q => q.id))}
            dislikedQuoteIds={new Set(dislikedQuotes.map(q => q.id))}
            savedQuoteIds={new Set(savedQuotes.map(q => q.id))}
            onLike={(quoteId) => {
              const quote = filteredQuotes.find(q => q.id === quoteId);
              if (quote) handleLikeQuote(quote);
            }}
            onDislike={(quoteId) => {
              const quote = filteredQuotes.find(q => q.id === quoteId);
              if (quote) handleDislikeQuote(quote);
            }}
            onSave={(quoteId) => {
              const quote = filteredQuotes.find(q => q.id === quoteId);
              if (quote) {
                // Open save modal with customization options (same as swipe view)
                setQuoteToSave(quote);
                setShowSaveQuoteModal(true);
              }
            }}
            onShare={(quote) => {
              setShareQuote(quote);
              setShowShareModal(true);
            }}
            onEditBackground={(quote) => {
              setQuoteToEditBg(quote);
              setShowEditBackgroundModal(true);
            }}
            cardTheme={cardTheme}
            fontStyle={fontStyle}
            backgroundImage={backgroundImage}
            isAuthenticated={isAuthenticated}
            onLoginRequired={() => setShowAuthModal(true)}
            targetQuoteId={feedTargetQuoteId}
            targetQuoteBackground={feedTargetQuoteBackground}
          />
        )}
      </div>

      {/* Bottom Navigation Bar - Visible on all screens */}
      <BottomNavBar
        activeTab={activeNavTab}
        onTabChange={(tab) => {
          if (tab === 'create') {
            // This is now handled by onCreateSelect
            setEditingQuote(null);
            setShowCreateQuoteModal(true);
          } else {
            setActiveNavTab(tab);
          }
        }}
        onCreateSelect={(type: CreateType) => {
          if (type === 'quote') {
            setEditingQuote(null);
            setShowCreateQuoteModal(true);
          } else if (type === 'reel') {
            setReelQuote(null); // Open reel modal without pre-set quote
            setShowQuoteReelModal(true);
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
          showEditBackgroundModal ||
          showQuoteReelModal ||
          showOnboarding ||
          viewingUserQuote !== null
        }
        userProfilePicture={user?.profile_picture}
        userName={user?.name}
        isLoadingUserData={isLoadingUserData}
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
                background_id: quote.background_id,
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
            onProfileUpdate={(profilePicture) => {
              setUser(prev => prev ? { ...prev, profile_picture: profilePicture } : null);
            }}
            savedQuotes={savedQuotes.map(q => ({
              id: q.id,
              text: q.text,
              author: q.author,
              category: q.category,
              category_icon: q.category_icon,
              custom_background: q.custom_background || null,
            }))}
            userQuotes={userQuotes.map(q => ({
              id: q.id,
              text: q.text,
              author: q.author,
              category: q.category,
              category_icon: q.category_icon,
              custom_background: q.custom_background,
              is_public: Boolean(q.is_public),
            }))}
            onQuoteClick={(quoteId, category, customBackground) => {
              setActiveNavTab('feed');
              handleQuoteNavigation(quoteId, category, customBackground);
            }}
          />
        </Suspense>
      )}

      {/* Navigation Loading Overlay */}
      {isNavigatingToQuote && <NavigationLoader />}
    </div>
  );
}

