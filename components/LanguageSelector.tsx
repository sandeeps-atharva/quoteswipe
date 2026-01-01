'use client';

import { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, Check, Search, X } from 'lucide-react';
import { useLanguage, SUPPORTED_LANGUAGES, Language } from '@/contexts/LanguageContext';

interface LanguageSelectorProps {
  compact?: boolean;
}

export default function LanguageSelector({ compact = false }: LanguageSelectorProps) {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const filteredLanguages = SUPPORTED_LANGUAGES.filter(
    (lang) =>
      lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lang.nativeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lang.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLanguageSelect = (lang: Language) => {
    setLanguage(lang);
    setIsOpen(false);
    setSearchQuery('');
  };

  if (compact) {
    return (
      <div className="relative" ref={dropdownRef}>
        {/* Compact Button - matches header icon style */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-stone-100 dark:bg-stone-700 flex items-center justify-center hover:bg-stone-200 dark:hover:bg-stone-600 active:scale-95 transition-all"
          title={`${language.name}`}
        >
          <span className="text-sm sm:text-base leading-none">{language.flag}</span>
        </button>

        {/* Dropdown - positioned to stay within viewport */}
        {isOpen && (
          <div 
            className="fixed sm:absolute left-4 right-4 sm:left-0 sm:right-auto top-auto mt-2 sm:w-72 bg-white dark:bg-stone-800 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-700 overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200"
            style={{
              boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.05)',
              maxWidth: 'calc(100vw - 32px)',
            }}
          >
            {/* Search */}
            <div className="p-3 border-b border-stone-100 dark:border-stone-700/50 bg-stone-50/50 dark:bg-stone-900/30">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search language..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2.5 text-sm bg-white dark:bg-stone-700 rounded-xl border border-stone-200 dark:border-stone-600 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-stone-900 dark:text-stone-100 placeholder-stone-400"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 p-1 rounded-full hover:bg-stone-100 dark:hover:bg-stone-600 transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Language List */}
            <div className="max-h-[300px] overflow-y-auto overscroll-contain custom-scrollbar">
              {filteredLanguages.map((lang, index) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageSelect(lang)}
                  className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
                    language.code === lang.code 
                      ? 'bg-amber-50 dark:bg-amber-900/20' 
                      : 'hover:bg-stone-50 dark:hover:bg-stone-700/50'
                  } ${index !== filteredLanguages.length - 1 ? 'border-b border-stone-100 dark:border-stone-700/30' : ''}`}
                >
                  <span className="text-xl flex-shrink-0">{lang.flag}</span>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">{lang.name}</p>
                    <p className="text-xs text-stone-500 dark:text-stone-400 truncate">{lang.nativeName}</p>
                  </div>
                  {language.code === lang.code && (
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center">
                      <Check size={12} className="text-white" strokeWidth={3} />
                    </div>
                  )}
                </button>
              ))}
              {filteredLanguages.length === 0 && (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm text-stone-500 dark:text-stone-400">No languages found</p>
                  <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">Try a different search term</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full-width version for sidebar
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl bg-gradient-to-r from-amber-50 to-rose-50 dark:from-amber-900/20 dark:to-rose-900/20 border border-amber-200/50 dark:border-amber-800/50 hover:from-amber-100 hover:to-rose-100 dark:hover:from-amber-900/30 dark:hover:to-rose-900/30 transition-all shadow-sm"
      >
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-rose-500 flex items-center justify-center flex-shrink-0">
          <Globe size={18} className="text-white" />
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">Language</p>
          <p className="text-sm font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <span>{language.flag}</span>
            <span className="truncate">{language.name}</span>
          </p>
        </div>
        <ChevronDown 
          size={18} 
          className={`text-stone-400 transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {isOpen && (
        <div 
          className="absolute left-0 right-0 mt-2 bg-white dark:bg-stone-800 rounded-xl shadow-2xl border border-stone-200 dark:border-stone-700 overflow-hidden z-50"
          style={{
            boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          }}
        >
          {/* Search */}
          <div className="p-3 border-b border-stone-100 dark:border-stone-700/50 bg-stone-50/50 dark:bg-stone-900/30">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search language..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 text-sm bg-white dark:bg-stone-700 rounded-xl border border-stone-200 dark:border-stone-600 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-stone-900 dark:text-stone-100 placeholder-stone-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 p-1 rounded-full hover:bg-stone-100 dark:hover:bg-stone-600 transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Language List */}
          <div className="max-h-72 overflow-y-auto overscroll-contain custom-scrollbar">
            {filteredLanguages.map((lang, index) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageSelect(lang)}
                className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
                  language.code === lang.code 
                    ? 'bg-amber-50 dark:bg-amber-900/20' 
                    : 'hover:bg-stone-50 dark:hover:bg-stone-700/50'
                } ${index !== filteredLanguages.length - 1 ? 'border-b border-stone-100 dark:border-stone-700/30' : ''}`}
              >
                <span className="text-2xl flex-shrink-0">{lang.flag}</span>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">{lang.name}</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">{lang.nativeName}</p>
                </div>
                {language.code === lang.code && (
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center">
                    <Check size={14} className="text-white" strokeWidth={3} />
                  </div>
                )}
              </button>
            ))}
            {filteredLanguages.length === 0 && (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-stone-500 dark:text-stone-400">No languages found</p>
                <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">Try a different search term</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
