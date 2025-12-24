'use client';

import { User, Heart, ThumbsDown, Palette, FolderOpen, X, LogOut, Shield, LogIn } from 'lucide-react';
import { memo } from 'react';

interface OptionsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  userName?: string;
  likedCount: number;
  skippedCount: number;
  isAdmin?: boolean;
  onProfileClick: () => void;
  onLikedClick: () => void;
  onSkippedClick: () => void;
  onCustomizeClick: () => void;
  onCategoriesClick: () => void;
  onLoginClick: () => void;
  onLogoutClick: () => void;
}

function OptionsMenu({
  isOpen,
  onClose,
  isAuthenticated,
  userName,
  likedCount,
  skippedCount,
  isAdmin,
  onProfileClick,
  onLikedClick,
  onSkippedClick,
  onCustomizeClick,
  onCategoriesClick,
  onLoginClick,
  onLogoutClick,
}: OptionsMenuProps) {
  if (!isOpen) return null;

  const handleOptionClick = (callback: () => void) => {
    callback();
    onClose();
  };

  // Menu item component for consistency
  const MenuItem = ({ 
    onClick, 
    icon: Icon, 
    iconFill = false,
    gradient, 
    title, 
    subtitle, 
    badge,
    danger = false,
    isLink = false,
    href = ''
  }: {
    onClick?: () => void;
    icon: React.ElementType;
    iconFill?: boolean;
    gradient: string;
    title: string;
    subtitle: string;
    badge?: number;
    danger?: boolean;
    isLink?: boolean;
    href?: string;
  }) => {
    const content = (
      <>
        <div className={`w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-lg sm:rounded-xl ${gradient} flex items-center justify-center shadow-md sm:shadow-lg shrink-0`}>
          <Icon size={18} className="sm:w-5 sm:h-5 md:w-[22px] md:h-[22px] text-white" fill={iconFill ? 'white' : 'none'} />
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className={`font-semibold text-sm sm:text-base truncate ${danger ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
            {title}
          </p>
          <p className="text-[10px] sm:text-xs text-gray-500 truncate">{subtitle}</p>
        </div>
        {badge !== undefined && badge > 0 && (
          <span className={`px-2 py-0.5 sm:px-2.5 sm:py-1 ${danger ? 'bg-red-500' : gradient.includes('pink') ? 'bg-pink-500' : 'bg-gray-500'} text-white text-[10px] sm:text-xs font-bold rounded-full shrink-0`}>
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </>
    );

    const className = `w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-3.5 md:p-4 rounded-xl sm:rounded-2xl ${
      danger 
        ? 'hover:bg-red-50 dark:hover:bg-red-900/20' 
        : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
    } transition-colors active:scale-[0.98]`;

    if (isLink) {
      return (
        <a href={href} className={className}>
          {content}
        </a>
      );
    }

    return (
      <button onClick={onClick} className={className}>
        {content}
      </button>
    );
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 sm:bg-black/50 z-[200] backdrop-blur-[2px] sm:backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Menu Panel */}
      {/* Mobile: Bottom Sheet | Desktop: Centered Modal */}
      <div className="fixed inset-0 z-[201] flex items-end sm:items-center justify-center pointer-events-none">
        <div className="w-full sm:w-auto sm:min-w-[360px] sm:max-w-md pointer-events-auto animate-slide-up sm:animate-fade-scale">
          <div className="bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl mx-0 sm:mx-4">
            {/* Handle Bar - Mobile Only */}
            <div className="flex sm:hidden justify-center pt-2.5 pb-1">
              <div className="w-9 h-1 bg-gray-300 dark:bg-gray-700 rounded-full" />
            </div>
            
            {/* Header - Desktop */}
            <div className="hidden sm:flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Menu</h3>
              <button 
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>
            
            {/* Close Button - Mobile */}
            <button 
              onClick={onClose}
              className="sm:hidden absolute top-3 right-3 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X size={18} className="text-gray-500" />
            </button>

            {/* Menu Items */}
            <div className="px-3 sm:px-4 md:px-5 pb-4 sm:pb-5 pt-1 sm:pt-3 space-y-0.5 sm:space-y-1 max-h-[70vh] sm:max-h-[60vh] overflow-y-auto">
              {isAuthenticated ? (
                <>
                  {/* Profile */}
                  <MenuItem
                    onClick={() => handleOptionClick(onProfileClick)}
                    icon={User}
                    gradient="bg-gradient-to-br from-blue-500 to-purple-500"
                    title={userName || 'Profile'}
                    subtitle="View your profile"
                  />

                  {/* Liked */}
                  <MenuItem
                    onClick={() => handleOptionClick(onLikedClick)}
                    icon={Heart}
                    iconFill
                    gradient="bg-gradient-to-br from-pink-500 to-red-500"
                    title="Liked"
                    subtitle={`${likedCount} quotes`}
                    badge={likedCount}
                  />

                  {/* Skipped */}
                  <MenuItem
                    onClick={() => handleOptionClick(onSkippedClick)}
                    icon={ThumbsDown}
                    gradient="bg-gradient-to-br from-gray-500 to-slate-600"
                    title="Skipped"
                    subtitle={`${skippedCount} quotes`}
                    badge={skippedCount}
                  />

                  {/* Divider */}
                  <div className="border-t border-gray-100 dark:border-gray-800 my-1.5 sm:my-2" />

                  {/* Customize */}
                  <MenuItem
                    onClick={() => handleOptionClick(onCustomizeClick)}
                    icon={Palette}
                    gradient="bg-gradient-to-br from-emerald-500 to-teal-500"
                    title="Customize"
                    subtitle="Themes, fonts, backgrounds"
                  />

                  {/* Categories */}
                  <MenuItem
                    onClick={() => handleOptionClick(onCategoriesClick)}
                    icon={FolderOpen}
                    gradient="bg-gradient-to-br from-amber-500 to-orange-500"
                    title="Categories"
                    subtitle="Browse quote categories"
                  />

                  {/* Admin Panel - Only for admins */}
                  {isAdmin && (
                    <MenuItem
                      isLink
                      href="/admin"
                      icon={Shield}
                      gradient="bg-gradient-to-br from-purple-500 to-indigo-600"
                      title="Admin Panel"
                      subtitle="Manage quotes & users"
                    />
                  )}

                  {/* Divider */}
                  <div className="border-t border-gray-100 dark:border-gray-800 my-1.5 sm:my-2" />

                  {/* Logout */}
                  <MenuItem
                    onClick={() => handleOptionClick(onLogoutClick)}
                    icon={LogOut}
                    gradient="bg-gradient-to-br from-red-400 to-red-500"
                    title="Logout"
                    subtitle="Sign out of your account"
                    danger
                  />
                </>
              ) : (
                <>
                  {/* Guest - Login Prompt */}
                  <div className="text-center py-4 sm:py-6">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg">
                      <User size={24} className="sm:w-7 sm:h-7 text-white" />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-1">Welcome!</h3>
                    <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">Sign in to access all features</p>
                    <button
                      onClick={() => handleOptionClick(onLoginClick)}
                      className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 text-sm sm:text-base active:scale-[0.98]"
                    >
                      <LogIn size={16} className="sm:w-[18px] sm:h-[18px]" />
                      Sign In
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-gray-100 dark:border-gray-800 my-1.5 sm:my-2" />

                  {/* Categories - Available for guests too */}
                  <MenuItem
                    onClick={() => handleOptionClick(onCategoriesClick)}
                    icon={FolderOpen}
                    gradient="bg-gradient-to-br from-amber-500 to-orange-500"
                    title="Categories"
                    subtitle="Browse quote categories"
                  />
                </>
              )}
            </div>
            
            {/* Safe area padding for bottom - Mobile */}
            <div className="sm:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom, 12px)' }} />
          </div>
        </div>
      </div>

      {/* Animation styles */}
      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0.5;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes fade-scale {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.25s ease-out;
        }
        .animate-fade-scale {
          animation: fade-scale 0.2s ease-out;
        }
      `}</style>
    </>
  );
}

export default memo(OptionsMenu);
