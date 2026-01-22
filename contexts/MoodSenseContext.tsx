'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode, useRef } from 'react';
import { useUser } from './UserContext';
import { useLanguage } from './LanguageContext';

// Emotion types
export type Emotion = 
  | 'hopeful' | 'lonely' | 'motivated' | 'anxious' | 'heartbroken' 
  | 'calm' | 'excited' | 'grateful' | 'determined' | 'reflective'
  | 'inspired' | 'peaceful' | 'energetic' | 'contemplative' | 'joyful'
  | 'melancholic' | 'confident' | 'uncertain' | 'content' | 'restless';

export type EmotionalIntensity = 'soft' | 'moderate' | 'deep' | 'bold';

export interface MoodState {
  emotion: Emotion | null;
  intensity: EmotionalIntensity;
  userInput?: string;
  timestamp: number;
}

export interface SwipeBehavior {
  action: 'like' | 'dislike' | 'save';
  quoteId: string | number;
  timestamp: number;
  timeSpent: number; // milliseconds
}

export interface BehaviorPattern {
  recentSwipes: SwipeBehavior[];
  averageSwipeTime: number;
  likeRate: number; // percentage
  saveRate: number; // percentage
  skipStreak: number;
  likeStreak: number;
  lastSavedEmotion?: Emotion;
  preferredIntensity?: EmotionalIntensity;
}

export interface GeneratedQuote {
  text: string;
  author: string;
  emotion: Emotion;
  suggestedTheme?: string;
  suggestedFont?: string;
  caption?: string;
  intensity: EmotionalIntensity;
}

interface MoodSenseContextType {
  currentMood: MoodState | null;
  behaviorPattern: BehaviorPattern;
  isMoodSenseActive: boolean;
  
  // Actions
  setMood: (emotion: Emotion, intensity?: EmotionalIntensity, userInput?: string) => void;
  clearMood: () => void;
  trackSwipe: (action: 'like' | 'dislike' | 'save', quoteId: string | number, timeSpent: number) => void;
  generateQuote: (context?: {
    theme?: string;
    timeOfDay?: string;
    recentLiked?: any[];
    recentSaved?: any[];
  }) => Promise<GeneratedQuote | null>;
  toggleMoodSense: () => void;
  
  // Analytics
  getEmotionalInsight: () => string | null;
  shouldSuggestReflection: () => boolean;
  
  // Category suggestions
  suggestCategories: (
    allCategories: Array<{ id: string; name: string; icon: string }>,
    emotion?: Emotion,
    intensity?: EmotionalIntensity,
    userInput?: string,
    freeTextMood?: string
  ) => Promise<string[]>;
}

const MoodSenseContext = createContext<MoodSenseContextType | undefined>(undefined);

const INITIAL_BEHAVIOR: BehaviorPattern = {
  recentSwipes: [],
  averageSwipeTime: 2000, // 2 seconds default
  likeRate: 50,
  saveRate: 10,
  skipStreak: 0,
  likeStreak: 0,
};

export function MoodSenseProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useUser();
  const { language } = useLanguage();
  const [currentMood, setCurrentMood] = useState<MoodState | null>(null);
  const [behaviorPattern, setBehaviorPattern] = useState<BehaviorPattern>(INITIAL_BEHAVIOR);
  const [isMoodSenseActive, setIsMoodSenseActive] = useState(false);
  const behaviorRef = useRef<BehaviorPattern>(INITIAL_BEHAVIOR);

  // Load saved behavior pattern
  useEffect(() => {
    if (isAuthenticated && user) {
      const saved = localStorage.getItem(`moodsense_behavior_${user._id}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setBehaviorPattern(parsed);
          behaviorRef.current = parsed;
        } catch (e) {
          console.error('Failed to load behavior pattern:', e);
        }
      }
    }
  }, [isAuthenticated, user]);

  // Save behavior pattern
  const saveBehaviorPattern = useCallback((pattern: BehaviorPattern) => {
    behaviorRef.current = pattern;
    setBehaviorPattern(pattern);
    if (isAuthenticated && user) {
      localStorage.setItem(`moodsense_behavior_${user._id}`, JSON.stringify(pattern));
    }
  }, [isAuthenticated, user]);

  // Set mood
  const setMood = useCallback((emotion: Emotion, intensity: EmotionalIntensity = 'moderate', userInput?: string) => {
    const mood: MoodState = {
      emotion,
      intensity,
      userInput,
      timestamp: Date.now(),
    };
    setCurrentMood(mood);
    setIsMoodSenseActive(true);
    
    // Save to localStorage
    localStorage.setItem('moodsense_current_mood', JSON.stringify(mood));
  }, []);

  // Clear mood
  const clearMood = useCallback(() => {
    setCurrentMood(null);
    localStorage.removeItem('moodsense_current_mood');
  }, []);

  // Track swipe behavior
  const trackSwipe = useCallback((action: 'like' | 'dislike' | 'save', quoteId: string | number, timeSpent: number) => {
    const swipe: SwipeBehavior = {
      action,
      quoteId,
      timestamp: Date.now(),
      timeSpent,
    };

    const current = behaviorRef.current;
    const recentSwipes = [swipe, ...current.recentSwipes].slice(0, 50); // Keep last 50
    
    // Calculate streaks
    let skipStreak = current.skipStreak;
    let likeStreak = current.likeStreak;
    
    if (action === 'dislike') {
      skipStreak = current.skipStreak + 1;
      likeStreak = 0;
    } else if (action === 'like') {
      likeStreak = current.likeStreak + 1;
      skipStreak = 0;
    } else {
      skipStreak = 0;
      likeStreak = 0;
    }

    // Calculate rates
    const last20Swipes = recentSwipes.slice(0, 20);
    const likes = last20Swipes.filter(s => s.action === 'like').length;
    const saves = last20Swipes.filter(s => s.action === 'save').length;
    const likeRate = last20Swipes.length > 0 ? (likes / last20Swipes.length) * 100 : 50;
    const saveRate = last20Swipes.length > 0 ? (saves / last20Swipes.length) * 100 : 10;

    // Calculate average swipe time
    const avgTime = recentSwipes.length > 0
      ? recentSwipes.reduce((sum, s) => sum + s.timeSpent, 0) / recentSwipes.length
      : 2000;

    const updated: BehaviorPattern = {
      ...current,
      recentSwipes,
      averageSwipeTime: avgTime,
      likeRate,
      saveRate,
      skipStreak,
      likeStreak,
      lastSavedEmotion: action === 'save' ? (currentMood?.emotion || undefined) : current.lastSavedEmotion,
      preferredIntensity: action === 'save' ? (currentMood?.intensity || undefined) : current.preferredIntensity,
    };

    saveBehaviorPattern(updated);
  }, [currentMood, saveBehaviorPattern]);

  // Generate quote based on mood and behavior
  const generateQuote = useCallback(async (context?: {
    theme?: string;
    timeOfDay?: string;
    recentLiked?: any[];
    recentSaved?: any[];
  }): Promise<GeneratedQuote | null> => {
    if (!currentMood?.emotion) {
      return null;
    }

    try {
      const response = await fetch('/api/moodsense/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emotion: currentMood.emotion,
          intensity: currentMood.intensity,
          userInput: currentMood.userInput,
          behaviorPattern: behaviorRef.current,
          language: language.code,
          context: {
            theme: context?.theme,
            timeOfDay: context?.timeOfDay || getTimeOfDay(),
            recentLiked: context?.recentLiked?.slice(0, 5) || [],
            recentSaved: context?.recentSaved?.slice(0, 5) || [],
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate quote');
      }

      const data = await response.json();
      return data.quote;
    } catch (error) {
      console.error('Error generating quote:', error);
      return null;
    }
  }, [currentMood, language.code]);

  // Get emotional insight
  const getEmotionalInsight = useCallback((): string | null => {
    const pattern = behaviorRef.current;
    
    if (pattern.skipStreak >= 5) {
      return "You've been skipping a lot. Would you like something softer or more uplifting?";
    }
    
    if (pattern.likeStreak >= 5) {
      return "You're loving these quotes! Want something deeper or more intense?";
    }
    
    if (pattern.averageSwipeTime < 1000) {
      return "You're swiping fast. Want to slow down and find something that really resonates?";
    }
    
    if (pattern.saveRate > 20) {
      return "You're saving a lot—these quotes really speak to you. Want more like this?";
    }
    
    return null;
  }, []);

  // Check if should suggest reflection
  const shouldSuggestReflection = useCallback((): boolean => {
    const pattern = behaviorRef.current;
    return pattern.skipStreak >= 3 || pattern.averageSwipeTime < 800;
  }, []);

  // Suggest categories based on mood
  const suggestCategories = useCallback(async (
    allCategories: Array<{ id: string; name: string; icon: string }>,
    emotion?: Emotion,
    intensity?: EmotionalIntensity,
    userInput?: string,
    freeTextMood?: string
  ): Promise<string[]> => {
    // Use provided emotion or fall back to currentMood
    const targetEmotion = emotion || currentMood?.emotion;
    const targetIntensity = intensity || currentMood?.intensity;
    const targetUserInput = userInput !== undefined ? userInput : currentMood?.userInput;

    // If freeTextMood is provided, use it; otherwise need emotion
    if (!freeTextMood && !targetEmotion) {
      return [];
    }

    try {
      const response = await fetch('/api/moodsense/suggest-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emotion: targetEmotion,
          intensity: targetIntensity,
          userInput: targetUserInput,
          freeTextMood: freeTextMood, // New: free-text mood input
          allCategories,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to suggest categories');
      }

      const data = await response.json();
      return data.suggestedCategories || [];
    } catch (error) {
      console.error('Error suggesting categories:', error);
      return [];
    }
  }, [currentMood]);

  // Toggle MoodSense
  const toggleMoodSense = useCallback(() => {
    setIsMoodSenseActive(prev => !prev);
    if (!isMoodSenseActive && !currentMood) {
      // Load saved mood if exists
      const saved = localStorage.getItem('moodsense_current_mood');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setCurrentMood(parsed);
        } catch (e) {
          // Ignore
        }
      }
    }
  }, [isMoodSenseActive, currentMood]);

  // Helper: Get time of day
  const getTimeOfDay = (): string => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  };

  const value: MoodSenseContextType = {
    currentMood,
    behaviorPattern,
    isMoodSenseActive,
    setMood,
    clearMood,
    trackSwipe,
    generateQuote,
    toggleMoodSense,
    getEmotionalInsight,
    shouldSuggestReflection,
    suggestCategories,
  };

  return (
    <MoodSenseContext.Provider value={value}>
      {children}
    </MoodSenseContext.Provider>
  );
}

export function useMoodSense() {
  const context = useContext(MoodSenseContext);
  if (context === undefined) {
    throw new Error('useMoodSense must be used within a MoodSenseProvider');
  }
  return context;
}
