'use client';

import { Home, Bookmark, PlusCircle, Sparkles, Menu } from 'lucide-react';
import { memo } from 'react';

export type NavTab = 'feed' | 'saved' | 'create' | 'profile';

interface BottomNavBarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  savedCount?: number;
  myQuotesCount?: number;
  isAuthenticated: boolean;
  onLoginRequired: () => void;
  onMenuClick?: () => void;
  hidden?: boolean;
}

function BottomNavBar({
  activeTab,
  onTabChange,
  savedCount = 0,
  myQuotesCount = 0,
  isAuthenticated,
  onLoginRequired,
  onMenuClick,
  hidden = false,
}: BottomNavBarProps) {
  
  const handleTabClick = (tab: NavTab) => {
    if (!isAuthenticated && (tab === 'saved' || tab === 'create' || tab === 'profile')) {
      onLoginRequired();
      return;
    }
    onTabChange(tab);
  };

  if (hidden) return null;

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-[100] sm:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {/* Solid background */}
      <div className="bg-white dark:bg-gray-900 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] dark:shadow-[0_-2px_10px_rgba(0,0,0,0.3)]">
        {/* Navigation Items */}
        <div className="flex items-center justify-around h-14 px-1">
          {/* Feed Tab */}
          <button
            onClick={() => handleTabClick('feed')}
            className="flex flex-col items-center justify-center flex-1 h-full gap-0.5"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <Home 
              size={22} 
              className={activeTab === 'feed' 
                ? 'text-blue-500' 
                : 'text-gray-400 dark:text-gray-500'
              } 
              fill={activeTab === 'feed' ? 'currentColor' : 'none'}
            />
            <span className={`text-[10px] font-medium ${
              activeTab === 'feed' 
                ? 'text-blue-500' 
                : 'text-gray-400 dark:text-gray-500'
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
                className={activeTab === 'saved' 
                  ? 'text-yellow-500' 
                  : 'text-gray-400 dark:text-gray-500'
                } 
                fill={activeTab === 'saved' ? 'currentColor' : 'none'}
              />
              {savedCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 flex items-center justify-center bg-yellow-500 text-white text-[9px] font-bold rounded-full">
                  {savedCount > 99 ? '99+' : savedCount}
                </span>
              )}
            </div>
            <span className={`text-[10px] font-medium ${
              activeTab === 'saved' 
                ? 'text-yellow-500' 
                : 'text-gray-400 dark:text-gray-500'
            }`}>Saved</span>
          </button>

          {/* Create Tab - Center Button */}
          <button
            onClick={() => handleTabClick('create')}
            className="flex flex-col items-center justify-center flex-1 h-full"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <div className="w-10 h-10 -mt-3 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform bg-gradient-to-br from-blue-500 to-purple-600">
              <PlusCircle size={20} className="text-white" strokeWidth={2} />
            </div>
            <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 mt-0.5">Create</span>
          </button>

          {/* My Quotes Tab */}
          <button
            onClick={() => handleTabClick('profile')}
            className="flex flex-col items-center justify-center flex-1 h-full gap-0.5"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <div className="relative">
              <Sparkles 
                size={22} 
                className={activeTab === 'profile' 
                  ? 'text-purple-500' 
                  : 'text-gray-400 dark:text-gray-500'
                } 
                fill={activeTab === 'profile' ? 'currentColor' : 'none'}
              />
              {myQuotesCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 flex items-center justify-center bg-purple-500 text-white text-[9px] font-bold rounded-full">
                  {myQuotesCount > 99 ? '99+' : myQuotesCount}
                </span>
              )}
            </div>
            <span className={`text-[10px] font-medium ${
              activeTab === 'profile' 
                ? 'text-purple-500' 
                : 'text-gray-400 dark:text-gray-500'
            }`}>My Quotes</span>
          </button>

          {/* More Tab */}
          <button
            onClick={onMenuClick}
            className="flex flex-col items-center justify-center flex-1 h-full gap-0.5"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <Menu size={22} className="text-gray-400 dark:text-gray-500" />
            <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">More</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(BottomNavBar);
