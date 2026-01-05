'use client';

import { useState, useRef, useEffect, useMemo, memo } from 'react';
import { Heart, Send, Bookmark, MoreHorizontal, Copy, Check, ChevronUp, ThumbsDown, Loader2, Sparkles, Quote as QuoteIcon, Palette } from 'lucide-react';
import { BackgroundImage, FontStyle, CardTheme, getRandomBackgroundForQuote } from '@/lib/constants';
import { useTranslation } from '@/hooks/useTranslation';
import { useLanguage } from '@/contexts/LanguageContext';

// Separate component for translatable quote text
interface TranslatableQuoteProps {
  text: string;
  fontStyle: FontStyle;
  textColor: string;
  textLength: number;
}

const TranslatableQuote = memo(function TranslatableQuote({ text, fontStyle, textColor, textLength }: TranslatableQuoteProps) {
  const { translatedText, isLoading: isTranslating } = useTranslation({ text, enabled: true });
  const { isOriginal } = useLanguage();
  
  const displayText = translatedText || text;
  
  // Dynamic font size based on text length
  const getFontSize = () => {
    if (textLength <= 80) return 'text-2xl sm:text-3xl';
    if (textLength <= 150) return 'text-xl sm:text-2xl';
    if (textLength <= 250) return 'text-lg sm:text-xl';
    return 'text-base sm:text-lg';
  };
  
  return (
    <div className="text-center px-6 sm:px-8">
      {/* Translation indicator */}
      {!isOriginal && isTranslating && (
        <div className="flex items-center justify-center gap-2 mb-4">
          <Loader2 size={16} className="animate-spin" style={{ color: textColor }} />
          <span className="text-sm font-medium" style={{ color: textColor, opacity: 0.8 }}>
            Translating...
          </span>
        </div>
      )}
      
      {/* Opening quote mark */}
      <QuoteIcon 
        size={28} 
        className="mx-auto mb-4 opacity-40 rotate-180" 
        style={{ color: textColor }}
        fill="currentColor"
      />
      
      <p
        className={`${getFontSize()} leading-relaxed font-medium transition-opacity duration-200 ${isTranslating ? 'opacity-40' : 'opacity-100'}`}
        style={{
          fontFamily: fontStyle.fontFamily,
          color: textColor,
          textShadow: '0 2px 12px rgba(0,0,0,0.4)',
          lineHeight: 1.6,
        }}
      >
        {displayText}
      </p>
    </div>
  );
});

interface Quote {
  id: string | number;
  text: string;
  author: string;
  category: string;
  category_icon?: string;
  likes_count?: number;
  dislikes_count?: number;
  is_liked?: number;
  is_disliked?: number;
  is_saved?: number;
}

interface FeedViewProps {
  quotes: Quote[];
  likedQuoteIds: Set<string | number>;
  dislikedQuoteIds: Set<string | number>;
  savedQuoteIds: Set<string | number>;
  onLike: (quoteId: string | number) => void;
  onDislike: (quoteId: string | number) => void;
  onSave: (quoteId: string | number) => void;
  onShare: (quote: Quote) => void;
  onEditBackground?: (quote: Quote) => void;
  cardTheme: CardTheme;
  fontStyle: FontStyle;
  backgroundImage: BackgroundImage;
  isAuthenticated: boolean;
  onLoginRequired: () => void;
  targetQuoteId?: string | number | null;
  targetQuoteBackground?: BackgroundImage | null;
}

export default function FeedView({
  quotes,
  likedQuoteIds,
  dislikedQuoteIds,
  savedQuoteIds,
  onLike,
  onDislike,
  onSave,
  onShare,
  onEditBackground,
  cardTheme,
  fontStyle,
  backgroundImage,
  isAuthenticated,
  onLoginRequired,
  targetQuoteId,
  targetQuoteBackground,
}: FeedViewProps) {
  const [copiedId, setCopiedId] = useState<string | number | null>(null);
  const [doubleTapId, setDoubleTapId] = useState<string | number | null>(null);
  const [likeAnimationId, setLikeAnimationId] = useState<string | number | null>(null);
  const [visibleCount, setVisibleCount] = useState(10);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef<{ id: string | number; time: number } | null>(null);

  // Deduplicate quotes
  const uniqueQuotes = useMemo(() => {
    const seen = new Set<string>();
    return quotes.filter(q => {
      const key = String(q.id);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [quotes]);

  // Get visible quotes
  const visibleQuotes = useMemo(() => {
    return uniqueQuotes.slice(0, visibleCount);
  }, [uniqueQuotes, visibleCount]);

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < uniqueQuotes.length) {
          setVisibleCount(prev => Math.min(prev + 10, uniqueQuotes.length));
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [visibleCount, uniqueQuotes.length]);

  // Scroll to top button visibility
  useEffect(() => {
    const handleScroll = () => {
      if (containerRef.current) {
        setShowScrollTop(containerRef.current.scrollTop > 500);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  // Reset on quotes change
  useEffect(() => {
    setVisibleCount(10);
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [quotes.length, targetQuoteId]);

  const scrollToTop = () => {
    containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCopy = async (quote: Quote, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(`"${quote.text}" - ${quote.author}`);
      setCopiedId(quote.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDoubleTap = (quote: Quote) => {
    const now = Date.now();
    const lastTap = lastTapRef.current;

    if (lastTap && lastTap.id === quote.id && now - lastTap.time < 300) {
      if (!isAuthenticated) {
        onLoginRequired();
        return;
      }
      setDoubleTapId(quote.id);
      setLikeAnimationId(quote.id);
      onLike(quote.id);
      setTimeout(() => setDoubleTapId(null), 800);
      setTimeout(() => setLikeAnimationId(null), 1000);
      lastTapRef.current = null;
    } else {
      lastTapRef.current = { id: quote.id, time: now };
    }
  };

  const handleAction = (action: () => void, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      onLoginRequired();
      return;
    }
    action();
  };

  const handleLikeWithAnimation = (quote: Quote, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      onLoginRequired();
      return;
    }
    setLikeAnimationId(quote.id);
    onLike(quote.id);
    setTimeout(() => setLikeAnimationId(null), 300);
  };

  // Get background for quote
  const getQuoteBackground = (quoteId: string | number): BackgroundImage => {
    const isTargetQuote = targetQuoteId && String(quoteId) === String(targetQuoteId);
    if (isTargetQuote && targetQuoteBackground) {
      return targetQuoteBackground;
    }
    
    if (backgroundImage && backgroundImage.id !== 'none' && backgroundImage.url) {
      return backgroundImage;
    }
    
    return getRandomBackgroundForQuote(quoteId);
  };

  const getBackgroundStyle = (quoteId: string | number) => {
    const bg = getQuoteBackground(quoteId);
    
    if (bg.url) {
      if (bg.url.startsWith('linear-gradient') || bg.url.startsWith('radial-gradient')) {
        return { background: bg.url };
      }
      return {
        backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.3) 100%), url(${bg.url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };
    }
    return { background: cardTheme.background };
  };

  const formatCount = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 top-16 bottom-16 overflow-y-auto overscroll-contain bg-gradient-to-b from-stone-50 to-stone-100 dark:from-stone-950 dark:to-stone-900"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {/* Feed Container */}
      <div className="max-w-[500px] mx-auto px-3 sm:px-4 py-4 space-y-5">
        {visibleQuotes.map((quote, index) => {
          const isLiked = likedQuoteIds.has(quote.id) || likedQuoteIds.has(String(quote.id));
          const isDisliked = dislikedQuoteIds.has(quote.id) || dislikedQuoteIds.has(String(quote.id));
          const isSaved = savedQuoteIds.has(quote.id) || savedQuoteIds.has(String(quote.id));
          const isCopied = copiedId === quote.id;
          const showHeartAnimation = doubleTapId === quote.id;
          const showLikeAnimation = likeAnimationId === quote.id;
          const isTargetQuote = targetQuoteId && String(quote.id) === String(targetQuoteId);
          const quoteBg = getQuoteBackground(quote.id);
          const likesCount = quote.likes_count || 0;

          return (
            <article
              key={`${quote.id}-${index}`}
              className={`group relative rounded-3xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-500 ${
                isTargetQuote ? 'ring-2 ring-amber-500/50 ring-offset-2 ring-offset-stone-50 dark:ring-offset-stone-950' : ''
              }`}
            >
              {/* Main Card Content */}
              <div 
                className="relative aspect-[4/5] cursor-pointer select-none"
                onClick={() => handleDoubleTap(quote)}
              >
                {/* Background */}
                <div 
                  className="absolute inset-0 transition-transform duration-700 group-hover:scale-105"
                  style={getBackgroundStyle(quote.id)}
                />
                
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-black/30" />
                
                {/* Top Bar - Category & Actions */}
                <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10">
                  {/* Category Badge */}
                  <div className="flex items-center gap-2 bg-white/20 dark:bg-black/30 backdrop-blur-md rounded-full pl-1.5 pr-3 py-1.5 border border-white/20">
                    <div className="w-7 h-7 rounded-full bg-white/90 dark:bg-stone-800 flex items-center justify-center text-sm shadow-sm">
                      {quote.category_icon || '💭'}
                    </div>
                    <span className="text-xs font-semibold text-white drop-shadow-lg">
                      {quote.category}
                    </span>
                  </div>
                  
                  {/* More Options */}
                  <button className="w-9 h-9 rounded-full bg-white/20 dark:bg-black/30 backdrop-blur-md flex items-center justify-center border border-white/20 text-white hover:bg-white/30 transition-colors">
                    <MoreHorizontal size={18} />
                  </button>
                </div>
                
                {/* Quote Content - Centered */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <TranslatableQuote 
                    text={quote.text}
                    fontStyle={fontStyle}
                    textColor={quoteBg.textColor || '#ffffff'}
                    textLength={quote.text.length}
                  />
                </div>
                
                {/* Author Badge - Bottom */}
                <div className="absolute bottom-20 left-0 right-0 flex justify-center">
                  <div className="bg-white/20 dark:bg-black/30 backdrop-blur-md rounded-full px-4 py-2 border border-white/20">
                    <span className="text-sm font-medium text-white drop-shadow-lg">
                      — {quote.author}
                    </span>
                  </div>
                </div>

                {/* Double-tap Heart Animation */}
                {showHeartAnimation && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                    <div className="relative">
                      <Heart
                        size={120}
                        className="text-rose-500 fill-rose-500 drop-shadow-2xl"
                        style={{
                          animation: 'heartBurst 0.8s ease-out forwards',
                        }}
                      />
                      <Sparkles 
                        size={40} 
                        className="absolute -top-4 -right-4 text-yellow-400"
                        style={{ animation: 'sparkle 0.6s ease-out forwards' }}
                      />
                      <Sparkles 
                        size={30} 
                        className="absolute -bottom-2 -left-6 text-pink-400"
                        style={{ animation: 'sparkle 0.7s ease-out 0.1s forwards' }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Action Bar - Glassmorphism */}
              <div className="absolute bottom-0 left-0 right-0 bg-white/80 dark:bg-stone-900/80 backdrop-blur-xl border-t border-white/30 dark:border-stone-700/50">
                <div className="flex items-center justify-between px-2 py-2">
                  {/* Left Actions */}
                  <div className="flex items-center">
                    {/* Like */}
                    <button
                      onClick={(e) => handleLikeWithAnimation(quote, e)}
                      className={`group/btn flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all duration-300 ${
                        isLiked 
                          ? 'bg-rose-100 dark:bg-rose-950/50' 
                          : 'hover:bg-stone-100 dark:hover:bg-stone-800'
                      }`}
                    >
                      <Heart
                        size={22}
                        className={`transition-all duration-300 ${
                          isLiked 
                            ? 'text-rose-500 fill-rose-500' 
                            : 'text-stone-600 dark:text-stone-300 group-hover/btn:text-rose-500'
                        } ${showLikeAnimation ? 'scale-125' : 'scale-100'}`}
                      />
                      {likesCount > 0 && (
                        <span className={`text-sm font-semibold ${
                          isLiked ? 'text-rose-600 dark:text-rose-400' : 'text-stone-600 dark:text-stone-300'
                        }`}>
                          {formatCount(likesCount)}
                        </span>
                      )}
                    </button>

                    {/* Skip/Dislike */}
                    <button
                      onClick={(e) => handleAction(() => onDislike(quote.id), e)}
                      className={`p-2 rounded-xl transition-all duration-300 ${
                        isDisliked 
                          ? 'bg-stone-200 dark:bg-stone-700' 
                          : 'hover:bg-stone-100 dark:hover:bg-stone-800'
                      }`}
                    >
                      <ThumbsDown
                        size={20}
                        className={`transition-colors ${
                          isDisliked 
                            ? 'text-stone-500 fill-stone-400' 
                            : 'text-stone-600 dark:text-stone-300 hover:text-stone-700'
                        }`}
                      />
                    </button>

                    {/* Copy */}
                    <button
                      onClick={(e) => handleCopy(quote, e)}
                      className="p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-all duration-300"
                    >
                      {isCopied ? (
                        <Check size={20} className="text-emerald-500" />
                      ) : (
                        <Copy size={20} className="text-stone-600 dark:text-stone-300 hover:text-emerald-500 transition-colors" />
                      )}
                    </button>

                    {/* Share */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onShare(quote);
                      }}
                      className="p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-all duration-300"
                    >
                      <Send size={20} className="text-stone-600 dark:text-stone-300 hover:text-sky-500 transition-colors" />
                    </button>

                    {/* Edit Background */}
                    {onEditBackground && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditBackground(quote);
                        }}
                        className="p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-all duration-300"
                      >
                        <Palette size={20} className="text-stone-600 dark:text-stone-300 hover:text-violet-500 transition-colors" />
                      </button>
                    )}
                  </div>

                  {/* Right Action - Save */}
                  <button
                    onClick={(e) => handleAction(() => onSave(quote.id), e)}
                    className={`p-2 rounded-xl transition-all duration-300 ${
                      isSaved 
                        ? 'bg-amber-100 dark:bg-amber-950/50' 
                        : 'hover:bg-stone-100 dark:hover:bg-stone-800'
                    }`}
                  >
                    <Bookmark
                      size={22}
                      className={`transition-colors ${
                        isSaved 
                          ? 'text-amber-500 fill-amber-500' 
                          : 'text-stone-600 dark:text-stone-300 hover:text-amber-500'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </article>
          );
        })}

        {/* Load More */}
        {visibleCount < uniqueQuotes.length && (
          <div ref={loadMoreRef} className="flex justify-center py-8">
            <div className="flex items-center gap-3 px-6 py-3 bg-white/60 dark:bg-stone-800/60 backdrop-blur-md rounded-full border border-stone-200/50 dark:border-stone-700/50">
              <div className="w-5 h-5 border-2 border-stone-400 border-t-amber-500 rounded-full animate-spin" />
              <span className="text-sm font-medium text-stone-600 dark:text-stone-300">Loading more...</span>
            </div>
          </div>
        )}

        {/* End of Feed */}
        {visibleCount >= uniqueQuotes.length && uniqueQuotes.length > 0 && (
          <div className="text-center py-12 px-6">
            <div className="inline-flex flex-col items-center bg-white/60 dark:bg-stone-800/60 backdrop-blur-md rounded-3xl p-8 border border-stone-200/50 dark:border-stone-700/50">
              <div className="w-20 h-20 mb-4 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <Check size={40} className="text-white" strokeWidth={3} />
              </div>
              <p className="text-xl font-bold text-stone-800 dark:text-white">All Caught Up! ✨</p>
              <p className="text-stone-500 dark:text-stone-400 text-sm mt-2">You've seen all the quotes</p>
              <button
                onClick={scrollToTop}
                className="mt-6 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full font-semibold text-sm shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/30 hover:scale-105 transition-all duration-300"
              >
                Back to Top
              </button>
            </div>
          </div>
        )}

        {/* Bottom Spacing */}
        <div className="h-4" />
      </div>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-20 right-4 w-12 h-12 bg-white dark:bg-stone-800 text-stone-700 dark:text-white rounded-full shadow-xl hover:shadow-2xl hover:scale-110 transition-all z-50 border border-stone-200 dark:border-stone-700 flex items-center justify-center"
        >
          <ChevronUp size={24} />
        </button>
      )}

      {/* Custom Animation Styles */}
      <style jsx>{`
        @keyframes heartBurst {
          0% {
            transform: scale(0);
            opacity: 1;
          }
          50% {
            transform: scale(1.3);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 0;
          }
        }
        @keyframes sparkle {
          0% {
            transform: scale(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: scale(1.5) rotate(180deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
