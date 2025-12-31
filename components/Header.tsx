'use client';

import { Menu, Search, Moon, Sun } from 'lucide-react';
import LanguageSelector from './LanguageSelector';
import { Category } from '@/types/quotes';

interface HeaderProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  isAuthenticated: boolean;
  categories: Category[];
  selectedCategories: string[];
  onMenuClick: () => void;
  onSearchClick: () => void;
  onCategoriesClick: () => void;
}

export default function Header({
  theme,
  toggleTheme,
  isAuthenticated,
  categories,
  selectedCategories,
  onMenuClick,
  onSearchClick,
  onCategoriesClick,
}: HeaderProps) {
  return (
    <div className="fixed top-2 left-2 right-2 sm:top-3 sm:left-3 sm:right-3 z-30 flex items-center justify-between px-2 py-1.5 sm:px-3 sm:py-2 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl sm:rounded-3xl shadow-lg border border-gray-200/50 dark:border-gray-700/50">
      {/* Left Group - All icons on desktop, Menu & Search on mobile */}
      <div className="flex items-center gap-1 sm:gap-2">
        <button
          onClick={onMenuClick}
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 active:scale-95 transition-all"
          title="Menu"
        >
          <Menu size={16} className="sm:w-[18px] sm:h-[18px] text-gray-700 dark:text-gray-300" />
        </button>

        {/* Search - Only show when logged in */}
        {isAuthenticated && (
          <button
            onClick={onSearchClick}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 active:scale-95 transition-all"
            title="Search"
          >
            <Search size={14} className="sm:w-4 sm:h-4 text-gray-700 dark:text-gray-300" />
          </button>
        )}

        {/* Dark Mode - Hidden on mobile, shown on desktop */}
        <button
          onClick={toggleTheme}
          className={`hidden sm:flex w-9 h-9 rounded-full items-center justify-center active:scale-95 transition-all ${
            theme === 'dark'
              ? 'bg-yellow-100 dark:bg-yellow-900/30 hover:bg-yellow-200 dark:hover:bg-yellow-900/50'
              : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          {theme === 'dark' ? (
            <Sun size={16} className="text-yellow-600 dark:text-yellow-400" />
          ) : (
            <Moon size={16} className="text-gray-600 dark:text-gray-400" />
          )}
        </button>

        {/* Language - Hidden on mobile, shown on desktop - Only show when logged in */}
        {isAuthenticated && (
          <div className="hidden sm:block">
            <LanguageSelector compact />
          </div>
        )}
      </div>

      {/* Center - Categories (mobile only) */}
      <div className="sm:hidden">
        <CategoryButton
          categories={categories}
          selectedCategories={selectedCategories}
          onClick={onCategoriesClick}
          compact
        />
      </div>

      {/* Right Group - Theme & Language on mobile, Categories on desktop */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Mobile only - Theme & Language */}
        <button
          onClick={toggleTheme}
          className={`sm:hidden w-8 h-8 rounded-full flex items-center justify-center active:scale-95 transition-all ${
            theme === 'dark'
              ? 'bg-yellow-100 dark:bg-yellow-900/30 hover:bg-yellow-200 dark:hover:bg-yellow-900/50'
              : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          {theme === 'dark' ? (
            <Sun size={14} className="text-yellow-600 dark:text-yellow-400" />
          ) : (
            <Moon size={14} className="text-gray-600 dark:text-gray-400" />
          )}
        </button>

        {/* Language - Mobile - Only show when logged in */}
        {isAuthenticated && (
          <div className="sm:hidden">
            <LanguageSelector compact />
          </div>
        )}

        {/* Desktop only - Categories */}
        <div className="hidden sm:block">
          <CategoryButton
            categories={categories}
            selectedCategories={selectedCategories}
            onClick={onCategoriesClick}
          />
        </div>
      </div>
    </div>
  );
}

interface CategoryButtonProps {
  categories: Category[];
  selectedCategories: string[];
  onClick: () => void;
  compact?: boolean;
}

function CategoryButton({ categories, selectedCategories, onClick, compact = false }: CategoryButtonProps) {
  if (selectedCategories.length > 0) {
    return (
      <button
        onClick={onClick}
        className={`${
          compact ? 'h-7 px-2.5' : 'h-8 px-3'
        } rounded-full bg-gradient-to-r from-blue-500/10 to-pink-500/10 dark:from-blue-500/20 dark:to-pink-500/20 border border-blue-200/50 dark:border-blue-700/50 flex items-center gap-${
          compact ? '1.5' : '2'
        } hover:from-blue-500/20 hover:to-pink-500/20 active:scale-95 transition-all`}
        title="Manage categories"
      >
        <span className="flex items-center gap-0.5">
          {selectedCategories.slice(0, compact ? 3 : 4).map((catName) => {
            const cat = categories.find((c) => c.name === catName);
            return cat ? (
              <span key={catName} className={`${compact ? 'text-xs' : 'text-sm'} leading-none`}>
                {cat.icon}
              </span>
            ) : null;
          })}
        </span>
        <span className={`${compact ? 'text-[10px]' : 'text-xs'} font-semibold text-gray-700 dark:text-gray-300`}>
          {selectedCategories.length === 1
            ? compact
              ? categories.find((c) => c.name === selectedCategories[0])?.name?.slice(0, 8)
              : categories.find((c) => c.name === selectedCategories[0])?.name
            : compact
              ? `${selectedCategories.length}`
              : `${selectedCategories.length} categories`}
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`${
        compact ? 'h-7 px-2.5' : 'h-8 px-3'
      } rounded-full bg-gray-100 dark:bg-gray-700 flex items-center gap-${
        compact ? '1.5' : '2'
      } hover:bg-gray-200 dark:hover:bg-gray-600 active:scale-95 transition-all`}
      title="Select categories"
    >
      <span className={compact ? 'text-xs' : 'text-sm'}>📚</span>
      <span className={`${compact ? 'text-[10px]' : 'text-xs'} font-medium text-gray-500 dark:text-gray-400`}>
        {compact ? 'All' : 'All quotes'}
      </span>
    </button>
  );
}

