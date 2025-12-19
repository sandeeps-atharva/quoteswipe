'use client';

import { useState, useEffect, useCallback } from 'react';
import { PlanId, PlanFeatures, SubscriptionStatus, PLANS, getPlanFeatures } from '@/lib/subscription';

export interface SubscriptionData {
  plan: PlanId;
  status: SubscriptionStatus;
  isActive: boolean;
  isExpiringSoon: boolean;
  startedAt: Date | null;
  expiresAt: Date | null;
  features: PlanFeatures;
  planDetails: typeof PLANS[PlanId];
}

export interface UseSubscriptionReturn {
  subscription: SubscriptionData | null;
  isLoading: boolean;
  error: string | null;
  isPro: boolean;
  canAccess: (feature: keyof PlanFeatures) => boolean;
  getLimit: (feature: keyof PlanFeatures) => number;
  isLimitReached: (feature: keyof PlanFeatures, currentCount: number) => boolean;
  refresh: () => Promise<void>;
}

const DEFAULT_FREE_SUBSCRIPTION: SubscriptionData = {
  plan: 'free',
  status: 'none',
  isActive: false,
  isExpiringSoon: false,
  startedAt: null,
  expiresAt: null,
  features: getPlanFeatures('free'),
  planDetails: PLANS.free,
};

export function useSubscription(): UseSubscriptionReturn {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/user/subscription');
      const data = await response.json();

      if (data.success) {
        setSubscription(data.subscription);
      } else {
        setSubscription(DEFAULT_FREE_SUBSCRIPTION);
      }
    } catch (err) {
      console.error('Failed to fetch subscription:', err);
      setError('Failed to load subscription');
      setSubscription(DEFAULT_FREE_SUBSCRIPTION);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // Check if user has pro subscription
  const isPro = subscription?.plan !== 'free' && subscription?.isActive === true;

  // Check if user can access a specific feature
  const canAccess = useCallback((feature: keyof PlanFeatures): boolean => {
    if (!subscription) return false;
    const value = subscription.features[feature];
    
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (Array.isArray(value)) return value.length > 0;
    return !!value;
  }, [subscription]);

  // Get limit for a feature
  const getLimit = useCallback((feature: keyof PlanFeatures): number => {
    if (!subscription) return 0;
    const value = subscription.features[feature];
    return typeof value === 'number' ? value : 0;
  }, [subscription]);

  // Check if limit is reached for a feature
  const isLimitReached = useCallback((feature: keyof PlanFeatures, currentCount: number): boolean => {
    const limit = getLimit(feature);
    if (limit === -1) return false; // unlimited
    if (limit === 0) return true; // not available
    return currentCount >= limit;
  }, [getLimit]);

  return {
    subscription,
    isLoading,
    error,
    isPro,
    canAccess,
    getLimit,
    isLimitReached,
    refresh: fetchSubscription,
  };
}

// Hook for checking specific feature access
export function useFeatureAccess(feature: keyof PlanFeatures): {
  hasAccess: boolean;
  isLoading: boolean;
} {
  const { subscription, isLoading, canAccess } = useSubscription();
  
  return {
    hasAccess: canAccess(feature),
    isLoading,
  };
}

// Hook for checking limits
export function useFeatureLimit(feature: keyof PlanFeatures, currentCount: number): {
  limit: number;
  isUnlimited: boolean;
  isReached: boolean;
  remaining: number;
  isLoading: boolean;
} {
  const { subscription, isLoading, getLimit, isLimitReached } = useSubscription();
  
  const limit = getLimit(feature);
  const isUnlimited = limit === -1;
  const isReached = isLimitReached(feature, currentCount);
  const remaining = isUnlimited ? Infinity : Math.max(0, limit - currentCount);

  return {
    limit,
    isUnlimited,
    isReached,
    remaining,
    isLoading,
  };
}

