'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Sparkles, Trash2, Share2, Loader2, X, Edit3, Globe, Lock, Plus, ArrowLeft, MoreVertical } from 'lucide-react';
import toast from 'react-hot-toast';
import { isQuotePublic } from '@/lib/helpers';
import { BACKGROUND_IMAGES } from '@/lib/constants';

interface UserQuote {
  id: string | number;
  text: string;
  author: string;
  category?: string;
  category_icon?: string;
  is_public?: boolean | number;
  created_at?: string;
  custom_background?: string;
  background_id?: string;
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
  const [activeActionsId, setActiveActionsId] = useState<string | number | null>(null);

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
    setActiveActionsId(null);
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

  // Toggle actions menu (for mobile)
  const toggleActions = useCallback((e: React.MouseEvent, quoteId: string | number) => {
    e.stopPropagation();
    setActiveActionsId(prev => prev === quoteId ? null : quoteId);
  }, []);

  // Handle card click - on mobile with actions shown, close actions; otherwise navigate
  const handleCardClick = useCallback((quote: UserQuote) => {
    if (activeActionsId === quote.id) {
      setActiveActionsId(null);
    } else {
      onViewQuote(quote);
    }
  }, [activeActionsId, onViewQuote]);

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

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
                <Sparkles size={18} className="sm:w-5 sm:h-5 text-rose-500 shrink-0" />
                <span className="truncate">My Quotes</span>
              </h1>
              <p className="text-[10px] sm:text-xs text-stone-500">{quotes.length} quotes created</p>
            </div>

            {/* Create Button */}
            <button
              onClick={onCreateQuote}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white text-xs sm:text-sm font-semibold rounded-lg sm:rounded-xl shadow-sm shadow-orange-500/25 hover:shadow-md transition-all active:scale-95"
            >
              <Plus size={14} className="sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Create</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="mt-2.5 sm:mt-3 relative">
            <Search size={14} className="sm:w-4 sm:h-4 absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search your quotes..."
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
              <p className="text-xs sm:text-sm text-stone-500 font-medium">Loading your quotes...</p>
            </div>
          ) : quotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 sm:py-20 px-4 sm:px-6 text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mb-3 sm:mb-4">
                <Sparkles size={28} className="sm:w-9 sm:h-9 text-rose-500" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-stone-900 dark:text-white mb-1.5 sm:mb-2">No quotes yet</h2>
              <p className="text-xs sm:text-sm text-stone-500 max-w-xs mb-4 sm:mb-6">
                Create your first quote and share your thoughts with the world
              </p>
              <button
                onClick={onCreateQuote}
                className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2.5 sm:py-3 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white text-sm sm:text-base font-semibold rounded-xl shadow-md shadow-orange-500/25 hover:shadow-lg transition-all active:scale-95"
              >
                <Plus size={16} className="sm:w-[18px] sm:h-[18px]" />
                Create Your First Quote
              </button>
            </div>
          ) : filteredQuotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 sm:py-20 px-4 sm:px-6 text-center">
              <Search size={28} className="sm:w-8 sm:h-8 text-stone-300 mb-3" />
              <p className="text-xs sm:text-sm text-stone-500">No quotes match "{searchQuery}"</p>
              <button
                onClick={() => setSearchQuery('')}
                className="mt-2 text-xs sm:text-sm text-rose-600 hover:text-rose-700 font-medium"
              >
                Clear search
              </button>
            </div>
          ) : (
            <div className="p-3 sm:p-4 md:p-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
              {filteredQuotes.map((quote) => {
                const isPublic = isQuotePublic(quote.is_public);
                const hasCustomBg = !!quote.custom_background;
                // Get preset background URL if background_id is set
                const presetBg = quote.background_id 
                  ? BACKGROUND_IMAGES.find(bg => bg.id === quote.background_id)?.url 
                  : null;
                
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
                const backgroundUrl = quote.custom_background || presetBg || defaultBgs[bgIndex];
                
                const isActionsVisible = activeActionsId === quote.id;
                
                return (
                  <div
                    key={quote.id}
                    onClick={() => handleCardClick(quote)}
                    className="group relative aspect-[3/4] rounded-xl sm:rounded-2xl overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform duration-200 shadow-sm"
                  >
                    {/* Background Image */}
                    <div 
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url(${backgroundUrl})` }}
                    />
                    
                    {/* Dark Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    
                    {/* Top Icons Row */}
                    <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-10">
                      {/* Visibility Badge */}
                      <span className={`text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full flex items-center gap-0.5 backdrop-blur-sm ${
                        isPublic
                          ? 'bg-green-500/30 text-green-200'
                          : 'bg-black/30 text-white/80'
                      }`}>
                        {isPublic ? <Globe size={9} className="sm:w-[10px] sm:h-[10px]" /> : <Lock size={9} className="sm:w-[10px] sm:h-[10px]" />}
                        <span className="hidden sm:inline">{isPublic ? 'Public' : 'Private'}</span>
                      </span>
                      
                      {/* Mobile Menu Button (hidden when actions shown) + Sparkle Icon */}
                      <div className="flex items-center gap-1">
                        {!isActionsVisible && (
                          <button
                            onClick={(e) => toggleActions(e, quote.id)}
                            className="p-1.5 bg-black/30 backdrop-blur-sm rounded-lg sm:hidden active:bg-black/50"
                          >
                            <MoreVertical size={14} className="text-white" />
                          </button>
                        )}
                        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-br from-amber-500 to-rose-500 flex items-center justify-center shadow-lg">
                          <Sparkles size={12} className="sm:w-3.5 sm:h-3.5 text-white" />
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Buttons - Shows instantly on mobile when active, with transition on desktop hover */}
                    <div className={`absolute top-10 right-2 flex flex-col gap-1 z-10 ${
                      isActionsVisible 
                        ? 'flex' 
                        : 'hidden sm:flex sm:opacity-0 sm:group-hover:opacity-100 sm:pointer-events-none sm:group-hover:pointer-events-auto sm:transition-opacity'
                    }`}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveActionsId(null);
                          onEditQuote(quote);
                        }}
                        className="p-2 sm:p-1.5 bg-black/40 backdrop-blur-sm hover:bg-black/60 active:bg-black/60 rounded-lg"
                        title="Edit"
                      >
                        <Edit3 size={16} className="sm:w-3.5 sm:h-3.5 text-white" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveActionsId(null);
                          onShareQuote(quote);
                        }}
                        className="p-2 sm:p-1.5 bg-orange-500/60 backdrop-blur-sm hover:bg-orange-500/80 active:bg-orange-500/80 rounded-lg"
                        title="Share"
                      >
                        <Share2 size={16} className="sm:w-3.5 sm:h-3.5 text-white" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(quote.id);
                        }}
                        disabled={deletingId === quote.id}
                        className="p-2 sm:p-1.5 bg-red-500/60 backdrop-blur-sm hover:bg-red-500/80 active:bg-red-500/80 rounded-lg disabled:opacity-50"
                        title="Delete"
                      >
                        {deletingId === quote.id ? (
                          <Loader2 size={16} className="sm:w-3.5 sm:h-3.5 text-white animate-spin" />
                        ) : (
                          <Trash2 size={16} className="sm:w-3.5 sm:h-3.5 text-white" />
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

      {/* Floating Create Button */}
      {quotes.length > 0 && (
        <button
          onClick={onCreateQuote}
          className="fixed right-3 sm:right-4 md:right-6 w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 text-white rounded-full shadow-lg shadow-orange-500/30 flex items-center justify-center hover:shadow-xl transition-all active:scale-95 z-20"
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
