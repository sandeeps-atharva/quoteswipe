/**
 * Shared types for quotes, categories, and users
 * Used across multiple components
 */

export interface Quote {
  id: string | number;
  text: string;
  author: string;
  category: string;
  category_icon?: string;
  likes_count?: number;
  dislikes_count?: number;
  custom_background?: string | null;
}

export interface Category {
  id: string | number;
  name: string;
  icon: string;
  count: number;
}

export interface User {
  id: string | number;
  name: string;
  email: string;
  role?: 'user' | 'admin';
  auth_provider?: 'google' | 'email';
  profile_picture?: string | null;
}

export interface UserQuote {
  id: string | number;
  text: string;
  author: string;
  theme_id?: string;
  font_id?: string;
  background_id?: string;
  category_id?: string | number;
  category?: string;
  category_icon?: string;
  is_public?: number | boolean;
  created_at?: string;
  custom_background?: string;
}

export interface ShareQuote {
  id: number | string;
  text: string;
  author: string;
  category: string;
  category_icon?: string;
  likes_count?: number;
  isUserQuote?: boolean;
  is_public?: number | boolean;
  custom_background?: string;
  background_id?: string;
}

export interface SwipeHistory {
  index: number;
  direction: 'left' | 'right';
}

