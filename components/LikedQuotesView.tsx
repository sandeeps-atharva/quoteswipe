'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Heart, Share2, Loader2, X, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

interface LikedQuote {
  id: string | number;
  text: string;
  author: string;
  category: string;
  category_icon?: string;
}

interface LikedQuotesViewProps {
  onBack: () => void;
  onQuoteClick: (quoteId: string | number, category?: string) => void;
  onShareQuote: (quote: LikedQuote) => void;
}

export default function LikedQuotesView({
  onBack,
  onQuoteClick,
  onShareQuote,
}: LikedQuotesViewProps) {
  const [quotes, setQuotes] = useState<LikedQuote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [navigatingId, setNavigatingId] = useState<string | number | null>(null);

  // Fetch liked quotes
  useEffect(() => {
    const fetchLikedQuotes = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/user/likes');
        if (response.ok) {
          const data = await response.json();
          setQuotes(data.quotes || []);
        }
      } catch (error) {
        console.error('Failed to fetch liked quotes:', error);
        toast.error('Failed to load liked quotes');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLikedQuotes();
  }, []);

  // Filter quotes by search
  const filteredQuotes = useMemo(() => {
    if (!searchQuery.trim()) return quotes;
    const q = searchQuery.toLowerCase();
    return quotes.filter(quote =>
      quote.text.toLowerCase().includes(q) ||
      quote.author.toLowerCase().includes(q) ||
      quote.category.toLowerCase().includes(q)
    );
  }, [quotes, searchQuery]);

  // Handle share
  const handleShare = useCallback((e: React.MouseEvent, quote: LikedQuote) => {
    e.stopPropagation();
    onShareQuote(quote);
  }, [onShareQuote]);

  // Handle quote click with loading state
  const handleQuoteClick = useCallback((quote: LikedQuote) => {
    if (navigatingId) return;
    setNavigatingId(quote.id);
    onQuoteClick(quote.id, quote.category);
    // Reset after navigation
    setTimeout(() => setNavigatingId(null), 500);
  }, [navigatingId, onQuoteClick]);

  return (
    <div 
      className="fixed inset-0 z-30 bg-[#FFFBF7] dark:bg-[#0C0A09] flex flex-col"
      style={{ 
        paddingBottom: 'calc(56px + env(safe-area-inset-bottom, 0px))',
        paddingTop: 'env(safe-area-inset-top, 0px)'
      }}
    >
      {/* Header */}
      <div className="bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 px-4 py-3 sm:py-4">
        <div className="flex items-center gap-3 max-w-4xl mx-auto">
          <button
            onClick={onBack}
            className="p-2 -ml-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors"
          >
            <ArrowLeft size={20} className="text-stone-600 dark:text-stone-400" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg sm:text-xl font-bold text-stone-900 dark:text-white flex items-center gap-2">
              <Heart size={20} className="text-rose-500" fill="currentColor" />
              Liked Quotes
            </h1>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {isLoading ? 'Loading...' : `${quotes.length} quotes you loved`}
            </p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 px-4 py-2 sm:py-3">
        <div className="relative max-w-4xl mx-auto">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Search liked quotes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-stone-100 dark:bg-stone-800 rounded-xl text-sm placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
            >
              <X size={16} />
            </button>
          )}
        </div>
        {searchQuery && (
          <p className="text-xs text-stone-500 mt-2 max-w-4xl mx-auto">
            Found {filteredQuotes.length} of {quotes.length} quotes
          </p>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative animate-bounce mb-4">
                <span className="text-5xl">💬</span>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 rounded-full flex items-center justify-center shadow-lg">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
              </div>
              <p className="text-stone-500 font-medium">Loading liked quotes...</p>
            </div>
          ) : quotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-100 to-rose-200 dark:from-rose-900/30 dark:to-rose-800/30 flex items-center justify-center mb-4">
                <Heart size={36} className="text-rose-500" />
              </div>
              <h3 className="text-lg font-semibold text-stone-900 dark:text-white mb-2">No liked quotes yet</h3>
              <p className="text-sm text-stone-500 dark:text-stone-400 max-w-xs">
                Swipe right on quotes you love to add them here
              </p>
            </div>
          ) : filteredQuotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Search size={32} className="text-stone-300 mb-4" />
              <p className="text-stone-500">No quotes match "{searchQuery}"</p>
              <button
                onClick={() => setSearchQuery('')}
                className="mt-2 text-sm text-rose-500 hover:text-rose-600"
              >
                Clear search
              </button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredQuotes.map((quote) => (
                <div
                  key={quote.id}
                  onClick={() => handleQuoteClick(quote)}
                  className={`group relative bg-white dark:bg-stone-900 rounded-2xl p-4 shadow-sm border border-rose-100 dark:border-rose-900/30 hover:shadow-md hover:border-rose-200 dark:hover:border-rose-800 transition-all cursor-pointer ${
                    navigatingId === quote.id ? 'opacity-50 pointer-events-none' : ''
                  }`}
                >
                  {navigatingId === quote.id && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/80 dark:bg-stone-900/80 rounded-2xl backdrop-blur-sm">
                      <div className="relative">
                        <span className="text-3xl animate-bounce">💬</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Actions */}
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleShare(e, quote)}
                      className="p-2 bg-rose-100 dark:bg-rose-900/30 hover:bg-rose-200 dark:hover:bg-rose-800/50 rounded-lg transition-colors"
                      title="Share"
                    >
                      <Share2 size={14} className="text-rose-600 dark:text-rose-400" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="pr-16">
                    <div className="flex items-center gap-2 mb-2">
                      <Heart size={14} className="text-rose-400 shrink-0" fill="currentColor" />
                      <span className="text-lg">{quote.category_icon}</span>
                      <span className="text-xs text-stone-500 truncate">{quote.category}</span>
                    </div>
                    <p className="text-sm text-stone-900 dark:text-white leading-relaxed line-clamp-3 mb-2">
                      "{quote.text}"
                    </p>
                    <p className="text-xs text-stone-500 dark:text-stone-400 truncate">
                      — {quote.author}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

