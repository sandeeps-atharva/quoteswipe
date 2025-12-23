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
      className="fixed inset-0 z-30 bg-gray-50 dark:bg-gray-950 flex flex-col"
      style={{ 
        paddingTop: 'env(safe-area-inset-top, 0px)',
        overscrollBehavior: 'none',
      }}
    >
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
          
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Bookmark size={20} className="text-yellow-500" fill="currentColor" />
              Saved Quotes
            </h1>
            <p className="text-xs text-gray-500">{quotes.length} quotes saved</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mt-3 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search saved quotes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          )}
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
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-yellow-500 mb-3" />
            <p className="text-sm text-gray-500">Loading saved quotes...</p>
          </div>
        ) : quotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-20 h-20 rounded-2xl bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center mb-4">
              <Bookmark size={36} className="text-yellow-500" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No saved quotes yet</h2>
            <p className="text-sm text-gray-500 max-w-xs">
              Swipe right or tap the bookmark icon on quotes you love to save them here
            </p>
          </div>
        ) : filteredQuotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <Search size={32} className="text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">No quotes match "{searchQuery}"</p>
            <button
              onClick={() => setSearchQuery('')}
              className="mt-2 text-sm text-yellow-600 hover:text-yellow-700 font-medium"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {filteredQuotes.map((quote) => (
              <div
                key={quote.id}
                onClick={() => onQuoteClick(quote.id, quote.category, quote.custom_background)}
                className={`group relative rounded-2xl overflow-hidden shadow-sm border transition-all active:scale-[0.98] cursor-pointer ${
                  quote.custom_background
                    ? 'border-yellow-300 dark:border-yellow-700 min-h-[140px]'
                    : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-yellow-300 dark:hover:border-yellow-700'
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
                <div className={`relative z-10 p-4 ${quote.custom_background ? 'min-h-[140px] flex flex-col justify-between' : ''}`}>
                  {/* Quote Text */}
                  <div className="flex gap-3">
                    <span className="text-xl shrink-0">{quote.category_icon || '📚'}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-relaxed ${
                        quote.custom_background 
                          ? 'text-white drop-shadow-md' 
                          : 'text-gray-800 dark:text-gray-200'
                      }`}>
                        "{quote.text}"
                      </p>
                      {quote.author && (
                        <p className={`text-xs mt-2 ${
                          quote.custom_background 
                            ? 'text-white/80 drop-shadow' 
                            : 'text-gray-500'
                        }`}>
                          — {quote.author}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className={`flex items-center justify-between mt-3 pt-3 ${
                    quote.custom_background 
                      ? 'border-t border-white/20' 
                      : 'border-t border-gray-100 dark:border-gray-800'
                  }`}>
                    <div className="flex items-center gap-2">
                      {quote.custom_background && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          quote.custom_background 
                            ? 'bg-white/20 text-white' 
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          <ImageIcon size={10} />
                          Custom BG
                        </span>
                      )}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        quote.custom_background 
                          ? 'bg-white/20 text-white' 
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                      }`}>
                        {quote.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleShare(e, quote)}
                        className={`p-2 rounded-lg transition-colors ${
                          quote.custom_background
                            ? 'bg-white/20 hover:bg-white/30 text-white'
                            : 'bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 text-blue-600'
                        }`}
                      >
                        <Share2 size={16} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(quote.id);
                        }}
                        disabled={deletingId === quote.id}
                        className={`p-2 rounded-lg transition-colors ${
                          quote.custom_background
                            ? 'bg-white/20 hover:bg-red-500/50 text-white'
                            : 'bg-red-50 dark:bg-red-900/30 hover:bg-red-100 text-red-600'
                        } disabled:opacity-50`}
                      >
                        {deletingId === quote.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

