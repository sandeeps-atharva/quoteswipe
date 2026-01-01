'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Bookmark, Trash2, Share2, Loader2, X, ImageIcon, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import toast from 'react-hot-toast';

interface SavedQuote {
  id: string | number;
  text: string;
  author: string;
  category: string;
  category_icon?: string;
  custom_background?: string | null;
}

interface SavedQuotesViewProps {
  onBack: () => void;
  onQuoteClick: (quoteId: string | number, category?: string, customBackground?: string | null) => void;
  onShareQuote: (quote: SavedQuote) => void;
  onDeleteQuote: (quoteId: string | number) => void;
}

export default function SavedQuotesView({
  onBack,
  onQuoteClick,
  onShareQuote,
  onDeleteQuote,
}: SavedQuotesViewProps) {
  const [quotes, setQuotes] = useState<SavedQuote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | number | null>(null);

  // Fetch saved quotes
  useEffect(() => {
    const fetchSavedQuotes = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/user/saved');
        if (response.ok) {
          const data = await response.json();
          setQuotes(data.quotes || []);
        }
      } catch (error) {
        console.error('Failed to fetch saved quotes:', error);
        toast.error('Failed to load saved quotes');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSavedQuotes();
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

  // Handle delete
  const handleDelete = useCallback(async (quoteId: string | number) => {
    setDeletingId(quoteId);
    try {
      const response = await fetch('/api/user/saved', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteId }),
      });

      if (response.ok) {
        setQuotes(prev => prev.filter(q => q.id !== quoteId));
        onDeleteQuote(quoteId);
        toast.success('Quote removed');
      } else {
        toast.error('Failed to remove quote');
      }
    } catch (error) {
      toast.error('Failed to remove quote');
    } finally {
      setDeletingId(null);
    }
  }, [onDeleteQuote]);

  // Handle share
  const handleShare = useCallback((e: React.MouseEvent, quote: SavedQuote) => {
    e.stopPropagation();
    onShareQuote(quote);
  }, [onShareQuote]);

  return (
    <div 
      className="fixed inset-0 z-30 bg-[#FFFBF7] dark:bg-[#0C0A09] flex flex-col"
      style={{ 
        paddingTop: 'env(safe-area-inset-top, 0px)',
        overscrollBehavior: 'none',
      }}
    >
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onBack}
              className="p-1.5 sm:p-2 -ml-1 sm:-ml-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              <ArrowLeft size={18} className="sm:w-5 sm:h-5 text-stone-600 dark:text-stone-400" />
            </button>
            
            <div className="flex-1 min-w-0">
              <h1 className="text-base sm:text-lg md:text-xl font-bold text-stone-900 dark:text-white flex items-center gap-1.5 sm:gap-2">
                <Bookmark size={18} className="sm:w-5 sm:h-5 text-amber-500 shrink-0" fill="currentColor" />
                <span className="truncate">Saved Quotes</span>
              </h1>
              <p className="text-[10px] sm:text-xs text-stone-500">{quotes.length} quotes saved</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mt-2.5 sm:mt-3 relative">
            <Search size={14} className="sm:w-4 sm:h-4 absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search saved quotes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 sm:pl-9 pr-8 sm:pr-9 py-2 sm:py-2.5 bg-stone-100 dark:bg-stone-800 rounded-lg sm:rounded-xl text-sm placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                <X size={14} className="sm:w-4 sm:h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main 
        className="flex-1 overflow-y-auto"
        style={{
          paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <div className="max-w-5xl mx-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 sm:py-20">
              <div className="relative animate-bounce mb-3">
                <span className="text-5xl">💬</span>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 rounded-full flex items-center justify-center shadow-lg">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-stone-500 font-medium">Loading saved quotes...</p>
            </div>
          ) : quotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 sm:py-20 px-4 sm:px-6 text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-3 sm:mb-4">
                <Bookmark size={28} className="sm:w-9 sm:h-9 text-amber-500" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-stone-900 dark:text-white mb-1.5 sm:mb-2">No saved quotes yet</h2>
              <p className="text-xs sm:text-sm text-stone-500 max-w-xs">
                Swipe right or tap the bookmark icon on quotes you love to save them here
              </p>
            </div>
          ) : filteredQuotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 sm:py-20 px-4 sm:px-6 text-center">
              <Search size={28} className="sm:w-8 sm:h-8 text-stone-300 mb-3" />
              <p className="text-xs sm:text-sm text-stone-500">No quotes match "{searchQuery}"</p>
              <button
                onClick={() => setSearchQuery('')}
                className="mt-2 text-xs sm:text-sm text-amber-600 hover:text-amber-700 font-medium"
              >
                Clear search
              </button>
            </div>
          ) : (
            <div className="p-3 sm:p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {filteredQuotes.map((quote) => (
                <div
                  key={quote.id}
                  onClick={() => onQuoteClick(quote.id, quote.category, quote.custom_background)}
                  className={`group relative rounded-xl sm:rounded-2xl overflow-hidden shadow-sm border transition-all active:scale-[0.98] cursor-pointer ${
                    quote.custom_background
                      ? 'border-amber-300 dark:border-amber-700 min-h-[120px] sm:min-h-[140px]'
                      : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:border-amber-300 dark:hover:border-amber-700'
                  }`}
                >
                  {/* Background Image Layer */}
                  {quote.custom_background && (
                    <>
                      <Image
                        src={quote.custom_background}
                        alt=""
                        fill
                        className="object-cover"
                        unoptimized
                      />
                      <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/50 to-black/70" />
                    </>
                  )}

                  {/* Content */}
                  <div className={`relative z-10 p-3 sm:p-4 ${quote.custom_background ? 'min-h-[120px] sm:min-h-[140px] flex flex-col justify-between' : ''}`}>
                    {/* Quote Text */}
                    <div className="flex gap-2 sm:gap-3">
                      <span className="text-lg sm:text-xl shrink-0">{quote.category_icon || '📚'}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs sm:text-sm leading-relaxed line-clamp-3 ${
                          quote.custom_background 
                            ? 'text-white drop-shadow-md' 
                            : 'text-stone-800 dark:text-stone-200'
                        }`}>
                          "{quote.text}"
                        </p>
                        {quote.author && (
                          <p className={`text-[10px] sm:text-xs mt-1.5 sm:mt-2 ${
                            quote.custom_background 
                              ? 'text-white/80 drop-shadow' 
                              : 'text-stone-500'
                          }`}>
                            — {quote.author}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className={`flex items-center justify-between mt-2.5 sm:mt-3 pt-2.5 sm:pt-3 ${
                      quote.custom_background 
                        ? 'border-t border-white/20' 
                        : 'border-t border-stone-100 dark:border-stone-800'
                    }`}>
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        {quote.custom_background && (
                          <span className={`text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full flex items-center gap-0.5 sm:gap-1 ${
                            quote.custom_background 
                              ? 'bg-white/20 text-white' 
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            <ImageIcon size={9} className="sm:w-[10px] sm:h-[10px]" />
                            Custom BG
                          </span>
                        )}
                        <span className={`text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full truncate max-w-[80px] sm:max-w-[100px] ${
                          quote.custom_background 
                            ? 'bg-white/20 text-white' 
                            : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                        }`}>
                          {quote.category}
                        </span>
                      </div>

                      <div className="flex items-center gap-0.5 sm:gap-1">
                        <button
                          onClick={(e) => handleShare(e, quote)}
                          className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                            quote.custom_background
                              ? 'bg-white/20 hover:bg-white/30 text-white'
                              : 'bg-orange-50 dark:bg-orange-900/30 hover:bg-orange-100 text-orange-600'
                          }`}
                        >
                          <Share2 size={14} className="sm:w-4 sm:h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(quote.id);
                          }}
                          disabled={deletingId === quote.id}
                          className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                            quote.custom_background
                              ? 'bg-white/20 hover:bg-red-500/50 text-white'
                              : 'bg-red-50 dark:bg-red-900/30 hover:bg-red-100 text-red-600'
                          } disabled:opacity-50`}
                        >
                          {deletingId === quote.id ? (
                            <Loader2 size={14} className="sm:w-4 sm:h-4 animate-spin" />
                          ) : (
                            <Trash2 size={14} className="sm:w-4 sm:h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
