'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { apiCache, CACHE_KEYS, CACHE_TTL, clearCacheOnLogout } from '@/lib/api-cache';

// Types
interface User {
  _id: string;
  name: string;
  email: string;
  profile_picture?: string;
  language?: string;
  preferredCategories?: string[];
  onboardingComplete?: boolean;
}

interface UserProfile {
  name: string;
  email: string;
  profile_picture?: string;
  language?: string;
  preferredCategories?: string[];
}

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  profile: UserProfile | null;
  
  // Actions
  fetchUser: (force?: boolean) => Promise<User | null>;
  fetchProfile: (force?: boolean) => Promise<UserProfile | null>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  setUser: (user: User | null) => void;
  logout: () => void;
  invalidateUser: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = useCallback(async (force = false): Promise<User | null> => {
    try {
      if (force) {
        apiCache.invalidate(CACHE_KEYS.USER);
      }

      const userData = await apiCache.getOrFetch<User | null>(
        CACHE_KEYS.USER,
        async () => {
          const response = await fetch('/api/auth/me');
          if (!response.ok) return null;
          const data = await response.json();
          return data.user || null;
        },
        { ttl: CACHE_TTL.MEDIUM, sensitive: true }
      );

      setUserState(userData);
      return userData;
    } catch (error) {
      console.error('Error fetching user:', error);
      setUserState(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchProfile = useCallback(async (force = false): Promise<UserProfile | null> => {
    try {
      if (force) {
        apiCache.invalidate(CACHE_KEYS.USER_PROFILE);
      }

      const profileData = await apiCache.getOrFetch<UserProfile | null>(
        CACHE_KEYS.USER_PROFILE,
        async () => {
          const response = await fetch('/api/user/profile');
          if (!response.ok) return null;
          const data = await response.json();
          return data.user || null;
        },
        { ttl: CACHE_TTL.MEDIUM, sensitive: true }
      );

      setProfile(profileData);
      return profileData;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  }, []);

  const updateProfile = useCallback(async (data: Partial<UserProfile>) => {
    const response = await fetch('/api/user/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      // Invalidate and refetch
      apiCache.invalidate(CACHE_KEYS.USER_PROFILE);
      apiCache.invalidate(CACHE_KEYS.USER);
      await fetchProfile(true);
      await fetchUser(true);
    }
  }, [fetchProfile, fetchUser]);

  const setUser = useCallback((newUser: User | null) => {
    setUserState(newUser);
    if (newUser) {
      apiCache.set(CACHE_KEYS.USER, newUser);
    } else {
      apiCache.invalidate(CACHE_KEYS.USER);
    }
  }, []);

  const logout = useCallback(() => {
    setUserState(null);
    setProfile(null);
    // Clear all user-related cache securely (broadcasts to other tabs too)
    clearCacheOnLogout();
  }, []);

  const invalidateUser = useCallback(() => {
    apiCache.invalidate(CACHE_KEYS.USER);
    apiCache.invalidate(CACHE_KEYS.USER_PROFILE);
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const value: UserContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    profile,
    fetchUser,
    fetchProfile,
    updateProfile,
    setUser,
    logout,
    invalidateUser,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

