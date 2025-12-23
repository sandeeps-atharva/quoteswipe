'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export interface UserBackground {
  id: string;
  url: string;
  name: string;
}

interface BackgroundsContextType {
  userBackgrounds: UserBackground[];
  isLoading: boolean;
  isInitialized: boolean;
  refreshBackgrounds: () => Promise<void>;
  addBackground: (background: UserBackground) => void;
  removeBackground: (backgroundId: string) => void;
}

const BackgroundsContext = createContext<BackgroundsContextType | undefined>(undefined);

export function BackgroundsProvider({ children }: { children: ReactNode }) {
  const [userBackgrounds, setUserBackgrounds] = useState<UserBackground[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Fetch backgrounds from API (no caching)
  const fetchBackgrounds = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/user/upload-background', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setUserBackgrounds(data.backgrounds || []);
      }
    } catch (error) {
      console.error('Failed to fetch user backgrounds:', error);
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  }, []);

  // Refresh backgrounds (can be called manually)
  const refreshBackgrounds = useCallback(async () => {
    await fetchBackgrounds();
  }, [fetchBackgrounds]);

  // Add a new background to the list (after upload)
  const addBackground = useCallback((background: UserBackground) => {
    setUserBackgrounds(prev => [background, ...prev]);
  }, []);

  // Remove a background from the list (after delete)
  const removeBackground = useCallback((backgroundId: string) => {
    setUserBackgrounds(prev => prev.filter(bg => bg.id !== backgroundId));
  }, []);

  // Fetch on mount (preload)
  useEffect(() => {
    fetchBackgrounds();
  }, [fetchBackgrounds]);

  return (
    <BackgroundsContext.Provider
      value={{
        userBackgrounds,
        isLoading,
        isInitialized,
        refreshBackgrounds,
        addBackground,
        removeBackground,
      }}
    >
      {children}
    </BackgroundsContext.Provider>
  );
}

export function useBackgrounds() {
  const context = useContext(BackgroundsContext);
  if (context === undefined) {
    throw new Error('useBackgrounds must be used within a BackgroundsProvider');
  }
  return context;
}

// Optional hook for components that might not be wrapped in provider
export function useBackgroundsSafe() {
  const context = useContext(BackgroundsContext);
  return context;
}

