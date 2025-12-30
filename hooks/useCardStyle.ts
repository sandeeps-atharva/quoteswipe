'use client';

import { useState, useCallback, useRef } from 'react';
import { 
  CARD_THEMES, 
  FONT_STYLES, 
  BACKGROUND_IMAGES, 
  CardTheme, 
  FontStyle, 
  BackgroundImage 
} from '@/lib/constants';
import { getFromCache, setToCache, CACHE_DURATIONS } from '@/lib/cache-utils';

interface UseCardStyleReturn {
  cardTheme: CardTheme;
  fontStyle: FontStyle;
  backgroundImage: BackgroundImage;
  savedQuoteBackgrounds: Record<string, BackgroundImage>;
  isLoadingPreferences: React.MutableRefObject<boolean>;
  preferencesLoaded: boolean;
  setCardTheme: (theme: CardTheme) => void;
  setFontStyle: (font: FontStyle) => void;
  setBackgroundImage: (bg: BackgroundImage) => void;
  setSavedQuoteBackgrounds: React.Dispatch<React.SetStateAction<Record<string, BackgroundImage>>>;
  setPreferencesLoaded: (loaded: boolean) => void;
  fetchAllPreferences: () => Promise<void>;
  saveCardStyle: (theme?: CardTheme, font?: FontStyle, bg?: BackgroundImage) => Promise<void>;
  createCustomBg: (img: { id: string; name: string; url: string }) => BackgroundImage;
  resolveBackground: (bgId: string | undefined, serverBgs: Array<{ id: string; url: string; name: string }>) => BackgroundImage;
  cacheStyles: (isAppReady: boolean) => void;
}

/**
 * Helper: Create custom BackgroundImage object
 */
export function createCustomBg(img: { id: string; name: string; url: string }): BackgroundImage {
  return {
    id: img.id,
    name: img.name,
    url: img.url,
    thumbnail: img.url,
    overlay: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.55) 100%)',
    textColor: '#ffffff',
    authorColor: '#e5e5e5',
    categoryBg: 'rgba(255,255,255,0.15)',
    categoryText: '#ffffff',
  };
}

/**
 * Helper: Resolve background ID to BackgroundImage object
 */
export function resolveBackground(
  bgId: string | undefined, 
  serverBgs: Array<{ id: string; url: string; name: string }>
): BackgroundImage {
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
}

export function useCardStyle(): UseCardStyleReturn {
  // Card Customization - restore from cache immediately for instant display
  const [cardTheme, setCardTheme] = useState<CardTheme>(() => {
    const cached = getFromCache<CardTheme>('cardTheme', CACHE_DURATIONS.PREFERENCES);
    return cached || CARD_THEMES[0];
  });
  
  const [fontStyle, setFontStyle] = useState<FontStyle>(() => {
    const cached = getFromCache<FontStyle>('fontStyle', CACHE_DURATIONS.PREFERENCES);
    return cached || FONT_STYLES[0];
  });
  
  const [backgroundImage, setBackgroundImage] = useState<BackgroundImage>(() => {
    const cached = getFromCache<BackgroundImage>('backgroundImage', CACHE_DURATIONS.PREFERENCES);
    return cached || BACKGROUND_IMAGES[0];
  });
  
  // Per-quote custom backgrounds (for saved quotes with custom backgrounds)
  const [savedQuoteBackgrounds, setSavedQuoteBackgrounds] = useState<Record<string, BackgroundImage>>({});
  
  const isLoadingPreferences = useRef(false);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);

  // Fetch ALL user preferences in single optimized call
  const fetchAllPreferences = useCallback(async () => {
    try {
      isLoadingPreferences.current = true;
      const response = await fetch('/api/user/all-preferences', { credentials: 'include' });
      
      if (response.ok) {
        const data = await response.json();
        
        // Apply card style preferences
        const theme = CARD_THEMES.find(t => t.id === data.themeId);
        const font = FONT_STYLES.find(f => f.id === data.fontId);
        const bg = resolveBackground(data.backgroundId, data.customBackgrounds || []);
        
        setCardTheme(theme || CARD_THEMES[0]);
        setFontStyle(font || FONT_STYLES[0]);
        setBackgroundImage(bg);
        
        return data;
      }
      
      setPreferencesLoaded(true);
    } catch (error) {
      console.error('Fetch all preferences error:', error);
      setPreferencesLoaded(true);
    } finally {
      setTimeout(() => { isLoadingPreferences.current = false; }, 300);
    }
  }, []);

  // Save user's card style preferences
  const saveCardStyle = useCallback(async (
    themeToSave?: CardTheme, 
    fontToSave?: FontStyle, 
    bgToSave?: BackgroundImage
  ) => {
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
  }, [cardTheme.id, fontStyle.id, backgroundImage.id]);

  // Cache card styles for instant restoration
  const cacheStyles = useCallback((isAppReady: boolean) => {
    if (!isAppReady) return;
    setToCache('cardTheme', cardTheme);
    setToCache('fontStyle', fontStyle);
    setToCache('backgroundImage', backgroundImage);
  }, [cardTheme, fontStyle, backgroundImage]);

  return {
    cardTheme,
    fontStyle,
    backgroundImage,
    savedQuoteBackgrounds,
    isLoadingPreferences,
    preferencesLoaded,
    setCardTheme,
    setFontStyle,
    setBackgroundImage,
    setSavedQuoteBackgrounds,
    setPreferencesLoaded,
    fetchAllPreferences,
    saveCardStyle,
    createCustomBg,
    resolveBackground,
    cacheStyles,
  };
}

