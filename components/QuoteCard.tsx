'use client';

import { Heart, Loader2 } from 'lucide-react';
import { useMemo, useCallback, memo } from 'react';
import Image from 'next/image';
import { useTranslation } from '@/hooks/useTranslation';
import { useLanguage } from '@/contexts/LanguageContext';
import { CardTheme, FontStyle, BackgroundImage, DEFAULT_THEME, DEFAULT_FONT, BACKGROUND_IMAGES } from '@/lib/constants';

// Re-export types for backward compatibility
export type { CardTheme, FontStyle, BackgroundImage };

interface Quote {
  id: string | number;
  text: string;
  author: string;
  category: string;
  category_icon?: string;
  likes_count?: number;
  dislikes_count?: number;
}

interface QuoteCardProps {
  quote: Quote;
  index: number;
  currentIndex: number;
  dragOffset: { x: number; y: number };
  swipeDirection: 'left' | 'right' | null;
  isDragging: boolean;
  isAnimating?: boolean;
  totalQuotes: number;
  onDragStart: (e: React.MouseEvent | React.TouchEvent) => void;
  onDragMove: (e: React.MouseEvent | React.TouchEvent) => void;
  customBackground?: string;
  cardTheme?: CardTheme;
  fontStyle?: FontStyle;
  backgroundImage?: BackgroundImage;
}

// Format likes count - memoized outside component
const formatLikes = (count: number): string => {
  if (count >= 1000) {
    return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return count.toString();
};

// Calculate font size based on text length
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

const DEFAULT_BACKGROUND = BACKGROUND_IMAGES[0];

function QuoteCard({
  quote,
  index,
  currentIndex,
  dragOffset,
  swipeDirection,
  isDragging,
  isAnimating = false,
  totalQuotes,
  onDragStart,
  onDragMove,
  customBackground,
  cardTheme = DEFAULT_THEME,
  fontStyle = DEFAULT_FONT,
  backgroundImage = DEFAULT_BACKGROUND,
}: QuoteCardProps) {
  const offset = index - currentIndex;
  const isTopCard = offset === 0;
  
  // Only translate the top card and the next card for performance
  const shouldTranslate = offset <= 1;
  
  // Translation hook
  const { translatedText, isLoading: isTranslating } = useTranslation({
    text: quote.text,
    enabled: shouldTranslate,
  });
  const { isOriginal } = useLanguage();
  
  // Use translated text for display
  const displayText = translatedText || quote.text;
  
  // Check if background image is active
  const hasBackgroundImage = backgroundImage && backgroundImage.id !== 'none' && backgroundImage.url;
  
  // Get colors based on whether background image is used
  const colors = useMemo(() => {
    if (hasBackgroundImage) {
      return {
        textColor: backgroundImage.textColor,
        authorColor: backgroundImage.authorColor,
        categoryBg: backgroundImage.categoryBg,
        categoryText: backgroundImage.categoryText,
        isDark: true, // Background images typically need dark mode styling for contrast
      };
    }
    return {
      textColor: cardTheme.textColor,
      authorColor: cardTheme.authorColor,
      categoryBg: cardTheme.categoryBg,
      categoryText: cardTheme.categoryText,
      isDark: cardTheme.isDark,
    };
  }, [hasBackgroundImage, backgroundImage, cardTheme]);
  
  // Memoized calculations
  const textLength = displayText.length;
  const lineHeight = useMemo(() => calculateLineHeight(textLength), [textLength]);
  
  // Memoized responsive font sizes
  const fontSizes = useMemo(() => ({
    base: calculateFontSize(textLength, 12, 17),
    sm: calculateFontSize(textLength, 13, 19),
    md: calculateFontSize(textLength, 15, 24),
    lg: calculateFontSize(textLength, 17, 28),
    xl: calculateFontSize(textLength, 19, 32),
  }), [textLength]);

  // Memoized card transform style
  const cardTransformStyle = useMemo(() => {
  if (offset < 0 || offset > 2) return null;
    
  const rotation = isTopCard ? dragOffset.x / 20 : 0;
  const translateX = isTopCard ? dragOffset.x : 0;
  const translateY = isTopCard ? dragOffset.y * 0.3 : 0;
  const scale = 1 - offset * 0.05;
  const yOffset = offset * 15;
  const zIndex = 10 - offset;

    return {
      transform: `translateX(${translateX}px) translateY(${translateY + yOffset}px) rotate(${rotation}deg) scale(${scale})`,
      zIndex,
      opacity: 1,
      transition: (isDragging && !isAnimating) && isTopCard ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      userSelect: 'none' as const,
      WebkitUserSelect: 'none' as const,
      MozUserSelect: 'none' as const,
      msUserSelect: 'none' as const,
    };
  }, [offset, isTopCard, dragOffset.x, dragOffset.y, isDragging, isAnimating]);

  // Memoized card background style
  const cardStyle = useMemo(() => ({
    background: hasBackgroundImage ? 'transparent' : (customBackground || cardTheme.background),
    borderRadius: '16px',
    boxShadow: isTopCard 
      ? '0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.03)' 
      : '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
  }), [hasBackgroundImage, customBackground, cardTheme.background, isTopCard]);

  // Memoized quote text style
  const quoteTextStyle = useMemo(() => ({
    color: colors.textColor,
    letterSpacing: '-0.01em',
    fontFamily: fontStyle.fontFamily,
    fontWeight: fontStyle.fontWeight,
    fontSize: `clamp(${fontSizes.base}px, 2.5vw, ${fontSizes.xl}px)`,
    lineHeight,
    wordWrap: 'normal' as const,
    overflowWrap: 'normal' as const,
    wordBreak: 'keep-all' as const,
    hyphens: 'none' as const,
    WebkitHyphens: 'none' as const,
    msHyphens: 'none' as const,
    whiteSpace: 'normal' as const,
    overflow: 'hidden' as const,
    textShadow: hasBackgroundImage ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
  }), [colors.textColor, fontStyle.fontFamily, fontStyle.fontWeight, fontSizes, lineHeight, hasBackgroundImage]);

  // Memoized event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onDragStart(e);
  }, [onDragStart]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    onDragStart(e);
  }, [onDragStart]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  // Early return for cards not in view
  if (offset < 0 || offset > 2 || !cardTransformStyle) return null;

  return (
    <div
      style={cardTransformStyle}
      className="absolute inset-0 cursor-grab active:cursor-grabbing select-none flex items-center justify-center"
      onMouseDown={isTopCard ? handleMouseDown : undefined}
      onMouseMove={isTopCard ? onDragMove : undefined}
      onTouchStart={isTopCard ? handleTouchStart : undefined}
      onTouchMove={isTopCard ? onDragMove : undefined}
      onContextMenu={handleContextMenu}
    >
      <div 
        data-quote-id={quote.id}
        data-quote-card="true"
        data-theme-id={cardTheme.id}
        data-font-id={fontStyle.id}
        data-background-id={backgroundImage?.id || 'none'}
        className="relative w-full max-w-[280px] sm:max-w-[320px] md:max-w-[380px] lg:max-w-[420px] xl:max-w-[450px] aspect-[4/5] flex flex-col overflow-hidden"
        style={cardStyle}
      >
        {/* Background Image Layer */}
        {hasBackgroundImage && (
          <>
            {/* Background Image */}
            <div className="absolute inset-0">
              <Image
                src={backgroundImage.url}
                alt="Card background"
                fill
                className="object-cover"
                sizes="(max-width: 640px) 280px, (max-width: 768px) 320px, (max-width: 1024px) 380px, 450px"
                priority={isTopCard}
                unoptimized
              />
            </div>
            {/* Overlay gradient for text readability */}
            <div 
              className="absolute inset-0"
              style={{ background: backgroundImage.overlay }}
            />
          </>
        )}
        
        {/* Base gradient for non-image backgrounds */}
        {!hasBackgroundImage && (
          <div 
            className="absolute inset-0 rounded-[16px]"
            style={{ background: customBackground || cardTheme.background }}
          />
        )}

        {/* Content Container with safe margins */}
        <div className="relative z-10 flex flex-col h-full p-5 sm:p-6 md:p-8 lg:p-10">
          
          {/* Header Section - Category & Likes */}
          <div className="flex items-center justify-between flex-shrink-0">
            {/* Category Tag - Pill with proper background (hidden during download via data-hide-on-download) */}
            <div 
              data-hide-on-download="true"
              className="inline-flex items-center gap-1 p-1.5 sm:px-3 sm:py-1.5 rounded-full"
              style={{ 
                background: hasBackgroundImage 
                  ? 'rgba(0, 0, 0, 0.4)' 
                  : colors.categoryBg,
                backdropFilter: hasBackgroundImage ? 'blur(8px)' : 'none',
                WebkitBackdropFilter: hasBackgroundImage ? 'blur(8px)' : 'none',
                border: hasBackgroundImage 
                  ? '1px solid rgba(255, 255, 255, 0.1)' 
                  : colors.isDark 
                    ? '1px solid rgba(255, 255, 255, 0.1)' 
                    : '1px solid rgba(0, 0, 0, 0.05)',
                boxShadow: hasBackgroundImage ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
              }}
            >
              {quote.category_icon && (
                <span className="text-[10px] sm:text-xs leading-none">{quote.category_icon}</span>
              )}
              <span 
                className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.06em] leading-none"
                style={{ 
                  color: hasBackgroundImage ? '#ffffff' : colors.categoryText,
                  textShadow: hasBackgroundImage ? '0 1px 2px rgba(0,0,0,0.3)' : 'none',
                }}
              >
                  {quote.category}
              </span>
            </div>

            {/* Likes Badge */}
            {/* <div 
              className="inline-flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1.5 rounded-full"
              style={{
                background: hasBackgroundImage 
                  ? 'rgba(0, 0, 0, 0.4)' 
                  : colors.isDark 
                    ? 'rgba(248, 113, 113, 0.15)' 
                    : 'rgba(239, 68, 68, 0.08)',
                backdropFilter: hasBackgroundImage ? 'blur(8px)' : 'none',
                WebkitBackdropFilter: hasBackgroundImage ? 'blur(8px)' : 'none',
                border: hasBackgroundImage 
                  ? '1px solid rgba(255, 255, 255, 0.1)' 
                  : 'none',
                boxShadow: hasBackgroundImage ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
              }}
            >
              <Heart 
                size={10} 
                className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-current"
                style={{ color: hasBackgroundImage ? '#f87171' : colors.isDark ? '#f87171' : '#ef4444' }}
              />
              <span 
                className="text-[9px] sm:text-[10px] font-medium leading-none"
                style={{ 
                  color: hasBackgroundImage ? '#ffffff' : colors.isDark ? '#f87171' : '#9ca3af',
                  textShadow: hasBackgroundImage ? '0 1px 2px rgba(0,0,0,0.3)' : 'none',
                }}
              >
                {formatLikes(quote.likes_count || 0)}
              </span>
            </div> */}
          </div>

          {/* Quote Content Area - Centered with plenty of whitespace */}
          <div className="flex-1 flex flex-col justify-center py-4 sm:py-6 md:py-8 overflow-hidden">
            {/* Subtle Quote Mark */}
            <div className="mb-3 sm:mb-4 md:mb-5">
              <svg 
                width="32" 
                height="32" 
                viewBox="0 0 24 24" 
                fill="none"
                className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8"
                style={{ opacity: colors.isDark ? 0.25 : 0.15 }}
              >
                <path 
                  d="M11 7.5V17.5H6.5C6.5 14.5 6.5 12 9 9.5L6 7.5H11ZM19.5 7.5V17.5H15C15 14.5 15 12 17.5 9.5L14.5 7.5H19.5Z" 
                  fill={colors.textColor}
                />
              </svg>
            </div>
                  
                  {/* Translation indicator */}
            {!isOriginal && isTopCard && isTranslating && (
              <div className="flex items-center gap-1.5 mb-3">
                <Loader2 size={12} className="animate-spin" style={{ color: colors.authorColor }} />
                <span className="text-[10px] font-medium" style={{ color: colors.authorColor }}>
                  Translating...
                </span>
                    </div>
                  )}
            
            {/* Quote text - Using CSS clamp for responsive sizing */}
            <p 
              className={`transition-opacity duration-200 ${isTranslating ? 'opacity-40' : 'opacity-100'}`}
              style={quoteTextStyle}
            >
              {displayText}
            </p>
                </div>
                
          {/* Author Section - Clean bottom area */}
          <div className="flex-shrink-0">
            {/* Thin divider line */}
            <div 
              className="w-12 sm:w-16 h-px mb-4 sm:mb-5"
              style={{ background: colors.isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)' }}
            />
            
            {/* Author name and Logo row */}
            <div className="flex items-center justify-between">
              {/* Author name - Simple sans-serif */}
              <p 
                className="text-xs sm:text-sm md:text-base font-medium tracking-wide"
                style={{ 
                  color: colors.authorColor,
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  textShadow: hasBackgroundImage ? '0 1px 2px rgba(0,0,0,0.3)' : 'none',
                }}
              >
                — {quote.author}
              </p>
              
              {/* Logo */}
              <div 
                className="flex items-center gap-1.5" 
                style={{ opacity: colors.isDark ? 0.7 : 0.6 }}
              >
                <Image 
                  src="/logo.svg" 
                  alt="QuoteSwipe" 
                  width={24}
                  height={24}
                  className="w-5 h-5 sm:w-6 sm:h-6"
                  style={{ filter: colors.isDark ? 'brightness(1.5)' : 'none' }}
                />
                <span 
                  className="text-[9px] sm:text-[10px] font-medium tracking-wide sm:inline"
                  style={{ 
                    color: colors.authorColor,
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    textShadow: hasBackgroundImage ? '0 1px 2px rgba(0,0,0,0.3)' : 'none',
                  }}
                >
                  QuoteSwipe
                    </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Memoize the entire component to prevent unnecessary re-renders
export default memo(QuoteCard);
