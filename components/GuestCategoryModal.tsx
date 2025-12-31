'use client';

import React, { useState, useEffect } from 'react';
import { X, Sparkles, ChevronRight, Check, Zap } from 'lucide-react';

interface Category {
  id: string | number;
  name: string;
  icon: string;
  count?: number;
}

interface GuestCategoryModalProps {
  categories: Category[];
  onComplete: (selectedCategories: string[]) => void;
  onSkip: () => void;
  isLoading?: boolean;
}

const MIN_CATEGORIES = 2;

export default function GuestCategoryModal({ 
  categories, 
  onComplete, 
  onSkip,
  isLoading = false,
}: GuestCategoryModalProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showContent, setShowContent] = useState(false);

  // Prevent body scroll when modal is open
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const toggleCategory = (categoryName: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryName)) {
        return prev.filter(c => c !== categoryName);
      }
      return [...prev, categoryName];
    });
  };

  const handleComplete = () => {
    if (selectedCategories.length < MIN_CATEGORIES) return;
    
    setIsAnimating(true);
    setTimeout(() => {
      onComplete(selectedCategories);
    }, 300);
  };

  const handleSkip = () => {
    setIsAnimating(true);
    setTimeout(() => {
      onSkip();
    }, 300);
  };

  const canContinue = selectedCategories.length >= MIN_CATEGORIES;

  // Group categories by type
  const popularCategories = categories.filter(c => 
    ['Love', 'Motivation', 'Wisdom', 'Humor', 'Life', 'Success', 'Happiness', 'Friendship'].includes(c.name)
  );
  const trendingCategories = categories.filter(c => 
    ['2am Quotes', 'Savage Comebacks', 'Shower Thoughts', 'Toxic Truths', 'Villain Era', 'Main Character Energy', 'Rizz & Flirting', 'Overthinking'].includes(c.name)
  );
  const otherCategories = categories.filter(c => 
    !popularCategories.includes(c) && !trendingCategories.includes(c)
  );

  const CategoryButton = ({ category, gradient }: { category: Category; gradient: string }) => {
    const isSelected = selectedCategories.includes(category.name);
    return (
      <button
        onClick={() => toggleCategory(category.name)}
        className={`relative flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg sm:rounded-xl transition-all duration-200 min-w-0 ${
          isSelected
            ? `${gradient} text-white shadow-lg scale-[1.02]`
            : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 active:scale-95'
        }`}
      >
        <span className="text-base sm:text-lg flex-shrink-0">{category.icon}</span>
        <span className="text-[11px] sm:text-sm font-medium truncate flex-1 text-left">{category.name}</span>
        {isSelected && (
          <Check size={14} className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 flex-shrink-0" />
        )}
      </button>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-purple-500/30 border-t-purple-500 animate-spin" />
            <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-purple-400" />
          </div>
          <p className="text-white/80 text-sm">Loading categories...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`fixed inset-0 z-[100] flex items-end sm:items-center justify-center transition-all duration-300 ${
        isAnimating ? 'opacity-0 scale-95' : showContent ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
      }`}
      style={{ touchAction: 'none' }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      
      {/* Modal - Full screen on mobile, centered on desktop */}
      <div 
        className="relative w-full sm:max-w-lg bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col"
        style={{ 
          maxHeight: 'calc(100dvh - env(safe-area-inset-top, 0px) - 70px)', // Account for bottom nav
          height: 'auto',
          marginBottom: '70px', // Space for bottom navigation
        }}
      >
        {/* Drag handle for mobile */}
        <div className="sm:hidden flex justify-center pt-2 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>
        
        {/* Header */}
        <div className="relative bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 px-4 py-3 sm:p-6 text-white flex-shrink-0 sm:rounded-t-2xl">
          <div className="absolute inset-0 bg-black/10" />
          <div className="relative pr-8">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-2">
              <Zap className="w-4 h-4 sm:w-6 sm:h-6" />
              <span className="text-[10px] sm:text-sm font-medium uppercase tracking-wider opacity-90">
                Get Started
              </span>
            </div>
            <h2 className="text-lg sm:text-2xl md:text-3xl font-bold mb-0.5 sm:mb-2">
              What interests you?
            </h2>
            <p className="text-white/90 text-[11px] sm:text-sm md:text-base leading-tight">
              Pick at least {MIN_CATEGORIES} topics to see personalized quotes ✨
            </p>
          </div>
          
          {/* Skip button */}
          <button
            onClick={handleSkip}
            className="absolute top-2.5 right-2.5 sm:top-4 sm:right-4 p-1.5 sm:p-2 hover:bg-white/20 rounded-full transition-colors"
            title="Skip and see all"
          >
            <X size={18} className="sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Categories - Scrollable area with hidden scrollbar on mobile */}
        <div 
          className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:p-6 space-y-4 sm:space-y-6 min-h-0 scrollbar-hide sm:scrollbar-default"
          style={{ 
            WebkitOverflowScrolling: 'touch',
            maxHeight: 'calc(100dvh - 350px)', // Account for header, footer, and bottom nav
          }}
        >
          {/* Hide scrollbar on mobile */}
          <style jsx>{`
            .scrollbar-hide::-webkit-scrollbar {
              display: none;
            }
            .scrollbar-hide {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
            @media (min-width: 640px) {
              .scrollbar-hide::-webkit-scrollbar {
                display: block;
                width: 6px;
              }
              .scrollbar-hide::-webkit-scrollbar-thumb {
                background: rgba(156, 163, 175, 0.5);
                border-radius: 3px;
              }
              .scrollbar-hide {
                scrollbar-width: thin;
              }
            }
          `}</style>
          {/* Popular */}
          {popularCategories.length > 0 && (
            <div>
              <h3 className="text-[10px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-amber-500 rounded-full"></span>
                Most Popular
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
                {popularCategories.map((category) => (
                  <CategoryButton 
                    key={category.id} 
                    category={category} 
                    gradient="bg-gradient-to-r from-amber-500 to-orange-500" 
                  />
                ))}
              </div>
            </div>
          )}

          {/* Trending */}
          {trendingCategories.length > 0 && (
            <div>
              <h3 className="text-[10px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-rose-500 rounded-full animate-pulse"></span>
                Trending Now
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
                {trendingCategories.map((category) => (
                  <CategoryButton 
                    key={category.id} 
                    category={category} 
                    gradient="bg-gradient-to-r from-rose-500 to-pink-500" 
                  />
                ))}
              </div>
            </div>
          )}

          {/* More */}
          {otherCategories.length > 0 && (
            <div>
              <h3 className="text-[10px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-400 rounded-full"></span>
                Explore More
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
                {otherCategories.slice(0, 15).map((category) => (
                  <CategoryButton 
                    key={category.id} 
                    category={category} 
                    gradient="bg-gradient-to-r from-violet-500 to-purple-500" 
                  />
                ))}
              </div>
              {otherCategories.length > 15 && (
                <p className="text-[10px] sm:text-xs text-gray-400 mt-2 text-center">
                  +{otherCategories.length - 15} more available after sign up
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer - Fixed at bottom */}
        <div 
          className="flex-shrink-0 px-4 py-3 sm:p-6 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 sm:rounded-b-2xl"
          style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
        >
          <div className="flex items-center justify-between gap-3 sm:gap-4">
            {/* Selection count */}
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 min-w-0">
              <span className={`font-bold ${canContinue ? 'text-green-500' : 'text-amber-500'}`}>
                {selectedCategories.length}
              </span>
              <span className="hidden sm:inline"> / {MIN_CATEGORIES} selected</span>
              <span className="sm:hidden">/{MIN_CATEGORIES}</span>
              {selectedCategories.length > 0 && selectedCategories.length < MIN_CATEGORIES && (
                <span className="text-[10px] sm:text-xs ml-1 text-gray-400">
                  (+{MIN_CATEGORIES - selectedCategories.length} more)
                </span>
              )}
            </div>
            
            {/* Continue button */}
            <button
              onClick={handleComplete}
              disabled={!canContinue}
              className={`flex items-center gap-1.5 sm:gap-2 px-5 sm:px-6 py-3 sm:py-3 rounded-xl font-semibold text-sm sm:text-base transition-all duration-200 flex-shrink-0 ${
                canContinue
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg hover:shadow-xl active:scale-[0.98]'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
            >
              <span>Show Quotes</span>
              <ChevronRight size={16} className="sm:w-[18px] sm:h-[18px]" />
            </button>
          </div>
          
          {/* Skip link */}
          <button
            onClick={handleSkip}
            className="w-full mt-2 sm:mt-3 text-xs sm:text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors py-1"
          >
            Skip and explore all quotes
          </button>
        </div>
      </div>
    </div>
  );
}

