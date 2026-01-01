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
        <div className={`w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-xl ${gradient} flex items-center justify-center shadow-lg shrink-0`}>
          <Icon size={18} className="sm:w-5 sm:h-5 md:w-[22px] md:h-[22px] text-white" fill={iconFill ? 'white' : 'none'} />
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className={`font-semibold text-sm sm:text-base truncate ${danger ? 'text-red-600 dark:text-red-400' : 'text-stone-900 dark:text-white'}`}>
            {title}
          </p>
          <p className="text-[10px] sm:text-xs text-stone-500 truncate">{subtitle}</p>
        </div>
        {badge !== undefined && badge > 0 && (
          <span className={`px-2 py-0.5 sm:px-2.5 sm:py-1 ${danger ? 'bg-red-500' : gradient.includes('rose') ? 'bg-rose-500' : 'bg-stone-500'} text-white text-[10px] sm:text-xs font-bold rounded-full shrink-0`}>
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </>
    );

    const className = `w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-3.5 md:p-4 rounded-xl sm:rounded-2xl ${
      danger 
        ? 'hover:bg-red-50 dark:hover:bg-red-900/20' 
        : 'hover:bg-stone-50 dark:hover:bg-stone-800/50'
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
      {/* Backdrop with warm gradient */}
      <div 
        className="fixed inset-0 bg-black/50 z-[200] backdrop-blur-md"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-rose-500/10" />
      </div>
      
      {/* Menu Panel */}
      {/* Mobile: Bottom Sheet | Desktop: Centered Modal */}
      <div className="fixed inset-0 z-[201] flex items-end sm:items-center justify-center pointer-events-none">
        <div className="w-full sm:w-auto sm:min-w-[360px] sm:max-w-md pointer-events-auto animate-slide-up sm:animate-fade-scale">
          <div className="bg-white dark:bg-stone-900 rounded-t-3xl sm:rounded-3xl shadow-2xl mx-0 sm:mx-4 border border-stone-200/50 dark:border-stone-700/50 relative overflow-hidden">
            {/* Decorative gradient orbs */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-amber-400/20 to-orange-400/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-gradient-to-br from-rose-400/20 to-pink-400/20 rounded-full blur-3xl pointer-events-none" />
            
            {/* Handle Bar - Mobile Only */}
            <div className="flex sm:hidden justify-center pt-2.5 pb-1">
              <div className="w-9 h-1 bg-stone-300 dark:bg-stone-700 rounded-full" />
            </div>
            
            {/* Header - Desktop */}
            <div className="hidden sm:flex items-center justify-between px-5 py-4 border-b border-stone-100 dark:border-stone-800 relative">
              <h3 className="text-lg font-bold text-stone-900 dark:text-white">Menu</h3>
              <button 
                onClick={onClose}
                className="p-2 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
              >
                <X size={18} className="text-stone-500" />
              </button>
            </div>
            
            {/* Close Button - Mobile */}
            <button 
              onClick={onClose}
              className="sm:hidden absolute top-3 right-3 p-2 rounded-xl bg-stone-100/80 dark:bg-stone-800/80 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors z-10"
            >
              <X size={18} className="text-stone-500" />
            </button>

            {/* Menu Items */}
            <div className="px-3 sm:px-4 md:px-5 pb-4 sm:pb-5 pt-1 sm:pt-3 space-y-0.5 sm:space-y-1 max-h-[70vh] sm:max-h-[60vh] overflow-y-auto custom-scrollbar relative">
              {isAuthenticated ? (
                <>
                  {/* Profile */}
                  <MenuItem
                    onClick={() => handleOptionClick(onProfileClick)}
                    icon={User}
                    gradient="bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500"
                    title={userName || 'Profile'}
                    subtitle="View your profile"
                  />

                  {/* Liked */}
                  <MenuItem
                    onClick={() => handleOptionClick(onLikedClick)}
                    icon={Heart}
                    iconFill
                    gradient="bg-gradient-to-br from-rose-500 to-pink-500"
                    title="Liked"
                    subtitle={`${likedCount} quotes`}
                    badge={likedCount}
                  />

                  {/* Skipped */}
                  <MenuItem
                    onClick={() => handleOptionClick(onSkippedClick)}
                    icon={ThumbsDown}
                    gradient="bg-gradient-to-br from-stone-500 to-stone-600"
                    title="Skipped"
                    subtitle={`${skippedCount} quotes`}
                    badge={skippedCount}
                  />

                  {/* Divider */}
                  <div className="border-t border-stone-100 dark:border-stone-800 my-1.5 sm:my-2" />

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
                      gradient="bg-gradient-to-br from-rose-500 to-rose-600"
                      title="Admin Panel"
                      subtitle="Manage quotes & users"
                    />
                  )}

                  {/* Divider */}
                  <div className="border-t border-stone-100 dark:border-stone-800 my-1.5 sm:my-2" />

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
                    <div className="relative inline-block">
                      <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-rose-500 rounded-2xl blur-xl opacity-30 scale-110" />
                      <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
                        <User size={24} className="sm:w-7 sm:h-7 text-white" />
                      </div>
                    </div>
                    <h3 className="mt-4 text-base sm:text-lg font-bold text-stone-900 dark:text-white">Welcome!</h3>
                    <p className="text-xs sm:text-sm text-stone-500 mb-4">Sign in to access all features</p>
                    <button
                      onClick={() => handleOptionClick(onLoginClick)}
                      className="w-full py-3 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white font-semibold rounded-xl shadow-lg shadow-orange-500/30 hover:shadow-xl transition-all flex items-center justify-center gap-2 text-sm sm:text-base active:scale-[0.98]"
                    >
                      <LogIn size={16} className="sm:w-[18px] sm:h-[18px]" />
                      Sign In
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-stone-100 dark:border-stone-800 my-1.5 sm:my-2" />

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
