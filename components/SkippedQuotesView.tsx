'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, ThumbsDown, Share2, Loader2, X, ArrowLeft, MoreVertical } from 'lucide-react';
import toast from 'react-hot-toast';
import ThematicLoader from './ThematicLoader';

interface SkippedQuote {
  id: string | number;
  text: string;
  author: string;
  category: string;
  category_icon?: string;
  custom_background?: string | null;
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
  const [activeActionsId, setActiveActionsId] = useState<string | number | null>(null);

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
    setActiveActionsId(null);
    onShareQuote(quote);
  }, [onShareQuote]);

  // Toggle actions menu (for mobile)
  const toggleActions = useCallback((e: React.MouseEvent, quoteId: string | number) => {
    e.stopPropagation();
    setActiveActionsId(prev => prev === quoteId ? null : quoteId);
  }, []);

  // Handle quote click with loading state
  const handleQuoteClick = useCallback((quote: SkippedQuote) => {
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
            <div className="flex items-center justify-center py-16">
              <ThematicLoader message="Loading skipped quotes..." size="md" />
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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
              {filteredQuotes.map((quote) => {
                // Use stored background if available, otherwise use default
                const defaultBgs = [
                  'https://images.unsplash.com/photo-1553356084-58ef4a67b2a7?w=400&q=80',
                  'https://images.unsplash.com/photo-1557683316-973673baf926?w=400&q=80',
                  'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400&q=80',
                  'https://images.unsplash.com/photo-1475070929565-c985b496cb9f?w=400&q=80',
                  'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=400&q=80',
                  'https://images.unsplash.com/photo-1504805572947-34fad45aed93?w=400&q=80',
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
                      className="absolute inset-0 bg-cover bg-center grayscale-[30%]"
                      style={{ backgroundImage: `url(${backgroundUrl})` }}
                    />
                    
                    {/* Dark Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                    
                    {/* Skipped Icon */}
                    <div className="absolute top-2 right-2 z-10">
                      <ThumbsDown size={18} className="text-stone-400 drop-shadow-lg" />
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
                      <p className="text-white/90 text-xs sm:text-sm leading-snug line-clamp-3 drop-shadow-md">
                        "{quote.text}"
                      </p>
                      <p className="text-white/60 text-[10px] sm:text-xs mt-1.5 truncate drop-shadow">
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

