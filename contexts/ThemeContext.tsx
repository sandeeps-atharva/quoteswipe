'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  syncWithUser: () => Promise<void>;
  isAuthenticated: boolean;
  setIsAuthenticated: (value: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Get initial theme from localStorage or system preference (matches blocking script)
function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  
  try {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || savedTheme === 'light') {
      return savedTheme;
    }
    // Fall back to system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  } catch {
    // localStorage might be blocked
  }
  return 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initialize with the same logic as the blocking script to avoid mismatch
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasFetchedUserTheme, setHasFetchedUserTheme] = useState(false);

  // Apply theme to document
  const applyTheme = useCallback((newTheme: Theme) => {
    if (typeof window !== 'undefined') {
      const root = document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(newTheme);
      root.setAttribute('data-theme', newTheme);
    }
  }, []);

  // Save theme to API for authenticated users
  const saveThemeToAPI = useCallback(async (newTheme: Theme) => {
    try {
      await fetch('/api/user/theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ theme: newTheme }),
      });
    } catch (error) {
      console.error('Failed to save theme to API:', error);
    }
  }, []);

  // Fetch theme from API for authenticated users
  const fetchUserTheme = useCallback(async () => {
    try {
      const response = await fetch('/api/user/theme', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        if (data.theme === 'light' || data.theme === 'dark') {
          setThemeState(data.theme);
          localStorage.setItem('theme', data.theme);
          applyTheme(data.theme);
        }
      }
    } catch (error) {
      console.error('Failed to fetch user theme:', error);
    }
  }, [applyTheme]);

  // Sync with user preferences when authenticated
  const syncWithUser = useCallback(async () => {
    if (!hasFetchedUserTheme) {
      setHasFetchedUserTheme(true);
      await fetchUserTheme();
    }
  }, [hasFetchedUserTheme, fetchUserTheme]);

  // Sync theme on mount - ensures the class is applied (may already be set by blocking script)
  useEffect(() => {
    // Apply theme class to ensure consistency with React state
    applyTheme(theme);
  }, []); // Only run once on mount

  // When authentication changes, sync theme
  useEffect(() => {
    if (isAuthenticated && !hasFetchedUserTheme) {
      fetchUserTheme();
      setHasFetchedUserTheme(true);
    }
    // Reset when user logs out
    if (!isAuthenticated) {
      setHasFetchedUserTheme(false);
    }
  }, [isAuthenticated, hasFetchedUserTheme, fetchUserTheme]);

  const toggleTheme = useCallback(() => {
    setThemeState((prevTheme) => {
      const newTheme: Theme = prevTheme === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', newTheme);
      applyTheme(newTheme);
      
      // Save to API if authenticated
      if (isAuthenticated) {
        saveThemeToAPI(newTheme);
      }
      
      return newTheme;
    });
  }, [applyTheme, isAuthenticated, saveThemeToAPI]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
    
    // Save to API if authenticated
    if (isAuthenticated) {
      saveThemeToAPI(newTheme);
    }
  }, [applyTheme, isAuthenticated, saveThemeToAPI]);

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      toggleTheme, 
      setTheme, 
      syncWithUser,
      isAuthenticated,
      setIsAuthenticated 
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

