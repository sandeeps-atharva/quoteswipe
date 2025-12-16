'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Quote, User, ArrowRight } from 'lucide-react';

interface SearchResult {
  id: number;
  text: string;
  author: string;
  category: string;
  category_icon?: string;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuoteSelect: (quoteId: number, category?: string) => void;
}

// Cache quotes to avoid repeated API calls
let cachedQuotes: SearchResult[] | null = null;
let cachePromise: Promise<SearchResult[]> | null = null;

export default function SearchModal({ isOpen, onClose, onQuoteSelect }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [allQuotes, setAllQuotes] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load quotes once when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      // Reset search state but keep quotes cached
      setQuery('');
      setResults([]);
      setHasSearched(false);
      
      // Load quotes if not cached
      if (cachedQuotes) {
        setAllQuotes(cachedQuotes);
      } else if (!cachePromise) {
        setIsLoading(true);
        cachePromise = fetch('/api/quotes')
          .then(r => r.ok ? r.json() : { quotes: [] })
          .then(data => {
            const quotes: SearchResult[] = data.quotes || [];
            cachedQuotes = quotes;
            setAllQuotes(quotes);
            setIsLoading(false);
            return quotes;
          })
          .catch((): SearchResult[] => {
            setIsLoading(false);
            cachePromise = null;
            return [];
          });
      } else {
        setIsLoading(true);
        cachePromise.then(quotes => {
          setAllQuotes(quotes);
          setIsLoading(false);
        });
      }
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Filter quotes instantly (no API call needed)
  const filterQuotes = useCallback((searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setHasSearched(true);
    const searchLower = searchQuery.toLowerCase();
    const filtered = allQuotes.filter((q: SearchResult) => 
      q.text.toLowerCase().includes(searchLower) ||
      q.author.toLowerCase().includes(searchLower) ||
      q.category.toLowerCase().includes(searchLower)
    ).slice(0, 10);
    
    setResults(filtered);
  }, [allQuotes]);

  // Handle input change - instant filtering, no debounce needed
  const handleInputChange = (value: string) => {
    setQuery(value);
    filterQuotes(value);
  };

  // Handle quote selection
  const handleSelect = (quote: SearchResult) => {
    onQuoteSelect(quote.id, quote.category);
    onClose();
  };

  // Truncate text
  const truncate = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] sm:pt-[15vh] px-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Search Input */}
        <div className="relative border-b border-gray-200 dark:border-gray-800">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Search quotes, authors..."
            className="w-full pl-12 pr-12 py-4 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none text-base"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setResults([]);
                setHasSearched(false);
                inputRef.current?.focus();
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto">
          {/* Loading Skeleton */}
          {isLoading && (
            <div className="py-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="px-4 py-3 flex items-start gap-3 animate-pulse">
                  {/* Icon skeleton */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700" />
                  {/* Content skeleton */}
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/5" />
                    <div className="flex items-center gap-2 mt-1">
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20" />
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* No Results */}
          {!isLoading && hasSearched && results.length === 0 && (
            <div className="py-12 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <Search className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-gray-500 dark:text-gray-400">No quotes found</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Try a different search term</p>
            </div>
          )}

          {/* Results List */}
          {!isLoading && results.length > 0 && (
            <div className="py-2">
              {results.map((quote) => (
                <button
                  key={quote.id}
                  onClick={() => handleSelect(quote)}
                  className="w-full px-4 py-3 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left group"
                >
                  {/* Quote Icon */}
                  <div className="flex-shrink-0 mt-0.5 p-2 rounded-lg bg-gradient-to-br from-blue-100 to-pink-100 dark:from-blue-900/30 dark:to-pink-900/30">
                    <Quote className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-white leading-relaxed">
                      "{truncate(quote.text, 100)}"
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <User className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">{quote.author}</span>
                      <span className="text-gray-300 dark:text-gray-600">•</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {quote.category_icon} {quote.category}
                      </span>
                    </div>
                  </div>

                  {/* Arrow */}
                  <ArrowRight className="flex-shrink-0 w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-blue-500 transition-colors mt-1" />
                </button>
              ))}
            </div>
          )}

          {/* Initial State */}
          {!isLoading && !hasSearched && (
            <div className="py-8 text-center">
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Type at least 2 characters to search
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
            <span>Search by quote text, author, or category</span>
            <kbd className="px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 font-mono">ESC</kbd>
          </div>
        </div>
      </div>
    </div>
  );
}

