'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Instagram, MessageCircle, Download, Share2, Link2, Check, Copy, X, Sparkles, Image as ImageIcon, MoveVertical, ChevronUp, ChevronDown, Lock, Smartphone, Square, RectangleVertical, Type, Minus, Plus, ZoomIn, ZoomOut, Move, RotateCcw, WrapText, Undo2, AlignLeft, AlignCenter, AlignRight, AlignJustify, AlignStartVertical, AlignEndVertical, Palette, ChevronLeft, ChevronRight, LineChart, Bold, Italic, Underline } from 'lucide-react';
import { toPng } from 'html-to-image';
import { isQuotePublic } from '@/lib/helpers';
import Image from 'next/image';
import { CardTheme, FontStyle, BackgroundImage, DEFAULT_THEME, DEFAULT_FONT, BACKGROUND_IMAGES, FONT_STYLES } from '@/lib/constants';
import QuoteReelModal from './QuoteReelModal';

// ============================================================================
// Types & Interfaces
// ============================================================================

type ShareFormat = 'post' | 'story' | 'square';
type TextAlignment = 'left' | 'center' | 'right' | 'justify' | 'start' | 'end';

interface ShareFormatConfig {
  id: ShareFormat;
  label: string;
  sublabel: string;
  width: number;
  height: number;
  aspectRatio: string;
  pixelRatio: number;
  icon: React.ReactNode;
}

interface QuoteData {
  id: number | string;
    text: string;
    author: string;
    category: string;
    category_icon?: string;
    likes_count?: number;
    dislikes_count?: number;
  isUserQuote?: boolean;
  is_public?: number | boolean;
  custom_background?: string;
}

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: QuoteData;
  preGeneratedImage?: string | null;
  cardTheme?: CardTheme;
  fontStyle?: FontStyle;
  backgroundImage?: BackgroundImage;
}

interface PreviewCardProps {
  quote: QuoteData;
  cardTheme?: CardTheme;
  fontStyle?: FontStyle;
  backgroundImage?: BackgroundImage;
  customBackground?: string;
  verticalOffset?: number;
  horizontalOffset?: number; // Text horizontal position (-15 to 15)
  textAlign?: TextAlignment; // Text alignment (left, center, right)
  format?: ShareFormatConfig;
  fontSizePx?: number; // 0 = auto, otherwise direct px value
  bgZoom?: number; // Background zoom level (1 = 100%)
  bgPanX?: number; // Background horizontal pan (-50 to 50)
  bgPanY?: number; // Background vertical pan (-50 to 50)
  customTextColor?: string | null; // Custom text color override
  customLineHeight?: number; // Custom line height (1.0 - 2.5)
  isBold?: boolean; // Bold text
  isItalic?: boolean; // Italic text
  isUnderline?: boolean; // Underline text
  containerWidth?: number; // Container width percentage (50-100)
}

interface ShareButtonProps {
  onClick: () => void;
  disabled: boolean;
  gradient: string;
  iconBg: string;
  shadowColor: string;
  icon: React.ReactNode;
  label: string;
}

// ============================================================================
// Constants
// ============================================================================

const POSITION_PRESETS = [
  { label: 'Top', value: -60 },
  { label: 'Center', value: 0 },
  { label: 'Bottom', value: 60 },
] as const;

const POSITION_STEP = 5;
const POSITION_MIN = -80;
const POSITION_MAX = 80;
// Horizontal limits for left/right movement
const HORIZONTAL_MIN = -50;
const HORIZONTAL_MAX = 50;
const COPY_FEEDBACK_DURATION = 2000;

// ============================================================================
// Hashtag & Caption Generator
// ============================================================================

// Default hashtags (always included)
const DEFAULT_HASHTAGS = ['#reelsindia', '#quoteswipe', '#quote_swipe'];

// Category-based hashtags
const CATEGORY_HASHTAGS: Record<string, string[]> = {
  'motivation': ['#motivation', '#motivationalquotes', '#successmindset'],
  'love': ['#lovequotes', '#love', '#relationshipgoals'],
  'love story': ['#lovestory', '#romanticquotes', '#truelove', '#couplegoals', '#loveparagraph'],
  'romantic meeting': ['#howwemet', '#lovestory', '#romanticmoments', '#meetcute', '#firstmeeting'],
  'deep emotional': ['#deepfeelings', '#emotionalquotes', '#rawemotions', '#heartfelt', '#feelings'],
  'long distance love': ['#longdistance', '#ldr', '#longdistancerelationship', '#missingyou', '#distancelove'],
  'marriage & forever': ['#marriagegoals', '#forevermine', '#couplesgoals', '#marriedlife', '#husband'],
  'healing journey': ['#healingjourney', '#secondchance', '#movingon', '#selflove', '#healing'],
  'poetic love': ['#poetrylove', '#lovepoetry', '#romanticpoetry', '#poeticquotes', '#aesthetic'],
  'love confessions': ['#loveconfession', '#iloveyou', '#confession', '#truelove', '#myfeeling'],
  'soulmate stories': ['#soulmate', '#twinflame', '#destined', '#meantobe', '#fate'],
  'realistic love': ['#realcouple', '#relationshipgoals', '#couplelife', '#realationship', '#together'],
  'viral love reels': ['#viralreels', '#trending', '#reelsviral', '#loversreels', '#couplegoals'],
  'vulnerable & raw': ['#vulnerable', '#rawfeelings', '#deepthoughts', '#honestfeelings', '#truth'],
  'hope & future': ['#forever', '#ourfuture', '#futuretogether', '#growingoldtogether', '#hopeful'],
  'bollywood dialogues': ['#bollywood', '#bollywoodquotes', '#hindiquotes', '#filmy', '#ddlj', '#srk', '#bollywoodlove'],
  'hollywood romance': ['#hollywood', '#moviequotes', '#romanticmovies', '#titanic', '#thenotebook', '#filmquotes', '#movielines'],
  'modern bollywood': ['#modernbollywood', '#yjhd', '#aedilhaimushkil', '#tamasha', '#bollywood2020s', '#hindimovies', '#bollywoodfeels'],
  'success': ['#success', '#entrepreneur', '#mindset'],
  'life': ['#lifequotes', '#lifelessons', '#wisdom'],
  'inspirational': ['#inspiration', '#inspired', '#positivevibes'],
  'friendship': ['#friendship', '#bestfriends', '#friendshipgoals'],
  'happiness': ['#happiness', '#behappy', '#positivity'],
  'wisdom': ['#wisdom', '#wise', '#knowledge'],
  'attitude': ['#attitude', '#savage', '#bossmindset'],
  'spiritual': ['#spiritual', '#spirituality', '#innerpeace'],
  'sad': ['#sadquotes', '#feelings', '#emotions'],
  'funny': ['#funny', '#humor', '#laughing'],
  'default': ['#quotes', '#dailyquotes', '#quoteoftheday'],
};

// Famous author hashtags
const AUTHOR_HASHTAGS: Record<string, string> = {
  'steve jobs': '#stevejobs',
  'elon musk': '#elonmusk',
  'albert einstein': '#einstein',
  'mahatma gandhi': '#gandhi',
  'buddha': '#buddha',
  'rumi': '#rumi',
  'confucius': '#confucius',
  'aristotle': '#aristotle',
  'plato': '#plato',
  'shakespeare': '#shakespeare',
  'mark twain': '#marktwain',
  'oscar wilde': '#oscarwilde',
  'nelson mandela': '#nelsonmandela',
  'martin luther king': '#mlk',
  'oprah winfrey': '#oprah',
  'warren buffett': '#warrenbuffett',
  'bill gates': '#billgates',
  'apj abdul kalam': '#abdulkalam',
  'swami vivekananda': '#vivekananda',
};

/** Generate hashtags based on quote category and author */
function generateHashtags(category: string, author: string): string[] {
  const hashtags: string[] = [];
  
  // 1. Add category-based hashtags (pick 2-3)
  const categoryKey = category.toLowerCase().replace(/\s+/g, '');
  const categoryTags = CATEGORY_HASHTAGS[categoryKey] || CATEGORY_HASHTAGS['default'];
  hashtags.push(...categoryTags.slice(0, 3));
  
  // 2. Add author hashtag if famous
  const authorLower = author.toLowerCase();
  for (const [name, tag] of Object.entries(AUTHOR_HASHTAGS)) {
    if (authorLower.includes(name)) {
      hashtags.push(tag);
      break;
    }
  }
  
  // 3. Add default hashtags
  hashtags.push(...DEFAULT_HASHTAGS);
  
  // Remove duplicates and limit to 7
  return [...new Set(hashtags)].slice(0, 7);
}

/** Generate shareable caption with quote, author, and hashtags */
function generateCaption(quote: QuoteData): string {
  const hashtags = generateHashtags(quote.category || '', quote.author || '');
  
  // Truncate quote for caption if too long
  const maxQuoteLength = 150;
  const truncatedQuote = quote.text.length > maxQuoteLength 
    ? quote.text.substring(0, maxQuoteLength) + '...'
    : quote.text;
  
  const caption = `✨ "${truncatedQuote}" ✨

${quote.author ? `— ${quote.author}` : ''}

💭 Follow @quote_swipe for daily inspiration!

${hashtags.join(' ')}`;

  return caption.trim();
}

// Font size pixel constants
const FONT_SIZE_PX_MIN = 10;
const FONT_SIZE_PX_MAX = 32;
const FONT_SIZE_PX_DEFAULT = 0; // 0 means "auto" (calculated based on text length)

// Share format configurations
const SHARE_FORMATS: ShareFormatConfig[] = [
  {
    id: 'post',
    label: 'Post',
    sublabel: '4:5',
    width: 320,
    height: 400,
    aspectRatio: '4/5',
    pixelRatio: 6, // 1920x2400
    icon: <RectangleVertical size={16} />,
  },
  {
    id: 'story',
    label: 'Story',
    sublabel: '9:16',
    width: 270,
    height: 480,
    aspectRatio: '9/16',
    pixelRatio: 4, // 1080x1920
    icon: <Smartphone size={16} />,
  },
  {
    id: 'square',
    label: 'Square',
    sublabel: '1:1',
    width: 360,
    height: 360,
    aspectRatio: '1/1',
    pixelRatio: 3, // 1080x1080
    icon: <Square size={16} />,
  },
];

const DEFAULT_FORMAT = SHARE_FORMATS[0];

const PREVIEW_SCALE = 0.55;

// ============================================================================
// Typography Utilities
// ============================================================================

/** Calculate responsive font size based on text length */
const calculateFontSize = (textLength: number, minSize: number, maxSize: number): number => {
  const ranges = [
    { max: 50, scale: 1, factor: 0 },
    { max: 100, scale: 1, factor: 0.2 },
    { max: 180, scale: 0.8, factor: 0.3 },
    { max: 280, scale: 0.56, factor: 0.35 },
    { max: 400, scale: 0.38, factor: 0.4 },
  ];

  let prevMax = 0;
  for (const range of ranges) {
    if (textLength <= range.max) {
      const baseSize = maxSize * range.scale;
      const progress = (textLength - prevMax) / (range.max - prevMax);
      return baseSize - (baseSize - minSize) * progress * range.factor;
    }
    prevMax = range.max;
  }
  return minSize;
};

/** Calculate line height based on text length for better readability */
const calculateLineHeight = (textLength: number): number => {
  const thresholds = [
    { min: 350, height: 1.35 },
    { min: 250, height: 1.4 },
    { min: 150, height: 1.45 },
    { min: 80, height: 1.5 },
  ];

  for (const { min, height } of thresholds) {
    if (textLength > min) return height;
  }
  return 1.6;
};

// ============================================================================
// Share Button Component
// ============================================================================

function ShareButton({ onClick, disabled, gradient, iconBg, shadowColor, icon, label }: ShareButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`group flex flex-col items-center gap-1.5 sm:gap-2 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl ${gradient} hover:shadow-md hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50`}
    >
      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl ${iconBg} flex items-center justify-center shadow-lg ${shadowColor} transition-shadow`}>
        {icon}
      </div>
      <span className="text-[10px] sm:text-xs font-semibold text-stone-700 dark:text-stone-300">
        {label}
      </span>
    </button>
  );
}

// ============================================================================
// Preview Card Component
// ============================================================================

function PreviewCard({ 
  quote, 
  cardTheme = DEFAULT_THEME, 
  fontStyle = DEFAULT_FONT, 
  backgroundImage,
  customBackground,
  verticalOffset = 0,
  horizontalOffset = 0,
  textAlign = 'left',
  format = DEFAULT_FORMAT,
  fontSizePx = 0,
  bgZoom = 1,
  bgPanX = 0,
  bgPanY = 0,
  customTextColor = null,
  customLineHeight = 0,
  isBold = false,
  isItalic = false,
  isUnderline = false,
  containerWidth = 100,
}: PreviewCardProps) {
  const textLength = quote.text.length;
  const hasBackgroundImage = !!(backgroundImage?.url || customBackground);
  const actualBackgroundUrl = customBackground || backgroundImage?.url;
  const backgroundOverlay = backgroundImage?.overlay || 'linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.5))';
  
  // Memoized color scheme based on theme and background
  const colors = useMemo(() => {
    const isDark = cardTheme.isDark || hasBackgroundImage;
    // Use custom text color if provided, otherwise default based on background
    const textColor = customTextColor || (hasBackgroundImage ? '#ffffff' : cardTheme.textColor);
    return {
      isDark,
      text: textColor,
      author: hasBackgroundImage ? 'rgba(255,255,255,0.8)' : cardTheme.authorColor,
      divider: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',
    };
  }, [cardTheme, hasBackgroundImage, customTextColor]);

  // Calculate font size based on format and text length
  // These values match QuoteCard.tsx exactly for consistent text wrapping
  const getBaseFontSize = (formatId: ShareFormat): { min: number; max: number } => {
    switch (formatId) {
      case 'story': return { min: 15, max: 22 }; // Slightly larger for tall story format
      case 'square': return { min: 13, max: 19 }; // Same as QuoteCard sm breakpoint
      default: return { min: 13, max: 19 }; // Same as QuoteCard sm breakpoint (320px)
    }
  };

  // Memoized typography calculations - uses direct px value or auto-calculated
  const typography = useMemo(() => {
    const { min, max } = getBaseFontSize(format.id);
    const autoFontSize = calculateFontSize(textLength, min, max);
    // Use user-specified px value or fall back to auto
    const finalFontSize = fontSizePx > 0 ? fontSizePx : autoFontSize;
    // Use custom line height if set, otherwise calculate automatically
    const finalLineHeight = customLineHeight > 0 ? customLineHeight : calculateLineHeight(textLength);
    return {
      fontSize: finalFontSize,
      autoFontSize, // expose for control display
      lineHeight: finalLineHeight,
    };
  }, [textLength, format.id, fontSizePx, customLineHeight]);

  // Memoized styles
  const cardStyle = useMemo(() => ({
    background: hasBackgroundImage ? 'transparent' : (customBackground || cardTheme.background),
    borderRadius: '16px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  }), [hasBackgroundImage, customBackground, cardTheme.background]);

  const quoteTextStyle = useMemo(() => ({
    color: colors.text,
    letterSpacing: '-0.01em',
    fontFamily: fontStyle.fontFamily,
    fontWeight: isBold ? '700' : fontStyle.fontWeight,
    fontStyle: isItalic ? 'italic' : 'normal',
    textDecoration: isUnderline ? 'underline' : 'none',
    fontSize: `${typography.fontSize}px`,
    lineHeight: typography.lineHeight,
    textShadow: hasBackgroundImage ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
    // Consistent word-breaking with QuoteCard
    wordWrap: 'break-word' as const,
    overflowWrap: 'break-word' as const,
    wordBreak: 'normal' as const,
    hyphens: 'none' as const,
    WebkitHyphens: 'none' as const,
    msHyphens: 'none' as const,
    whiteSpace: 'pre-line' as const,
  }), [colors.text, fontStyle, typography, hasBackgroundImage, isBold, isItalic, isUnderline]);


  return (
    <div 
      data-preview-card="true"
      className="relative flex flex-col overflow-hidden"
      style={{
        ...cardStyle,
        width: `${format.width}px`,
        height: `${format.height}px`,
      }}
    >
      {/* Background Image Layer with Zoom/Pan */}
      {hasBackgroundImage && actualBackgroundUrl && (
        <>
          <div 
            className="absolute inset-0 overflow-hidden"
            style={{
              // Expand container to allow for panning when zoomed
              margin: bgZoom > 1 ? `-${(bgZoom - 1) * 50}%` : 0,
              width: bgZoom > 1 ? `${bgZoom * 100}%` : '100%',
              height: bgZoom > 1 ? `${bgZoom * 100}%` : '100%',
            }}
          >
            <Image
              src={actualBackgroundUrl}
              alt="Card background"
              fill
              className="object-cover"
              sizes="320px"
              priority
              unoptimized
              style={{
                transform: `scale(${bgZoom}) translate(${bgPanX}%, ${bgPanY}%)`,
                transformOrigin: 'center center',
              }}
            />
          </div>
          <div className="absolute inset-0" style={{ background: backgroundOverlay }} />
        </>
      )}
      
      {/* Base gradient for non-image backgrounds */}
      {!hasBackgroundImage && (
        <div 
          className="absolute inset-0 rounded-[16px]"
          style={{ background: customBackground || cardTheme.background }}
        />
      )}

      {/* Content Container */}
      <div className="relative z-10 flex flex-col h-full p-6 overflow-hidden">
        {/* Quote Content Area - positioned absolutely to allow free movement */}
        <div 
          className="absolute"
          style={{
            top: `calc(50% + ${verticalOffset * 2}px)`,
            left: `calc(50% + ${horizontalOffset * 2}px)`,
            transform: `translate(-50%, -50%)`,
            width: `${(containerWidth / 100) * (format.width - 32)}px`,
            maxWidth: `${format.width - 32}px`,
          }}
        >
          {/* Text container */}
          <div 
            style={{
              textAlign: textAlign,
              width: '100%',
            }}
          >
            {/* Quote text */}
            <p style={quoteTextStyle}>{quote.text}</p>
          </div>
        </div>
        
        {/* Author Section - positioned at bottom */}
        <div className="mt-auto">
          <AuthorSection 
            author={quote.author}
            colors={colors}
            hasBackgroundImage={hasBackgroundImage}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PreviewCard Sub-components
// ============================================================================

function QuoteMark({ color, isDark }: { color: string; isDark: boolean }) {
  return (
    <div className="mb-3">
      <svg 
        width="28" 
        height="28" 
        viewBox="0 0 24 24" 
        fill="none"
        style={{ opacity: isDark ? 0.25 : 0.15 }}
      >
        <path 
          d="M11 7.5V17.5H6.5C6.5 14.5 6.5 12 9 9.5L6 7.5H11ZM19.5 7.5V17.5H15C15 14.5 15 12 17.5 9.5L14.5 7.5H19.5Z" 
          fill={color}
        />
      </svg>
    </div>
  );
}

interface AuthorSectionProps {
  author: string;
  colors: { isDark: boolean; author: string; divider: string };
  hasBackgroundImage: boolean;
}

function AuthorSection({ author, colors, hasBackgroundImage }: AuthorSectionProps) {
  const textStyle = {
    color: colors.author,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    textShadow: hasBackgroundImage ? '0 1px 2px rgba(0,0,0,0.3)' : 'none',
  };

  return (
    <div className="flex-shrink-0">
      {/* <div className="w-14 h-px mb-4" style={{ background: colors.divider }} /> */}
      
      <div className="flex items-center justify-end">
        {author && (
          <p data-author-text="true" className="text-sm font-medium tracking-wide mr-auto" style={textStyle}>
            — {author}
          </p>
        )}
        
        <div className="flex items-center gap-1.5" style={{ opacity: colors.isDark ? 0.7 : 0.6 }}>
          {/* Inline SVG Logo - Blue/Purple/Pink Theme for downloads */}
          <svg 
            width="20" 
            height="20" 
            viewBox="0 0 200 200" 
            fill="none"
            style={{ filter: colors.isDark ? 'brightness(1.3)' : 'none' }}
          >
            {/* Outer ring */}
            <circle cx="100" cy="100" r="96" fill="none" stroke="#A78BFA" strokeWidth="2" opacity="0.3"/>
            {/* Main circle - Purple (blue-purple-pink theme) */}
            <circle cx="100" cy="100" r="92" fill="#8B5CF6"/>
            {/* Inner ring */}
            <circle cx="100" cy="100" r="85" fill="none" stroke="white" strokeWidth="1" opacity="0.15"/>
            {/* Card 3 - Back */}
            <g transform="rotate(-15 100 105)">
              <rect x="52" y="50" width="80" height="100" rx="12" fill="white" opacity="0.15"/>
            </g>
            {/* Card 2 - Middle */}
            <g transform="rotate(-8 100 105)">
              <rect x="55" y="48" width="80" height="100" rx="12" fill="white" opacity="0.35"/>
            </g>
            {/* Card 1 - Front */}
            <g>
              <rect x="58" y="46" width="80" height="100" rx="12" fill="white"/>
              {/* Quote mark */}
              <text x="68" y="82" fontFamily="Georgia, serif" fontSize="36" fontWeight="bold" fill="#8B5CF6">"</text>
              {/* Text lines */}
              <rect x="96" y="62" width="32" height="4" rx="2" fill="#8B5CF6"/>
              <rect x="96" y="72" width="26" height="4" rx="2" fill="#A78BFA" opacity="0.7"/>
              {/* Author lines */}
              <rect x="72" y="110" width="52" height="3" rx="1.5" fill="#9CA3AF"/>
              <rect x="72" y="118" width="36" height="3" rx="1.5" fill="#D1D5DB"/>
              {/* Heart icon - Pink */}
              <g transform="translate(114, 126)">
                <path d="M8 3 C8 1.5 9.5 0 11.5 0 C13.5 0 15 1.5 15 3.5 C15 7 8 12 8 12 C8 12 1 7 1 3.5 C1 1.5 2.5 0 4.5 0 C6.5 0 8 1.5 8 3Z" fill="#EC4899"/>
              </g>
            </g>
            {/* Sparkles */}
            <circle cx="45" cy="55" r="3" fill="white" opacity="0.6"/>
            <circle cx="160" cy="140" r="2" fill="white" opacity="0.5"/>
          </svg>
          <span className="text-[9px] font-medium tracking-wide" style={textStyle}>
            QuoteSwipe
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Format Selector Component
// ============================================================================

interface FormatSelectorProps {
  selectedFormat: ShareFormat;
  onChange: (format: ShareFormatConfig) => void;
}

function FormatSelector({ selectedFormat, onChange }: FormatSelectorProps) {
  return (
    <div className="flex items-center gap-1.5 p-1 bg-stone-100 dark:bg-stone-800 rounded-xl">
      {SHARE_FORMATS.map((format) => (
        <button
          key={format.id}
          onClick={() => onChange(format)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            selectedFormat === format.id
              ? 'bg-white dark:bg-stone-700 text-amber-600 dark:text-amber-400 shadow-sm'
              : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
          }`}
        >
          {format.icon}
          <span className="hidden sm:inline">{format.label}</span>
          <span className="text-[10px] opacity-70">{format.sublabel}</span>
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// Text Position Control Component (Vertical & Horizontal)
// ============================================================================

interface TextPositionControlProps {
  verticalOffset: number;
  horizontalOffset: number;
  onVerticalChange: (value: number) => void;
  onHorizontalChange: (value: number) => void;
  onReset: () => void;
}

function TextPositionControl({ 
  verticalOffset, 
  horizontalOffset, 
  onVerticalChange, 
  onHorizontalChange,
  onReset,
}: TextPositionControlProps) {
  const formatValue = (v: number) => v > 0 ? `+${v}` : String(v);

  return (
    <div className="mt-3 p-3 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl border border-amber-200/50 dark:border-amber-800/50">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
          <Move size={12} />
          Text Position
        </span>
        <button
          onClick={onReset}
          className="text-[9px] px-2 py-0.5 bg-white dark:bg-stone-700 text-stone-600 dark:text-stone-300 rounded-md hover:bg-stone-100 dark:hover:bg-stone-600 transition-colors flex items-center gap-1"
        >
          <RotateCcw size={10} />
          Center
        </button>
      </div>
      
      {/* D-Pad Style Controls */}
      <div className="flex items-center justify-center mb-3">
        <div className="grid grid-cols-3 gap-1">
          {/* Empty */}
          <div />
          {/* Up */}
          <button
            onClick={() => onVerticalChange(Math.max(POSITION_MIN, verticalOffset - POSITION_STEP))}
            disabled={verticalOffset <= POSITION_MIN}
            className="w-10 h-10 rounded-lg bg-white dark:bg-stone-700 shadow-sm hover:bg-stone-50 dark:hover:bg-stone-600 flex items-center justify-center transition-colors disabled:opacity-40"
          >
            <ChevronUp size={18} className="text-amber-600 dark:text-amber-400" />
          </button>
          {/* Empty */}
          <div />
          
          {/* Left - Limited range */}
          <button
            onClick={() => onHorizontalChange(Math.max(HORIZONTAL_MIN, horizontalOffset - POSITION_STEP))}
            disabled={horizontalOffset <= HORIZONTAL_MIN}
            className="w-10 h-10 rounded-lg bg-white dark:bg-stone-700 shadow-sm hover:bg-stone-50 dark:hover:bg-stone-600 flex items-center justify-center transition-colors disabled:opacity-40"
          >
            <ChevronUp size={18} className="text-amber-600 dark:text-amber-400 -rotate-90" />
          </button>
          {/* Center indicator */}
          <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <span className="text-[8px] font-mono text-amber-600 dark:text-amber-400">
              {horizontalOffset},{verticalOffset}
            </span>
          </div>
          {/* Right - Limited range */}
          <button
            onClick={() => onHorizontalChange(Math.min(HORIZONTAL_MAX, horizontalOffset + POSITION_STEP))}
            disabled={horizontalOffset >= HORIZONTAL_MAX}
            className="w-10 h-10 rounded-lg bg-white dark:bg-stone-700 shadow-sm hover:bg-stone-50 dark:hover:bg-stone-600 flex items-center justify-center transition-colors disabled:opacity-40"
          >
            <ChevronUp size={18} className="text-amber-600 dark:text-amber-400 rotate-90" />
          </button>
          
          {/* Empty */}
          <div />
          {/* Down */}
          <button
            onClick={() => onVerticalChange(Math.min(POSITION_MAX, verticalOffset + POSITION_STEP))}
            disabled={verticalOffset >= POSITION_MAX}
            className="w-10 h-10 rounded-lg bg-white dark:bg-stone-700 shadow-sm hover:bg-stone-50 dark:hover:bg-stone-600 flex items-center justify-center transition-colors disabled:opacity-40"
          >
            <ChevronDown size={18} className="text-amber-600 dark:text-amber-400" />
          </button>
          {/* Empty */}
          <div />
        </div>
      </div>
      
      {/* Fine Adjustment Sliders */}
      <div className="grid grid-cols-2 gap-3">
        {/* Horizontal Slider - Limited range */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] text-stone-500 dark:text-stone-400">← → Left/Right</span>
            <span className="text-[9px] font-mono text-amber-600 dark:text-amber-400">{formatValue(horizontalOffset)}</span>
          </div>
          <input
            type="range"
            min={HORIZONTAL_MIN}
            max={HORIZONTAL_MAX}
            step={1}
            value={horizontalOffset}
            onChange={(e) => onHorizontalChange(Number(e.target.value))}
            className="w-full h-1.5 bg-stone-200 dark:bg-stone-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
        </div>
        
        {/* Vertical Slider */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] text-stone-500 dark:text-stone-400">↑ ↓ Up/Down</span>
            <span className="text-[9px] font-mono text-amber-600 dark:text-amber-400">{formatValue(verticalOffset)}</span>
          </div>
          <input
            type="range"
            min={POSITION_MIN}
            max={POSITION_MAX}
            step={1}
            value={verticalOffset}
            onChange={(e) => onVerticalChange(Number(e.target.value))}
            className="w-full h-1.5 bg-stone-200 dark:bg-stone-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
        </div>
      </div>
      
      {/* Quick Presets - Horizontal limited to keep text inside card */}
      <div className="flex items-center justify-center gap-1.5 mt-3 flex-wrap">
        {[
          { label: '↖', v: -60, h: -40 },
          { label: '↑', v: -60, h: 0 },
          { label: '↗', v: -60, h: 40 },
          { label: '←', v: 0, h: -40 },
          { label: '●', v: 0, h: 0 },
          { label: '→', v: 0, h: 40 },
          { label: '↙', v: 60, h: -40 },
          { label: '↓', v: 60, h: 0 },
          { label: '↘', v: 60, h: 40 },
        ].map((preset) => (
          <button
            key={preset.label}
            onClick={() => {
              onVerticalChange(preset.v);
              onHorizontalChange(preset.h);
            }}
            className={`w-7 h-7 rounded-lg text-[11px] font-medium transition-colors ${
              Math.abs(verticalOffset - preset.v) < 10 && Math.abs(horizontalOffset - preset.h) < 8
                ? 'bg-amber-500 text-white'
                : 'bg-white dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-600'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Text Alignment Control Component
// ============================================================================

interface TextAlignmentControlProps {
  value: TextAlignment;
  onChange: (value: TextAlignment) => void;
}

function TextAlignmentControl({ value, onChange }: TextAlignmentControlProps) {
  const alignments: { id: TextAlignment; label: string; icon: React.ReactNode }[] = [
    { id: 'left', label: 'Left', icon: <AlignLeft size={14} /> },
    { id: 'center', label: 'Center', icon: <AlignCenter size={14} /> },
    { id: 'right', label: 'Right', icon: <AlignRight size={14} /> },
    { id: 'justify', label: 'Justify', icon: <AlignJustify size={14} /> },
    { id: 'start', label: 'Start', icon: <AlignStartVertical size={14} /> },
    { id: 'end', label: 'End', icon: <AlignEndVertical size={14} /> },
  ];

  return (
    <div className="mt-3 p-3 bg-gradient-to-br from-rose-50 to-orange-50 dark:from-rose-900/20 dark:to-orange-900/20 rounded-xl border border-rose-200/50 dark:border-rose-800/50">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-semibold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
          <AlignCenter size={12} />
          Text Alignment
        </span>
      </div>
      
      {/* Alignment Buttons - Grid layout */}
      <div className="grid grid-cols-3 gap-2">
        {alignments.map((alignment) => (
          <button
            key={alignment.id}
            onClick={() => onChange(alignment.id)}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-medium transition-all ${
              value === alignment.id
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                : 'bg-white dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-rose-100 dark:hover:bg-stone-600'
            }`}
          >
            {alignment.icon}
            <span>{alignment.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Font Size Control Component
// ============================================================================

interface FontSizeControlProps {
  value: number; // 0 = auto, otherwise px value
  onChange: (value: number) => void;
  autoSize: number; // calculated auto size for display
}

function FontSizeControl({ value, onChange, autoSize }: FontSizeControlProps) {
  const isAuto = value === 0;
  const displayValue = isAuto ? Math.round(autoSize) : value;
  
  const handleDecrease = () => {
    const currentVal = isAuto ? Math.round(autoSize) : value;
    onChange(Math.max(FONT_SIZE_PX_MIN, currentVal - 1));
  };
  
  const handleIncrease = () => {
    const currentVal = isAuto ? Math.round(autoSize) : value;
    onChange(Math.min(FONT_SIZE_PX_MAX, currentVal + 1));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value) || 0;
    if (val === 0) {
      onChange(0); // Reset to auto
          } else {
      onChange(Math.max(FONT_SIZE_PX_MIN, Math.min(FONT_SIZE_PX_MAX, val)));
    }
  };

  // Pixel presets
  const presets = [
    { label: 'Auto', value: 0 },
    { label: '12', value: 12 },
    { label: '14', value: 14 },
    { label: '16', value: 16 },
    { label: '18', value: 18 },
    { label: '20', value: 20 },
    { label: '24', value: 24 },
  ];

  return (
    <div className="mt-3 p-3 bg-stone-50 dark:bg-stone-800/50 rounded-xl">
      <div className="flex items-center gap-3">
        {/* Decrease Button */}
        <button
          onClick={handleDecrease}
          disabled={!isAuto && value <= FONT_SIZE_PX_MIN}
          className="p-1.5 rounded-lg bg-white dark:bg-stone-700 shadow-sm hover:bg-stone-50 dark:hover:bg-stone-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title="Smaller"
        >
          <Minus size={16} className="text-stone-600 dark:text-stone-300" />
        </button>
        
        {/* Size Display & Input */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-medium text-stone-500 dark:text-stone-400 flex items-center gap-1">
              <Type size={10} />
              Font Size
            </span>
            {isAuto && (
              <span className="text-[9px] px-1.5 py-0.5 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded">
                Auto
              </span>
            )}
      </div>

          {/* Pixel Input */}
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={FONT_SIZE_PX_MIN}
              max={FONT_SIZE_PX_MAX}
              value={isAuto ? '' : value}
              placeholder={`${Math.round(autoSize)}`}
              onChange={handleInputChange}
              className="w-20 px-2.5 py-1.5 text-sm font-mono text-center bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all"
            />
            <span className="text-xs text-stone-500 dark:text-stone-400">px</span>
            
            {/* Slider */}
            <input
              type="range"
              min={FONT_SIZE_PX_MIN}
              max={FONT_SIZE_PX_MAX}
              value={displayValue}
              onChange={(e) => onChange(Number(e.target.value))}
              className="flex-1 h-2 bg-stone-200 dark:bg-stone-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>
          
          <div className="flex justify-between mt-1.5 px-1">
            <span className="text-[9px] text-stone-400">{FONT_SIZE_PX_MIN}px</span>
            <span className="text-[9px] text-stone-400 font-medium">
              Current: {displayValue}px
            </span>
            <span className="text-[9px] text-stone-400">{FONT_SIZE_PX_MAX}px</span>
          </div>
        </div>
        
        {/* Increase Button */}
        <button
          onClick={handleIncrease}
          disabled={!isAuto && value >= FONT_SIZE_PX_MAX}
          className="p-1.5 rounded-lg bg-white dark:bg-stone-700 shadow-sm hover:bg-stone-50 dark:hover:bg-stone-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title="Larger"
        >
          <Plus size={16} className="text-stone-600 dark:text-stone-300" />
        </button>
      </div>
      
      {/* Quick Pixel Presets */}
      <div className="flex items-center justify-center gap-1.5 mt-3 flex-wrap">
        {presets.map((preset) => (
          <button
            key={preset.label}
            onClick={() => onChange(preset.value)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors ${
              value === preset.value
                ? 'bg-rose-500 text-white'
                : 'bg-white dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-600'
            }`}
          >
            {preset.value === 0 ? preset.label : `${preset.label}px`}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Background Zoom Control Component
// ============================================================================

const BG_ZOOM_MIN = 1;
const BG_ZOOM_MAX = 3;
const BG_ZOOM_STEP = 0.1;
const BG_PAN_MIN = -30;
const BG_PAN_MAX = 30;
const BG_PAN_STEP = 5;

interface BackgroundZoomControlProps {
  zoom: number;
  panX: number;
  panY: number;
  onZoomChange: (zoom: number) => void;
  onPanXChange: (panX: number) => void;
  onPanYChange: (panY: number) => void;
  onReset: () => void;
}

function BackgroundZoomControl({ 
  zoom, 
  panX, 
  panY, 
  onZoomChange, 
  onPanXChange, 
  onPanYChange,
  onReset,
}: BackgroundZoomControlProps) {
  const handleZoomIn = () => onZoomChange(Math.min(BG_ZOOM_MAX, zoom + BG_ZOOM_STEP));
  const handleZoomOut = () => onZoomChange(Math.max(BG_ZOOM_MIN, zoom - BG_ZOOM_STEP));
  
  const zoomPresets = [
    { label: '1x', value: 1 },
    { label: '1.5x', value: 1.5 },
    { label: '2x', value: 2 },
    { label: '2.5x', value: 2.5 },
    { label: '3x', value: 3 },
  ];

  return (
    <div className="mt-3 p-3 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl border border-emerald-200/50 dark:border-emerald-800/50">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
          <ZoomIn size={12} />
          Background Zoom & Position
        </span>
        <button
          onClick={onReset}
          className="text-[9px] px-2 py-0.5 bg-white dark:bg-stone-700 text-stone-600 dark:text-stone-300 rounded-md hover:bg-stone-100 dark:hover:bg-stone-600 transition-colors flex items-center gap-1"
        >
          <RotateCcw size={10} />
          Reset
        </button>
      </div>
      
      {/* Zoom Control */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={handleZoomOut}
          disabled={zoom <= BG_ZOOM_MIN}
          className="p-1.5 rounded-lg bg-white dark:bg-stone-700 shadow-sm hover:bg-stone-50 dark:hover:bg-stone-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title="Zoom Out"
        >
          <ZoomOut size={14} className="text-emerald-600 dark:text-emerald-400" />
        </button>
        
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] text-stone-500 dark:text-stone-400">Zoom</span>
            <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400">{zoom.toFixed(1)}x</span>
          </div>
          <input
            type="range"
            min={BG_ZOOM_MIN}
            max={BG_ZOOM_MAX}
            step={BG_ZOOM_STEP}
            value={zoom}
            onChange={(e) => onZoomChange(Number(e.target.value))}
            className="w-full h-1.5 bg-emerald-200 dark:bg-emerald-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
        </div>
        
        <button
          onClick={handleZoomIn}
          disabled={zoom >= BG_ZOOM_MAX}
          className="p-1.5 rounded-lg bg-white dark:bg-stone-700 shadow-sm hover:bg-stone-50 dark:hover:bg-stone-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title="Zoom In"
        >
          <ZoomIn size={14} className="text-emerald-600 dark:text-emerald-400" />
        </button>
      </div>
      
      {/* Zoom Presets */}
      <div className="flex items-center justify-center gap-1.5 mb-3">
        {zoomPresets.map((preset) => (
          <button
            key={preset.label}
            onClick={() => onZoomChange(preset.value)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors ${
              Math.abs(zoom - preset.value) < 0.05
                ? 'bg-emerald-500 text-white'
                : 'bg-white dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-600'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>
      
      {/* Pan Controls - Only show when zoomed */}
      {zoom > 1 && (
        <div className="pt-3 border-t border-emerald-200/50 dark:border-emerald-700/50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Move size={10} className="text-stone-500" />
              <span className="text-[9px] text-stone-500 dark:text-stone-400">Move Background</span>
            </div>
            <button
              onClick={() => { onPanXChange(0); onPanYChange(0); }}
              className="text-[8px] px-1.5 py-0.5 bg-stone-200 dark:bg-stone-700 text-stone-500 rounded hover:bg-stone-300 dark:hover:bg-stone-600"
            >
              Center
            </button>
          </div>
          
          {/* Arrow Controls - D-Pad Style */}
          <div className="flex items-center justify-center mb-3">
            <div className="grid grid-cols-3 gap-1">
              {/* Empty */}
              <div />
              {/* Up */}
              <button
                onClick={() => onPanYChange(Math.min(BG_PAN_MAX, panY + BG_PAN_STEP))}
                disabled={panY >= BG_PAN_MAX}
                className="w-9 h-9 rounded-lg bg-white dark:bg-stone-700 shadow-sm hover:bg-stone-50 dark:hover:bg-stone-600 flex items-center justify-center transition-colors disabled:opacity-40"
              >
                <ChevronUp size={16} className="text-stone-600 dark:text-stone-300" />
              </button>
              {/* Empty */}
              <div />
              
              {/* Left */}
              <button
                onClick={() => onPanXChange(Math.max(BG_PAN_MIN, panX - BG_PAN_STEP))}
                disabled={panX <= BG_PAN_MIN}
                className="w-9 h-9 rounded-lg bg-white dark:bg-stone-700 shadow-sm hover:bg-stone-50 dark:hover:bg-stone-600 flex items-center justify-center transition-colors disabled:opacity-40"
              >
                <ChevronUp size={16} className="text-stone-600 dark:text-stone-300 -rotate-90" />
              </button>
              {/* Center indicator */}
              <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <span className="text-[8px] font-mono text-emerald-600 dark:text-emerald-400">
                  {panX},{panY}
                </span>
              </div>
              {/* Right */}
              <button
                onClick={() => onPanXChange(Math.min(BG_PAN_MAX, panX + BG_PAN_STEP))}
                disabled={panX >= BG_PAN_MAX}
                className="w-9 h-9 rounded-lg bg-white dark:bg-stone-700 shadow-sm hover:bg-stone-50 dark:hover:bg-stone-600 flex items-center justify-center transition-colors disabled:opacity-40"
              >
                <ChevronUp size={16} className="text-stone-600 dark:text-stone-300 rotate-90" />
              </button>
              
              {/* Empty */}
              <div />
              {/* Down */}
              <button
                onClick={() => onPanYChange(Math.max(BG_PAN_MIN, panY - BG_PAN_STEP))}
                disabled={panY <= BG_PAN_MIN}
                className="w-9 h-9 rounded-lg bg-white dark:bg-stone-700 shadow-sm hover:bg-stone-50 dark:hover:bg-stone-600 flex items-center justify-center transition-colors disabled:opacity-40"
              >
                <ChevronDown size={16} className="text-stone-600 dark:text-stone-300" />
              </button>
              {/* Empty */}
              <div />
            </div>
          </div>
          
          {/* Fine Adjustment Sliders */}
          <div className="grid grid-cols-2 gap-3">
            {/* Horizontal Pan */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] text-stone-400">← → Horizontal</span>
                <span className="text-[9px] font-mono text-emerald-600">{panX > 0 ? '+' : ''}{panX}</span>
              </div>
              <input
                type="range"
                min={BG_PAN_MIN}
                max={BG_PAN_MAX}
                step={1}
                value={panX}
                onChange={(e) => onPanXChange(Number(e.target.value))}
                className="w-full h-1.5 bg-stone-200 dark:bg-stone-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
            
            {/* Vertical Pan */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] text-stone-400">↑ ↓ Vertical</span>
                <span className="text-[9px] font-mono text-emerald-600">{panY > 0 ? '+' : ''}{panY}</span>
              </div>
              <input
                type="range"
                min={BG_PAN_MIN}
                max={BG_PAN_MAX}
                step={1}
                value={panY}
                onChange={(e) => onPanYChange(Number(e.target.value))}
                className="w-full h-1.5 bg-stone-200 dark:bg-stone-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Text Editor Control Component (Add Line Breaks)
// ============================================================================

interface TextEditorControlProps {
  originalText: string;
  editedText: string;
  onChange: (text: string) => void;
  onReset: () => void;
  isEdited: boolean;
}

function TextEditorControl({ originalText, editedText, onChange, onReset, isEdited }: TextEditorControlProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [editedText]);
  
  const handleInsertLineBreak = () => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const newText = editedText.substring(0, start) + '\n' + editedText.substring(end);
      onChange(newText);
      // Set cursor position after the inserted line break
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 1;
          textareaRef.current.focus();
        }
      }, 0);
    }
  };

  return (
    <div className="mt-3 p-3 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-xl border border-orange-200/50 dark:border-orange-800/50">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold text-orange-700 dark:text-orange-400 flex items-center gap-1.5">
          <WrapText size={12} />
          Edit Quote Text (Add Line Breaks)
                </span>
        {isEdited && (
          <button
            onClick={onReset}
            className="text-[9px] px-2 py-0.5 bg-white dark:bg-stone-700 text-stone-600 dark:text-stone-300 rounded-md hover:bg-stone-100 dark:hover:bg-stone-600 transition-colors flex items-center gap-1"
          >
            <Undo2 size={10} />
            Reset
          </button>
        )}
              </div>
      
      {/* Instructions */}
      <p className="text-[9px] text-stone-500 dark:text-stone-400 mb-2">
        Click where you want to add a line break, then press Enter or use the button below.
      </p>
      
      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={editedText}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-3 text-sm bg-white dark:bg-stone-800 border border-orange-200 dark:border-orange-700 rounded-lg resize-none focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all min-h-[80px] max-h-[200px]"
        placeholder="Edit your quote text..."
        style={{ fontFamily: 'inherit' }}
      />
      
      {/* Action Buttons */}
      <div className="flex items-center gap-2 mt-2">
              <button
          onClick={handleInsertLineBreak}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-[10px] font-medium transition-colors"
        >
          <WrapText size={12} />
          Insert Line Break
        </button>
        
        {isEdited && (
          <span className="text-[9px] text-orange-600 dark:text-orange-400 flex items-center gap-1">
            <Check size={10} />
            Modified
          </span>
        )}
      </div>
      
      {/* Preview hint */}
      <p className="text-[8px] text-stone-400 mt-2">
        Tip: Press Enter key to add line breaks. The preview above will update in real-time.
      </p>
    </div>
  );
}

// ============================================================================
// Font Style Selector Component
// ============================================================================

// Curated list of fonts that work reliably (Google Fonts + system fonts)
const SHARE_FONT_OPTIONS = FONT_STYLES.filter(f => 
  // Google Fonts loaded in layout.tsx
  ['playfair', 'playfair_bold', 'merriweather', 'crimson', 'cormorant', 
   'roboto', 'roboto_light', 'roboto_medium', 'opensans', 'opensans_light',
   'lato', 'lato_light', 'poppins', 'poppins_medium', 'poppins_semibold',
   'montserrat', 'montserrat_medium', 'inter', 'inter_medium', 'nunito',
   'raleway', 'source_sans', 'dancing', 'pacifico', 'sacramento', 'great_vibes',
   'jetbrains', 'elegant',
   // System fonts (available everywhere)
   'georgia', 'georgia_bold', 'times', 'times_bold', 'system', 'system_medium', 
   'system_bold', 'helvetica', 'helvetica_light', 'helvetica_bold', 'arial',
   'mono', 'courier', 'consolas'
  ].includes(f.id)
).slice(0, 24); // Limit to 24 most popular options

interface FontStyleSelectorProps {
  selectedFont: FontStyle;
  onFontChange: (font: FontStyle) => void;
}

function FontStyleSelector({ selectedFont, onFontChange }: FontStyleSelectorProps) {
  const [showAll, setShowAll] = useState(false);
  const displayFonts = showAll ? SHARE_FONT_OPTIONS : SHARE_FONT_OPTIONS.slice(0, 12);

  return (
    <div className="mt-3 p-3 bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 rounded-xl border border-pink-200/50 dark:border-pink-800/50">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-semibold text-pink-700 dark:text-pink-400 flex items-center gap-1.5">
          <Type size={12} />
          Font Style
        </span>
        <span className="text-[9px] text-stone-500 dark:text-stone-400">
          {SHARE_FONT_OPTIONS.length} fonts
        </span>
      </div>
      
      {/* Font Grid */}
      <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto custom-scrollbar">
        {displayFonts.map((font) => (
          <button
            key={font.id}
            onClick={() => onFontChange(font)}
            className={`p-2 rounded-lg text-center transition-all ${
              selectedFont.id === font.id
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30 ring-2 ring-rose-300'
                : 'bg-white dark:bg-stone-700 text-stone-700 dark:text-stone-300 hover:bg-rose-100 dark:hover:bg-stone-600'
            }`}
          >
            <span 
              className="text-base block mb-0.5"
              style={{ fontFamily: font.fontFamily, fontWeight: font.fontWeight }}
            >
              Aa
            </span>
            <span className={`text-[8px] ${selectedFont.id === font.id ? 'text-rose-100' : 'text-stone-500 dark:text-stone-400'}`}>
              {font.name.length > 12 ? font.name.substring(0, 12) + '...' : font.name}
            </span>
          </button>
        ))}
      </div>
      
      {/* Show More/Less */}
      {SHARE_FONT_OPTIONS.length > 12 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full mt-2 py-1.5 text-[10px] font-medium text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 flex items-center justify-center gap-1"
        >
          {showAll ? (
            <>Show Less <ChevronUp size={12} /></>
          ) : (
            <>Show {SHARE_FONT_OPTIONS.length - 12} More <ChevronDown size={12} /></>
          )}
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Text Color Picker Component
// ============================================================================

// Preset colors for quick selection
const TEXT_COLOR_PRESETS = [
  { color: '#ffffff', name: 'White', dark: false },
  { color: '#000000', name: 'Black', dark: true },
  { color: '#f8fafc', name: 'Light', dark: false },
  { color: '#1e293b', name: 'Slate', dark: true },
  { color: '#fef3c7', name: 'Cream', dark: false },
  { color: '#fcd34d', name: 'Gold', dark: false },
  { color: '#f472b6', name: 'Pink', dark: false },
  { color: '#a78bfa', name: 'Purple', dark: false },
  { color: '#60a5fa', name: 'Blue', dark: false },
  { color: '#34d399', name: 'Green', dark: false },
  { color: '#fb923c', name: 'Orange', dark: false },
  { color: '#f87171', name: 'Red', dark: false },
];

interface TextColorPickerProps {
  value: string | null;
  defaultColor: string;
  onChange: (color: string | null) => void;
}

function TextColorPicker({ value, defaultColor, onChange }: TextColorPickerProps) {
  const isCustom = value !== null && !TEXT_COLOR_PRESETS.some(p => p.color === value);
  
  return (
    <div className="mt-3 p-3 bg-gradient-to-br from-cyan-50 to-sky-50 dark:from-cyan-900/20 dark:to-sky-900/20 rounded-xl border border-cyan-200/50 dark:border-cyan-800/50">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-semibold text-cyan-700 dark:text-cyan-400 flex items-center gap-1.5">
          <Palette size={12} />
          Text Color
        </span>
        {value && (
          <button
            onClick={() => onChange(null)}
            className="text-[9px] px-2 py-0.5 bg-white dark:bg-stone-700 text-stone-600 dark:text-stone-300 rounded-md hover:bg-stone-100 dark:hover:bg-stone-600 transition-colors flex items-center gap-1"
          >
            <RotateCcw size={10} />
            Auto
          </button>
        )}
      </div>
      
      {/* Color Presets */}
      <div className="grid grid-cols-6 gap-2 mb-3">
        {TEXT_COLOR_PRESETS.map((preset) => (
          <button
            key={preset.color}
            onClick={() => onChange(preset.color)}
            className={`w-full aspect-square rounded-lg border-2 transition-all ${
              value === preset.color
                ? 'border-cyan-500 ring-2 ring-cyan-300 scale-105'
                : 'border-stone-200 dark:border-stone-600 hover:border-cyan-300'
            }`}
            style={{ backgroundColor: preset.color }}
            title={preset.name}
          >
            {value === preset.color && (
              <Check size={12} className={preset.dark ? 'text-white mx-auto' : 'text-stone-800 mx-auto'} />
            )}
          </button>
        ))}
      </div>
      
      {/* Custom Color Picker */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-[9px] text-stone-500 dark:text-stone-400">Custom:</label>
          <input
            type="color"
            value={value || defaultColor}
            onChange={(e) => onChange(e.target.value)}
            className="w-8 h-8 rounded-lg cursor-pointer border border-stone-200 dark:border-stone-600"
          />
        </div>
        <div className="flex-1 flex items-center gap-2">
          <input
            type="text"
            value={value || ''}
            placeholder={defaultColor || '#ffffff'}
            onChange={(e) => {
              const val = e.target.value;
              if (val.match(/^#[0-9A-Fa-f]{6}$/) || val === '') {
                onChange(val || null);
              }
            }}
            className="flex-1 px-2 py-1.5 text-[10px] font-mono bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
          />
        </div>
      </div>
      
      {/* Current color indicator */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-cyan-200/50 dark:border-cyan-700/50">
        <span className="text-[9px] text-stone-500 dark:text-stone-400">
          {value ? 'Custom color' : 'Auto (based on background)'}
        </span>
        <div 
          className="w-6 h-6 rounded-md border border-stone-300 dark:border-stone-600"
          style={{ backgroundColor: value || defaultColor }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Line Height Control Component
// ============================================================================

const LINE_HEIGHT_MIN = 1.0;
const LINE_HEIGHT_MAX = 2.5;
const LINE_HEIGHT_STEP = 0.1;

interface LineHeightControlProps {
  value: number; // 0 = auto
  autoValue: number;
  onChange: (value: number) => void;
}

function LineHeightControl({ value, autoValue, onChange }: LineHeightControlProps) {
  const isAuto = value === 0;
  const displayValue = isAuto ? autoValue : value;
  
  const presets = [
    { label: 'Auto', value: 0 },
    { label: 'Tight', value: 1.2 },
    { label: 'Normal', value: 1.5 },
    { label: 'Relaxed', value: 1.75 },
    { label: 'Loose', value: 2.0 },
  ];

  return (
    <div className="mt-3 p-3 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-xl border border-amber-200/50 dark:border-amber-800/50">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
          <LineChart size={12} />
          Line Height (Spacing)
        </span>
        {!isAuto && (
          <button
            onClick={() => onChange(0)}
            className="text-[9px] px-2 py-0.5 bg-white dark:bg-stone-700 text-stone-600 dark:text-stone-300 rounded-md hover:bg-stone-100 dark:hover:bg-stone-600 transition-colors flex items-center gap-1"
          >
            <RotateCcw size={10} />
            Auto
          </button>
        )}
      </div>
      
      {/* Slider */}
      <div className="flex items-center gap-3 mb-3">
        <button
          onClick={() => {
            const current = isAuto ? autoValue : value;
            onChange(Math.max(LINE_HEIGHT_MIN, current - LINE_HEIGHT_STEP));
          }}
          className="p-1.5 rounded-lg bg-white dark:bg-stone-700 shadow-sm hover:bg-stone-50 dark:hover:bg-stone-600 transition-colors"
        >
          <Minus size={14} className="text-amber-600 dark:text-amber-400" />
        </button>
        
        <div className="flex-1">
          <input
            type="range"
            min={LINE_HEIGHT_MIN}
            max={LINE_HEIGHT_MAX}
            step={LINE_HEIGHT_STEP}
            value={displayValue}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full h-2 bg-amber-200 dark:bg-amber-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
          <div className="flex justify-between mt-1">
            <span className="text-[8px] text-stone-400">Tight</span>
            <span className="text-[9px] font-mono text-amber-600 dark:text-amber-400">
              {isAuto ? `Auto (${autoValue.toFixed(2)})` : displayValue.toFixed(2)}
            </span>
            <span className="text-[8px] text-stone-400">Loose</span>
          </div>
        </div>
        
        <button
          onClick={() => {
            const current = isAuto ? autoValue : value;
            onChange(Math.min(LINE_HEIGHT_MAX, current + LINE_HEIGHT_STEP));
          }}
          className="p-1.5 rounded-lg bg-white dark:bg-stone-700 shadow-sm hover:bg-stone-50 dark:hover:bg-stone-600 transition-colors"
        >
          <Plus size={14} className="text-amber-600 dark:text-amber-400" />
        </button>
      </div>
      
      {/* Presets */}
      <div className="flex items-center justify-center gap-1.5 flex-wrap">
        {presets.map((preset) => (
          <button
            key={preset.label}
            onClick={() => onChange(preset.value)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors ${
              (preset.value === 0 && isAuto) || (preset.value !== 0 && Math.abs(value - preset.value) < 0.05)
                ? 'bg-amber-500 text-white'
                : 'bg-white dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-amber-100 dark:hover:bg-stone-600'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>
      
      {/* Visual Preview */}
      <div className="mt-3 p-2 bg-white dark:bg-stone-800 rounded-lg border border-amber-200 dark:border-amber-700">
        <p className="text-[10px] text-stone-600 dark:text-stone-400" style={{ lineHeight: displayValue }}>
          The quick brown fox jumps over the lazy dog. This preview shows the current line height setting.
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Container Size Control Component (Width Only)
// ============================================================================

const CONTAINER_WIDTH_MIN = 50;
const CONTAINER_WIDTH_MAX = 100;
const CONTAINER_SIZE_STEP = 5;

interface ContainerSizeControlProps {
  width: number;
  onWidthChange: (value: number) => void;
  onReset: () => void;
}

function ContainerSizeControl({ 
  width, 
  onWidthChange, 
  onReset,
}: ContainerSizeControlProps) {
  const widthPresets = [
    { label: '60%', value: 60 },
    { label: '70%', value: 70 },
    { label: '80%', value: 80 },
    { label: '90%', value: 90 },
    { label: '100%', value: 100 },
  ];

  return (
    <div className="mt-3 p-3 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-xl border border-violet-200/50 dark:border-violet-800/50">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-semibold text-violet-700 dark:text-violet-400 flex items-center gap-1.5">
          <Square size={12} />
          Quote Container Width
        </span>
        <button
          onClick={onReset}
          className="text-[9px] px-2 py-0.5 bg-white dark:bg-stone-700 text-stone-600 dark:text-stone-300 rounded-md hover:bg-stone-100 dark:hover:bg-stone-600 transition-colors flex items-center gap-1"
        >
          <RotateCcw size={10} />
          Reset
        </button>
      </div>
      
      {/* Width Control */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] text-stone-500 dark:text-stone-400 flex items-center gap-1">
            ↔ Width
          </span>
          <span className="text-[10px] font-mono text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/30 px-1.5 py-0.5 rounded">
            {width}%
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => onWidthChange(Math.max(CONTAINER_WIDTH_MIN, width - CONTAINER_SIZE_STEP))}
            disabled={width <= CONTAINER_WIDTH_MIN}
            className="p-1.5 rounded-lg bg-white dark:bg-stone-700 shadow-sm hover:bg-stone-50 dark:hover:bg-stone-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Minus size={12} className="text-violet-600 dark:text-violet-400" />
          </button>
          
          <input
            type="range"
            min={CONTAINER_WIDTH_MIN}
            max={CONTAINER_WIDTH_MAX}
            step={1}
            value={width}
            onChange={(e) => onWidthChange(Number(e.target.value))}
            className="flex-1 h-2 bg-violet-200 dark:bg-violet-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
          />
          
          <button
            onClick={() => onWidthChange(Math.min(CONTAINER_WIDTH_MAX, width + CONTAINER_SIZE_STEP))}
            disabled={width >= CONTAINER_WIDTH_MAX}
            className="p-1.5 rounded-lg bg-white dark:bg-stone-700 shadow-sm hover:bg-stone-50 dark:hover:bg-stone-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus size={12} className="text-violet-600 dark:text-violet-400" />
          </button>
        </div>
        
        {/* Width Presets */}
        <div className="flex items-center justify-center gap-1.5 mt-2">
          {widthPresets.map((preset) => (
            <button
              key={preset.label}
              onClick={() => onWidthChange(preset.value)}
              className={`px-2 py-1 rounded-lg text-[9px] font-medium transition-colors ${
                width === preset.value
                  ? 'bg-violet-500 text-white'
                  : 'bg-white dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-violet-100 dark:hover:bg-stone-600'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Info Text */}
      <p className="text-[8px] text-stone-400 dark:text-stone-500 mt-3 text-center">
        Tip: Adjust width to control line wrapping.
      </p>
    </div>
  );
}

// ============================================================================
// Text Format Control Component (Bold, Italic, Underline)
// ============================================================================

interface TextFormatControlProps {
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  onBoldChange: (value: boolean) => void;
  onItalicChange: (value: boolean) => void;
  onUnderlineChange: (value: boolean) => void;
}

function TextFormatControl({ 
  isBold, 
  isItalic, 
  isUnderline, 
  onBoldChange, 
  onItalicChange, 
  onUnderlineChange 
}: TextFormatControlProps) {
  const hasAnyFormat = isBold || isItalic || isUnderline;
  
  return (
    <div className="mt-3 p-3 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-xl border border-orange-200/50 dark:border-orange-800/50">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-semibold text-orange-700 dark:text-orange-400 flex items-center gap-1.5">
          <Type size={12} />
          Text Format
        </span>
        {hasAnyFormat && (
          <button
            onClick={() => {
              onBoldChange(false);
              onItalicChange(false);
              onUnderlineChange(false);
            }}
            className="text-[9px] px-2 py-0.5 bg-white dark:bg-stone-700 text-stone-600 dark:text-stone-300 rounded-md hover:bg-stone-100 dark:hover:bg-stone-600 transition-colors flex items-center gap-1"
          >
            <RotateCcw size={10} />
            Reset
          </button>
        )}
      </div>
      
      {/* Format Buttons */}
      <div className="flex items-center justify-center gap-3">
        {/* Bold */}
        <button
          onClick={() => onBoldChange(!isBold)}
          className={`flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl transition-all ${
            isBold
              ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30 ring-2 ring-orange-300'
              : 'bg-white dark:bg-stone-700 text-stone-700 dark:text-stone-300 hover:bg-orange-100 dark:hover:bg-stone-600'
          }`}
        >
          <Bold size={20} strokeWidth={isBold ? 3 : 2} />
          <span className="text-[10px] font-medium">Bold</span>
        </button>
        
        {/* Italic */}
        <button
          onClick={() => onItalicChange(!isItalic)}
          className={`flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl transition-all ${
            isItalic
              ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30 ring-2 ring-orange-300'
              : 'bg-white dark:bg-stone-700 text-stone-700 dark:text-stone-300 hover:bg-orange-100 dark:hover:bg-stone-600'
          }`}
        >
          <Italic size={20} />
          <span className="text-[10px] font-medium">Italic</span>
        </button>
        
        {/* Underline */}
        <button
          onClick={() => onUnderlineChange(!isUnderline)}
          className={`flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl transition-all ${
            isUnderline
              ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30 ring-2 ring-orange-300'
              : 'bg-white dark:bg-stone-700 text-stone-700 dark:text-stone-300 hover:bg-orange-100 dark:hover:bg-stone-600'
          }`}
        >
          <Underline size={20} />
          <span className="text-[10px] font-medium">Underline</span>
        </button>
      </div>
      
      {/* Preview */}
      <div className="mt-3 p-3 bg-white dark:bg-stone-800 rounded-lg border border-orange-200 dark:border-orange-700">
        <p 
          className="text-sm text-center text-stone-700 dark:text-stone-300"
          style={{
            fontWeight: isBold ? '700' : '400',
            fontStyle: isItalic ? 'italic' : 'normal',
            textDecoration: isUnderline ? 'underline' : 'none',
          }}
        >
          Preview: The quick brown fox
        </p>
      </div>
      
      {/* Active formats indicator */}
      {hasAnyFormat && (
        <div className="mt-2 flex items-center justify-center gap-2">
          <span className="text-[9px] text-stone-500 dark:text-stone-400">Active:</span>
          {isBold && (
            <span className="text-[9px] px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded font-bold">
              B
            </span>
          )}
          {isItalic && (
            <span className="text-[9px] px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded italic">
              I
            </span>
          )}
          {isUnderline && (
            <span className="text-[9px] px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded underline">
              U
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Copy Link Section Component
// ============================================================================

interface CopyLinkSectionProps {
  url: string;
  copied: boolean;
  onCopy: () => void;
}

function CopyLinkSection({ url, copied, onCopy }: CopyLinkSectionProps) {
  return (
    <div className="mb-4 sm:mb-5">
      <div className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-stone-100 dark:bg-stone-800 rounded-xl">
        <Link2 size={14} className="flex-shrink-0 text-stone-400" />
        <span className="flex-1 text-xs sm:text-sm text-stone-600 dark:text-stone-300 truncate font-mono">
          {url}
        </span>
        <button
          onClick={onCopy}
          className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all active:scale-95 ${
            copied 
                    ? 'bg-green-500 text-white' 
              : 'bg-stone-900 dark:bg-white text-white dark:text-stone-900 hover:bg-stone-800 dark:hover:bg-stone-100'
                }`}
              >
          {copied ? (
                  <>
              <Check size={12} className="sm:w-3.5 sm:h-3.5" />
              <span>Done</span>
                  </>
                ) : (
                  <>
              <Copy size={12} className="sm:w-3.5 sm:h-3.5" />
              <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>
  );
}

// ============================================================================
// Private Quote Notice Component
// ============================================================================

function PrivateQuoteNotice() {
  return (
    <div className="mb-4 sm:mb-5 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800/50">
      <div className="flex items-center gap-2">
        <Lock size={16} className="text-amber-600 dark:text-amber-400" />
        <span className="text-xs sm:text-sm font-medium text-amber-700 dark:text-amber-300">
          Private quote - no shareable link
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// Caption Section Component (Hashtags & Description)
// ============================================================================

interface CaptionSectionProps {
  quote: QuoteData;
  copied: boolean;
  onCopy: () => void;
}

function CaptionSection({ quote, copied, onCopy }: CaptionSectionProps) {
  const caption = useMemo(() => generateCaption(quote), [quote]);
  
  return (
    <div className="mb-4 sm:mb-5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">📝</span>
          <span className="text-xs font-medium text-stone-600 dark:text-stone-400">Caption & Hashtags</span>
        </div>
        <span className="text-[10px] text-stone-400">Tap to copy</span>
      </div>
      
      <div 
        onClick={onCopy}
        className="relative p-3 sm:p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-xl border border-amber-100 dark:border-amber-800/50 cursor-pointer hover:from-amber-100 hover:to-orange-100 dark:hover:from-amber-950/50 dark:hover:to-orange-950/50 transition-all group"
      >
        <pre className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 whitespace-pre-wrap font-sans leading-relaxed">
          {caption}
        </pre>
        
        {/* Copy indicator */}
        <div className={`absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-all ${
          copied 
            ? 'bg-green-500 text-white' 
            : 'bg-white/80 dark:bg-stone-800/80 text-stone-500 dark:text-stone-400 group-hover:bg-amber-500 group-hover:text-white'
        }`}>
          {copied ? (
            <>
              <Check size={10} />
              Copied!
            </>
          ) : (
            <>
              <Copy size={10} />
              Copy
            </>
          )}
        </div>
      </div>
      
      <p className="mt-2 text-[10px] text-stone-400 dark:text-stone-500 text-center">
        Paste this caption when you post on Instagram/Reels 🚀
      </p>
    </div>
  );
}

// ============================================================================
// Pinterest Icon Component
// ============================================================================

function PinterestIcon({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.237 2.636 7.855 6.356 9.312-.088-.791-.167-2.005.035-2.868.181-.78 1.172-4.97 1.172-4.97s-.299-.599-.299-1.484c0-1.391.806-2.428 1.809-2.428.853 0 1.265.64 1.265 1.408 0 .858-.546 2.14-.828 3.33-.236.995.5 1.807 1.481 1.807 1.778 0 3.144-1.874 3.144-4.58 0-2.393-1.72-4.068-4.177-4.068-2.845 0-4.515 2.135-4.515 4.34 0 .859.331 1.781.744 2.281a.3.3 0 01.069.288l.278 1.133c.044.183.145.223.334.134 1.249-.581 1.735-2.407 1.735-3.874 0-3.154 2.292-6.052 6.608-6.052 3.469 0 6.165 2.473 6.165 5.776 0 3.447-2.173 6.22-5.19 6.22-1.013 0-1.965-.527-2.292-1.155l-.623 2.378c-.226.869-.835 1.958-1.244 2.621.937.29 1.931.446 2.962.446 5.523 0 10-4.477 10-10S17.523 2 12 2z" />
    </svg>
  );
}

// ============================================================================
// Share Options Grid Component
// ============================================================================

interface ShareOptionsGridProps {
  isGenerating: boolean;
  onDownload: () => void;
  onInstagram: () => void;
  onWhatsApp: () => void;
  onPinterest: () => void;
  onCreateReel: () => void;
}

// Film icon for Reel
function FilmIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="18" height="18" x="3" y="3" rx="2"/>
      <path d="M7 3v18"/>
      <path d="M3 7.5h4"/>
      <path d="M3 12h18"/>
      <path d="M3 16.5h4"/>
      <path d="M17 3v18"/>
      <path d="M17 7.5h4"/>
      <path d="M17 16.5h4"/>
    </svg>
  );
}

function ShareOptionsGrid({ isGenerating, onDownload, onInstagram, onWhatsApp, onPinterest, onCreateReel }: ShareOptionsGridProps) {
  return (
    <div className="grid grid-cols-5 gap-2 sm:gap-3">
      <ShareButton
        onClick={onDownload}
        disabled={isGenerating}
        gradient="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/50"
        iconBg="bg-gradient-to-br from-amber-500 to-orange-500"
        shadowColor="shadow-amber-500/20 group-hover:shadow-amber-500/40"
        icon={isGenerating 
          ? <Sparkles size={18} className="sm:w-6 sm:h-6 text-white animate-pulse" />
          : <Download size={18} className="sm:w-6 sm:h-6 text-white" />
        }
        label={isGenerating ? 'Wait...' : 'Save'}
      />
      
      <ShareButton
        onClick={onInstagram}
        disabled={isGenerating}
        gradient="bg-gradient-to-br from-pink-50 to-orange-50 dark:from-pink-950/50 dark:to-orange-950/50"
        iconBg="bg-gradient-to-br from-pink-500 via-red-500 to-orange-500"
        shadowColor="shadow-pink-500/20 group-hover:shadow-pink-500/40"
        icon={<Instagram size={18} className="sm:w-6 sm:h-6 text-white" />}
        label="Insta"
      />
      
      <ShareButton
        onClick={onWhatsApp}
        disabled={isGenerating}
        gradient="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50"
        iconBg="bg-gradient-to-br from-green-500 to-emerald-500"
        shadowColor="shadow-green-500/20 group-hover:shadow-green-500/40"
        icon={<MessageCircle size={18} className="sm:w-6 sm:h-6 text-white" />}
        label="WhatsApp"
      />
      
      <ShareButton
        onClick={onPinterest}
        disabled={isGenerating}
        gradient="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/50 dark:to-rose-950/50"
        iconBg="bg-gradient-to-br from-red-500 to-rose-600"
        shadowColor="shadow-red-500/20 group-hover:shadow-red-500/40"
        icon={<PinterestIcon className="sm:w-6 sm:h-6 text-white" />}
        label="Pinterest"
      />

      <ShareButton
        onClick={onCreateReel}
        disabled={isGenerating}
        gradient="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/50 dark:to-purple-950/50"
        iconBg="bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500"
        shadowColor="shadow-violet-500/20 group-hover:shadow-violet-500/40"
        icon={<FilmIcon className="sm:w-6 sm:h-6 text-white" />}
        label="Reel"
      />
    </div>
  );
}

// ============================================================================
// Main ShareModal Component
// ============================================================================

export default function ShareModal({ 
  isOpen, 
  onClose, 
  quote, 
  cardTheme = DEFAULT_THEME,
  fontStyle = DEFAULT_FONT,
  backgroundImage = BACKGROUND_IMAGES[0],
}: ShareModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [captionCopied, setCaptionCopied] = useState(false);
  const [verticalOffset, setVerticalOffset] = useState(0);
  const [horizontalOffset, setHorizontalOffset] = useState(0);
  const [textAlign, setTextAlign] = useState<TextAlignment>('left');
  const [fontSizePx, setFontSizePx] = useState(0); // 0 = auto
  const [showPositionControl, setShowPositionControl] = useState(false);
  const [showFontSizeControl, setShowFontSizeControl] = useState(false);
  const [showAlignmentControl, setShowAlignmentControl] = useState(false);
  const [showZoomControl, setShowZoomControl] = useState(false);
  const [showTextEditor, setShowTextEditor] = useState(false);
  const [showFontStyleControl, setShowFontStyleControl] = useState(false);
  const [showTextColorControl, setShowTextColorControl] = useState(false);
  const [showLineHeightControl, setShowLineHeightControl] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<ShareFormatConfig>(DEFAULT_FORMAT);
  
  // Background zoom and pan state
  const [bgZoom, setBgZoom] = useState(1);
  const [bgPanX, setBgPanX] = useState(0);
  const [bgPanY, setBgPanY] = useState(0);
  
  // Font style state (for share customization)
  const [selectedFontStyle, setSelectedFontStyle] = useState<FontStyle>(fontStyle);
  
  // Text color state (null = auto/default)
  const [customTextColor, setCustomTextColor] = useState<string | null>(null);
  
  // Line height state (0 = auto)
  const [customLineHeight, setCustomLineHeight] = useState(0);
  
  // Text format state (bold, italic, underline)
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  
  // Container size state
  const [containerWidth, setContainerWidth] = useState(100);
  const [showContainerSizeControl, setShowContainerSizeControl] = useState(false);
  
  // Reel modal state
  const [showReelModal, setShowReelModal] = useState(false);
  const [showTextFormatControl, setShowTextFormatControl] = useState(false);
  
  // Edited quote text (with line breaks)
  const [editedQuoteText, setEditedQuoteText] = useState(quote.text);
  const [isTextEdited, setIsTextEdited] = useState(false);
  
  const previewRef = useRef<HTMLDivElement>(null);
  
  // Check if background image exists
  const hasBackgroundImage = !!(backgroundImage?.url || quote.custom_background);
  
  // Default text color based on background
  const defaultTextColor = hasBackgroundImage ? '#ffffff' : cardTheme.textColor;
  
  // Reset all states when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      // Reset to original quote text when modal opens
      setEditedQuoteText(quote.text);
      setIsTextEdited(false);
    } else {
      setBgZoom(1);
      setBgPanX(0);
      setBgPanY(0);
    }
  }, [isOpen, quote.text]);
  
  const handleResetZoom = useCallback(() => {
    setBgZoom(1);
    setBgPanX(0);
    setBgPanY(0);
  }, []);
  
  const handleResetTextPosition = useCallback(() => {
    setVerticalOffset(0);
    setHorizontalOffset(0);
  }, []);
  
  const handleResetContainerSize = useCallback(() => {
    setContainerWidth(100);
  }, []);
  
  const handleResetText = useCallback(() => {
    setEditedQuoteText(quote.text);
    setIsTextEdited(false);
  }, [quote.text]);
  
  const handleTextChange = useCallback((newText: string) => {
    setEditedQuoteText(newText);
    setIsTextEdited(newText !== quote.text);
  }, [quote.text]);
  
  // Create modified quote object with edited text
  const displayQuote = useMemo(() => ({
    ...quote,
    text: editedQuoteText,
  }), [quote, editedQuoteText]);

  // Derived state
  const isUserQuote = quote.isUserQuote || String(quote.id).startsWith('user_');
  const isPublicQuote = !isUserQuote || isQuotePublic(quote.is_public);
  
  // Calculate auto font size based on text length and format (for display in control)
  const autoFontSize = useMemo(() => {
    const textLength = quote.text.length;
    const getBaseFontSize = (formatId: ShareFormat): { min: number; max: number } => {
      switch (formatId) {
        case 'story': return { min: 15, max: 22 };
        case 'square': return { min: 13, max: 19 };
        default: return { min: 13, max: 19 };
      }
    };
    const { min, max } = getBaseFontSize(selectedFormat.id);
    return calculateFontSize(textLength, min, max);
  }, [quote.text.length, selectedFormat.id]);
  
  // Generate quote URL
  const getQuoteUrl = useCallback(() => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    if (isUserQuote) {
      return `${baseUrl}/user-quote/${String(quote.id).replace('user_', '')}`;
    }
    return `${baseUrl}/quote/${quote.id}`;
  }, [isUserQuote, quote.id]);

  // Generate quote text for sharing
  const getShareText = useCallback((includeUrl = false) => {
    const text = quote.author ? `"${quote.text}" — ${quote.author}` : `"${quote.text}"`;
    if (includeUrl && isPublicQuote) {
      return `${text}\n\n${getQuoteUrl()}`;
    }
    return text;
  }, [quote.text, quote.author, isPublicQuote, getQuoteUrl]);

  // Reset state on modal open
  useEffect(() => {
    if (!isOpen) return;
    setLinkCopied(false);
    setCaptionCopied(false);
    setVerticalOffset(0);
    setHorizontalOffset(0);
    setTextAlign('left');
    setFontSizePx(0); // Reset to auto
    setShowPositionControl(false);
    setShowFontSizeControl(false);
    setShowAlignmentControl(false);
    setShowZoomControl(false);
    setShowTextEditor(false);
    setShowFontStyleControl(false);
    setShowTextColorControl(false);
    setShowLineHeightControl(false);
    setShowTextFormatControl(false);
    setShowContainerSizeControl(false);
    setSelectedFontStyle(fontStyle);
    setCustomTextColor(null);
    setCustomLineHeight(0);
    setIsBold(false);
    setIsItalic(false);
    setIsUnderline(false);
    setContainerWidth(100);
    setSelectedFormat(DEFAULT_FORMAT);
  }, [isOpen, quote.id, fontStyle]);

  // Copy to clipboard utility
  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    }
  }, []);

  // Handle copy link
  const handleCopyLink = useCallback(async () => {
    await copyToClipboard(getQuoteUrl());
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), COPY_FEEDBACK_DURATION);
  }, [copyToClipboard, getQuoteUrl]);

  // Handle copy caption (hashtags & description)
  const handleCopyCaption = useCallback(async () => {
    const caption = generateCaption(quote);
    await copyToClipboard(caption);
    setCaptionCopied(true);
    setTimeout(() => setCaptionCopied(false), COPY_FEEDBACK_DURATION);
  }, [copyToClipboard, quote]);

  // Generate image from preview card
  const generateImage = useCallback(async (): Promise<string | null> => {
    const previewCard = previewRef.current?.querySelector('[data-preview-card="true"]') as HTMLElement;
    if (!previewCard) return null;

    // Hide author text before generating image (author shows in preview but not in download)
    const authorElement = previewCard.querySelector('[data-author-text="true"]') as HTMLElement;
    const originalDisplay = authorElement?.style.display;
    if (authorElement) {
      authorElement.style.display = 'none';
    }

    // Calculate effective pixel ratio based on zoom level
    // When zoomed in, we need higher resolution to maintain quality
    // Cap at reasonable maximum to prevent memory issues on mobile
    const zoomMultiplier = Math.min(bgZoom, 2); // Cap zoom multiplier at 2x
    const effectivePixelRatio = Math.min(
      selectedFormat.pixelRatio * zoomMultiplier,
      8 // Maximum pixel ratio to prevent memory issues
    );

    // Quality settings based on selected format
    // Story: 1080×1920, Post: 1920×2400, Square: 1080×1080
    const imageOptions = {
      quality: 1.0,
      pixelRatio: effectivePixelRatio,
      cacheBust: true,
      width: previewCard.offsetWidth,
      height: previewCard.offsetHeight,
      style: { borderRadius: '0px', overflow: 'hidden' },
    };

    // Helper to restore author visibility
    const restoreAuthor = () => {
      if (authorElement) {
        authorElement.style.display = originalDisplay || '';
      }
    };

    try {
      const result = await toPng(previewCard, imageOptions);
      restoreAuthor();
      return result;
    } catch {
      // Fallback with lower quality if device can't handle high resolution
      try {
        const result = await toPng(previewCard, { ...imageOptions, pixelRatio: Math.max(2, effectivePixelRatio - 2) });
        restoreAuthor();
        return result;
      } catch {
        // Last resort fallback
        try {
          const result = await toPng(previewCard, { ...imageOptions, pixelRatio: 2 });
          restoreAuthor();
          return result;
      } catch {
        restoreAuthor();
        return null;
      }
    }
    }
  }, [selectedFormat.pixelRatio, bgZoom]);

  // Get filename for download
  const getFilename = useCallback(() => {
    const quoteIdStr = String(quote.id).replace('user_', 'my-');
    const formatSuffix = selectedFormat.id !== 'post' ? `-${selectedFormat.id}` : '';
    if (quote.author) {
      const authorName = quote.author.replace(/\s+/g, '-').toLowerCase();
      return `quote-${quoteIdStr}-${authorName}${formatSuffix}.png`;
    }
    return `quote-${quoteIdStr}${formatSuffix}.png`;
  }, [quote.author, quote.id, selectedFormat.id]);

  // Download image handler
  const handleDownload = useCallback(async () => {
    setIsGenerating(true);
    try {
      const imageUrl = await generateImage();
      if (imageUrl) {
        const link = document.createElement('a');
        link.download = getFilename();
        link.href = imageUrl;
        link.click();
      }
    } finally {
      setIsGenerating(false);
    }
  }, [generateImage, getFilename]);

  // Share to Instagram (opens story or post based on format)
  const handleInstagramShare = useCallback(async () => {
    await handleDownload();
    setTimeout(() => {
      // Open different Instagram pages based on format
      const instagramUrl = selectedFormat.id === 'story' 
        ? 'https://www.instagram.com/create/story/' 
        : 'https://www.instagram.com/';
      window.open(instagramUrl, '_blank', 'noopener,noreferrer');
    }, 300);
  }, [handleDownload, selectedFormat.id]);

  // Share to WhatsApp
  const handleWhatsAppShare = useCallback(async () => {
    await handleDownload();
    const text = getShareText(isPublicQuote);
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  }, [handleDownload, getShareText, isPublicQuote]);

  // Share to Pinterest
  const handlePinterestShare = useCallback(async () => {
    const imageUrl = await generateImage();
    if (!imageUrl) return;
    
    const description = getShareText(false);
    const shareUrl = isPublicQuote ? getQuoteUrl() : (typeof window !== 'undefined' ? window.location.origin : '');
    const url = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(shareUrl)}&media=${encodeURIComponent(imageUrl)}&description=${encodeURIComponent(description)}`;
    window.open(url, '_blank', 'width=750,height=600');
  }, [generateImage, getShareText, isPublicQuote, getQuoteUrl]);

  // Generic share (Web Share API)
  const handleGenericShare = useCallback(async () => {
    setIsGenerating(true);
    const imageUrl = await generateImage();
    setIsGenerating(false);
    
    const shareText = getShareText(false);
    const shareUrl = isPublicQuote ? getQuoteUrl() : '';
    
    if (navigator.share && imageUrl) {
      try {
        const res = await fetch(imageUrl);
        const blob = await res.blob();
        const file = new File([blob], getFilename(), { type: 'image/png' });
        
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'Quote', text: shareText });
          return;
        }
        
        await navigator.share({
          title: 'Quote',
          text: shareText,
          ...(isPublicQuote && { url: shareUrl }),
        });
      } catch {
        const textToCopy = isPublicQuote ? shareUrl : shareText;
        await copyToClipboard(textToCopy);
        alert(isPublicQuote ? 'Link copied to clipboard!' : 'Quote copied to clipboard!');
      }
    } else {
      const textToCopy = isPublicQuote ? shareUrl : shareText;
      await copyToClipboard(textToCopy);
      alert(isPublicQuote ? 'Link copied to clipboard!' : 'Quote copied to clipboard!');
    }
  }, [generateImage, getShareText, isPublicQuote, getQuoteUrl, getFilename, copyToClipboard]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full sm:max-w-xl mx-0 sm:mx-4 bg-white dark:bg-stone-900 rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[95vh] overflow-hidden animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="relative px-4 pt-4 pb-3 sm:px-6 sm:pt-5 sm:pb-4 border-b border-stone-100 dark:border-stone-800">
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-stone-300 dark:bg-stone-700 rounded-full sm:hidden" />
          
          <div className="flex items-center justify-between mt-2 sm:mt-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-500 to-rose-500 flex items-center justify-center">
                <Share2 size={16} className="sm:w-5 sm:h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-stone-900 dark:text-white">Share Quote</h2>
                <p className="text-[10px] sm:text-xs text-stone-500 dark:text-stone-400">Adjust position & download</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
            >
              <X size={16} className="sm:w-[18px] sm:h-[18px] text-stone-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-4 sm:px-6 sm:py-5 overflow-y-auto max-h-[calc(95vh-80px)]">
          {/* Preview Card with Position Control */}
          <div className="mb-4 sm:mb-5">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <ImageIcon size={14} className="text-stone-400" />
                <span className="text-xs font-medium text-stone-500 dark:text-stone-400">Preview</span>
              </div>
              
              {/* Format Selector */}
              <FormatSelector 
                selectedFormat={selectedFormat.id} 
                onChange={setSelectedFormat} 
              />
            </div>

            {/* Preview Card Container */}
            <div 
              ref={previewRef}
              className="flex justify-center items-center p-4 sm:p-6 bg-gradient-to-br from-stone-100 via-stone-50 to-stone-200 dark:from-stone-800 dark:via-stone-850 dark:to-stone-900 rounded-2xl transition-all duration-300"
              style={{ minHeight: `${selectedFormat.height * PREVIEW_SCALE + 48}px` }}
            >
              <div 
                className="relative shadow-2xl rounded-2xl overflow-hidden ring-1 ring-black/5 dark:ring-white/10 transition-all duration-300"
                style={{ 
                  width: `${selectedFormat.width * PREVIEW_SCALE}px`, 
                  height: `${selectedFormat.height * PREVIEW_SCALE}px` 
                }}
              >
                <div 
                  className="origin-top-left transition-all duration-300"
                  style={{ 
                    transform: `scale(${PREVIEW_SCALE})`,
                    width: `${selectedFormat.width}px`,
                    height: `${selectedFormat.height}px`,
                  }}
                >
                  <PreviewCard
                    quote={displayQuote}
                    cardTheme={cardTheme}
                    fontStyle={selectedFontStyle}
                    backgroundImage={backgroundImage}
                    customBackground={quote.custom_background}
                    verticalOffset={verticalOffset}
                    horizontalOffset={horizontalOffset}
                    textAlign={textAlign}
                    format={selectedFormat}
                    fontSizePx={fontSizePx}
                    bgZoom={bgZoom}
                    bgPanX={bgPanX}
                    bgPanY={bgPanY}
                    customTextColor={customTextColor}
                    customLineHeight={customLineHeight}
                    isBold={isBold}
                    isItalic={isItalic}
                    isUnderline={isUnderline}
                    containerWidth={containerWidth}
                  />
                </div>
              </div>
            </div>

            {/* Adjustment Controls Row */}
            <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                {/* Position Toggle */}
            <button
                  onClick={() => {
                    setShowPositionControl(!showPositionControl);
                    if (!showPositionControl) {
                      setShowFontSizeControl(false);
                      setShowAlignmentControl(false);
                      setShowZoomControl(false);
                      setShowTextEditor(false);
                      setShowFontStyleControl(false);
                      setShowTextColorControl(false);
                      setShowLineHeightControl(false);
                      setShowTextFormatControl(false);
                      setShowContainerSizeControl(false);
                    }
                  }}
                  className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-colors ${
                    showPositionControl 
                      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' 
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                  }`}
                >
                  <MoveVertical size={12} />
                  <span className="hidden sm:inline">Position</span>
            </button>

                {/* Font Size Toggle */}
            <button
                  onClick={() => {
                    setShowFontSizeControl(!showFontSizeControl);
                    if (!showFontSizeControl) {
                      setShowPositionControl(false);
                      setShowAlignmentControl(false);
                      setShowZoomControl(false);
                      setShowTextEditor(false);
                      setShowFontStyleControl(false);
                      setShowTextColorControl(false);
                      setShowLineHeightControl(false);
                      setShowTextFormatControl(false);
                      setShowContainerSizeControl(false);
                    }
                  }}
                  className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-colors ${
                    showFontSizeControl 
                      ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400' 
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                  }`}
                >
                  <Type size={12} />
                  <span className="hidden sm:inline">Size</span>
            </button>

                {/* Text Alignment Toggle */}
            <button
                  onClick={() => {
                    setShowAlignmentControl(!showAlignmentControl);
                    if (!showAlignmentControl) {
                      setShowPositionControl(false);
                      setShowFontSizeControl(false);
                      setShowZoomControl(false);
                      setShowTextEditor(false);
                      setShowFontStyleControl(false);
                      setShowTextColorControl(false);
                      setShowLineHeightControl(false);
                      setShowTextFormatControl(false);
                      setShowContainerSizeControl(false);
                    }
                  }}
                  className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-colors ${
                    showAlignmentControl 
                      ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400' 
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                  }`}
                >
                  {textAlign === 'left' && <AlignLeft size={12} />}
                  {textAlign === 'center' && <AlignCenter size={12} />}
                  {textAlign === 'right' && <AlignRight size={12} />}
                  {textAlign === 'justify' && <AlignJustify size={12} />}
                  {textAlign === 'start' && <AlignStartVertical size={12} />}
                  {textAlign === 'end' && <AlignEndVertical size={12} />}
                  <span className="hidden sm:inline">Align</span>
                </button>
                
                {/* Background Zoom Toggle - Only show when there's a background image */}
                {hasBackgroundImage && (
                  <button
                    onClick={() => {
                      setShowZoomControl(!showZoomControl);
                      if (!showZoomControl) {
                        setShowPositionControl(false);
                        setShowFontSizeControl(false);
                        setShowAlignmentControl(false);
                        setShowTextEditor(false);
                        setShowFontStyleControl(false);
                        setShowTextColorControl(false);
                        setShowLineHeightControl(false);
                        setShowTextFormatControl(false);
                        setShowContainerSizeControl(false);
                      }
                    }}
                    className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-colors ${
                      showZoomControl 
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' 
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                    }`}
                  >
                    <ZoomIn size={12} />
                    <span className="hidden sm:inline">Zoom</span>
                    {bgZoom > 1 && (
                      <span className="text-[9px] bg-emerald-500 text-white px-1 rounded">{bgZoom.toFixed(1)}x</span>
                    )}
            </button>
                )}

                {/* Text Editor Toggle - Add Line Breaks */}
            <button
                  onClick={() => {
                    setShowTextEditor(!showTextEditor);
                    if (!showTextEditor) {
                      setShowPositionControl(false);
                      setShowFontSizeControl(false);
                      setShowAlignmentControl(false);
                      setShowZoomControl(false);
                      setShowFontStyleControl(false);
                      setShowTextColorControl(false);
                      setShowLineHeightControl(false);
                      setShowTextFormatControl(false);
                      setShowContainerSizeControl(false);
                    }
                  }}
                  className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-colors ${
                    showTextEditor 
                      ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' 
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                  }`}
                >
                  <WrapText size={12} />
                  <span className="hidden sm:inline">Edit</span>
                  {isTextEdited && (
                    <span className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                  )}
            </button>
            
                {/* Font Style Toggle */}
                <button
                  onClick={() => {
                    setShowFontStyleControl(!showFontStyleControl);
                    if (!showFontStyleControl) {
                      setShowPositionControl(false);
                      setShowFontSizeControl(false);
                      setShowAlignmentControl(false);
                      setShowZoomControl(false);
                      setShowTextEditor(false);
                      setShowTextColorControl(false);
                      setShowLineHeightControl(false);
                      setShowTextFormatControl(false);
                      setShowContainerSizeControl(false);
                    }
                  }}
                  className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-colors ${
                    showFontStyleControl 
                      ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400' 
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                  }`}
                >
                  <Type size={12} />
                  <span className="hidden sm:inline">Style</span>
                </button>
                
                {/* Text Color Toggle */}
                <button
                  onClick={() => {
                    setShowTextColorControl(!showTextColorControl);
                    if (!showTextColorControl) {
                      setShowPositionControl(false);
                      setShowFontSizeControl(false);
                      setShowAlignmentControl(false);
                      setShowZoomControl(false);
                      setShowTextEditor(false);
                      setShowFontStyleControl(false);
                      setShowLineHeightControl(false);
                      setShowTextFormatControl(false);
                      setShowContainerSizeControl(false);
                    }
                  }}
                  className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-colors ${
                    showTextColorControl 
                      ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400' 
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                  }`}
                >
                  <Palette size={12} />
                  <span className="hidden sm:inline">Color</span>
                  {customTextColor && (
                    <span 
                      className="w-2.5 h-2.5 rounded-full border border-white/50"
                      style={{ backgroundColor: customTextColor }}
                    />
                  )}
                </button>
                
                {/* Line Height Toggle */}
                <button
                  onClick={() => {
                    setShowLineHeightControl(!showLineHeightControl);
                    if (!showLineHeightControl) {
                      setShowPositionControl(false);
                      setShowFontSizeControl(false);
                      setShowAlignmentControl(false);
                      setShowZoomControl(false);
                      setShowTextEditor(false);
                      setShowFontStyleControl(false);
                      setShowTextColorControl(false);
                      setShowTextFormatControl(false);
                      setShowContainerSizeControl(false);
                    }
                  }}
                  className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-colors ${
                    showLineHeightControl 
                      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' 
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                  }`}
                >
                  <LineChart size={12} />
                  <span className="hidden sm:inline">Space</span>
                </button>
                
                {/* Text Format Toggle (Bold, Italic, Underline) */}
                <button
                  onClick={() => {
                    setShowTextFormatControl(!showTextFormatControl);
                    if (!showTextFormatControl) {
                      setShowPositionControl(false);
                      setShowFontSizeControl(false);
                      setShowAlignmentControl(false);
                      setShowZoomControl(false);
                      setShowTextEditor(false);
                      setShowFontStyleControl(false);
                      setShowTextColorControl(false);
                      setShowLineHeightControl(false);
                      setShowContainerSizeControl(false);
                    }
                  }}
                  className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-colors ${
                    showTextFormatControl 
                      ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' 
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                  }`}
                >
                  <Bold size={12} />
                  <span className="hidden sm:inline">Format</span>
                  {(isBold || isItalic || isUnderline) && (
                    <span className="flex items-center gap-0.5">
                      {isBold && <span className="text-[8px] font-bold">B</span>}
                      {isItalic && <span className="text-[8px] italic">I</span>}
                      {isUnderline && <span className="text-[8px] underline">U</span>}
                    </span>
                  )}
                </button>
                
                {/* Container Size Toggle */}
                <button
                  onClick={() => {
                    setShowContainerSizeControl(!showContainerSizeControl);
                    if (!showContainerSizeControl) {
                      setShowPositionControl(false);
                      setShowFontSizeControl(false);
                      setShowAlignmentControl(false);
                      setShowZoomControl(false);
                      setShowTextEditor(false);
                      setShowFontStyleControl(false);
                      setShowTextColorControl(false);
                      setShowLineHeightControl(false);
                      setShowTextFormatControl(false);
                    }
                  }}
                  className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-colors ${
                    showContainerSizeControl 
                      ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400' 
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                  }`}
                >
                  <Square size={12} />
                  <span className="hidden sm:inline">Width</span>
                  {containerWidth !== 100 && (
                    <span className="text-[8px] bg-violet-500 text-white px-1 rounded">
                      {containerWidth}%
                    </span>
                  )}
                </button>
          </div>
              
              {/* Output size indicator */}
              <span className="text-[10px] text-stone-400 dark:text-stone-500 font-mono">
                {selectedFormat.id === 'story' && '1080×1920'}
                {selectedFormat.id === 'post' && '1920×2400'}
                {selectedFormat.id === 'square' && '1080×1080'}
              </span>
            </div>
            
            {/* Text Position Control Panel */}
            {showPositionControl && (
              <TextPositionControl
                verticalOffset={verticalOffset}
                horizontalOffset={horizontalOffset}
                onVerticalChange={setVerticalOffset}
                onHorizontalChange={setHorizontalOffset}
                onReset={handleResetTextPosition}
              />
            )}

            {/* Font Size Control Panel */}
            {showFontSizeControl && (
              <FontSizeControl
                value={fontSizePx}
                onChange={setFontSizePx}
                autoSize={autoFontSize}
              />
            )}
            
            {/* Text Alignment Control Panel */}
            {showAlignmentControl && (
              <TextAlignmentControl
                value={textAlign}
                onChange={setTextAlign}
              />
            )}
            
            {/* Background Zoom Control Panel */}
            {showZoomControl && hasBackgroundImage && (
              <BackgroundZoomControl
                zoom={bgZoom}
                panX={bgPanX}
                panY={bgPanY}
                onZoomChange={setBgZoom}
                onPanXChange={setBgPanX}
                onPanYChange={setBgPanY}
                onReset={handleResetZoom}
              />
            )}
            
            {/* Text Editor Control Panel */}
            {showTextEditor && (
              <TextEditorControl
                originalText={quote.text}
                editedText={editedQuoteText}
                onChange={handleTextChange}
                onReset={handleResetText}
                isEdited={isTextEdited}
              />
            )}
            
            {/* Font Style Control Panel */}
            {showFontStyleControl && (
              <FontStyleSelector
                selectedFont={selectedFontStyle}
                onFontChange={setSelectedFontStyle}
              />
            )}
            
            {/* Text Color Control Panel */}
            {showTextColorControl && (
              <TextColorPicker
                value={customTextColor}
                defaultColor={defaultTextColor}
                onChange={setCustomTextColor}
              />
            )}
            
            {/* Line Height Control Panel */}
            {showLineHeightControl && (
              <LineHeightControl
                value={customLineHeight}
                autoValue={calculateLineHeight(quote.text.length)}
                onChange={setCustomLineHeight}
              />
            )}
            
            {/* Text Format Control Panel (Bold, Italic, Underline) */}
            {showTextFormatControl && (
              <TextFormatControl
                isBold={isBold}
                isItalic={isItalic}
                isUnderline={isUnderline}
                onBoldChange={setIsBold}
                onItalicChange={setIsItalic}
                onUnderlineChange={setIsUnderline}
              />
            )}
            
            {/* Container Size Control Panel */}
            {showContainerSizeControl && (
              <ContainerSizeControl
                width={containerWidth}
                onWidthChange={setContainerWidth}
                onReset={handleResetContainerSize}
              />
            )}
            </div>

          {/* Caption & Hashtags Section */}
          <CaptionSection 
            quote={quote} 
            copied={captionCopied} 
            onCopy={handleCopyCaption} 
          />

          {/* Copy Link / Private Notice */}
          {isPublicQuote ? (
            <CopyLinkSection url={getQuoteUrl()} copied={linkCopied} onCopy={handleCopyLink} />
          ) : (
            <PrivateQuoteNotice />
          )}

          {/* Share Options Grid */}
          <ShareOptionsGrid
            isGenerating={isGenerating}
            onDownload={handleDownload}
            onInstagram={handleInstagramShare}
            onWhatsApp={handleWhatsAppShare}
            onPinterest={handlePinterestShare}
            onCreateReel={() => setShowReelModal(true)}
          />

          {/* More Options */}
          <button
            onClick={handleGenericShare}
            disabled={isGenerating}
            className="w-full mt-3 sm:mt-4 flex items-center justify-center gap-2 px-4 py-2.5 sm:py-3 bg-stone-100 dark:bg-stone-800 rounded-xl sm:rounded-2xl hover:bg-stone-200 dark:hover:bg-stone-700 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <Share2 size={14} className="sm:w-4 sm:h-4 text-stone-600 dark:text-stone-400" />
            <span className="text-xs sm:text-sm font-semibold text-stone-700 dark:text-stone-300">More sharing options</span>
          </button>
          </div>
        </div>

      {/* Quote Reel Modal */}
      <QuoteReelModal
        isOpen={showReelModal}
        onClose={() => setShowReelModal(false)}
        quote={{
          id: quote.id,
          text: quote.text,
          author: quote.author,
          category: quote.category,
        }}
      />
    </div>
  );
}
