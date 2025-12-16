'use client';

import { Heart, X, Share2, Bookmark, Sparkles } from 'lucide-react';

interface ControlButtonsProps {
  onLike: () => void;
  onDislike: () => void;
  onSave: () => void;
  onShare: () => void;
  onUndo: () => void;
  canUndo: boolean;
  swipeDirection?: 'left' | 'right' | null;
  isAnimating?: boolean;
}

export default function ControlButtons({
  onLike,
  onDislike,
  onSave,
  onShare,
  swipeDirection,
  isAnimating = false,
}: ControlButtonsProps) {
  return (
    <div className="flex items-center justify-center gap-2.5 sm:gap-4 px-4">
      {/* Skip/Dislike Button */}
      <button
        onClick={onDislike}
        className={`group relative w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all duration-300 ${
          swipeDirection === 'left' && isAnimating
            ? 'bg-gradient-to-br from-red-500 to-orange-500 text-white scale-110 shadow-lg shadow-red-500/40 rotate-[-8deg]'
            : 'bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 hover:scale-105 active:scale-95 shadow-md sm:shadow-lg border border-gray-200/50 dark:border-gray-700/50'
        }`}
        aria-label="Skip"
      >
        <X 
          size={18} 
          className={`sm:w-6 sm:h-6 transition-transform duration-300 ${
            swipeDirection === 'left' && isAnimating ? '' : 'group-hover:rotate-12'
          }`} 
          strokeWidth={2.5}
        />
      </button>

      {/* Save Button */}
      <button
        onClick={onSave}
        className="group relative w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm text-amber-500 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50 hover:scale-105 active:scale-95 transition-all duration-300 shadow-md sm:shadow-lg border border-gray-200/50 dark:border-gray-700/50"
        aria-label="Save"
      >
        <Bookmark 
          size={16} 
          className="sm:w-5 sm:h-5 transition-transform duration-300 group-hover:scale-110" 
        />
      </button>

      {/* Like/Love Button - Primary Action */}
      <button
        onClick={onLike}
        className={`group relative w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all duration-300 ${
          swipeDirection === 'right' && isAnimating
            ? 'bg-gradient-to-br from-pink-500 via-rose-500 to-red-500 text-white scale-110 shadow-lg shadow-pink-500/40 rotate-[8deg]'
            : 'bg-gradient-to-br from-pink-500 via-rose-500 to-red-500 text-white hover:scale-105 active:scale-95 shadow-md sm:shadow-lg shadow-pink-500/25 hover:shadow-lg hover:shadow-pink-500/40'
        }`}
        aria-label="Love"
      >
        {/* Shine effect */}
        <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-br from-white/30 via-transparent to-transparent opacity-50" />
        
        {/* Sparkle decorations */}
        <Sparkles 
          size={8} 
          className={`absolute top-1.5 right-1.5 sm:top-2 sm:right-2 opacity-70 transition-all duration-300 ${
            swipeDirection === 'right' && isAnimating ? 'animate-ping' : 'group-hover:animate-pulse'
          }`} 
        />
        
        <Heart 
          size={20} 
          className={`sm:w-7 sm:h-7 relative z-10 transition-transform duration-300 ${
            swipeDirection === 'right' && isAnimating ? 'animate-bounce' : 'group-hover:scale-110'
          }`}
          fill={swipeDirection === 'right' && isAnimating ? 'currentColor' : 'none'}
          strokeWidth={2}
        />
      </button>

      {/* Share Button */}
      <button
        onClick={onShare}
        className="group relative w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:scale-105 active:scale-95 transition-all duration-300 shadow-md sm:shadow-lg border border-gray-200/50 dark:border-gray-700/50"
        aria-label="Share"
      >
        <Share2 
          size={16} 
          className="sm:w-5 sm:h-5 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-12" 
        />
      </button>
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
  return (
    <div className="flex items-center justify-center gap-2.5 sm:gap-4 mt-3 sm:mt-5 px-4">
      {/* Skip Button */}
      <button
        onClick={onDislike}
        className={`group relative flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl transition-all duration-300 min-w-[85px] sm:min-w-[110px] justify-center font-semibold overflow-hidden ${
          swipeDirection === 'left' && isAnimating
            ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white scale-105 shadow-lg'
            : 'bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm text-gray-600 dark:text-gray-300 shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] border border-gray-200/50 dark:border-gray-700/50'
        }`}
        aria-label="Skip"
      >
        <X 
          size={14} 
          className={`sm:w-[18px] sm:h-[18px] transition-all duration-300 ${
            swipeDirection === 'left' && isAnimating 
              ? 'text-white' 
              : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 group-hover:rotate-90'
          }`}
          strokeWidth={2.5}
        />
        <span className="text-xs sm:text-sm">Skip</span>
      </button>

      {/* Love Button */}
      <button
        onClick={onLike}
        className={`group relative flex items-center gap-1.5 sm:gap-2 px-5 sm:px-7 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl transition-all duration-300 min-w-[95px] sm:min-w-[120px] justify-center font-semibold overflow-hidden ${
          swipeDirection === 'right' && isAnimating
            ? 'bg-gradient-to-r from-pink-500 via-rose-500 to-red-500 text-white scale-105 shadow-lg shadow-pink-500/40'
            : 'bg-gradient-to-r from-pink-500 via-rose-500 to-red-500 text-white shadow-md shadow-pink-500/25 hover:shadow-lg hover:shadow-pink-500/40 hover:scale-[1.02] active:scale-[0.98]'
        }`}
        aria-label="Love"
      >
        {/* Shine overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
        
        <Heart 
          size={14} 
          className={`sm:w-[18px] sm:h-[18px] relative z-10 transition-all duration-300 ${
            swipeDirection === 'right' && isAnimating ? 'animate-pulse scale-110' : 'group-hover:scale-110'
          }`}
          fill={swipeDirection === 'right' && isAnimating ? 'currentColor' : 'none'}
          strokeWidth={2}
        />
        <span className="relative z-10 text-xs sm:text-sm">Love</span>
        
        {/* Sparkle */}
        <Sparkles 
          size={10} 
          className={`relative z-10 sm:w-3 sm:h-3 opacity-80 transition-all duration-300 ${
            swipeDirection === 'right' && isAnimating ? 'animate-spin' : 'group-hover:animate-pulse'
          }`} 
        />
      </button>
    </div>
  );
}
