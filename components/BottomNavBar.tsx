'use client';

import { Home, Bookmark, PlusCircle, Sparkles, User, Loader2, Film, Quote, X } from 'lucide-react';
import { memo, useState, useRef, useEffect } from 'react';
import Image from 'next/image';

export type NavTab = 'feed' | 'saved' | 'create' | 'myquotes' | 'profile' | 'liked' | 'skipped';
export type CreateType = 'quote' | 'reel';

interface BottomNavBarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  savedCount?: number;
  myQuotesCount?: number;
  isAuthenticated: boolean;
  onLoginRequired: () => void;
  onMenuClick?: () => void;
  onCreateSelect?: (type: CreateType) => void;
  hidden?: boolean;
  userProfilePicture?: string | null;
  userName?: string;
  isLoadingUserData?: boolean; // Show loading indicators on badges
}

function BottomNavBar({
  activeTab,
  onTabChange,
  savedCount = 0,
  myQuotesCount = 0,
  isAuthenticated,
  onLoginRequired,
  onMenuClick,
  onCreateSelect,
  hidden = false,
  userProfilePicture,
  userName,
  isLoadingUserData = false,
}: BottomNavBarProps) {
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const createMenuRef = useRef<HTMLDivElement>(null);
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (createMenuRef.current && !createMenuRef.current.contains(e.target as Node)) {
        setShowCreateMenu(false);
      }
    };
    if (showCreateMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCreateMenu]);
  
  const handleTabClick = (tab: NavTab) => {
    if (!isAuthenticated && tab !== 'feed') {
      onLoginRequired();
      return;
    }
    onTabChange(tab);
  };
  
  const handleCreateClick = () => {
    if (!isAuthenticated) {
      onLoginRequired();
      return;
    }
    setShowCreateMenu(!showCreateMenu);
  };
  
  const handleCreateSelect = (type: CreateType) => {
    setShowCreateMenu(false);
    if (onCreateSelect) {
      onCreateSelect(type);
    } else {
      // Fallback to old behavior if onCreateSelect not provided
      onTabChange('create');
    }
  };

  if (hidden) return null;

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-[100]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {/* Solid background */}
      <div className="bg-white dark:bg-stone-900 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] dark:shadow-[0_-2px_10px_rgba(0,0,0,0.3)] border-t border-stone-100 dark:border-stone-800">
        {/* Navigation Items - 5 tabs */}
        <div className="flex items-center justify-around h-14 sm:h-16 px-2 max-w-2xl mx-auto">
          {/* Feed Tab */}
          <button
            onClick={() => handleTabClick('feed')}
            className="flex flex-col items-center justify-center flex-1 h-full gap-0.5"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <Home 
              size={22} 
              className={`sm:w-6 sm:h-6 ${activeTab === 'feed' 
                ? 'text-amber-500' 
                : 'text-stone-400 dark:text-stone-500'
              }`} 
              fill={activeTab === 'feed' ? 'currentColor' : 'none'}
            />
            <span className={`text-[10px] sm:text-xs font-medium ${
              activeTab === 'feed' 
                ? 'text-amber-500' 
                : 'text-stone-400 dark:text-stone-500'
            }`}>Feed</span>
          </button>

          {/* Saved Tab */}
          <button
            onClick={() => handleTabClick('saved')}
            className="flex flex-col items-center justify-center flex-1 h-full gap-0.5"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <div className="relative">
              <Bookmark 
                size={22} 
                className={`sm:w-6 sm:h-6 ${activeTab === 'saved' 
                  ? 'text-orange-500' 
                  : 'text-stone-400 dark:text-stone-500'
                }`} 
                fill={activeTab === 'saved' ? 'currentColor' : 'none'}
              />
              {isLoadingUserData && isAuthenticated ? (
                <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 flex items-center justify-center bg-orange-500 text-white rounded-full">
                  <Loader2 size={10} className="animate-spin" />
                </span>
              ) : savedCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 flex items-center justify-center bg-orange-500 text-white text-[9px] font-bold rounded-full">
                  {savedCount > 99 ? '99+' : savedCount}
                </span>
              )}
            </div>
            <span className={`text-[10px] sm:text-xs font-medium ${
              activeTab === 'saved' 
                ? 'text-orange-500' 
                : 'text-stone-400 dark:text-stone-500'
            }`}>Saved</span>
          </button>

          {/* Create Tab - Center Button with Menu */}
          <div className="flex flex-col items-center justify-center flex-1 h-full relative" ref={createMenuRef}>
            {/* Create Menu Popup */}
            {showCreateMenu && (
              <div className="absolute bottom-full mb-4 flex items-center gap-3 p-3 bg-white dark:bg-stone-800 rounded-2xl shadow-xl border border-stone-200 dark:border-stone-700 animate-in slide-in-from-bottom-4 fade-in duration-200 z-10">
                {/* Quote Option */}
                <button
                  onClick={() => handleCreateSelect('quote')}
                  className="group flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                    <Quote size={20} className="text-white" />
                  </div>
                  <span className="text-xs font-medium text-stone-600 dark:text-stone-300">Quote</span>
                </button>
                
                {/* Reel Option */}
                <button
                  onClick={() => handleCreateSelect('reel')}
                  className="group flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-fuchsia-500 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                    <Film size={20} className="text-white" />
                  </div>
                  <span className="text-xs font-medium text-stone-600 dark:text-stone-300">Reel</span>
                </button>
              </div>
            )}
            
            <button
              onClick={handleCreateClick}
              className="flex flex-col items-center justify-center"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <div className={`w-12 h-12 sm:w-14 sm:h-14 -mt-4 sm:-mt-5 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/30 active:scale-95 transition-all bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 ${showCreateMenu ? 'rotate-45' : ''}`}>
                {showCreateMenu ? (
                  <X size={22} className="sm:w-6 sm:h-6 text-white" strokeWidth={2} />
                ) : (
                  <PlusCircle size={22} className="sm:w-6 sm:h-6 text-white" strokeWidth={2} />
                )}
              </div>
              <span className="text-[10px] sm:text-xs font-medium text-stone-400 dark:text-stone-500 mt-0.5">Create</span>
            </button>
          </div>

          {/* My Quotes Tab */}
          <button
            onClick={() => handleTabClick('myquotes')}
            className="flex flex-col items-center justify-center flex-1 h-full gap-0.5"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <div className="relative">
              <Sparkles 
                size={22} 
                className={`sm:w-6 sm:h-6 ${activeTab === 'myquotes' 
                  ? 'text-rose-500' 
                  : 'text-stone-400 dark:text-stone-500'
                }`} 
                fill={activeTab === 'myquotes' ? 'currentColor' : 'none'}
              />
              {isLoadingUserData && isAuthenticated ? (
                <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 flex items-center justify-center bg-rose-500 text-white rounded-full">
                  <Loader2 size={10} className="animate-spin" />
                </span>
              ) : myQuotesCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 flex items-center justify-center bg-rose-500 text-white text-[9px] font-bold rounded-full">
                  {myQuotesCount > 99 ? '99+' : myQuotesCount}
                </span>
              )}
            </div>
            <span className={`text-[10px] sm:text-xs font-medium ${
              activeTab === 'myquotes' 
                ? 'text-rose-500' 
                : 'text-stone-400 dark:text-stone-500'
            }`}>My Quotes</span>
          </button>

          {/* Profile/Menu Tab */}
          <button
            onClick={onMenuClick}
            className="flex flex-col items-center justify-center flex-1 h-full gap-0.5"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            {isAuthenticated && userProfilePicture ? (
              <div className="relative w-[26px] h-[26px] sm:w-7 sm:h-7 rounded-full overflow-hidden ring-2 ring-stone-200 dark:ring-stone-700">
                <Image
                  src={userProfilePicture}
                  alt={userName || 'Profile'}
                  fill
                  className="object-cover"
                  sizes="28px"
                />
              </div>
            ) : isAuthenticated && userName ? (
              <div className="w-[26px] h-[26px] sm:w-7 sm:h-7 rounded-full bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 flex items-center justify-center text-white text-xs sm:text-sm font-bold ring-2 ring-stone-200 dark:ring-stone-700">
                {userName.charAt(0).toUpperCase()}
              </div>
            ) : (
              <User size={22} className="sm:w-6 sm:h-6 text-stone-400 dark:text-stone-500" />
            )}
            <span className="text-[10px] sm:text-xs font-medium text-stone-400 dark:text-stone-500">
              {isAuthenticated ? 'Menu' : 'Login'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(BottomNavBar);
