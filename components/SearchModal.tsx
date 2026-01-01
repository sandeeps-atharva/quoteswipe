'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Search, X, Quote, User, ArrowRight, Clock, TrendingUp, 
  Heart, Bookmark, Filter, ChevronDown, Sparkles, Hash,
  ArrowUp, ArrowDown, CornerDownLeft, Zap
} from 'lucide-react';

interface SearchResult {
  id: string | number;
  text: string;
  author: string;
  category: string;
  category_icon?: string;
  likes_count?: number;
  relevanceScore?: number;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuoteSelect: (quoteId: string | number, category?: string) => void;
  likedQuotes?: Set<string | number>;
  savedQuotes?: Set<string | number>;
}

// Cache quotes to avoid repeated API calls
let cachedQuotes: SearchResult[] | null = null;
let cachePromise: Promise<SearchResult[]> | null = null;

// Popular searches
const POPULAR_SEARCHES = [
  'motivation', 'love', 'success', 'life', 'happiness', 
  'wisdom', 'friendship', 'dreams', 'courage', 'peace'
];

// Get recent searches from localStorage
const getRecentSearches = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem('recentSearches') || '[]').slice(0, 5);
  } catch {
    return [];
  }
};

// Save recent search
const saveRecentSearch = (query: string) => {
  if (typeof window === 'undefined' || query.length < 2) return;
  try {
    const recent = getRecentSearches().filter(s => s !== query);
    recent.unshift(query);
    localStorage.setItem('recentSearches', JSON.stringify(recent.slice(0, 5)));
  } catch {
    // Ignore
  }
};

export default function SearchModal({ 
  isOpen, 
  onClose, 
  onQuoteSelect,
  likedQuotes = new Set(),
  savedQuotes = new Set()
}: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [allQuotes, setAllQuotes] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [activeFilter, setActiveFilter] = useState<'all' | 'liked' | 'saved'>('all');
  const [sortBy, setSortBy] = useState<'relevance' | 'popular'>('relevance');
  const [showFilters, setShowFilters] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Get unique categories from quotes
  const categories = useMemo(() => {
    const cats = new Map<string, { icon: string; count: number }>();
    allQuotes.forEach(q => {
      const existing = cats.get(q.category);
      if (existing) {
        existing.count++;
      } else {
        cats.set(q.category, { icon: q.category_icon || '📝', count: 1 });
      }
    });
    return Array.from(cats.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 8);
  }, [allQuotes]);

  // Load quotes once when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setResults([]);
      setHasSearched(false);
      setSelectedIndex(-1);
      setActiveFilter('all');
      setSelectedCategory(null);
      setRecentSearches(getRecentSearches());
      
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

  // Calculate relevance score for a quote
  const calculateRelevance = useCallback((quote: SearchResult, searchTerms: string[]): number => {
    let score = 0;
    const textLower = quote.text.toLowerCase();
    const authorLower = quote.author.toLowerCase();
    const categoryLower = quote.category.toLowerCase();
    
    searchTerms.forEach(term => {
      // Exact phrase match in text (highest priority)
      if (textLower.includes(term)) {
        score += 10;
        // Bonus for match at start
        if (textLower.startsWith(term)) score += 5;
      }
      
      // Author match (high priority)
      if (authorLower.includes(term)) {
        score += 15;
        if (authorLower === term) score += 10; // Exact author match
      }
      
      // Category match
      if (categoryLower.includes(term)) {
        score += 8;
      }
      
      // Word boundary matches (better than substring)
      const wordBoundaryRegex = new RegExp(`\\b${term}\\b`, 'i');
      if (wordBoundaryRegex.test(quote.text)) score += 5;
      if (wordBoundaryRegex.test(quote.author)) score += 5;
    });
    
    // Popularity boost
    if (quote.likes_count) {
      score += Math.min(quote.likes_count / 10, 5);
    }
    
    // Liked/Saved boost
    if (likedQuotes.has(quote.id)) score += 3;
    if (savedQuotes.has(quote.id)) score += 3;
    
    return score;
  }, [likedQuotes, savedQuotes]);

  // Perform the actual filtering - returns results without setting state
  const getFilteredResults = useCallback((
    searchQuery: string,
    filter: 'all' | 'liked' | 'saved',
    sort: 'relevance' | 'popular',
    category: string | null
  ): SearchResult[] => {
    const searchTerms = searchQuery.toLowerCase().split(/\s+/).filter(t => t.length >= 2);
    
    let filtered = allQuotes;
    
    // Apply category filter
    if (category) {
      filtered = filtered.filter(q => q.category === category);
    }
    
    // Apply liked/saved filter
    if (filter === 'liked') {
      filtered = filtered.filter(q => likedQuotes.has(q.id));
    } else if (filter === 'saved') {
      filtered = filtered.filter(q => savedQuotes.has(q.id));
    }
    
    // Apply text search if query exists
    if (searchTerms.length > 0) {
      filtered = filtered
        .map(quote => ({
          ...quote,
          relevanceScore: calculateRelevance(quote, searchTerms)
        }))
        .filter(q => q.relevanceScore! > 0);
    } else {
      // No search query, just add default score
      filtered = filtered.map(q => ({ ...q, relevanceScore: q.likes_count || 0 }));
    }
    
    // Sort results
    if (sort === 'relevance') {
      filtered.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
    } else {
      filtered.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
    }
    
    return filtered.slice(0, 50);
  }, [allQuotes, calculateRelevance, likedQuotes, savedQuotes]);

  // Handle input change
  const handleInputChange = (value: string) => {
    setQuery(value);
    setSelectedIndex(-1);
    
    if (value.trim().length < 2 && !selectedCategory) {
      setResults([]);
      setHasSearched(false);
    } else {
      setHasSearched(true);
      const newResults = getFilteredResults(value, activeFilter, sortBy, selectedCategory);
      setResults(newResults);
    }
  };

  // Handle filter change
  const handleFilterChange = (filter: 'all' | 'liked' | 'saved') => {
    setActiveFilter(filter);
    setSelectedIndex(-1);
    
    if (query.trim().length >= 2 || selectedCategory) {
      setHasSearched(true);
      const newResults = getFilteredResults(query, filter, sortBy, selectedCategory);
      setResults(newResults);
    }
  };

  // Handle sort change
  const handleSortChange = () => {
    const newSort = sortBy === 'relevance' ? 'popular' : 'relevance';
    setSortBy(newSort);
    setSelectedIndex(-1);
    
    if (query.trim().length >= 2 || selectedCategory) {
      const newResults = getFilteredResults(query, activeFilter, newSort, selectedCategory);
      setResults(newResults);
    }
  };

  // Handle category click
  const handleCategoryClick = (category: string) => {
    const newCategory = selectedCategory === category ? null : category;
    setSelectedCategory(newCategory);
    setSelectedIndex(-1);
    
    if (query.trim().length >= 2 || newCategory) {
      setHasSearched(true);
      const newResults = getFilteredResults(query, activeFilter, sortBy, newCategory);
      setResults(newResults);
    } else {
      setHasSearched(false);
      setResults([]);
    }
  };

  // Handle quote selection
  const handleSelect = (quote: SearchResult) => {
    if (query.length >= 2) {
      saveRecentSearch(query);
    }
    onQuoteSelect(quote.id, quote.category);
    onClose();
  };

  // Handle recent/popular search click
  const handleQuickSearch = (term: string) => {
    setQuery(term);
    setSelectedIndex(-1);
    setHasSearched(true);
    const newResults = getFilteredResults(term, activeFilter, sortBy, selectedCategory);
    setResults(newResults);
    inputRef.current?.focus();
  };

  // Clear recent searches
  const clearRecentSearches = () => {
    localStorage.removeItem('recentSearches');
    setRecentSearches([]);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, -1));
      } else if (e.key === 'Enter' && selectedIndex >= 0 && results[selectedIndex]) {
        e.preventDefault();
        handleSelect(results[selectedIndex]);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, results, selectedIndex]);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && resultsRef.current) {
      const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  // Highlight matching text
  const highlightText = (text: string, maxLength: number = 120): React.ReactNode => {
    if (query.length < 2) {
      return truncate(text, maxLength);
    }
    
    const truncated = truncate(text, maxLength);
    const terms = query.toLowerCase().split(/\s+/).filter(t => t.length >= 2);
    
    if (terms.length === 0) return truncated;
    
    // Create regex pattern for all terms
    const pattern = new RegExp(`(${terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
    const parts = truncated.split(pattern);
    
    return parts.map((part, i) => {
      const isMatch = terms.some(term => part.toLowerCase() === term);
      return isMatch ? (
        <mark key={i} className="bg-amber-200 dark:bg-amber-800 text-stone-900 dark:text-white rounded px-0.5">
          {part}
        </mark>
      ) : part;
    });
  };

  // Truncate text
  const truncate = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[5vh] sm:pt-[10vh] px-4">
      {/* Backdrop with warm gradient */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-md"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-rose-500/10" />
      </div>
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-stone-900 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-stone-200/50 dark:border-stone-700/50">
        {/* Decorative gradient orbs */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-amber-400/20 to-orange-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-gradient-to-br from-rose-400/20 to-pink-400/20 rounded-full blur-3xl pointer-events-none" />
        
        {/* Search Input */}
        <div className="relative border-b border-stone-200 dark:border-stone-700">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Search quotes, authors, categories..."
            className="w-full pl-12 pr-24 py-4 bg-transparent text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none text-base"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {query && (
              <button
                onClick={() => {
                  setQuery('');
                  setResults([]);
                  setHasSearched(false);
                  setSelectedIndex(-1);
                  inputRef.current?.focus();
                }}
                className="p-1.5 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
              >
                <X size={16} />
              </button>
            )}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-1.5 rounded-lg transition-colors ${
                showFilters || activeFilter !== 'all' || selectedCategory
                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                  : 'hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400'
              }`}
            >
              <Filter size={16} />
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="px-4 py-3 bg-stone-50 dark:bg-stone-800/50 border-b border-stone-200 dark:border-stone-700 space-y-3">
            {/* Filter Tabs */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-500 dark:text-stone-400 mr-1">Filter:</span>
              {[
                { key: 'all', label: 'All', icon: Sparkles },
                { key: 'liked', label: 'Liked', icon: Heart },
                { key: 'saved', label: 'Saved', icon: Bookmark },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => handleFilterChange(key as 'all' | 'liked' | 'saved')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    activeFilter === key
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                      : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600'
                  }`}
                >
                  <Icon size={12} />
                  {label}
                </button>
              ))}
              
              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs text-stone-500 dark:text-stone-400">Sort:</span>
                <button
                  onClick={handleSortChange}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors"
                >
                  {sortBy === 'relevance' ? <Zap size={12} /> : <TrendingUp size={12} />}
                  {sortBy === 'relevance' ? 'Relevance' : 'Popular'}
                  <ChevronDown size={12} />
                </button>
              </div>
            </div>
            
            {/* Category Pills */}
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {categories.map(([cat, { icon }]) => (
                  <button
                    key={cat}
                    onClick={() => handleCategoryClick(cat)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-colors ${
                      selectedCategory === cat
                        ? 'bg-gradient-to-r from-orange-500 to-rose-500 text-white'
                        : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600'
                    }`}
                  >
                    <span>{icon}</span>
                    <span className="max-w-[80px] truncate">{cat}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Results */}
        <div className="max-h-[55vh] overflow-y-auto custom-scrollbar">
          {/* Loading Skeleton */}
          {isLoading && (
            <div className="py-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="px-4 py-3 flex items-start gap-3 animate-pulse">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-stone-200 dark:bg-stone-700" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-full" />
                    <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-4/5" />
                    <div className="flex items-center gap-2 mt-1">
                      <div className="h-3 bg-stone-200 dark:bg-stone-700 rounded w-20" />
                      <div className="h-3 bg-stone-200 dark:bg-stone-700 rounded w-16" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* No Results */}
          {!isLoading && hasSearched && results.length === 0 && (
            <div className="py-12 text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-100 to-rose-100 dark:from-amber-900/30 dark:to-rose-900/30 flex items-center justify-center">
                <Search className="w-7 h-7 text-amber-500" />
              </div>
              <p className="text-stone-600 dark:text-stone-300 font-medium">No quotes found</p>
              <p className="text-sm text-stone-400 dark:text-stone-500 mt-1">Try different keywords or filters</p>
              {(activeFilter !== 'all' || selectedCategory) && (
                <button
                  onClick={() => {
                    setActiveFilter('all');
                    setSelectedCategory(null);
                    if (query.trim().length >= 2) {
                      const newResults = getFilteredResults(query, 'all', sortBy, null);
                      setResults(newResults);
                    }
                  }}
                  className="mt-3 text-sm text-amber-600 dark:text-amber-400 hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}

          {/* Results List */}
          {!isLoading && results.length > 0 && (
            <>
              {/* Results Count */}
              <div className="px-4 py-2 text-xs text-stone-500 dark:text-stone-400 bg-stone-50 dark:bg-stone-800/30 flex items-center justify-between">
                <span>
                  {results.length === 50 ? '50+' : results.length} result{results.length !== 1 ? 's' : ''}
                  {selectedCategory && ` in "${selectedCategory}"`}
                </span>
                {query && (
                  <span className="text-stone-400 dark:text-stone-500">
                    Press ↵ to select
                  </span>
                )}
              </div>
              
              <div className="py-1" ref={resultsRef}>
                {results.map((quote, index) => (
                  <button
                    key={quote.id}
                    onClick={() => handleSelect(quote)}
                    className={`w-full px-4 py-3 flex items-start gap-3 transition-colors text-left group ${
                      index === selectedIndex
                        ? 'bg-amber-50 dark:bg-amber-900/20'
                        : 'hover:bg-stone-50 dark:hover:bg-stone-800/50'
                    }`}
                  >
                    {/* Quote Icon */}
                    <div className={`flex-shrink-0 mt-0.5 p-2 rounded-lg ${
                      likedQuotes.has(quote.id)
                        ? 'bg-gradient-to-br from-rose-100 to-pink-100 dark:from-rose-900/30 dark:to-pink-900/30'
                        : savedQuotes.has(quote.id)
                        ? 'bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30'
                        : 'bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30'
                    }`}>
                      <Quote className={`w-4 h-4 ${
                        likedQuotes.has(quote.id)
                          ? 'text-rose-600 dark:text-rose-400'
                          : savedQuotes.has(quote.id)
                          ? 'text-orange-600 dark:text-orange-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }`} />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-stone-900 dark:text-white leading-relaxed">
                        "{highlightText(quote.text)}"
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3 text-stone-400" />
                          <span className="text-xs text-stone-600 dark:text-stone-300 font-medium">
                            {highlightText(quote.author, 30)}
                          </span>
                        </div>
                        <span className="text-stone-300 dark:text-stone-600">•</span>
                        <span className="text-xs text-stone-400 dark:text-stone-500">
                          {quote.category_icon} {quote.category}
                        </span>
                        {quote.likes_count && quote.likes_count > 0 && (
                          <>
                            <span className="text-stone-300 dark:text-stone-600">•</span>
                            <span className="text-xs text-stone-400 dark:text-stone-500 flex items-center gap-0.5">
                              <Heart size={10} className="fill-current" /> {quote.likes_count}
                            </span>
                          </>
                        )}
                        {likedQuotes.has(quote.id) && (
                          <span className="text-xs bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded">
                            Liked
                          </span>
                        )}
                        {savedQuotes.has(quote.id) && (
                          <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded">
                            Saved
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Arrow */}
                    <ArrowRight className={`flex-shrink-0 w-4 h-4 transition-colors mt-1 ${
                      index === selectedIndex
                        ? 'text-amber-500'
                        : 'text-stone-300 dark:text-stone-600 group-hover:text-amber-500'
                    }`} />
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Initial State - Recent & Popular Searches */}
          {!isLoading && !hasSearched && !selectedCategory && (
            <div className="py-4 px-4 space-y-6">
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                      <Clock size={12} />
                      Recent Searches
                    </div>
                    <button
                      onClick={clearRecentSearches}
                      className="text-xs text-stone-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((term) => (
                      <button
                        key={term}
                        onClick={() => handleQuickSearch(term)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-sm hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                      >
                        <Clock size={12} className="text-stone-400" />
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Popular Searches */}
              <div>
                <div className="flex items-center gap-2 text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2">
                  <TrendingUp size={12} />
                  Popular Searches
                </div>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_SEARCHES.map((term) => (
                    <button
                      key={term}
                      onClick={() => handleQuickSearch(term)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-50 to-rose-50 dark:from-amber-900/20 dark:to-rose-900/20 text-stone-700 dark:text-stone-300 text-sm hover:from-amber-100 hover:to-rose-100 dark:hover:from-amber-900/30 dark:hover:to-rose-900/30 transition-colors border border-amber-200/50 dark:border-amber-800/30"
                    >
                      <Hash size={12} className="text-amber-500" />
                      {term}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Category Access */}
              {categories.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2">
                    <Sparkles size={12} />
                    Browse Categories
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {categories.slice(0, 6).map(([cat, { icon }]) => (
                      <button
                        key={cat}
                        onClick={() => handleCategoryClick(cat)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-sm hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                      >
                        <span>{icon}</span>
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Search Tips */}
              <div className="pt-2 border-t border-stone-100 dark:border-stone-800">
                <p className="text-xs text-stone-400 dark:text-stone-500 flex items-center gap-2">
                  <Sparkles size={12} className="text-amber-400" />
                  Tip: Search by author name for better results (e.g., &quot;Einstein&quot;, &quot;Rumi&quot;)
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-stone-50 dark:bg-stone-800/50 border-t border-stone-200 dark:border-stone-700">
          <div className="flex items-center justify-between text-xs text-stone-400 dark:text-stone-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <ArrowUp size={12} />
                <ArrowDown size={12} />
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <CornerDownLeft size={12} />
                Select
              </span>
            </div>
            <kbd className="px-2 py-0.5 rounded bg-stone-200 dark:bg-stone-700 font-mono text-[10px]">ESC</kbd>
          </div>
        </div>
      </div>
    </div>
  );
}
