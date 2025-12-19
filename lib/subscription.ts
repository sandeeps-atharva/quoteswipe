// Subscription Plans and Feature Limits Configuration

export type PlanId = 'free' | 'monthly' | 'yearly' | 'lifetime';
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'pending' | 'none';

// Plan configuration
export interface PlanConfig {
  id: PlanId;
  name: string;
  price: number; // in smallest currency unit (paise for INR)
  priceDisplay: number; // display price in rupees
  currency: string;
  period: 'month' | 'year' | 'lifetime' | 'free';
  features: PlanFeatures;
}

// Feature limits for each plan
export interface PlanFeatures {
  categoriesLimit: number; // -1 for unlimited
  savedQuotesLimit: number;
  createdQuotesLimit: number;
  dailyDownloadsLimit: number;
  imageQuality: 'hd' | 'fhd' | '2k' | '4k';
  themesCount: number;
  fontsCount: number;
  backgroundsCount: number;
  hasWatermark: boolean;
  hasAds: boolean;
  shareFormats: ('post' | 'story' | 'square')[];
  canUseCamera: boolean;
  canSharePublicly: boolean;
  hasFontSizeControl: boolean;
  hasPositionControl: boolean;
  hasBatchDownload: boolean;
  hasCollections: boolean;
  hasReminders: boolean;
  hasPrioritySupport: boolean;
  hasApiAccess: boolean;
  apiRequestsPerDay: number;
  hasCustomBranding: boolean;
  hasDataExport: boolean;
}

// Plan definitions
export const PLANS: Record<PlanId, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    priceDisplay: 0,
    currency: 'INR',
    period: 'free',
    features: {
      categoriesLimit: 3,
      savedQuotesLimit: 10,
      createdQuotesLimit: 3,
      dailyDownloadsLimit: 5,
      imageQuality: 'hd',
      themesCount: 3,
      fontsCount: 3,
      backgroundsCount: 10,
      hasWatermark: true,
      hasAds: true,
      shareFormats: ['post'],
      canUseCamera: false,
      canSharePublicly: false,
      hasFontSizeControl: false,
      hasPositionControl: false,
      hasBatchDownload: false,
      hasCollections: false,
      hasReminders: false,
      hasPrioritySupport: false,
      hasApiAccess: false,
      apiRequestsPerDay: 0,
      hasCustomBranding: false,
      hasDataExport: false,
    },
  },
  monthly: {
    id: 'monthly',
    name: 'Pro Monthly',
    price: 9900, // ₹99 in paise
    priceDisplay: 99,
    currency: 'INR',
    period: 'month',
    features: {
      categoriesLimit: -1, // unlimited
      savedQuotesLimit: -1,
      createdQuotesLimit: 50,
      dailyDownloadsLimit: -1,
      imageQuality: 'fhd',
      themesCount: -1,
      fontsCount: -1,
      backgroundsCount: -1,
      hasWatermark: false,
      hasAds: false,
      shareFormats: ['post', 'story', 'square'],
      canUseCamera: true,
      canSharePublicly: true,
      hasFontSizeControl: true,
      hasPositionControl: true,
      hasBatchDownload: false,
      hasCollections: false,
      hasReminders: false,
      hasPrioritySupport: false,
      hasApiAccess: false,
      apiRequestsPerDay: 0,
      hasCustomBranding: false,
      hasDataExport: false,
    },
  },
  yearly: {
    id: 'yearly',
    name: 'Pro Yearly',
    price: 79900, // ₹799 in paise
    priceDisplay: 799,
    currency: 'INR',
    period: 'year',
    features: {
      categoriesLimit: -1,
      savedQuotesLimit: -1,
      createdQuotesLimit: -1, // unlimited
      dailyDownloadsLimit: -1,
      imageQuality: '2k',
      themesCount: -1,
      fontsCount: -1,
      backgroundsCount: -1,
      hasWatermark: false,
      hasAds: false,
      shareFormats: ['post', 'story', 'square'],
      canUseCamera: true,
      canSharePublicly: true,
      hasFontSizeControl: true,
      hasPositionControl: true,
      hasBatchDownload: true,
      hasCollections: true,
      hasReminders: true,
      hasPrioritySupport: true,
      hasApiAccess: false,
      apiRequestsPerDay: 0,
      hasCustomBranding: false,
      hasDataExport: false,
    },
  },
  lifetime: {
    id: 'lifetime',
    name: 'Lifetime',
    price: 199900, // ₹1999 in paise
    priceDisplay: 1999,
    currency: 'INR',
    period: 'lifetime',
    features: {
      categoriesLimit: -1,
      savedQuotesLimit: -1,
      createdQuotesLimit: -1,
      dailyDownloadsLimit: -1,
      imageQuality: '4k',
      themesCount: -1,
      fontsCount: -1,
      backgroundsCount: -1,
      hasWatermark: false,
      hasAds: false,
      shareFormats: ['post', 'story', 'square'],
      canUseCamera: true,
      canSharePublicly: true,
      hasFontSizeControl: true,
      hasPositionControl: true,
      hasBatchDownload: true,
      hasCollections: true,
      hasReminders: true,
      hasPrioritySupport: true,
      hasApiAccess: true,
      apiRequestsPerDay: 1000,
      hasCustomBranding: true,
      hasDataExport: true,
    },
  },
};

// Get plan by ID
export function getPlan(planId: PlanId): PlanConfig {
  return PLANS[planId] || PLANS.free;
}

// Get features for a plan
export function getPlanFeatures(planId: PlanId): PlanFeatures {
  return getPlan(planId).features;
}

// Check if a feature is available for a plan
export function hasFeature(planId: PlanId, feature: keyof PlanFeatures): boolean {
  const features = getPlanFeatures(planId);
  const value = features[feature];
  
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (Array.isArray(value)) return value.length > 0;
  return !!value;
}

// Check if limit is reached
export function isLimitReached(planId: PlanId, feature: keyof PlanFeatures, currentCount: number): boolean {
  const features = getPlanFeatures(planId);
  const limit = features[feature];
  
  if (typeof limit !== 'number') return false;
  if (limit === -1) return false; // unlimited
  return currentCount >= limit;
}

// Get limit value
export function getLimit(planId: PlanId, feature: keyof PlanFeatures): number {
  const features = getPlanFeatures(planId);
  const value = features[feature];
  return typeof value === 'number' ? value : 0;
}

// Check if user can upgrade from current plan to target plan
export function canUpgrade(currentPlan: PlanId, targetPlan: PlanId): boolean {
  const planOrder: PlanId[] = ['free', 'monthly', 'yearly', 'lifetime'];
  return planOrder.indexOf(targetPlan) > planOrder.indexOf(currentPlan);
}

// Calculate expiry date based on plan
export function calculateExpiryDate(planId: PlanId): Date | null {
  const now = new Date();
  
  switch (planId) {
    case 'monthly':
      return new Date(now.setMonth(now.getMonth() + 1));
    case 'yearly':
      return new Date(now.setFullYear(now.getFullYear() + 1));
    case 'lifetime':
      return null; // never expires
    default:
      return null;
  }
}

// Check if subscription is active
export function isSubscriptionActive(status: SubscriptionStatus, expiresAt: Date | null): boolean {
  if (status !== 'active') return false;
  if (!expiresAt) return true; // lifetime
  return new Date() < new Date(expiresAt);
}

// Get effective plan based on subscription status
export function getEffectivePlan(
  subscriptionPlan: PlanId | undefined,
  subscriptionStatus: SubscriptionStatus | undefined,
  expiresAt: Date | null | undefined
): PlanId {
  if (!subscriptionPlan || subscriptionPlan === 'free') return 'free';
  if (!subscriptionStatus || subscriptionStatus === 'none') return 'free';
  
  if (isSubscriptionActive(subscriptionStatus, expiresAt || null)) {
    return subscriptionPlan;
  }
  
  return 'free';
}

// Image quality to pixel ratio mapping
export const IMAGE_QUALITY_MAP: Record<PlanFeatures['imageQuality'], number> = {
  'hd': 2,    // 720p
  'fhd': 4,   // 1080p
  '2k': 6,    // 1440p
  '4k': 8,    // 2160p
};

// Get pixel ratio for image quality
export function getPixelRatio(planId: PlanId): number {
  const quality = getPlanFeatures(planId).imageQuality;
  return IMAGE_QUALITY_MAP[quality];
}

