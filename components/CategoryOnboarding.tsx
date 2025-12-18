'use client';

import React, { useState, useEffect } from 'react';
import { X, Sparkles, ChevronRight, Check } from 'lucide-react';

interface Category {
  id: string | number;
  name: string;
  icon: string;
  count?: number;
}

interface CategoryOnboardingProps {
  categories: Category[];
  onComplete: (selectedCategories: string[]) => void;
  onSkip: () => void;
}

const MIN_CATEGORIES = 3;

export default function CategoryOnboarding({ 
  categories, 
  onComplete, 
  onSkip 
}: CategoryOnboardingProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // Animate in
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
    
    // Animate out then complete (parent handles database save)
    setTimeout(() => {
      onComplete(selectedCategories);
    }, 300);
  };

  const handleSkip = () => {
    setIsAnimating(true);
    
    // Animate out then skip (parent handles database save)
    setTimeout(() => {
      onSkip();
    }, 300);
  };

  const canContinue = selectedCategories.length >= MIN_CATEGORIES;

  // Group categories by popularity/type for better UX
  const popularCategories = categories.filter(c => 
    ['Love', 'Motivation', 'Wisdom', 'Humor', 'Life', 'Success', 'Happiness', 'Friendship'].includes(c.name)
  );
  const trendingCategories = categories.filter(c => 
    ['2am Quotes', 'Savage Comebacks', 'Shower Thoughts', 'Toxic Truths', 'Villain Era', 'Main Character Energy', 'Rizz & Flirting', 'Overthinking'].includes(c.name)
  );
  const otherCategories = categories.filter(c => 
    !popularCategories.includes(c) && !trendingCategories.includes(c)
  );

  // Category button component for reusability
  const CategoryButton = ({ category, gradient }: { category: Category; gradient: string }) => {
    const isSelected = selectedCategories.includes(category.name);
    return (
      <button
        key={category.id}
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

  return (
    <div 
      className={`fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all duration-300 ${
        isAnimating ? 'opacity-0 scale-95' : showContent ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
      }`}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm" 
        onClick={handleSkip}
      />
      
      {/* Modal - Full width on mobile, max-width on larger screens */}
      <div className="relative w-full sm:max-w-lg max-h-[92vh] sm:max-h-[85vh] bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header - Compact on mobile */}
        <div className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 px-4 py-3 sm:p-6 text-white flex-shrink-0">
          <div className="absolute inset-0 bg-black/10" />
          <div className="relative pr-8">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-2">
              <Sparkles className="w-4 h-4 sm:w-6 sm:h-6" />
              <span className="text-[10px] sm:text-sm font-medium uppercase tracking-wider opacity-90">
                Welcome to QuoteSwipe
              </span>
            </div>
            <h2 className="text-lg sm:text-2xl md:text-3xl font-bold mb-0.5 sm:mb-2">
              What inspires you?
            </h2>
            <p className="text-white/80 text-[11px] sm:text-sm md:text-base leading-tight">
              Select at least {MIN_CATEGORIES} categories to personalize your feed
            </p>
          </div>
          
          {/* Skip button */}
          <button
            onClick={handleSkip}
            className="absolute top-2.5 right-2.5 sm:top-4 sm:right-4 p-1.5 sm:p-2 hover:bg-white/20 rounded-full transition-colors"
            title="Skip for now"
          >
            <X size={18} className="sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Categories - Scrollable area */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:p-6 space-y-4 sm:space-y-6">
          
          {/* Popular */}
          {popularCategories.length > 0 && (
            <div>
              <h3 className="text-[10px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full"></span>
                Popular
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
                {popularCategories.map((category) => (
                  <CategoryButton 
                    key={category.id} 
                    category={category} 
                    gradient="bg-gradient-to-r from-blue-500 to-purple-500" 
                  />
                ))}
              </div>
            </div>
          )}

          {/* Trending */}
          {trendingCategories.length > 0 && (
            <div>
              <h3 className="text-[10px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-pink-500 rounded-full animate-pulse"></span>
                Trending
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
                {trendingCategories.map((category) => (
                  <CategoryButton 
                    key={category.id} 
                    category={category} 
                    gradient="bg-gradient-to-r from-pink-500 to-orange-500" 
                  />
                ))}
              </div>
            </div>
          )}

          {/* More Categories */}
          {otherCategories.length > 0 && (
            <div>
              <h3 className="text-[10px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-400 rounded-full"></span>
                More Categories
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
                {otherCategories.slice(0, 18).map((category) => (
                  <CategoryButton 
                    key={category.id} 
                    category={category} 
                    gradient="bg-gradient-to-r from-emerald-500 to-teal-500" 
                  />
                ))}
              </div>
              {otherCategories.length > 18 && (
                <p className="text-[10px] sm:text-xs text-gray-400 mt-2 text-center">
                  +{otherCategories.length - 18} more in sidebar
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer - Sticky at bottom with safe area padding */}
        <div className="flex-shrink-0 px-3 py-3 sm:p-6 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-between gap-3 sm:gap-4">
            {/* Selection count */}
            <div className="text-[11px] sm:text-sm text-gray-600 dark:text-gray-400 min-w-0">
              <span className={`font-bold ${canContinue ? 'text-green-500' : 'text-blue-500'}`}>
                {selectedCategories.length}
              </span>
              <span className="hidden sm:inline"> / {MIN_CATEGORIES} selected</span>
              <span className="sm:hidden">/{MIN_CATEGORIES}</span>
              {selectedCategories.length > 0 && selectedCategories.length < MIN_CATEGORIES && (
                <span className="text-[10px] sm:text-xs ml-1 text-gray-400">
                  (+{MIN_CATEGORIES - selectedCategories.length})
                </span>
              )}
            </div>
            
            {/* Continue button */}
            <button
              onClick={handleComplete}
              disabled={!canContinue}
              className={`flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold text-sm sm:text-base transition-all duration-200 flex-shrink-0 ${
                canContinue
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:shadow-xl active:scale-[0.98]'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
            >
              <span>Continue</span>
              <ChevronRight size={16} className="sm:w-[18px] sm:h-[18px]" />
            </button>
          </div>
          
          {/* Skip link */}
          <button
            onClick={handleSkip}
            className="w-full mt-2 sm:mt-3 text-[11px] sm:text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors py-1"
          >
            Skip and explore all categories
          </button>
        </div>
      </div>
    </div>
  );
}
