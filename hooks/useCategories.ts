'use client';

import { useState, useCallback } from 'react';
import { apiCache, CACHE_KEYS, CACHE_TTL } from '@/lib/api-cache';

// Types
interface Category {
  _id: string;
  name: string;
  slug: string;
  icon?: string;
  description?: string;
  group?: string;
  isOnboarding?: boolean;
  [key: string]: unknown;
}

interface CategoryGroup {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  categories?: Category[];
  [key: string]: unknown;
}

interface UseCategoriesReturn {
  categories: Category[];
  categoryGroups: CategoryGroup[];
  onboardingCategories: Category[];
  isLoading: boolean;
  
  // Fetch functions
  fetchCategories: (force?: boolean) => Promise<Category[]>;
  fetchCategoryGroups: (force?: boolean) => Promise<CategoryGroup[]>;
  fetchOnboardingCategories: (force?: boolean) => Promise<Category[]>;
  
  // Invalidate
  invalidateCategories: () => void;
}

export function useCategories(): UseCategoriesReturn {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
  const [onboardingCategories, setOnboardingCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchCategories = useCallback(async (force = false): Promise<Category[]> => {
    try {
      setIsLoading(true);
      if (force) apiCache.invalidate(CACHE_KEYS.CATEGORIES);
      
      const data = await apiCache.getOrFetch<Category[]>(
        CACHE_KEYS.CATEGORIES,
        async () => {
          const response = await fetch('/api/categories', { credentials: 'include' });
          if (!response.ok) return [];
          const json = await response.json();
          return json.categories || [];
        },
        { ttl: CACHE_TTL.LONG } // Categories don't change often
      );
      
      setCategories(data);
      return data;
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchCategoryGroups = useCallback(async (force = false): Promise<CategoryGroup[]> => {
    try {
      if (force) apiCache.invalidate(CACHE_KEYS.CATEGORY_GROUPS);
      
      const data = await apiCache.getOrFetch<CategoryGroup[]>(
        CACHE_KEYS.CATEGORY_GROUPS,
        async () => {
          const response = await fetch('/api/category-groups');
          if (!response.ok) return [];
          const json = await response.json();
          return json.groups || [];
        },
        { ttl: CACHE_TTL.LONG } // Category groups don't change often
      );
      
      setCategoryGroups(data);
      return data;
    } catch (error) {
      console.error('Error fetching category groups:', error);
      return [];
    }
  }, []);

  const fetchOnboardingCategories = useCallback(async (force = false): Promise<Category[]> => {
    const cacheKey = `${CACHE_KEYS.CATEGORIES}-onboarding`;
    
    try {
      if (force) apiCache.invalidate(cacheKey);
      
      const data = await apiCache.getOrFetch<Category[]>(
        cacheKey,
        async () => {
          const response = await fetch('/api/categories?onboarding=true');
          if (!response.ok) return [];
          const json = await response.json();
          return json.categories || [];
        },
        { ttl: CACHE_TTL.VERY_LONG } // Onboarding categories rarely change
      );
      
      setOnboardingCategories(data);
      return data;
    } catch (error) {
      console.error('Error fetching onboarding categories:', error);
      return [];
    }
  }, []);

  const invalidateCategories = useCallback(() => {
    apiCache.invalidate(CACHE_KEYS.CATEGORIES);
    apiCache.invalidate(CACHE_KEYS.CATEGORY_GROUPS);
    apiCache.invalidate(`${CACHE_KEYS.CATEGORIES}-onboarding`);
  }, []);

  return {
    categories,
    categoryGroups,
    onboardingCategories,
    isLoading,
    fetchCategories,
    fetchCategoryGroups,
    fetchOnboardingCategories,
    invalidateCategories,
  };
}

