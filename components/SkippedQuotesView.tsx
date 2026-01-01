'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, ThumbsDown, Share2, Loader2, X, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

interface SkippedQuote {
  id: string | number;
  text: string;
  author: string;
  category: string;
  category_icon?: string;
}

interface SkippedQuotesViewProps {
  onBack: () => void;
  onQuoteClick: (quoteId: string | number, category?: string) => void;
  onShareQuote: (quote: SkippedQuote) => void;
}

export default function SkippedQuotesView({
  onBack,
  onQuoteClick,
  onShareQuote,
}: SkippedQuotesViewProps) {
  const [quotes, setQuotes] = useState<SkippedQuote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [navigatingId, setNavigatingId] = useState<string | number | null>(null);

  // Fetch skipped/disliked quotes
  useEffect(() => {
    const fetchSkippedQuotes = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/user/dislikes');
        if (response.ok) {
          const data = await response.json();
          setQuotes(data.quotes || []);
        }
      } catch (error) {
        console.error('Failed to fetch skipped quotes:', error);
        toast.error('Failed to load skipped quotes');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSkippedQuotes();
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
  const handleShare = useCallback((e: React.MouseEvent, quote: SkippedQuote) => {
    e.stopPropagation();
    onShareQuote(quote);
  }, [onShareQuote]);

  // Handle quote click with loading state
  const handleQuoteClick = useCallback((quote: SkippedQuote) => {
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
              <ThumbsDown size={20} className="text-stone-500" />
              Skipped Quotes
            </h1>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {isLoading ? 'Loading...' : `${quotes.length} quotes you skipped`}
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
            placeholder="Search skipped quotes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-stone-100 dark:bg-stone-800 rounded-xl text-sm placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400"
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
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-br from-stone-500 to-stone-600 rounded-full flex items-center justify-center shadow-lg">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
              </div>
              <p className="text-stone-500 font-medium">Loading skipped quotes...</p>
            </div>
          ) : quotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 rounded-2xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center mb-4">
                <ThumbsDown size={36} className="text-stone-400" />
              </div>
              <h3 className="text-lg font-semibold text-stone-900 dark:text-white mb-2">No skipped quotes yet</h3>
              <p className="text-sm text-stone-500 dark:text-stone-400 max-w-xs">
                Swipe left on quotes to skip them and they'll appear here
              </p>
            </div>
          ) : filteredQuotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Search size={32} className="text-stone-300 mb-4" />
              <p className="text-stone-500">No quotes match "{searchQuery}"</p>
              <button
                onClick={() => setSearchQuery('')}
                className="mt-2 text-sm text-stone-500 hover:text-stone-600"
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
                  className={`group relative bg-white dark:bg-stone-900 rounded-2xl p-4 shadow-sm border border-stone-200 dark:border-stone-800 hover:shadow-md hover:border-stone-300 dark:hover:border-stone-700 transition-all cursor-pointer ${
                    navigatingId === quote.id ? 'opacity-50 pointer-events-none' : ''
                  }`}
                >
                  {navigatingId === quote.id && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/50 dark:bg-stone-900/50 rounded-2xl">
                      <Loader2 size={24} className="animate-spin text-stone-400" />
                    </div>
                  )}
                  
                  {/* Actions */}
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleShare(e, quote)}
                      className="p-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-lg transition-colors"
                      title="Share"
                    >
                      <Share2 size={14} className="text-stone-500" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="pr-12">
                    <div className="flex items-center gap-2 mb-2">
                      <ThumbsDown size={14} className="text-stone-400 shrink-0" />
                      <span className="text-lg opacity-50">{quote.category_icon}</span>
                      <span className="text-xs text-stone-400 truncate">{quote.category}</span>
                    </div>
                    <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed line-clamp-3 mb-2">
                      "{quote.text}"
                    </p>
                    <p className="text-xs text-stone-400 truncate">
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

