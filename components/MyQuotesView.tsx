'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Sparkles, Trash2, Share2, Loader2, X, Edit3, Globe, Lock, Plus, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { isQuotePublic } from '@/lib/helpers';

interface UserQuote {
  id: string | number;
  text: string;
  author: string;
  category?: string;
  category_icon?: string;
  is_public?: boolean | number;
  created_at?: string;
  custom_background?: string;
}

interface MyQuotesViewProps {
  onBack: () => void;
  onCreateQuote: () => void;
  onEditQuote: (quote: UserQuote) => void;
  onShareQuote: (quote: UserQuote) => void;
  onViewQuote: (quote: UserQuote) => void;
  quotes: UserQuote[];
  onRefresh: () => void;
  onDeleteQuote: (quoteId: string | number) => void;
}

export default function MyQuotesView({
  onBack,
  onCreateQuote,
  onEditQuote,
  onShareQuote,
  onViewQuote,
  quotes,
  onRefresh,
  onDeleteQuote,
}: MyQuotesViewProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | number | null>(null);

  // Refresh quotes on mount
  useEffect(() => {
    onRefresh();
  }, [onRefresh]);

  // Filter quotes by search
  const filteredQuotes = useMemo(() => {
    if (!searchQuery.trim()) return quotes;
    const q = searchQuery.toLowerCase();
    return quotes.filter(quote =>
      quote.text.toLowerCase().includes(q) ||
      quote.author.toLowerCase().includes(q) ||
      (quote.category && quote.category.toLowerCase().includes(q))
    );
  }, [quotes, searchQuery]);

  // Handle delete
  const handleDelete = useCallback(async (quoteId: string | number) => {
    setDeletingId(quoteId);
    try {
      const response = await fetch(`/api/user/quotes/${quoteId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onDeleteQuote(quoteId);
        toast.success('Quote deleted');
      } else {
        toast.error('Failed to delete quote');
      }
    } catch (error) {
      toast.error('Failed to delete quote');
    } finally {
      setDeletingId(null);
    }
  }, [onDeleteQuote]);

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div 
      className="fixed inset-0 z-30 bg-gray-50 dark:bg-gray-950 flex flex-col"
      style={{ 
        paddingTop: 'env(safe-area-inset-top, 0px)',
        overscrollBehavior: 'none',
      }}
    >
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onBack}
              className="p-1.5 sm:p-2 -ml-1 sm:-ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <ArrowLeft size={18} className="sm:w-5 sm:h-5 text-gray-600 dark:text-gray-400" />
            </button>
            
            <div className="flex-1 min-w-0">
              <h1 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-1.5 sm:gap-2">
                <Sparkles size={18} className="sm:w-5 sm:h-5 text-purple-500 shrink-0" />
                <span className="truncate">My Quotes</span>
              </h1>
              <p className="text-[10px] sm:text-xs text-gray-500">{quotes.length} quotes created</p>
            </div>

            {/* Create Button */}
            <button
              onClick={onCreateQuote}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs sm:text-sm font-semibold rounded-lg sm:rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95"
            >
              <Plus size={14} className="sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Create</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="mt-2.5 sm:mt-3 relative">
            <Search size={14} className="sm:w-4 sm:h-4 absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search your quotes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 sm:pl-9 pr-8 sm:pr-9 py-2 sm:py-2.5 bg-gray-100 dark:bg-gray-800 rounded-lg sm:rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
              <Loader2 size={28} className="sm:w-8 sm:h-8 animate-spin text-purple-500 mb-3" />
              <p className="text-xs sm:text-sm text-gray-500">Loading your quotes...</p>
            </div>
          ) : quotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 sm:py-20 px-4 sm:px-6 text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-3 sm:mb-4">
                <Sparkles size={28} className="sm:w-9 sm:h-9 text-purple-500" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-1.5 sm:mb-2">No quotes yet</h2>
              <p className="text-xs sm:text-sm text-gray-500 max-w-xs mb-4 sm:mb-6">
                Create your first quote and share your thoughts with the world
              </p>
              <button
                onClick={onCreateQuote}
                className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2.5 sm:py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm sm:text-base font-semibold rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95"
              >
                <Plus size={16} className="sm:w-[18px] sm:h-[18px]" />
                Create Your First Quote
              </button>
            </div>
          ) : filteredQuotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 sm:py-20 px-4 sm:px-6 text-center">
              <Search size={28} className="sm:w-8 sm:h-8 text-gray-300 mb-3" />
              <p className="text-xs sm:text-sm text-gray-500">No quotes match "{searchQuery}"</p>
              <button
                onClick={() => setSearchQuery('')}
                className="mt-2 text-xs sm:text-sm text-purple-600 hover:text-purple-700 font-medium"
              >
                Clear search
              </button>
            </div>
          ) : (
            <div className="p-3 sm:p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {filteredQuotes.map((quote) => {
                const isPublic = isQuotePublic(quote.is_public);
                const hasCustomBg = !!quote.custom_background;
                
                return (
                  <div
                    key={quote.id}
                    onClick={() => onViewQuote(quote)}
                    className="group relative rounded-xl sm:rounded-2xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-800 hover:border-purple-300 dark:hover:border-purple-700 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    {/* Background - custom or default */}
                    {hasCustomBg ? (
                      <div 
                        className="absolute inset-0 bg-cover bg-center"
                        style={{ backgroundImage: `url(${quote.custom_background})` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/60" />
                      </div>
                    ) : (
                      <div className="absolute inset-0 bg-white dark:bg-gray-900" />
                    )}
                    
                    {/* Gradient accent bar */}
                    <div className="absolute top-0 left-0 right-0 h-0.5 sm:h-1 bg-gradient-to-r from-purple-500 to-pink-500 z-10" />

                    {/* Content */}
                    <div className="relative z-10 p-3 sm:p-4 pt-3.5 sm:pt-5">
                      {/* Quote Text */}
                      <div className="flex gap-2 sm:gap-3">
                        <span className="text-lg sm:text-xl shrink-0">{quote.category_icon || '✨'}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs sm:text-sm leading-relaxed line-clamp-3 ${
                            hasCustomBg 
                              ? 'text-white drop-shadow-md' 
                              : 'text-gray-800 dark:text-gray-200'
                          }`}>
                            "{quote.text}"
                          </p>
                          {quote.author && (
                            <p className={`text-[10px] sm:text-xs mt-1.5 sm:mt-2 ${
                              hasCustomBg 
                                ? 'text-white/80 drop-shadow' 
                                : 'text-gray-500'
                            }`}>— {quote.author}</p>
                          )}
                        </div>
                      </div>

                      {/* Meta & Actions */}
                      <div className={`flex items-center justify-between mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t ${
                        hasCustomBg 
                          ? 'border-white/20' 
                          : 'border-gray-100 dark:border-gray-800'
                      }`}>
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          {/* Visibility Badge */}
                          <span className={`text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full flex items-center gap-0.5 sm:gap-1 ${
                            hasCustomBg
                              ? isPublic
                                ? 'bg-green-500/30 text-green-200'
                                : 'bg-white/20 text-white/80'
                              : isPublic
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                          }`}>
                            {isPublic ? <Globe size={9} className="sm:w-[10px] sm:h-[10px]" /> : <Lock size={9} className="sm:w-[10px] sm:h-[10px]" />}
                            {isPublic ? 'Public' : 'Private'}
                          </span>
                          
                          {/* Date */}
                          {quote.created_at && (
                            <span className={`text-[9px] sm:text-[10px] ${
                              hasCustomBg ? 'text-white/60' : 'text-gray-400'
                            }`}>
                              {formatDate(quote.created_at)}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-0.5 sm:gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditQuote(quote);
                            }}
                            className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                              hasCustomBg
                                ? 'bg-white/20 hover:bg-white/30 text-white'
                                : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                            }`}
                          >
                            <Edit3 size={14} className="sm:w-4 sm:h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onShareQuote(quote);
                            }}
                            className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                              hasCustomBg
                                ? 'bg-blue-500/30 hover:bg-blue-500/40 text-blue-200'
                                : 'bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 text-blue-600'
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
                            className={`p-1.5 sm:p-2 rounded-lg transition-colors disabled:opacity-50 ${
                              hasCustomBg
                                ? 'bg-red-500/30 hover:bg-red-500/40 text-red-200'
                                : 'bg-red-50 dark:bg-red-900/30 hover:bg-red-100 text-red-600'
                            }`}
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
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Floating Create Button */}
      {quotes.length > 0 && (
        <button
          onClick={onCreateQuote}
          className="fixed right-3 sm:right-4 md:right-6 w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition-all active:scale-95 z-20"
          style={{
            bottom: 'calc(76px + env(safe-area-inset-bottom, 0px))',
          }}
        >
          <Plus size={20} className="sm:w-6 sm:h-6" />
        </button>
      )}
    </div>
  );
}
