'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Instagram, MessageCircle, Download, Share2, Link2, Check, Copy, X, Sparkles, Image as ImageIcon, MoveVertical, ChevronUp, ChevronDown, Lock, Smartphone, Square, RectangleVertical, Type, Minus, Plus } from 'lucide-react';
import { toPng } from 'html-to-image';
import { isQuotePublic } from '@/lib/helpers';
import Image from 'next/image';
import { CardTheme, FontStyle, BackgroundImage, DEFAULT_THEME, DEFAULT_FONT, BACKGROUND_IMAGES } from '@/lib/constants';

// ============================================================================
// Types & Interfaces
// ============================================================================

type ShareFormat = 'post' | 'story' | 'square';

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
  format?: ShareFormatConfig;
  fontSizePx?: number; // 0 = auto, otherwise direct px value
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
  { label: 'Top', value: -40 },
  { label: 'Center', value: 0 },
  { label: 'Bottom', value: 40 },
] as const;

const POSITION_STEP = 10;
const POSITION_MIN = -50;
const POSITION_MAX = 50;
const COPY_FEEDBACK_DURATION = 2000;

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
      <span className="text-[10px] sm:text-xs font-semibold text-gray-700 dark:text-gray-300">
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
  format = DEFAULT_FORMAT,
  fontSizePx = 0,
}: PreviewCardProps) {
  const textLength = quote.text.length;
  const hasBackgroundImage = !!(backgroundImage?.url || customBackground);
  const actualBackgroundUrl = customBackground || backgroundImage?.url;
  const backgroundOverlay = backgroundImage?.overlay || 'linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.5))';
  
  // Memoized color scheme based on theme and background
  const colors = useMemo(() => {
    const isDark = cardTheme.isDark || hasBackgroundImage;
    return {
      isDark,
      text: hasBackgroundImage ? '#ffffff' : cardTheme.textColor,
      author: hasBackgroundImage ? 'rgba(255,255,255,0.8)' : cardTheme.authorColor,
      divider: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',
    };
  }, [cardTheme, hasBackgroundImage]);

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
    return {
      fontSize: finalFontSize,
      autoFontSize, // expose for control display
      lineHeight: calculateLineHeight(textLength),
    };
  }, [textLength, format.id, fontSizePx]);

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
    fontWeight: fontStyle.fontWeight,
    fontSize: `${typography.fontSize}px`,
    lineHeight: typography.lineHeight,
    textShadow: hasBackgroundImage ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
    // Consistent word-breaking with QuoteCard
    wordWrap: 'normal' as const,
    overflowWrap: 'normal' as const,
    wordBreak: 'keep-all' as const,
    hyphens: 'none' as const,
    WebkitHyphens: 'none' as const,
    msHyphens: 'none' as const,
    whiteSpace: 'normal' as const,
  }), [colors.text, fontStyle, typography, hasBackgroundImage]);

  // Vertical position calculations
  const getJustifyContent = useCallback(() => {
    if (verticalOffset <= -30) return 'flex-start';
    if (verticalOffset >= 30) return 'flex-end';
    return 'center';
  }, [verticalOffset]);

  const getPadding = useCallback(() => ({
    top: verticalOffset > 0 ? `${verticalOffset * 0.8}%` : '0',
    bottom: verticalOffset < 0 ? `${Math.abs(verticalOffset) * 0.8}%` : '0',
  }), [verticalOffset]);

  const padding = getPadding();

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
      {/* Background Image Layer */}
      {hasBackgroundImage && actualBackgroundUrl && (
        <>
          <div className="absolute inset-0">
            <Image
              src={actualBackgroundUrl}
              alt="Card background"
              fill
              className="object-cover"
              sizes="320px"
              priority
              unoptimized
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
      <div className="relative z-10 flex flex-col h-full p-6">
        {/* Header spacer */}
        <div className="flex-shrink-0 h-6" />

        {/* Quote Content Area - matches QuoteCard py-6 at sm breakpoint */}
        <div 
          className="flex-1 flex flex-col overflow-hidden transition-all duration-200 py-6"
          style={{ 
            justifyContent: getJustifyContent(),
            paddingTop: verticalOffset > 0 ? `${verticalOffset * 0.8}%` : undefined,
            paddingBottom: verticalOffset < 0 ? `${Math.abs(verticalOffset) * 0.8}%` : undefined,
          }}
        >
          {/* Quote Mark */}
          <QuoteMark color={colors.text} isDark={colors.isDark} />
          
          {/* Quote text */}
          <p style={quoteTextStyle}>{quote.text}</p>
        </div>
        
        {/* Author Section */}
        <AuthorSection 
          author={quote.author}
          colors={colors}
          hasBackgroundImage={hasBackgroundImage}
        />
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
      <div className="w-14 h-px mb-4" style={{ background: colors.divider }} />
      
      <div className="flex items-center justify-between">
        {author ? (
          <p className="text-sm font-medium tracking-wide" style={textStyle}>
            — {author}
          </p>
        ) : <div />}
        
        <div className="flex items-center gap-1.5" style={{ opacity: colors.isDark ? 0.7 : 0.6 }}>
          <Image 
            src="/logo.svg" 
            alt="QuoteSwipe" 
            width={20}
            height={20}
            style={{ filter: colors.isDark ? 'brightness(1.5)' : 'none' }}
          />
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
    <div className="flex items-center gap-1.5 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
      {SHARE_FORMATS.map((format) => (
        <button
          key={format.id}
          onClick={() => onChange(format)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            selectedFormat === format.id
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
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
// Position Control Component
// ============================================================================

interface PositionControlProps {
  value: number;
  onChange: (value: number) => void;
  onAdjust: (delta: number) => void;
}

function PositionControl({ value, onChange, onAdjust }: PositionControlProps) {
  const formatValue = (v: number) => v > 0 ? `+${v}` : String(v);
  
  const isPresetActive = (presetValue: number) => Math.abs(value - presetValue) < 15;

  return (
    <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
      <div className="flex items-center gap-3">
        {/* Up Button */}
        <button
          onClick={() => onAdjust(-POSITION_STEP)}
          className="p-1.5 rounded-lg bg-white dark:bg-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          title="Move Up"
        >
          <ChevronUp size={16} className="text-gray-600 dark:text-gray-300" />
        </button>
        
        {/* Slider */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
              Quote Position
            </span>
            <span className="text-[10px] font-mono text-gray-400">
              {formatValue(value)}%
            </span>
          </div>
          <input
            type="range"
            min={POSITION_MIN}
            max={POSITION_MAX}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex justify-between mt-1">
            <span className="text-[9px] text-gray-400">↑ Top</span>
            <span className="text-[9px] text-gray-400">Center</span>
            <span className="text-[9px] text-gray-400">Bottom ↓</span>
          </div>
        </div>
        
        {/* Down Button */}
        <button
          onClick={() => onAdjust(POSITION_STEP)}
          className="p-1.5 rounded-lg bg-white dark:bg-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          title="Move Down"
        >
          <ChevronDown size={16} className="text-gray-600 dark:text-gray-300" />
        </button>
      </div>
      
      {/* Quick Position Presets */}
      <div className="flex items-center justify-center gap-2 mt-3">
        {POSITION_PRESETS.map((preset) => (
          <button
            key={preset.label}
            onClick={() => onChange(preset.value)}
            className={`px-3 py-1 rounded-lg text-[10px] font-medium transition-colors ${
              isPresetActive(preset.value)
                ? 'bg-blue-500 text-white'
                : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
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
    <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
      <div className="flex items-center gap-3">
        {/* Decrease Button */}
        <button
          onClick={handleDecrease}
          disabled={!isAuto && value <= FONT_SIZE_PX_MIN}
          className="p-1.5 rounded-lg bg-white dark:bg-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title="Smaller"
        >
          <Minus size={16} className="text-gray-600 dark:text-gray-300" />
        </button>
        
        {/* Size Display & Input */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Type size={10} />
              Font Size
            </span>
            {isAuto && (
              <span className="text-[9px] px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded">
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
              className="w-20 px-2.5 py-1.5 text-sm font-mono text-center bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
            />
            <span className="text-xs text-gray-500 dark:text-gray-400">px</span>
            
            {/* Slider */}
            <input
              type="range"
              min={FONT_SIZE_PX_MIN}
              max={FONT_SIZE_PX_MAX}
              value={displayValue}
              onChange={(e) => onChange(Number(e.target.value))}
              className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
          </div>
          
          <div className="flex justify-between mt-1.5 px-1">
            <span className="text-[9px] text-gray-400">{FONT_SIZE_PX_MIN}px</span>
            <span className="text-[9px] text-gray-400 font-medium">
              Current: {displayValue}px
            </span>
            <span className="text-[9px] text-gray-400">{FONT_SIZE_PX_MAX}px</span>
          </div>
        </div>
        
        {/* Increase Button */}
        <button
          onClick={handleIncrease}
          disabled={!isAuto && value >= FONT_SIZE_PX_MAX}
          className="p-1.5 rounded-lg bg-white dark:bg-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title="Larger"
        >
          <Plus size={16} className="text-gray-600 dark:text-gray-300" />
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
                ? 'bg-purple-500 text-white'
                : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
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
      <div className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl">
        <Link2 size={14} className="flex-shrink-0 text-gray-400" />
        <span className="flex-1 text-xs sm:text-sm text-gray-600 dark:text-gray-300 truncate font-mono">
          {url}
        </span>
        <button
          onClick={onCopy}
          className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all active:scale-95 ${
            copied 
              ? 'bg-green-500 text-white' 
              : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100'
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
}

function ShareOptionsGrid({ isGenerating, onDownload, onInstagram, onWhatsApp, onPinterest }: ShareOptionsGridProps) {
  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3">
      <ShareButton
        onClick={onDownload}
        disabled={isGenerating}
        gradient="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/50 dark:to-cyan-950/50"
        iconBg="bg-gradient-to-br from-blue-500 to-cyan-500"
        shadowColor="shadow-blue-500/20 group-hover:shadow-blue-500/40"
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
  const [verticalOffset, setVerticalOffset] = useState(0);
  const [fontSizePx, setFontSizePx] = useState(0); // 0 = auto
  const [showPositionControl, setShowPositionControl] = useState(false);
  const [showFontSizeControl, setShowFontSizeControl] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<ShareFormatConfig>(DEFAULT_FORMAT);
  const previewRef = useRef<HTMLDivElement>(null);

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
    setVerticalOffset(0);
    setFontSizePx(0); // Reset to auto
    setShowPositionControl(false);
    setShowFontSizeControl(false);
    setSelectedFormat(DEFAULT_FORMAT);
  }, [isOpen, quote.id]);

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

  // Generate image from preview card
  const generateImage = useCallback(async (): Promise<string | null> => {
    const previewCard = previewRef.current?.querySelector('[data-preview-card="true"]') as HTMLElement;
    if (!previewCard) return null;

    // Quality settings based on selected format
    // Story: 1080×1920, Post: 1920×2400, Square: 1080×1080
    const imageOptions = {
      quality: 1.0,
      pixelRatio: selectedFormat.pixelRatio,
      cacheBust: true,
      width: previewCard.offsetWidth,
      height: previewCard.offsetHeight,
      style: { borderRadius: '0px', overflow: 'hidden' },
    };

    try {
      return await toPng(previewCard, imageOptions);
    } catch {
      // Fallback with lower quality if device can't handle high resolution
      try {
        return await toPng(previewCard, { ...imageOptions, pixelRatio: Math.max(2, selectedFormat.pixelRatio - 2) });
      } catch {
        return null;
      }
    }
  }, [selectedFormat.pixelRatio]);

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

  // Position adjustment handlers
  const adjustPosition = useCallback((delta: number) => {
    setVerticalOffset(prev => Math.max(POSITION_MIN, Math.min(POSITION_MAX, prev + delta)));
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full sm:max-w-xl mx-0 sm:mx-4 bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[95vh] overflow-hidden animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="relative px-4 pt-4 pb-3 sm:px-6 sm:pt-5 sm:pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full sm:hidden" />
          
          <div className="flex items-center justify-between mt-2 sm:mt-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                <Share2 size={16} className="sm:w-5 sm:h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Share Quote</h2>
                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Adjust position & download</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <X size={16} className="sm:w-[18px] sm:h-[18px] text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-4 sm:px-6 sm:py-5 overflow-y-auto max-h-[calc(95vh-80px)]">
          {/* Preview Card with Position Control */}
          <div className="mb-4 sm:mb-5">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <ImageIcon size={14} className="text-gray-400" />
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Preview</span>
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
              className="flex justify-center items-center p-4 sm:p-6 bg-gradient-to-br from-gray-100 via-gray-50 to-gray-200 dark:from-gray-800 dark:via-gray-850 dark:to-gray-900 rounded-2xl transition-all duration-300"
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
                    quote={quote}
                    cardTheme={cardTheme}
                    fontStyle={fontStyle}
                    backgroundImage={backgroundImage}
                    customBackground={quote.custom_background}
                    verticalOffset={verticalOffset}
                    format={selectedFormat}
                    fontSizePx={fontSizePx}
                  />
                </div>
              </div>
            </div>

            {/* Adjustment Controls Row */}
            <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                {/* Position Toggle */}
                <button
                  onClick={() => {
                    setShowPositionControl(!showPositionControl);
                    if (!showPositionControl) setShowFontSizeControl(false);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    showPositionControl 
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  <MoveVertical size={12} />
                  Position
                </button>

                {/* Font Size Toggle */}
                <button
                  onClick={() => {
                    setShowFontSizeControl(!showFontSizeControl);
                    if (!showFontSizeControl) setShowPositionControl(false);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    showFontSizeControl 
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' 
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  <Type size={12} />
                  Font Size
                </button>
              </div>
              
              {/* Output size indicator */}
              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">
                {selectedFormat.id === 'story' && '1080×1920'}
                {selectedFormat.id === 'post' && '1920×2400'}
                {selectedFormat.id === 'square' && '1080×1080'}
              </span>
            </div>
            
            {/* Position Control Panel */}
            {showPositionControl && (
              <PositionControl
                value={verticalOffset}
                onChange={setVerticalOffset}
                onAdjust={adjustPosition}
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
          </div>

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
          />

          {/* More Options */}
          <button
            onClick={handleGenericShare}
            disabled={isGenerating}
            className="w-full mt-3 sm:mt-4 flex items-center justify-center gap-2 px-4 py-2.5 sm:py-3 bg-gray-100 dark:bg-gray-800 rounded-xl sm:rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <Share2 size={14} className="sm:w-4 sm:h-4 text-gray-600 dark:text-gray-400" />
            <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">More sharing options</span>
          </button>
        </div>
      </div>
    </div>
  );
}
