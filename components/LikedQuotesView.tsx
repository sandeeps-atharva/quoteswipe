'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Heart, Share2, Loader2, X, ArrowLeft, MoreVertical } from 'lucide-react';
import toast from 'react-hot-toast';

interface LikedQuote {
  id: string | number;
  text: string;
  author: string;
  category: string;
  category_icon?: string;
  custom_background?: string | null;
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
  const [activeActionsId, setActiveActionsId] = useState<string | number | null>(null);

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
    setActiveActionsId(null);
    onShareQuote(quote);
  }, [onShareQuote]);

  // Toggle actions menu (for mobile)
  const toggleActions = useCallback((e: React.MouseEvent, quoteId: string | number) => {
    e.stopPropagation();
    setActiveActionsId(prev => prev === quoteId ? null : quoteId);
  }, []);

  // Handle quote click with loading state
  const handleQuoteClick = useCallback((quote: LikedQuote) => {
    // On mobile with actions shown, close actions instead of navigating
    if (activeActionsId === quote.id) {
      setActiveActionsId(null);
      return;
    }
    if (navigatingId) return;
    setNavigatingId(quote.id);
    onQuoteClick(quote.id, quote.category);
    // Reset after navigation
    setTimeout(() => setNavigatingId(null), 500);
  }, [navigatingId, onQuoteClick, activeActionsId]);

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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
              {filteredQuotes.map((quote) => {
                // Use stored background if available, otherwise use default
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
                
                const isActionsVisible = activeActionsId === quote.id;
                
                return (
                  <div
                    key={quote.id}
                    onClick={() => handleQuoteClick(quote)}
                    className={`group relative aspect-[3/4] rounded-xl sm:rounded-2xl overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform duration-200 shadow-sm ${
                      navigatingId === quote.id ? 'opacity-50 pointer-events-none' : ''
                    }`}
                  >
                    {/* Background Image */}
                    <div 
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url(${backgroundUrl})` }}
                    />
                    
                    {/* Dark Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    
                    {/* Heart Icon */}
                    <div className="absolute top-2 right-2 z-10">
                      <Heart size={18} className="text-rose-500 drop-shadow-lg" fill="currentColor" />
                    </div>
                    
                    {/* Mobile Menu Button - Hidden when actions shown */}
                    {!isActionsVisible && (
                      <button
                        onClick={(e) => toggleActions(e, quote.id)}
                        className="absolute top-2 left-2 p-1.5 bg-black/30 backdrop-blur-sm rounded-lg z-10 sm:hidden active:bg-black/50"
                      >
                        <MoreVertical size={14} className="text-white" />
                      </button>
                    )}
                    
                    {/* Share Button - Shows instantly on mobile when active, with transition on desktop hover */}
                    <div className={`absolute top-2 left-2 flex gap-1 z-10 ${
                      isActionsVisible 
                        ? 'flex' 
                        : 'hidden sm:flex sm:opacity-0 sm:group-hover:opacity-100 sm:pointer-events-none sm:group-hover:pointer-events-auto sm:transition-opacity'
                    }`}>
                      <button
                        onClick={(e) => handleShare(e, quote)}
                        className="p-2 sm:p-1.5 bg-black/40 backdrop-blur-sm hover:bg-black/60 active:bg-black/60 rounded-lg"
                        title="Share"
                      >
                        <Share2 size={16} className="sm:w-3.5 sm:h-3.5 text-white" />
                      </button>
                    </div>
                    
                    {/* Loading Overlay */}
                    {navigatingId === quote.id && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-20">
                        <Loader2 size={24} className="animate-spin text-white" />
                      </div>
                    )}
                    
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
      </div>
    </div>
  );
}

