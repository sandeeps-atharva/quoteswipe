'use client';

import { useState, useCallback, useRef } from 'react';

export interface User {
  id: string | number;
  name: string;
  email: string;
  role?: 'user' | 'admin';
  auth_provider?: 'google' | 'email';
  profile_picture?: string | null;
}

interface UseAuthReturn {
  isAuthenticated: boolean;
  user: User | null;
  isLoggingOut: boolean;
  isLoggingIn: React.MutableRefObject<boolean>;
  setIsAuthenticated: (value: boolean) => void;
  setUser: (user: User | null) => void;
  checkAuth: () => Promise<{ isAuthenticated: boolean; user: User | null; onboardingComplete: boolean }>;
  logout: () => Promise<void>;
  handleLoginSuccess: (userData: User) => void;
}

export function useAuth(): UseAuthReturn {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const isLoggingIn = useRef(false);

  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setIsAuthenticated(true);
        setUser(data.user);
        return {
          isAuthenticated: true,
          user: data.user,
          onboardingComplete: data.onboarding_complete !== false,
        };
      }
      setIsAuthenticated(false);
      setUser(null);
      return { isAuthenticated: false, user: null, onboardingComplete: true };
    } catch (error) {
      console.error('Auth check error:', error);
      setIsAuthenticated(false);
      setUser(null);
      return { isAuthenticated: false, user: null, onboardingComplete: true };
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setIsAuthenticated(false);
      setUser(null);
      
      // Clear user-specific cache
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key?.startsWith('qs_cache_quotes_')) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => sessionStorage.removeItem(key));
      } catch {
        // Ignore storage errors
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  }, []);

  const handleLoginSuccess = useCallback((userData: User) => {
    isLoggingIn.current = true;
    setIsAuthenticated(true);
    setUser(userData);
    // Reset login flag after a short delay
    setTimeout(() => {
      isLoggingIn.current = false;
    }, 500);
  }, []);

  return {
    isAuthenticated,
    user,
    isLoggingOut,
    isLoggingIn,
    setIsAuthenticated,
    setUser,
    checkAuth,
    logout,
    handleLoginSuccess,
  };
}

