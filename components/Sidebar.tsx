'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { X, User, Bookmark, LogOut, ArrowLeft, Trash2, Search, Heart, ThumbsDown, Mail, Calendar, Shield, Edit2, Check, Lock, Loader2, Eye, ChevronRight, Share2, ExternalLink, MessageSquare, Info, Palette, PenLine, Plus, Globe, Camera, Image as ImageIcon } from 'lucide-react';
import { isQuotePublic } from '@/lib/helpers';
import Link from 'next/link';
import Image from 'next/image';
import { useTheme } from '@/contexts/ThemeContext';
import UpdatePasswordModal from './UpdatePasswordModal';
import toast from 'react-hot-toast';

interface Category {
  id: string | number;
  name: string;
  icon: string;
  count: number;
}

interface SavedQuote {
  id: string | number;
  text: string;
  author: string;
  category: string;
  category_icon?: string;
  custom_background?: string | null;
}

interface UserQuote {
  id: string | number;
  text: string;
  author: string;
  theme_id?: string;
  font_id?: string;
  background_id?: string;
  category?: string;
  category_icon?: string;
  category_id?: string | number;
  is_public?: boolean | number;
  created_at?: string;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  user: { name: string; email: string; role?: 'user' | 'admin'; auth_provider?: 'google' | 'email' } | null;
  likedCount: number;
  savedCount: number;
  dislikedCount: number;
  viewedCount: number;
  categories: Category[];
  totalCategories?: number;
  selectedCategories: string[];
  onCategoryToggle: (category: string) => void;
  onLoginClick: () => void;
  onLogout: () => void;
  isLoggingOut?: boolean;
  onSavedQuoteDelete?: (quoteId: string | number) => void;
  onQuoteClick?: (quoteId: string | number, category?: string, customBackground?: string | null) => void;
  onCustomizeClick?: () => void;
  onCreateQuoteClick?: () => void;
  onEditQuoteClick?: (quote: UserQuote) => void;
  onViewQuoteClick?: (quote: UserQuote) => void;
  userQuotes?: UserQuote[];
  onUserQuoteDelete?: (quoteId: string | number) => void;
  onRefreshUserQuotes?: () => void;
  // Navigation to views
  onLikedClick?: () => void;
  onSkippedClick?: () => void;
  onProfileClick?: () => void;
}

type ViewType = 'main' | 'profile' | 'liked' | 'disliked';

export default function Sidebar({
  isOpen,
  onClose,
  isAuthenticated,
  user,
  likedCount,
  savedCount,
  dislikedCount,
  viewedCount,
  categories,
  totalCategories = categories.length,
  selectedCategories,
  onCategoryToggle,
  onLoginClick,
  onLogout,
  isLoggingOut = false,
  onSavedQuoteDelete,
  onQuoteClick,
  onCustomizeClick,
  onCreateQuoteClick,
  onEditQuoteClick,
  onViewQuoteClick,
  userQuotes = [],
  onUserQuoteDelete,
  onRefreshUserQuotes,
  onLikedClick,
  onSkippedClick,
  onProfileClick,
}: SidebarProps) {
  const { theme } = useTheme();
  const [currentView, setCurrentView] = useState<ViewType>('main');
  const [likedQuotes, setLikedQuotes] = useState<SavedQuote[]>([]);
  const [dislikedQuotes, setDislikedQuotes] = useState<SavedQuote[]>([]);
  const [isLoadingLiked, setIsLoadingLiked] = useState(false);
  const [isLoadingDisliked, setIsLoadingDisliked] = useState(false);
  const [hasFetchedLiked, setHasFetchedLiked] = useState(false);
  const [hasFetchedDisliked, setHasFetchedDisliked] = useState(false);
  const [navigatingQuoteId, setNavigatingQuoteId] = useState<string | number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [collectionSearch, setCollectionSearch] = useState('');
  const [showUpdatePasswordModal, setShowUpdatePasswordModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(user);
  
  // Profile state
  const [profileData, setProfileData] = useState<{
    user: {
      id: string | number;
      name: string;
      email: string;
      role: string;
      created_at: string;
      profile_picture?: string;
      auth_provider: 'google' | 'email';
    };
    stats: {
      liked: number;
      disliked: number;
      saved: number;
    };
  } | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [hasFetchedProfile, setHasFetchedProfile] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);

  // Category groups from database
  interface CategoryGroupData {
    id: string;
    name: string;
    label: string;
    icon: string;
    order: number;
    keywords: string[];
  }
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroupData[]>([]);
  const [hasFetchedGroups, setHasFetchedGroups] = useState(false);

  // Fetch category groups from API
  useEffect(() => {
    if (hasFetchedGroups) return;
    
    const fetchGroups = async () => {
      try {
        const response = await fetch('/api/category-groups');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.groups) {
            setCategoryGroups(data.groups);
          }
        }
      } catch (error) {
        console.error('Failed to fetch category groups:', error);
      } finally {
        setHasFetchedGroups(true);
      }
    };
    
    fetchGroups();
  }, [hasFetchedGroups]);

  // Reset view when sidebar closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => setCurrentView('main'), 300);
    }
  }, [isOpen]);

  // Reset cached data when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      setProfileData(null);
      setLikedQuotes([]);
      setDislikedQuotes([]);
      setHasFetchedProfile(false);
      setHasFetchedLiked(false);
      setHasFetchedDisliked(false);
    }
  }, [isAuthenticated]);

  // Consolidated view-based data fetching - single useEffect for better performance
  useEffect(() => {
    if (!isAuthenticated) return;
    
    switch (currentView) {
      case 'liked':
        if (!hasFetchedLiked) fetchLikedQuotes();
        break;
      case 'disliked':
        if (!hasFetchedDisliked) fetchDislikedQuotes();
        break;
      case 'profile':
        if (!hasFetchedProfile) fetchProfile();
        break;
    }
  }, [currentView, isAuthenticated, hasFetchedLiked, hasFetchedDisliked, hasFetchedProfile]);

  useEffect(() => {
    setCurrentUser(user);
  }, [user]);

  const fetchProfile = async () => {
    setIsLoadingProfile(true);
    try {
      const response = await fetch('/api/user/profile');
      if (response.ok) {
        const data = await response.json();
        setProfileData(data);
        setEditName(data.user.name);
        setHasFetchedProfile(true);
      }
    } catch (error) {
      console.error('Fetch profile error:', error);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handleSaveName = async () => {
    if (!editName.trim() || editName.trim().length < 2) {
      toast.error('Name must be at least 2 characters');
      return;
    }

    setIsSavingName(true);
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        setProfileData(prev => prev ? { ...prev, user: data.user } : null);
        setCurrentUser(prev => prev ? { ...prev, name: data.user.name } : null);
        setIsEditingName(false);
        toast.success('Name updated!');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update');
      }
    } catch (error) {
      toast.error('Failed to update');
    } finally {
      setIsSavingName(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset collection search when view changes
  useEffect(() => {
    setCollectionSearch('');
  }, [currentView]);

  // Group categories by their groups (from database)
  const groupedCategories = useMemo(() => {
    const searchResults = debouncedSearchQuery.trim()
      ? categories.filter(category =>
          category.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase().trim()) || 
          category.icon.includes(debouncedSearchQuery)
        )
      : categories;

    if (debouncedSearchQuery.trim()) {
      // When searching, return flat list
      return [{ id: 'search', label: `🔍 Search Results (${searchResults.length})`, icon: '🔍', categories: searchResults }];
    }

    // If no groups loaded yet, show all categories in one group
    if (categoryGroups.length === 0) {
      return [{ id: 'all', label: 'All Categories', icon: '📚', categories: categories }];
    }

    // Group categories based on database groups
    const grouped: { id: string; label: string; icon: string; categories: Category[] }[] = [];
    const assignedCategories = new Set<string>();

    categoryGroups.forEach(group => {
      const matchingCategories = categories.filter(cat => 
        group.keywords.some(keyword => 
          cat.name.toLowerCase() === keyword.toLowerCase()
        ) && !assignedCategories.has(cat.name)
      );
      
      if (matchingCategories.length > 0) {
        matchingCategories.forEach(cat => assignedCategories.add(cat.name));
        grouped.push({
          id: group.id,
          label: group.label,
          icon: group.icon,
          categories: matchingCategories,
        });
      }
    });

    // Add remaining categories to "More"
    const remaining = categories.filter(cat => !assignedCategories.has(cat.name));
    if (remaining.length > 0) {
      grouped.push({
        id: 'more',
        label: 'More Categories',
        icon: '✨',
        categories: remaining,
      });
    }

    return grouped;
  }, [categories, debouncedSearchQuery, categoryGroups]);

  // For backward compatibility (flat list)
  const filteredCategories = useMemo(() => {
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase().trim();
      return categories.filter(category =>
        category.name.toLowerCase().includes(query) || category.icon.includes(query)
      );
    }
    return categories;
  }, [categories, debouncedSearchQuery]);

  // Filter quotes based on search
  const filteredLikedQuotes = useMemo(() => {
    if (!collectionSearch.trim()) return likedQuotes;
    const q = collectionSearch.toLowerCase();
    return likedQuotes.filter(quote =>
      quote.text.toLowerCase().includes(q) ||
      quote.author.toLowerCase().includes(q) ||
      quote.category?.toLowerCase().includes(q)
    );
  }, [likedQuotes, collectionSearch]);

  const filteredDislikedQuotes = useMemo(() => {
    if (!collectionSearch.trim()) return dislikedQuotes;
    const q = collectionSearch.toLowerCase();
    return dislikedQuotes.filter(quote =>
      quote.text.toLowerCase().includes(q) ||
      quote.author.toLowerCase().includes(q) ||
      quote.category?.toLowerCase().includes(q)
    );
  }, [dislikedQuotes, collectionSearch]);

  const fetchLikedQuotes = async () => {
    setIsLoadingLiked(true);
    try {
      const response = await fetch('/api/user/likes');
      if (response.ok) {
        const data = await response.json();
        setLikedQuotes(data.quotes || []);
        setHasFetchedLiked(true);
      }
    } catch (error) {
      console.error('Fetch liked quotes error:', error);
    } finally {
      setIsLoadingLiked(false);
    }
  };

  const fetchDislikedQuotes = async () => {
    setIsLoadingDisliked(true);
    try {
      const response = await fetch('/api/user/dislikes');
      if (response.ok) {
        const data = await response.json();
        setDislikedQuotes(data.quotes || []);
        setHasFetchedDisliked(true);
      }
    } catch (error) {
      console.error('Fetch disliked quotes error:', error);
    } finally {
      setIsLoadingDisliked(false);
    }
  };

  // Render Profile View - Compact Design
  const renderProfileView = () => (
    <div className="flex-1 flex flex-col min-h-0 animate-in slide-in-from-right-4 duration-200">
      {/* Compact Profile Header */}
      <div className="p-3 border-b border-gray-100 dark:border-gray-800">
        <button
          onClick={() => setCurrentView('main')}
          className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors text-sm"
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
      </div>

      {/* Profile Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {isLoadingProfile ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-blue-500" />
          </div>
        ) : profileData ? (
          <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
            {/* Compact Avatar Row */}
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center text-white text-lg sm:text-xl font-bold shadow-lg">
                  {profileData.user.name.includes(' ') 
                    ? profileData.user.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
                    : profileData.user.name.slice(0, 2).toUpperCase()
                  }
                </div>
                <div className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  profileData.user.auth_provider === 'google' 
                    ? 'bg-white dark:bg-gray-800 shadow' 
                    : 'bg-blue-500 text-white'
                }`}>
                  {profileData.user.auth_provider === 'google' ? (
                    <svg className="w-3 h-3" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  ) : '📧'}
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                {isEditingName ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                    <button onClick={handleSaveName} disabled={isSavingName} className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50">
                      {isSavingName ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    </button>
                    <button onClick={() => { setIsEditingName(false); setEditName(profileData.user.name); }} className="p-1.5 bg-gray-100 dark:bg-gray-800 text-gray-600 rounded-lg">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setIsEditingName(true)} className="flex items-center gap-1.5 group">
                    <span className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate">{profileData.user.name}</span>
                    <Edit2 size={12} className="text-gray-400 opacity-50 sm:opacity-0 sm:group-hover:opacity-100 shrink-0" />
                  </button>
                )}
                <p className="text-xs text-gray-500 truncate">{profileData.user.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    profileData.user.auth_provider === 'google' ? 'bg-gray-100 dark:bg-gray-800 text-gray-500' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  }`}>
                    {profileData.user.auth_provider === 'google' ? 'Google' : 'Email'}
                  </span>
                  <span className="text-[10px] text-gray-400">Since {formatDate(profileData.user.created_at)}</span>
                </div>
              </div>
            </div>

            {/* Stats Grid - Compact (Read-only stats, use bottom nav for full views) */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-900/20 dark:to-pink-800/20 rounded-xl p-2 sm:p-3 text-center">
                <Heart size={16} className="mx-auto text-pink-500 mb-0.5" fill="currentColor" />
                <div className="text-lg sm:text-xl font-bold text-pink-600 dark:text-pink-400">{likedCount}</div>
                <div className="text-[10px] text-pink-600/70 dark:text-pink-400/70">Liked</div>
              </div>
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/40 dark:to-gray-700/40 rounded-xl p-2 sm:p-3 text-center">
                <ThumbsDown size={16} className="mx-auto text-gray-400 mb-0.5" />
                <div className="text-lg sm:text-xl font-bold text-gray-600 dark:text-gray-400">{dislikedCount}</div>
                <div className="text-[10px] text-gray-500">Skipped</div>
              </div>
            </div>

            {/* Create Your Quote Button */}
            <button
              onClick={() => { onCreateQuoteClick?.(); onClose(); }}
              className="w-full relative overflow-hidden py-3.5 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 text-white rounded-xl font-semibold text-sm shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <div className="flex items-center justify-center gap-2">
                <PenLine size={16} />
                <span>Create Your Own Quote</span>
              </div>
              <div className="flex items-center justify-center gap-2 mt-1 text-[10px] text-white/80">
                <span className="flex items-center gap-1"><Camera size={10} /> Photo</span>
                <span>•</span>
                <span className="flex items-center gap-1"><ImageIcon size={10} /> Upload</span>
                <span>•</span>
                <span className="flex items-center gap-1"><Palette size={10} /> Themes</span>
              </div>
            </button>

            {/* Account Actions */}
            <div className="space-y-2">
              {profileData.user.auth_provider === 'email' && (
                <button
                  onClick={() => setShowUpdatePasswordModal(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors text-sm"
                >
                  <Lock size={14} />
                  <span className="font-medium">Change Password</span>
                </button>
              )}
              {profileData.user.auth_provider === 'google' && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-[11px] text-blue-600 dark:text-blue-400 text-center">
                    🔒 Secured by Google
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <User size={40} className="mb-3" />
            <p className="text-sm">Unable to load profile</p>
          </div>
        )}
      </div>
    </div>
  );

  // Handle quote click - navigate to the quote with loading state
  const handleQuoteClick = useCallback(async (quoteId: string | number, category?: string, customBackground?: string | null) => {
    // Prevent double clicks
    if (navigatingQuoteId) return;
    
    setNavigatingQuoteId(quoteId);
    
    // Close sidebar first so user sees the main content immediately
    onClose();
    
    try {
      if (onQuoteClick) {
        await onQuoteClick(quoteId, category, customBackground);
      } else {
        // Fallback: navigate directly using window.location
        const idStr = String(quoteId);
        if (idStr.startsWith('user_')) {
          window.location.href = `/user-quote/${idStr.replace('user_', '')}`;
        } else {
          window.location.href = `/quote/${quoteId}`;
        }
      }
    } catch (error) {
      console.error('Navigation error:', error);
      toast.error('Failed to navigate to quote');
    } finally {
      // Small delay to prevent flicker if navigation is fast
      setTimeout(() => setNavigatingQuoteId(null), 300);
    }
  }, [navigatingQuoteId, onQuoteClick, onClose]);

  // Handle share quote
  const handleShareQuote = async (e: React.MouseEvent, quote: SavedQuote) => {
    e.stopPropagation(); // Prevent triggering the quote click
    const idStr = String(quote.id);
    const shareUrl = idStr.startsWith('user_') 
      ? `${window.location.origin}/user-quote/${idStr.replace('user_', '')}`
      : `${window.location.origin}/quote/${quote.id}`;
    const shareText = `"${quote.text}" — ${quote.author}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Share Quote',
          text: shareText,
          url: shareUrl,
        });
      } catch (error) {
        // User cancelled or share failed, fallback to copy
        copyToClipboard(shareUrl);
      }
    } else {
      copyToClipboard(shareUrl);
    }
  };

  // Copy to clipboard helper
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Link copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy link');
    });
  };

  // Render Liked Quotes View with Search
  const renderLikedView = () => (
    <div className="flex-1 flex flex-col min-h-0 animate-in slide-in-from-right-4 duration-200">
      {/* Header with Search */}
      <div className="p-3 border-b border-gray-100 dark:border-gray-800 space-y-2">
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentView('profile')} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors shrink-0">
            <ArrowLeft size={16} className="text-gray-500" />
          </button>
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search liked quotes..."
              value={collectionSearch}
              onChange={(e) => setCollectionSearch(e.target.value)}
              className="w-full pl-8 pr-8 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
            {collectionSearch && (
              <button onClick={() => setCollectionSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={12} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 bg-pink-50 dark:bg-pink-900/20 rounded-lg shrink-0">
            <Heart size={14} className="text-pink-500" fill="currentColor" />
            <span className="text-sm font-semibold text-pink-600 dark:text-pink-400">
              {isLoadingLiked ? <Loader2 size={12} className="animate-spin" /> : likedQuotes.length}
            </span>
          </div>
        </div>
        {collectionSearch && (
          <p className="text-[10px] text-gray-500 pl-9">Found {filteredLikedQuotes.length} of {likedQuotes.length}</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 sm:p-3">
        {isLoadingLiked ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-pink-500" />
          </div>
        ) : likedQuotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-12 h-12 rounded-xl bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center mb-3">
              <Heart size={22} className="text-pink-500" />
            </div>
            <p className="font-medium text-gray-900 dark:text-white text-sm mb-1">No liked quotes</p>
            <p className="text-xs text-gray-500">Swipe right on quotes you love</p>
          </div>
        ) : filteredLikedQuotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Search size={28} className="text-gray-300 mb-2" />
            <p className="text-xs text-gray-500">No quotes match "{collectionSearch}"</p>
            <button onClick={() => setCollectionSearch('')} className="text-xs text-pink-500 hover:text-pink-600 mt-2">Clear search</button>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredLikedQuotes.map((quote) => (
              <div 
                key={quote.id} 
                onClick={() => handleQuoteClick(quote.id, quote.category)}
                className={`group relative bg-gradient-to-r from-pink-50/50 to-white dark:from-pink-900/10 dark:to-gray-800 rounded-xl p-3 border border-pink-100 dark:border-pink-900/30 hover:shadow-md hover:border-pink-200 dark:hover:border-pink-800 transition-all cursor-pointer ${navigatingQuoteId === quote.id ? 'opacity-50 pointer-events-none' : ''}`}
              >
                {navigatingQuoteId === quote.id && (
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <Loader2 size={18} className="animate-spin text-pink-500" />
                  </div>
                )}
                <button
                  onClick={(e) => handleShareQuote(e, quote)}
                  className="absolute top-2 right-2 p-1.5 bg-pink-100 dark:bg-pink-900/30 hover:bg-pink-200 active:scale-95 rounded opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all"
                  title="Share"
                >
                  <Share2 size={14} className="text-pink-500" />
                </button>
                <div className="flex items-start gap-2">
                  <div className="shrink-0 mt-0.5">
                    <Heart size={14} className="text-pink-400" fill="currentColor" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-gray-900 dark:text-white leading-snug line-clamp-2">"{quote.text}"</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm">{quote.category_icon}</span>
                      {quote.author && <p className="text-[10px] sm:text-xs text-gray-500 truncate">— {quote.author}</p>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Render Disliked/Skipped Quotes View with Search
  const renderDislikedView = () => (
    <div className="flex-1 flex flex-col min-h-0 animate-in slide-in-from-right-4 duration-200">
      {/* Header with Search */}
      <div className="p-3 border-b border-gray-100 dark:border-gray-800 space-y-2">
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentView('profile')} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors shrink-0">
            <ArrowLeft size={16} className="text-gray-500" />
          </button>
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search skipped quotes..."
              value={collectionSearch}
              onChange={(e) => setCollectionSearch(e.target.value)}
              className="w-full pl-8 pr-8 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
            {collectionSearch && (
              <button onClick={() => setCollectionSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={12} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg shrink-0">
            <ThumbsDown size={14} className="text-gray-400" />
            <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
              {isLoadingDisliked ? <Loader2 size={12} className="animate-spin" /> : dislikedQuotes.length}
            </span>
          </div>
        </div>
        {collectionSearch && (
          <p className="text-[10px] text-gray-500 pl-9">Found {filteredDislikedQuotes.length} of {dislikedQuotes.length}</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 sm:p-3">
        {isLoadingDisliked ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        ) : dislikedQuotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
              <ThumbsDown size={22} className="text-gray-400" />
            </div>
            <p className="font-medium text-gray-900 dark:text-white text-sm mb-1">No skipped quotes</p>
            <p className="text-xs text-gray-500">Swipe left to skip quotes</p>
          </div>
        ) : filteredDislikedQuotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Search size={28} className="text-gray-300 mb-2" />
            <p className="text-xs text-gray-500">No quotes match "{collectionSearch}"</p>
            <button onClick={() => setCollectionSearch('')} className="text-xs text-gray-500 hover:text-gray-600 mt-2">Clear search</button>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredDislikedQuotes.map((quote) => (
              <div 
                key={quote.id} 
                onClick={() => handleQuoteClick(quote.id, quote.category)}
                className={`group relative bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 border border-gray-100 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 hover:shadow-sm transition-all cursor-pointer ${navigatingQuoteId === quote.id ? 'opacity-50 pointer-events-none' : ''}`}
              >
                {navigatingQuoteId === quote.id && (
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <Loader2 size={18} className="animate-spin text-gray-400" />
                  </div>
                )}
                <button
                  onClick={(e) => handleShareQuote(e, quote)}
                  className="absolute top-2 right-2 p-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 active:scale-95 rounded opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all"
                  title="Share"
                >
                  <Share2 size={14} className="text-gray-500" />
                </button>
                <div className="flex items-start gap-2">
                  <div className="shrink-0 mt-0.5">
                    <ThumbsDown size={14} className="text-gray-300 dark:text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-snug line-clamp-2">"{quote.text}"</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm opacity-50">{quote.category_icon}</span>
                      {quote.author && <p className="text-[10px] sm:text-xs text-gray-400 truncate">— {quote.author}</p>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Render Main View - Focused on Categories
  const renderMainView = () => (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header Title */}
      <div className="p-3 sm:p-4 border-b border-gray-100 dark:border-gray-800">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <span className="text-xl">📚</span>
          Categories
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">Choose your favorite topics</p>
      </div>

      {/* Create Your Quote Banner - For Authenticated Users */}
      {isAuthenticated && (
        <div className="px-3 sm:px-4 pb-3">
          <button
            onClick={() => { onCreateQuoteClick?.(); onClose(); }}
            className="w-full relative overflow-hidden group rounded-xl"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 opacity-90 group-hover:opacity-100 transition-opacity rounded-xl" />
            <div className="relative flex items-center gap-3 p-3 sm:p-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg relative">
                <PenLine size={22} className="text-white" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white/30 flex items-center justify-center">
                  <Camera size={12} className="text-white" />
                </div>
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white text-sm sm:text-base">Create Your Quote</h3>
                  <span className="px-1.5 py-0.5 bg-white/20 backdrop-blur-sm rounded text-[9px] font-bold text-white uppercase">New</span>
                </div>
                <p className="text-white/80 text-[10px] sm:text-xs mt-0.5">Write, upload photos or take pictures as background</p>
              </div>
              <ChevronRight size={20} className="text-white/60 group-hover:translate-x-1 transition-transform" />
            </div>
            {/* Feature badges */}
            <div className="relative flex items-center justify-center gap-2 pb-3 px-3">
              <span className="px-2 py-1 bg-white/20 backdrop-blur-sm rounded-full text-[9px] text-white flex items-center gap-1">
                <Camera size={10} /> Take Photo
              </span>
              <span className="px-2 py-1 bg-white/20 backdrop-blur-sm rounded-full text-[9px] text-white flex items-center gap-1">
                <ImageIcon size={10} /> Upload Image
              </span>
              <span className="px-2 py-1 bg-white/20 backdrop-blur-sm rounded-full text-[9px] text-white flex items-center gap-1">
                <Globe size={10} /> Share
              </span>
            </div>
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0 border-t border-gray-100 dark:border-gray-800">
        {!isAuthenticated ? (
          /* Guest View */
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-4">
            {categories.length > 0 && categories[0] && (
              <div className="mb-3 sm:mb-4">
                <p className="text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Current Category</p>
                <div className="flex items-center gap-2 sm:gap-3 p-3 bg-gradient-to-r from-blue-500/10 to-pink-500/10 dark:from-blue-500/20 dark:to-pink-500/20 rounded-xl border border-blue-200/50 dark:border-blue-700/50">
                  <span className="text-2xl sm:text-3xl">{categories[0].icon || '📚'}</span>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{categories[0].name || 'Loading...'}</p>
                    <p className="text-xs text-gray-500">{categories[0].count ?? 0} quotes</p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-gradient-to-br from-blue-50 to-pink-50 dark:from-gray-800 dark:to-gray-800 rounded-xl sm:rounded-2xl p-4 sm:p-5 text-center border border-gray-200/50 dark:border-gray-700/50">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-blue-500 to-pink-500 flex items-center justify-center mx-auto mb-3 shadow-lg">
                <span className="text-xl sm:text-2xl">🔓</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-1.5">Unlock Everything</h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-3">
                Access <span className="font-bold text-blue-600 dark:text-blue-400">{totalCategories}+</span> categories
              </p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mb-4 text-left">
                {[
                  { icon: '✍️', text: 'Create own quotes' },
                  { icon: '📷', text: 'Take photo BG' },
                  { icon: '🖼️', text: 'Upload image BG' },
                  { icon: '🎨', text: '60+ themes' },
                  { icon: '🔤', text: '75+ fonts' },
                  { icon: '💾', text: 'Save & Share' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300">
                    <span className="text-sm">{item.icon}</span>
                    <span className="truncate">{item.text}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => { onLoginClick(); onClose(); }}
                className="w-full py-2.5 bg-gradient-to-r from-blue-500 to-pink-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-shadow text-sm"
              >
                Get Started Free
              </button>
            </div>
          </div>
        ) : (
          /* Authenticated View - Categories */
          <>
            <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
              {/* Selected Categories - Compact */}
              {selectedCategories.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex flex-wrap gap-2 min-w-0">
                    {selectedCategories.slice(0, 3).map((catName) => {
                      const cat = categories.find(c => c.name === catName);
                      return cat && (
                        <span key={cat.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-pink-500 text-white text-[11px] sm:text-xs font-medium rounded-full shadow-sm">
                          {cat.icon} {cat.name}
                          <button onClick={(e) => { e.stopPropagation(); onCategoryToggle(catName); }} className="hover:bg-white/20 rounded-full p-0.5 -mr-1">
                            <X size={12} />
                          </button>
                        </span>
                      );
                    })}
                    {selectedCategories.length > 3 && (
                      <span className="inline-flex items-center px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[11px] sm:text-xs font-medium rounded-full">
                        +{selectedCategories.length - 3}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => selectedCategories.forEach(cat => onCategoryToggle(cat))}
                    className="text-[10px] sm:text-xs text-blue-500 hover:text-blue-600 whitespace-nowrap shrink-0"
                  >
                    Clear
                  </button>
                </div>
              )}

              {/* Search */}
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search categories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Categories List - Grouped with Headlines */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-3 sm:px-4 pb-3 sm:pb-4">
              {groupedCategories.length === 0 || (groupedCategories.length === 1 && groupedCategories[0].categories.length === 0) ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Search size={28} className="text-gray-300 mb-2" />
                  <p className="text-xs text-gray-500">No categories found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {groupedCategories.map((group) => (
                    <div key={group.id}>
                      {/* Group Header */}
                      <div className="flex items-center gap-2 mb-2 sticky top-0 bg-white dark:bg-gray-900 py-1.5 z-10">
                        <span className="text-base">{group.icon}</span>
                        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">
                          {group.label}
                        </h3>
                        <div className="flex-1 h-px bg-gradient-to-r from-gray-200 dark:from-gray-700 to-transparent" />
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                          {group.categories.length}
                        </span>
                      </div>
                      
                      {/* Categories Grid */}
                      <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                        {group.categories.map((category) => {
                          const isSelected = selectedCategories.includes(category.name);
                          return (
                            <button
                              key={category.id}
                              onClick={() => { onCategoryToggle(category.name); onClose(); }}
                              className={`flex items-center gap-2.5 px-3 py-2.5 sm:px-3.5 sm:py-3 rounded-xl transition-all ${
                                isSelected
                                  ? 'bg-gradient-to-r from-blue-500 to-pink-500 text-white shadow-lg ring-2 ring-blue-300/50'
                                  : 'bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                              }`}
                            >
                              <span className="text-lg sm:text-xl shrink-0">{category.icon}</span>
                              <span className="flex-1 text-left text-xs sm:text-sm font-medium truncate">{category.name}</span>
                              <span className={`text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full shrink-0 font-medium ${isSelected ? 'bg-white/25' : 'bg-gray-200 dark:bg-gray-700'}`}>
                                {category.count}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={onClose} />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 bg-white dark:bg-gray-900 shadow-2xl transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } w-full sm:w-[420px] md:w-[480px]`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <Image src="/logo.svg" alt="QuoteSwipe" width={40} height={40} />
              <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-pink-600 bg-clip-text text-transparent">QuoteSwipe</span>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          {/* Content based on view */}
          {currentView === 'profile' && renderProfileView()}
          {currentView === 'liked' && renderLikedView()}
          {currentView === 'disliked' && renderDislikedView()}
          {currentView === 'main' && renderMainView()}

          {/* Footer - Compact */}
          <div className="p-3 sm:p-4 border-t border-gray-100 dark:border-gray-800 space-y-2 sm:space-y-3">
            {/* Quick Links - Compact Row */}
            <div className="flex items-center justify-between gap-1">
              <Link
                href="/about"
                className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all text-[10px] sm:text-xs font-medium"
              >
                <Info size={12} />
                <span>About</span>
              </Link>
              <Link
                href="/contact"
                className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-green-50 dark:hover:bg-green-900/20 text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-all text-[10px] sm:text-xs font-medium"
              >
                <Mail size={12} />
                <span>Contact</span>
              </Link>
              <Link
                href="/feedback"
                className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-pink-50 dark:hover:bg-pink-900/20 text-gray-500 dark:text-gray-400 hover:text-pink-600 dark:hover:text-pink-400 transition-all text-[10px] sm:text-xs font-medium"
              >
                <MessageSquare size={12} />
                <span>Feedback</span>
              </Link>
              <Link
                href="/privacy-policy"
                className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-purple-50 dark:hover:bg-purple-900/20 text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-all text-[10px] sm:text-xs font-medium"
              >
                <Shield size={12} />
                <span>Privacy</span>
              </Link>
            </div>

            {/* Auth Button */}
            {isAuthenticated ? (
              <button
                onClick={onLogout}
                disabled={isLoggingOut}
                className={`w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-blue-500 to-pink-500 text-white rounded-xl shadow-lg hover:shadow-xl transition-all text-sm font-semibold active:scale-[0.98] ${isLoggingOut ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isLoggingOut ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Signing Out...</span>
                  </>
                ) : (
                  <>
                    <LogOut size={16} />
                    <span>Sign Out</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={() => { onLoginClick(); onClose(); }}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-blue-500 to-pink-500 text-white rounded-xl shadow-lg hover:shadow-xl transition-all text-sm font-semibold active:scale-[0.98]"
              >
                <User size={16} />
                <span>Sign In</span>
              </button>
            )}
            
            {/* Legal Links */}
            <div className="flex items-center justify-center gap-2 text-[9px] sm:text-[10px] text-gray-400 dark:text-gray-500">
              <Link href="/terms-of-service" className="hover:text-blue-500 transition-colors">Terms</Link>
              <span>•</span>
              <Link href="/cookie-policy" className="hover:text-blue-500 transition-colors">Cookies</Link>
              <span>•</span>
              <span>© 2025</span>
            </div>
          </div>
        </div>
      </div>

      {/* Update Password Modal */}
      {isAuthenticated && (
        <UpdatePasswordModal isOpen={showUpdatePasswordModal} onClose={() => setShowUpdatePasswordModal(false)} />
      )}
    </>
  );
}
