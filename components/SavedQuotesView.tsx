'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Bookmark, Trash2, Share2, Loader2, X, ArrowLeft } from 'lucide-react';
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
            <div className="p-3 sm:p-4 md:p-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
              {filteredQuotes.map((quote) => {
                // Default backgrounds for quotes without custom background
                const defaultBgs = [
                  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80',
                  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
                  'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=400&q=80',
                  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&q=80',
                  'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=400&q=80',
                  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400&q=80',
                ];
                const bgIndex = typeof quote.id === 'string' ? quote.id.charCodeAt(0) % defaultBgs.length : Number(quote.id) % defaultBgs.length;
                const backgroundUrl = quote.custom_background || defaultBgs[bgIndex];
                
                return (
                  <div
                    key={quote.id}
                    onClick={() => onQuoteClick(quote.id, quote.category, quote.custom_background)}
                    className="group relative aspect-[3/4] rounded-xl sm:rounded-2xl overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform duration-200 shadow-sm"
                  >
                    {/* Background Image */}
                    <div 
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url(${backgroundUrl})` }}
                    />
                    
                    {/* Dark Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    
                    {/* Bookmark Icon */}
                    <div className="absolute top-2 right-2 z-10">
                      <Bookmark size={18} className="text-amber-500 drop-shadow-lg" fill="currentColor" />
                    </div>
                    
                    {/* Action Buttons - Shows on hover */}
                    <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all z-10">
                      <button
                        onClick={(e) => handleShare(e, quote)}
                        className="p-1.5 bg-black/30 backdrop-blur-sm hover:bg-black/50 rounded-lg transition-colors"
                        title="Share"
                      >
                        <Share2 size={14} className="text-white" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(quote.id);
                        }}
                        disabled={deletingId === quote.id}
                        className="p-1.5 bg-red-500/50 backdrop-blur-sm hover:bg-red-500/70 rounded-lg transition-colors disabled:opacity-50"
                        title="Remove"
                      >
                        {deletingId === quote.id ? (
                          <Loader2 size={14} className="text-white animate-spin" />
                        ) : (
                          <Trash2 size={14} className="text-white" />
                        )}
                      </button>
                    </div>
                    
                    {/* Quote Content */}
                    <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 z-10">
                      <p className="text-white text-xs sm:text-sm leading-snug line-clamp-3 drop-shadow-md">
                        "{quote.text}"
                      </p>
                      <p className="text-white/70 text-[10px] sm:text-xs mt-1.5 truncate drop-shadow">
                        — {quote.author}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
