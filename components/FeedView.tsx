'use client';

import { useState, useRef, useEffect, useMemo, memo } from 'react';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Copy, Check, ChevronUp, ThumbsDown, Loader2 } from 'lucide-react';
import { BackgroundImage, FontStyle, CardTheme, getRandomBackgroundForQuote } from '@/lib/constants';
import { useTranslation } from '@/hooks/useTranslation';
import { useLanguage } from '@/contexts/LanguageContext';

// Separate component for translatable quote text
interface TranslatableQuoteProps {
  text: string;
  fontStyle: FontStyle;
  textColor: string;
}

const TranslatableQuote = memo(function TranslatableQuote({ text, fontStyle, textColor }: TranslatableQuoteProps) {
  const { translatedText, isLoading: isTranslating } = useTranslation({ text, enabled: true });
  const { isOriginal } = useLanguage();
  
  const displayText = translatedText || text;
  
  return (
    <div className="text-center max-w-[90%]">
      {/* Translation indicator */}
      {!isOriginal && isTranslating && (
        <div className="flex items-center justify-center gap-1.5 mb-3">
          <Loader2 size={14} className="animate-spin" style={{ color: textColor }} />
          <span className="text-xs font-medium" style={{ color: textColor, opacity: 0.8 }}>
            Translating...
          </span>
        </div>
      )}
      <p
        className={`text-xl sm:text-2xl leading-relaxed font-medium transition-opacity duration-200 ${isTranslating ? 'opacity-40' : 'opacity-100'}`}
        style={{
          fontFamily: fontStyle.fontFamily,
          color: textColor,
          textShadow: '0 2px 8px rgba(0,0,0,0.5)',
        }}
      >
        "{displayText}"
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
  const [expandedQuotes, setExpandedQuotes] = useState<Set<string | number>>(new Set());
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

  const toggleExpand = (quoteId: string | number) => {
    setExpandedQuotes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(quoteId)) {
        newSet.delete(quoteId);
      } else {
        newSet.add(quoteId);
      }
      return newSet;
    });
  };

  // Get background for quote
  // Priority: 1. Target quote custom BG, 2. User-selected global BG, 3. Random BG
  const getQuoteBackground = (quoteId: string | number): BackgroundImage => {
    // First priority: target quote with custom background (from saved quotes)
    const isTargetQuote = targetQuoteId && String(quoteId) === String(targetQuoteId);
    if (isTargetQuote && targetQuoteBackground) {
      return targetQuoteBackground;
    }
    
    // Second priority: user has selected a background image
    if (backgroundImage && backgroundImage.id !== 'none' && backgroundImage.url) {
      return backgroundImage;
    }
    
    // Third priority: use seeded random background based on quote ID
    return getRandomBackgroundForQuote(quoteId);
  };

  const getBackgroundStyle = (quoteId: string | number) => {
    const bg = getQuoteBackground(quoteId);
    
    if (bg.url) {
      if (bg.url.startsWith('linear-gradient') || bg.url.startsWith('radial-gradient')) {
        return { background: bg.url };
      }
      return {
        backgroundImage: `${bg.overlay || ''}, url(${bg.url})`,
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

  const getTimeAgo = (index: number): string => {
    const times = ['Just now', '2m', '5m', '15m', '30m', '1h', '2h', '3h', '5h', '8h', '12h', '1d', '2d', '3d', '1w'];
    return times[index % times.length];
  };

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 top-16 bottom-16 overflow-y-auto overscroll-contain bg-black"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {/* Feed Container */}
      <div className="max-w-[470px] mx-auto">
        {visibleQuotes.map((quote, index) => {
          const isLiked = likedQuoteIds.has(quote.id) || likedQuoteIds.has(String(quote.id));
          const isDisliked = dislikedQuoteIds.has(quote.id) || dislikedQuoteIds.has(String(quote.id));
          const isSaved = savedQuoteIds.has(quote.id) || savedQuoteIds.has(String(quote.id));
          const isCopied = copiedId === quote.id;
          const showHeartAnimation = doubleTapId === quote.id;
          const showLikeAnimation = likeAnimationId === quote.id;
          const isExpanded = expandedQuotes.has(quote.id);
          const isTargetQuote = targetQuoteId && String(quote.id) === String(targetQuoteId);
          const quoteBg = getQuoteBackground(quote.id);
          const likesCount = quote.likes_count || 0;

          return (
            <article
              key={`${quote.id}-${index}`}
              className={`bg-black border-b border-gray-800 ${isTargetQuote ? 'ring-1 ring-blue-500/30' : ''}`}
            >
              {/* Post Header - Instagram Style */}
              <div className="flex items-center justify-between px-3 py-2.5">
                <div className="flex items-center gap-3">
                  {/* Avatar with gradient ring */}
                  <div className="relative">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px]">
                      <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-lg">
                        {quote.category_icon || '💭'}
                      </div>
                    </div>
                  </div>
                  {/* Username & Location */}
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-white leading-tight">
                      {quote.category.toLowerCase().replace(/\s+/g, '_')}
                    </span>
                    <span className="text-xs text-gray-400">
                      {quote.author}
                    </span>
                  </div>
                </div>
                {/* More Options */}
                <button className="p-2 -mr-2 text-white hover:text-gray-300 transition-colors">
                  <MoreHorizontal size={20} />
                </button>
              </div>

              {/* Post Image/Content */}
              <div 
                className="relative aspect-square cursor-pointer select-none"
                onClick={() => handleDoubleTap(quote)}
              >
                {/* Background */}
                <div 
                  className="absolute inset-0"
                  style={getBackgroundStyle(quote.id)}
                />
                
                {/* Quote Content */}
                <div className="absolute inset-0 flex items-center justify-center p-8">
                  <TranslatableQuote 
                    text={quote.text}
                    fontStyle={fontStyle}
                    textColor={quoteBg.textColor || '#ffffff'}
                  />
                </div>

                {/* Double-tap Heart Animation */}
                {showHeartAnimation && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                    <Heart
                      size={100}
                      className="text-white fill-white drop-shadow-2xl"
                      style={{
                        animation: 'heartBurst 0.8s ease-out forwards',
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Action Buttons - Instagram Style */}
              <div className="px-3 pt-2">
                <div className="flex items-center justify-between">
                  {/* Left Actions */}
                  <div className="flex items-center gap-4">
                    {/* Like */}
                    <button
                      onClick={(e) => handleLikeWithAnimation(quote, e)}
                      className="p-1 transition-transform active:scale-75"
                    >
                      <Heart
                        size={26}
                        className={`transition-all duration-200 ${
                          isLiked 
                            ? 'text-red-500 fill-red-500' 
                            : 'text-white hover:text-gray-300'
                        } ${showLikeAnimation ? 'scale-125' : 'scale-100'}`}
                      />
                    </button>

                    {/* Dislike */}
                    <button
                      onClick={(e) => handleAction(() => onDislike(quote.id), e)}
                      className="p-1 transition-transform active:scale-75"
                    >
                      <ThumbsDown
                        size={24}
                        className={`transition-colors ${
                          isDisliked 
                            ? 'text-blue-500 fill-blue-500' 
                            : 'text-white hover:text-gray-300'
                        }`}
                      />
                    </button>

                    {/* Comment/Copy */}
                    <button
                      onClick={(e) => handleCopy(quote, e)}
                      className="p-1 transition-transform active:scale-75"
                    >
                      {isCopied ? (
                        <Check size={24} className="text-green-500" />
                      ) : (
                        <Copy size={24} className="text-white hover:text-gray-300 transition-colors" />
                      )}
                    </button>

                    {/* Share */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onShare(quote);
                      }}
                      className="p-1 transition-transform active:scale-75"
                    >
                      <Send size={24} className="text-white hover:text-gray-300 transition-colors -rotate-12" />
                    </button>
                  </div>

                  {/* Right Action - Save */}
                  <button
                    onClick={(e) => handleAction(() => onSave(quote.id), e)}
                    className="p-1 transition-transform active:scale-75"
                  >
                    <Bookmark
                      size={26}
                      className={`transition-colors ${
                        isSaved 
                          ? 'text-white fill-white' 
                          : 'text-white hover:text-gray-300'
                      }`}
                    />
                  </button>
                </div>

                {/* Likes Count */}
                {likesCount > 0 && (
                  <div className="mt-2">
                    <span className="text-sm font-semibold text-white">
                      {formatCount(likesCount)} {likesCount === 1 ? 'like' : 'likes'}
                    </span>
                  </div>
                )}

                {/* Caption - Author */}
                <div className="mt-1.5 pb-2">
                  <p className="text-sm text-white">
                    <span className="font-semibold mr-1.5">
                      {quote.category.toLowerCase().replace(/\s+/g, '_')}
                    </span>
                    <span className="text-gray-300">
                      {isExpanded || quote.text.length <= 100 
                        ? `— ${quote.author}` 
                        : `— ${quote.author.substring(0, 50)}...`}
                    </span>
                    {quote.text.length > 100 && !isExpanded && (
                      <button 
                        onClick={() => toggleExpand(quote.id)}
                        className="text-gray-500 ml-1"
                      >
                        more
                      </button>
                    )}
                  </p>
                  
                  {/* Timestamp */}
                  <p className="text-[11px] text-gray-500 mt-1.5 uppercase tracking-wide">
                    {getTimeAgo(index)}
                  </p>
                </div>
              </div>
            </article>
          );
        })}

        {/* Load More */}
        {visibleCount < uniqueQuotes.length && (
          <div ref={loadMoreRef} className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-gray-600 border-t-white rounded-full animate-spin" />
          </div>
        )}

        {/* End of Feed */}
        {visibleCount >= uniqueQuotes.length && uniqueQuotes.length > 0 && (
          <div className="text-center py-12 border-t border-gray-800">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full border-2 border-gray-700 flex items-center justify-center">
              <Check size={32} className="text-gray-600" />
            </div>
            <p className="text-white font-medium">You're All Caught Up</p>
            <p className="text-gray-500 text-sm mt-1">You've seen all new quotes</p>
            <button
              onClick={scrollToTop}
              className="mt-4 text-blue-500 hover:text-blue-400 text-sm font-medium"
            >
              Back to top
            </button>
          </div>
        )}
      </div>

      {/* Scroll to Top */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-20 right-4 p-3 bg-gray-800 text-white rounded-full shadow-lg hover:bg-gray-700 transition-all z-50 border border-gray-700"
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
            transform: scale(1.2);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
