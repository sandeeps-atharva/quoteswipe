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

// Calculate font size based on text length (same as QuoteCard)
const calculateFontSize = (textLength: number, minSize: number, maxSize: number): number => {
  if (textLength <= 50) return maxSize;
  if (textLength <= 100) {
    const ratio = (textLength - 50) / 50;
    return maxSize - (maxSize - minSize) * ratio * 0.2;
  }
  if (textLength <= 180) {
    const ratio = (textLength - 100) / 80;
    return maxSize * 0.8 - (maxSize * 0.8 - minSize) * ratio * 0.3;
  }
  if (textLength <= 280) {
    const ratio = (textLength - 180) / 100;
    return maxSize * 0.56 - (maxSize * 0.56 - minSize) * ratio * 0.35;
  }
  if (textLength <= 400) {
    const ratio = (textLength - 280) / 120;
    return maxSize * 0.38 - (maxSize * 0.38 - minSize) * ratio * 0.4;
  }
  return minSize;
};

// Calculate line height based on text length
const calculateLineHeight = (textLength: number): number => {
  if (textLength > 350) return 1.35;
  if (textLength > 250) return 1.4;
  if (textLength > 150) return 1.45;
  if (textLength > 80) return 1.5;
  return 1.6;
};

const TranslatableQuote = memo(function TranslatableQuote({ text, fontStyle, textColor, textLength }: TranslatableQuoteProps) {
  const { translatedText, isLoading: isTranslating } = useTranslation({ text, enabled: true });
  const { isOriginal } = useLanguage();
  
  const displayText = translatedText || text;
  
  // Responsive font sizes for mobile, tablet, and desktop (same as QuoteCard)
  const fontSizes = useMemo(() => ({
    base: calculateFontSize(textLength, 12, 17), // Mobile min/max
    sm: calculateFontSize(textLength, 13, 19),   // Small screens
    md: calculateFontSize(textLength, 15, 24),   // Medium screens
    lg: calculateFontSize(textLength, 17, 28),   // Large screens
    xl: calculateFontSize(textLength, 19, 32),   // Extra large screens
  }), [textLength]);
  
  const lineHeight = useMemo(() => calculateLineHeight(textLength), [textLength]);
  
  return (
    <div className="text-center px-4 sm:px-6 md:px-8">
      {/* Translation indicator - Mobile Optimized */}
      {!isOriginal && isTranslating && (
        <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-3 sm:mb-4">
          <Loader2 size={14} className="sm:w-4 sm:h-4 animate-spin" style={{ color: textColor }} />
          <span className="text-xs sm:text-sm font-medium" style={{ color: textColor, opacity: 0.8 }}>
            Translating...
          </span>
        </div>
      )}
      
      {/* Opening quote mark - Mobile Optimized */}
      <QuoteIcon 
        size={24}
        className="sm:w-7 sm:h-7 md:w-8 md:h-8 mx-auto mb-3 sm:mb-4 opacity-40 rotate-180" 
        style={{ color: textColor }}
        fill="currentColor"
      />
      
      <p
        className={`font-medium transition-opacity duration-200 ${isTranslating ? 'opacity-40' : 'opacity-100'}`}
        style={{
          fontFamily: fontStyle.fontFamily,
          fontWeight: fontStyle.fontWeight,
          color: textColor,
          textShadow: '0 2px 12px rgba(0,0,0,0.4)',
          fontSize: `clamp(${fontSizes.base}px, 2.5vw, ${fontSizes.xl}px)`,
          lineHeight: lineHeight,
          wordWrap: 'normal',
          overflowWrap: 'normal',
          wordBreak: 'keep-all',
          hyphens: 'none',
          WebkitHyphens: 'none',
          msHyphens: 'none',
          whiteSpace: 'normal',
          overflow: 'hidden',
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
      {/* Feed Container - Mobile Optimized */}
      <div className="max-w-[500px] mx-auto px-2 sm:px-3 md:px-4 py-3 sm:py-4 md:py-6 space-y-3 sm:space-y-4 md:space-y-6">
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
              className={`group relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl sm:shadow-2xl transition-all duration-300 active:scale-[0.98] sm:hover:shadow-3xl sm:transform sm:hover:-translate-y-1 ${
                isTargetQuote ? 'ring-2 sm:ring-4 ring-amber-500/60 ring-offset-2 sm:ring-offset-4 ring-offset-stone-50 dark:ring-offset-stone-950 shadow-amber-500/20' : ''
              }`}
              style={{
                boxShadow: isTargetQuote 
                  ? '0 15px 30px -8px rgba(245, 158, 11, 0.3), 0 0 0 2px rgba(245, 158, 11, 0.1)' 
                  : '0 10px 25px -8px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.05)',
              }}
            >
              {/* Main Card Content */}
              <div 
                className="relative aspect-[4/5] cursor-pointer select-none overflow-hidden touch-none"
                onClick={() => handleDoubleTap(quote)}
              >
                {/* Background */}
                <div 
                  className="absolute inset-0 transition-transform duration-500 sm:group-hover:scale-110"
                  style={getBackgroundStyle(quote.id)}
                />
                
                {/* Enhanced Gradient Overlay - Mobile Optimized */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 via-black/10 to-black/45 sm:from-black/70 sm:via-black/20 sm:via-black/5 sm:to-black/40" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/35 sm:to-black/30" />
                
                {/* Decorative Corner Accent - Hidden on Mobile */}
                <div className="hidden sm:block absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent rounded-bl-full" />
                
                {/* Top Bar - Category & Actions - Mobile Optimized */}
                <div className="absolute top-0 left-0 right-0 p-3 sm:p-4 md:p-5 flex items-center justify-between z-10">
                  {/* Enhanced Category Badge - Mobile Optimized */}
                  <div className="flex items-center gap-1.5 sm:gap-2.5 bg-white/30 dark:bg-black/50 backdrop-blur-xl rounded-full pl-1.5 sm:pl-2 pr-2.5 sm:pr-4 py-1.5 sm:py-2 border border-white/40 dark:border-white/20 shadow-lg">
                    <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full bg-white/95 dark:bg-stone-800 flex items-center justify-center text-sm sm:text-base shadow-md ring-1 sm:ring-2 ring-white/50">
                      {quote.category_icon || '💭'}
                    </div>
                    <span className="text-[10px] sm:text-xs font-bold text-white drop-shadow-lg tracking-wide uppercase hidden xs:inline">
                      {quote.category}
                    </span>
                  </div>
                  
                  {/* Enhanced More Options Button - Mobile Optimized */}
                  <button className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full bg-white/30 dark:bg-black/50 backdrop-blur-xl flex items-center justify-center border border-white/40 dark:border-white/20 text-white active:bg-white/40 active:scale-95 sm:hover:bg-white/35 sm:hover:scale-110 transition-all duration-200 shadow-lg touch-manipulation">
                    <MoreHorizontal size={16} className="sm:w-[19px] sm:h-[19px]" strokeWidth={2.5} />
                  </button>
                </div>
                
                {/* Quote Content - Centered with Mobile Optimized Spacing */}
                <div className="absolute inset-0 flex flex-col items-center justify-center px-4 sm:px-6 md:px-8 pb-20 sm:pb-24">
                  <TranslatableQuote 
                    text={quote.text}
                    fontStyle={fontStyle}
                    textColor={quoteBg.textColor || '#ffffff'}
                    textLength={quote.text.length}
                  />
                </div>
                
                {/* Enhanced Author Badge - Bottom - Mobile Optimized */}
                <div className="absolute bottom-16 sm:bottom-20 left-0 right-0 flex justify-center px-3 sm:px-4">
                  <div className="bg-white/30 dark:bg-black/50 backdrop-blur-xl rounded-full px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 md:py-2.5 border border-white/40 dark:border-white/20 shadow-lg">
                    <span className="text-xs sm:text-sm font-semibold text-white drop-shadow-lg tracking-wide">
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

              {/* Enhanced Action Bar - Mobile Optimized Glassmorphism */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white/98 via-white/95 to-white/92 dark:from-stone-900/98 dark:via-stone-900/95 dark:to-stone-900/92 backdrop-blur-2xl border-t border-white/50 dark:border-stone-700/70 shadow-[0_-2px_15px_rgba(0,0,0,0.1)] sm:shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
                <div className="flex items-center justify-between px-2 sm:px-3 md:px-4 py-2.5 sm:py-3">
                  {/* Left Actions - Mobile Optimized */}
                  <div className="flex items-center gap-0.5 sm:gap-1">
                    {/* Enhanced Like Button - Mobile Optimized */}
                    <button
                      onClick={(e) => handleLikeWithAnimation(quote, e)}
                      className={`group/btn flex items-center gap-1 sm:gap-2 px-2.5 sm:px-3 md:px-3.5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl transition-all duration-200 active:scale-95 touch-manipulation ${
                        isLiked 
                          ? 'bg-gradient-to-br from-rose-100 to-rose-50 dark:from-rose-950/60 dark:to-rose-900/40 shadow-md shadow-rose-500/20' 
                          : 'active:bg-stone-100 dark:active:bg-stone-800/80 sm:hover:bg-stone-100 sm:dark:hover:bg-stone-800/80 sm:hover:shadow-md'
                      }`}
                      aria-label="Like quote"
                    >
                      <Heart
                        size={20}
                        className={`sm:w-[22px] sm:h-[22px] md:w-[23px] md:h-[23px] transition-all duration-200 ${
                          isLiked 
                            ? 'text-rose-500 fill-rose-500' 
                            : 'text-stone-600 dark:text-stone-300 sm:group-hover/btn:text-rose-500'
                        } ${showLikeAnimation ? 'scale-125 animate-pulse' : 'scale-100'}`}
                        strokeWidth={2.5}
                      />
                      {likesCount > 0 && (
                        <span className={`text-xs sm:text-sm font-bold hidden sm:inline ${
                          isLiked ? 'text-rose-600 dark:text-rose-400' : 'text-stone-700 dark:text-stone-200'
                        }`}>
                          {formatCount(likesCount)}
                        </span>
                      )}
                    </button>

                    {/* Enhanced Skip/Dislike Button - Mobile Optimized */}
                    <button
                      onClick={(e) => handleAction(() => onDislike(quote.id), e)}
                      className={`p-2 sm:p-2.5 rounded-xl sm:rounded-2xl transition-all duration-200 active:scale-95 touch-manipulation ${
                        isDisliked 
                          ? 'bg-stone-200 dark:bg-stone-700 shadow-md' 
                          : 'active:bg-stone-100 dark:active:bg-stone-800/80 sm:hover:bg-stone-100 sm:dark:hover:bg-stone-800/80 sm:hover:shadow-md'
                      }`}
                      aria-label="Dislike quote"
                    >
                      <ThumbsDown
                        size={18}
                        className={`sm:w-[20px] sm:h-[20px] md:w-[21px] md:h-[21px] transition-all duration-200 ${
                          isDisliked 
                            ? 'text-stone-500 fill-stone-400' 
                            : 'text-stone-600 dark:text-stone-300 sm:hover:text-stone-700 sm:dark:hover:text-stone-200'
                        }`}
                        strokeWidth={2.5}
                      />
                    </button>

                    {/* Enhanced Copy Button - Mobile Optimized */}
                    <button
                      onClick={(e) => handleCopy(quote, e)}
                      className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl active:bg-stone-100 dark:active:bg-stone-800/80 sm:hover:bg-stone-100 sm:dark:hover:bg-stone-800/80 transition-all duration-200 active:scale-95 sm:hover:shadow-md touch-manipulation"
                      aria-label="Copy quote"
                    >
                      {isCopied ? (
                        <Check size={18} className="sm:w-[20px] sm:h-[20px] md:w-[21px] md:h-[21px] text-emerald-500 animate-in zoom-in duration-200" strokeWidth={2.5} />
                      ) : (
                        <Copy size={18} className="sm:w-[20px] sm:h-[20px] md:w-[21px] md:h-[21px] text-stone-600 dark:text-stone-300 sm:hover:text-emerald-500 transition-colors" strokeWidth={2.5} />
                      )}
                    </button>

                    {/* Enhanced Share Button - Mobile Optimized */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onShare(quote);
                      }}
                      className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl active:bg-stone-100 dark:active:bg-stone-800/80 sm:hover:bg-stone-100 sm:dark:hover:bg-stone-800/80 transition-all duration-200 active:scale-95 sm:hover:shadow-md touch-manipulation"
                      aria-label="Share quote"
                    >
                      <Send size={18} className="sm:w-[20px] sm:h-[20px] md:w-[21px] md:h-[21px] text-stone-600 dark:text-stone-300 sm:hover:text-sky-500 transition-colors" strokeWidth={2.5} />
                    </button>

                    {/* Enhanced Edit Background Button - Mobile Optimized */}
                    {onEditBackground && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditBackground(quote);
                        }}
                        className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl active:bg-stone-100 dark:active:bg-stone-800/80 sm:hover:bg-stone-100 sm:dark:hover:bg-stone-800/80 transition-all duration-200 active:scale-95 sm:hover:shadow-md touch-manipulation"
                        aria-label="Edit background"
                      >
                        <Palette size={18} className="sm:w-[20px] sm:h-[20px] md:w-[21px] md:h-[21px] text-stone-600 dark:text-stone-300 sm:hover:text-violet-500 transition-colors" strokeWidth={2.5} />
                      </button>
                    )}
                  </div>

                  {/* Enhanced Right Action - Save - Mobile Optimized */}
                  <button
                    onClick={(e) => handleAction(() => onSave(quote.id), e)}
                    className={`p-2 sm:p-2.5 rounded-xl sm:rounded-2xl transition-all duration-200 active:scale-95 touch-manipulation ${
                      isSaved 
                        ? 'bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-950/60 dark:to-amber-900/40 shadow-md shadow-amber-500/20' 
                        : 'active:bg-stone-100 dark:active:bg-stone-800/80 sm:hover:bg-stone-100 sm:dark:hover:bg-stone-800/80 sm:hover:shadow-md'
                    }`}
                    aria-label="Save quote"
                  >
                    <Bookmark
                      size={20}
                      className={`sm:w-[22px] sm:h-[22px] md:w-[23px] md:h-[23px] transition-all duration-200 ${
                        isSaved 
                          ? 'text-amber-500 fill-amber-500' 
                          : 'text-stone-600 dark:text-stone-300 sm:hover:text-amber-500'
                      }`}
                      strokeWidth={2.5}
                    />
                  </button>
                </div>
              </div>
            </article>
          );
        })}

      {/* Load More - Mobile Optimized */}
      {visibleCount < uniqueQuotes.length && (
        <div ref={loadMoreRef} className="flex justify-center py-6 sm:py-8">
          <div className="flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2.5 sm:py-3 bg-white/70 dark:bg-stone-800/70 backdrop-blur-md rounded-full border border-stone-200/50 dark:border-stone-700/50">
            <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-stone-400 border-t-amber-500 rounded-full animate-spin" />
            <span className="text-xs sm:text-sm font-medium text-stone-600 dark:text-stone-300">Loading more...</span>
          </div>
        </div>
      )}

        {/* End of Feed - Mobile Optimized */}
        {visibleCount >= uniqueQuotes.length && uniqueQuotes.length > 0 && (
          <div className="text-center py-8 sm:py-12 px-4 sm:px-6">
            <div className="inline-flex flex-col items-center bg-white/70 dark:bg-stone-800/70 backdrop-blur-md rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-stone-200/50 dark:border-stone-700/50">
              <div className="w-16 h-16 sm:w-20 sm:h-20 mb-3 sm:mb-4 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <Check size={32} className="sm:w-10 sm:h-10 text-white" strokeWidth={3} />
              </div>
              <p className="text-lg sm:text-xl font-bold text-stone-800 dark:text-white">All Caught Up! ✨</p>
              <p className="text-stone-500 dark:text-stone-400 text-xs sm:text-sm mt-1 sm:mt-2">You've seen all the quotes</p>
              <button
                onClick={scrollToTop}
                className="mt-4 sm:mt-6 px-5 sm:px-6 py-2 sm:py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full font-semibold text-xs sm:text-sm shadow-lg shadow-amber-500/25 active:scale-95 sm:hover:shadow-xl sm:hover:shadow-amber-500/30 sm:hover:scale-105 transition-all duration-300 touch-manipulation"
              >
                Back to Top
              </button>
            </div>
          </div>
        )}

        {/* Bottom Spacing */}
        <div className="h-4" />
      </div>

      {/* Enhanced Scroll to Top Button - Mobile Optimized */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-20 sm:bottom-20 right-3 sm:right-4 md:right-6 w-12 h-12 sm:w-13 sm:h-13 md:w-14 md:h-14 bg-gradient-to-br from-white to-stone-50 dark:from-stone-800 dark:to-stone-900 text-stone-700 dark:text-white rounded-xl sm:rounded-2xl shadow-xl sm:shadow-2xl active:scale-95 sm:hover:shadow-3xl sm:hover:scale-110 transition-all duration-300 z-50 border-2 border-stone-200/50 dark:border-stone-700/50 flex items-center justify-center backdrop-blur-sm touch-manipulation"
          aria-label="Scroll to top"
        >
          <ChevronUp size={22} className="sm:w-[24px] sm:h-[24px] md:w-[26px] md:h-[26px]" strokeWidth={2.5} />
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
