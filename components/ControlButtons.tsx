'use client';

import { useState, useRef, useEffect } from 'react';
import { Heart, X, Bookmark, Sparkles, RotateCcw, Send, Palette, MoreVertical, Film } from 'lucide-react';

interface ControlButtonsProps {
  onLike: () => void;
  onDislike: () => void;
  onSave: () => void;
  onShare: () => void;
  onUndo: () => void;
  onEdit?: () => void;
  onCreateReel?: () => void;
  canUndo: boolean;
  swipeDirection?: 'left' | 'right' | null;
  isAnimating?: boolean;
  isUndoing?: boolean;
}

export default function ControlButtons({
  onLike,
  onDislike,
  onSave,
  onShare,
  onUndo,
  onEdit,
  onCreateReel,
  canUndo,
  swipeDirection,
  isAnimating = false,
  isUndoing = false,
}: ControlButtonsProps) {
  const isSwipingLeft = swipeDirection === 'left' && isAnimating;
  const isSwipingRight = swipeDirection === 'right' && isAnimating;
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    if (showMoreMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMoreMenu]);

  return (
    <div className="flex items-center justify-center gap-3 sm:gap-4 px-4">
      {/* Undo Button - Warm amber */}
      <button
        onClick={onUndo}
        disabled={!canUndo || isUndoing}
        className={`group relative w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-300 ease-out ${
          !canUndo
            ? 'bg-orange-50/60 dark:bg-orange-950/20 text-orange-200 dark:text-orange-800 cursor-not-allowed'
            : isUndoing
            ? 'bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 text-white scale-110 shadow-xl shadow-orange-500/30'
            : 'bg-white/80 dark:bg-stone-900/80 backdrop-blur-xl text-amber-600 dark:text-amber-400 border-2 border-amber-300/60 dark:border-amber-700/40 hover:border-amber-500 dark:hover:border-amber-500 hover:scale-110 hover:shadow-lg hover:shadow-amber-500/25 active:scale-95'
        }`}
        aria-label="Undo last swipe"
        title={canUndo ? 'Undo' : 'Nothing to undo'}
      >
        {/* Glow effect on hover */}
        {canUndo && !isUndoing && (
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-400/0 to-orange-500/0 group-hover:from-amber-400/20 group-hover:to-orange-500/20 transition-all duration-300" />
        )}
        <RotateCcw 
          size={18} 
          className={`sm:w-5 sm:h-5 transition-all duration-500 ${
            isUndoing 
              ? 'animate-[spin_0.5s_ease-in-out_reverse]' 
              : canUndo 
              ? 'group-hover:-rotate-180' 
              : ''
          }`} 
          strokeWidth={2.5}
        />
      </button>

      {/* Skip/Dislike Button - Warm coral/terracotta */}
      <button
        onClick={onDislike}
        className={`group relative w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all duration-300 ease-out overflow-hidden ${
          isSwipingLeft
            ? 'bg-gradient-to-br from-orange-500 via-rose-500 to-red-600 text-white scale-110 shadow-2xl shadow-orange-500/40 -rotate-12'
            : 'bg-white/80 dark:bg-stone-900/80 backdrop-blur-xl border-2 border-orange-300/60 dark:border-orange-800/40 text-orange-500 dark:text-orange-400 hover:text-orange-600 hover:border-orange-500 dark:hover:border-orange-500 hover:scale-110 hover:shadow-xl hover:shadow-orange-500/25 active:scale-95'
        }`}
        aria-label="Skip"
      >
        {/* Animated ring on hover */}
        {!isSwipingLeft && (
          <div className="absolute inset-0 rounded-full border-2 border-transparent group-hover:border-orange-400/50 dark:group-hover:border-orange-500/50 scale-100 group-hover:scale-110 opacity-0 group-hover:opacity-100 transition-all duration-300" />
        )}
        {/* Inner glow */}
        <div className={`absolute inset-1 rounded-full transition-all duration-300 ${
          isSwipingLeft 
            ? 'bg-gradient-to-t from-black/20 to-transparent' 
            : 'bg-gradient-to-br from-orange-50/0 to-amber-100/0 dark:from-orange-950/0 dark:to-amber-900/0 group-hover:from-orange-50 group-hover:to-amber-100/50 dark:group-hover:from-orange-950/50 dark:group-hover:to-amber-900/30'
        }`} />
        <X 
          size={24} 
          className={`sm:w-7 sm:h-7 relative z-10 transition-all duration-300 ${
            isSwipingLeft ? 'rotate-90 scale-110' : 'group-hover:rotate-90 group-hover:scale-110'
          }`} 
          strokeWidth={3}
        />
      </button>

      {/* Save Button - Warm golden */}
      <button
        onClick={onSave}
        className="group relative w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-white/80 dark:bg-stone-900/80 backdrop-blur-xl border-2 border-yellow-400/60 dark:border-yellow-700/40 text-yellow-600 dark:text-yellow-500 hover:text-yellow-700 hover:border-yellow-500 dark:hover:border-yellow-500 hover:scale-110 hover:shadow-xl hover:shadow-yellow-500/25 active:scale-95 transition-all duration-300 ease-out overflow-hidden"
        aria-label="Save"
        title="Save quote"
      >
        {/* Shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-200/40 to-transparent dark:via-yellow-500/15 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
        {/* Inner glow */}
        <div className="absolute inset-1 rounded-full bg-gradient-to-br from-yellow-50/0 to-amber-100/0 dark:from-yellow-950/0 dark:to-amber-900/0 group-hover:from-yellow-50 group-hover:to-amber-100/50 dark:group-hover:from-yellow-950/50 dark:group-hover:to-amber-900/30 transition-all duration-300" />
        <Bookmark 
          size={18} 
          className="sm:w-5 sm:h-5 relative z-10 transition-all duration-300 group-hover:scale-110 group-hover:fill-current" 
          strokeWidth={2}
        />
      </button>

      {/* Like/Love Button - Warm rose/coral gradient */}
      <button
        onClick={onLike}
        className={`group relative w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-full flex items-center justify-center transition-all duration-300 ease-out overflow-hidden ${
          isSwipingRight
            ? 'bg-gradient-to-br from-rose-400 via-red-500 to-orange-600 scale-115 shadow-2xl shadow-rose-500/50 rotate-12'
            : 'bg-gradient-to-br from-rose-400 via-red-500 to-orange-500 hover:from-rose-300 hover:via-red-400 hover:to-orange-400 shadow-lg shadow-rose-500/30 hover:shadow-xl hover:shadow-rose-500/40 hover:scale-110 active:scale-95'
        }`}
        aria-label="Love"
      >
        {/* Outer glow ring */}
        <div className={`absolute -inset-1 rounded-full bg-gradient-to-br from-rose-400 to-orange-500 opacity-0 blur-md transition-all duration-300 ${
          isSwipingRight ? 'opacity-60' : 'group-hover:opacity-40'
        }`} />
        
        {/* Shine effect */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/40 via-white/10 to-transparent" />
        
        {/* Sparkles */}
        <Sparkles 
          size={10} 
          className={`absolute top-2 right-2 sm:top-2.5 sm:right-2.5 text-white/80 transition-all duration-300 ${
            isSwipingRight ? 'animate-ping scale-125' : 'opacity-60 group-hover:opacity-100 group-hover:animate-pulse'
          }`} 
        />
        <Sparkles 
          size={8} 
          className={`absolute bottom-3 left-2.5 text-white/60 transition-all duration-500 ${
            isSwipingRight ? 'animate-ping delay-100' : 'opacity-40 group-hover:opacity-80'
          }`} 
        />
        
        {/* Heart icon */}
        <Heart 
          size={28} 
          className={`sm:w-8 sm:h-8 relative z-10 text-white transition-all duration-300 ${
            isSwipingRight 
              ? 'scale-125 animate-pulse fill-current' 
              : 'group-hover:scale-110'
          }`}
          fill={isSwipingRight ? 'currentColor' : 'none'}
          strokeWidth={2.5}
        />
      </button>

      {/* More Options Button - Warm terracotta */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setShowMoreMenu(!showMoreMenu)}
          className={`group relative w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-white/80 dark:bg-stone-900/80 backdrop-blur-xl border-2 transition-all duration-300 ease-out ${
            showMoreMenu
              ? 'border-orange-400 dark:border-orange-500 text-orange-600 dark:text-orange-400 scale-105'
              : 'border-amber-300/60 dark:border-amber-700/40 text-amber-500 dark:text-amber-500 hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-500 dark:hover:border-amber-500 hover:scale-110 active:scale-95'
          }`}
          aria-label="More options"
          title="More options"
        >
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-100/0 to-orange-100/0 dark:from-amber-900/0 dark:to-orange-900/0 group-hover:from-amber-100/50 group-hover:to-orange-100/30 dark:group-hover:from-amber-900/30 dark:group-hover:to-orange-900/20 transition-all duration-300" />
          <MoreVertical 
            size={18} 
            className="sm:w-5 sm:h-5 transition-all duration-300" 
            strokeWidth={2.5}
          />
        </button>

        {/* Dropdown Menu - Compact circular icons */}
        {showMoreMenu && (
          <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-white/95 dark:bg-stone-900/95 backdrop-blur-xl rounded-full shadow-2xl border border-amber-200/50 dark:border-amber-800/30 p-1.5 flex items-center gap-1.5 animate-in slide-in-from-bottom-2 fade-in duration-200 z-50">
            {/* Share Option */}
            <button
              onClick={() => {
                onShare();
                setShowMoreMenu(false);
              }}
              className="group relative w-10 h-10 rounded-full flex items-center justify-center text-amber-500 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 hover:text-amber-600 dark:hover:text-amber-300 hover:scale-110 active:scale-95 transition-all duration-200"
              title="Share Quote"
            >
              <Send size={18} strokeWidth={2.5} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>

            {/* Edit Background Option */}
            {onEdit && (
              <button
                onClick={() => {
                  onEdit();
                  setShowMoreMenu(false);
                }}
                className="group relative w-10 h-10 rounded-full flex items-center justify-center text-orange-500 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/40 hover:text-orange-600 dark:hover:text-orange-300 hover:scale-110 active:scale-95 transition-all duration-200"
                title="Edit Background"
              >
                <Palette size={18} strokeWidth={2.5} className="transition-transform group-hover:rotate-12" />
              </button>
            )}

            {/* Create Reel Option */}
            {onCreateReel && (
              <button
                onClick={() => {
                  onCreateReel();
                  setShowMoreMenu(false);
                }}
                className="group relative w-10 h-10 rounded-full flex items-center justify-center text-purple-500 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/40 hover:text-purple-600 dark:hover:text-purple-300 hover:scale-110 active:scale-95 transition-all duration-200"
                title="Create Reel"
              >
                <Film size={18} strokeWidth={2.5} className="transition-transform group-hover:scale-110" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface ActionButtonsProps {
  onLike: () => void;
  onDislike: () => void;
  swipeDirection?: 'left' | 'right' | null;
  isAnimating?: boolean;
}

export function ActionButtons({
  onLike,
  onDislike,
  swipeDirection,
  isAnimating = false,
}: ActionButtonsProps) {
  const isSwipingLeft = swipeDirection === 'left' && isAnimating;
  const isSwipingRight = swipeDirection === 'right' && isAnimating;

  return (
    <div className="flex items-center justify-center gap-4 sm:gap-5 mt-4 sm:mt-6 px-4">
      {/* Skip Button - Warm pill style */}
      <button
        onClick={onDislike}
        className={`group relative flex items-center gap-2 sm:gap-2.5 px-5 sm:px-7 py-2.5 sm:py-3 rounded-full transition-all duration-300 ease-out overflow-hidden font-semibold ${
          isSwipingLeft
            ? 'bg-gradient-to-r from-orange-600 to-amber-700 text-white scale-105 shadow-xl -rotate-2'
            : 'bg-white/90 dark:bg-stone-900/90 backdrop-blur-xl text-orange-600 dark:text-orange-400 border-2 border-orange-200/60 dark:border-orange-800/40 hover:border-orange-400 dark:hover:border-orange-500 shadow-md hover:shadow-lg hover:scale-105 active:scale-95'
        }`}
        aria-label="Skip"
      >
        {/* Hover background */}
        {!isSwipingLeft && (
          <div className="absolute inset-0 bg-gradient-to-r from-orange-50/0 to-amber-50/0 dark:from-orange-950/0 dark:to-amber-950/0 group-hover:from-orange-50 group-hover:to-amber-50 dark:group-hover:from-orange-950/50 dark:group-hover:to-amber-950/30 transition-all duration-300" />
        )}
        <X 
          size={16} 
          className={`sm:w-[18px] sm:h-[18px] relative z-10 transition-all duration-300 ${
            isSwipingLeft 
              ? 'text-white rotate-90' 
              : 'text-orange-400 dark:text-orange-500 group-hover:text-orange-600 dark:group-hover:text-orange-400 group-hover:rotate-90'
          }`}
          strokeWidth={2.5}
        />
        <span className="relative z-10 text-sm sm:text-base tracking-wide">Skip</span>
      </button>

      {/* Love Button - Warm premium pill */}
      <button
        onClick={onLike}
        className={`group relative flex items-center gap-2 sm:gap-2.5 px-6 sm:px-8 py-2.5 sm:py-3 rounded-full transition-all duration-300 ease-out overflow-hidden font-semibold ${
          isSwipingRight
            ? 'bg-gradient-to-r from-rose-400 via-red-500 to-orange-500 text-white scale-105 shadow-xl shadow-rose-500/40 rotate-2'
            : 'bg-gradient-to-r from-rose-400 via-red-500 to-orange-500 text-white shadow-lg shadow-rose-500/25 hover:shadow-xl hover:shadow-rose-500/40 hover:scale-105 active:scale-95'
        }`}
        aria-label="Love"
      >
        {/* Shine sweep */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" />
        
        {/* Top shine */}
        <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent rounded-t-full" />
        
        <Heart 
          size={16} 
          className={`sm:w-[18px] sm:h-[18px] relative z-10 transition-all duration-300 ${
            isSwipingRight ? 'scale-110 fill-current' : 'group-hover:scale-110'
          }`}
          fill={isSwipingRight ? 'currentColor' : 'none'}
          strokeWidth={2.5}
        />
        <span className="relative z-10 text-sm sm:text-base tracking-wide">Love</span>
        
        {/* Sparkle accent */}
        <Sparkles 
          size={12} 
          className={`sm:w-3.5 sm:h-3.5 relative z-10 transition-all duration-300 ${
            isSwipingRight ? 'animate-spin text-white' : 'text-white/80 group-hover:text-white group-hover:animate-pulse'
          }`} 
        />
      </button>
    </div>
  );
}
