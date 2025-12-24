'use client';

import { createContext, useContext, useState, useCallback, ReactNode, useRef } from 'react';

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
  // New: Lazy load trigger - call this when modal opens
  ensureLoaded: () => Promise<void>;
}

const BackgroundsContext = createContext<BackgroundsContextType | undefined>(undefined);

export function BackgroundsProvider({ children }: { children: ReactNode }) {
  const [userBackgrounds, setUserBackgrounds] = useState<UserBackground[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const fetchPromiseRef = useRef<Promise<void> | null>(null);

  // Fetch backgrounds from API (lazy - only when needed)
  const fetchBackgrounds = useCallback(async () => {
    // Prevent duplicate fetches
    if (fetchPromiseRef.current) {
      return fetchPromiseRef.current;
    }

    setIsLoading(true);
    
    const promise = (async () => {
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
        fetchPromiseRef.current = null;
      }
    })();

    fetchPromiseRef.current = promise;
    return promise;
  }, []);

  // Ensure backgrounds are loaded (lazy load trigger)
  // Call this when customization modal opens
  const ensureLoaded = useCallback(async () => {
    if (!isInitialized && !isLoading) {
      await fetchBackgrounds();
    }
  }, [isInitialized, isLoading, fetchBackgrounds]);

  // Refresh backgrounds (force refetch)
  const refreshBackgrounds = useCallback(async () => {
    fetchPromiseRef.current = null; // Clear any pending promise
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

  // NO automatic fetch on mount - lazy loading only!

  return (
    <BackgroundsContext.Provider
      value={{
        userBackgrounds,
        isLoading,
        isInitialized,
        refreshBackgrounds,
        addBackground,
        removeBackground,
        ensureLoaded,
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

// Re-export type for convenience
export type { BackgroundsContextType };

