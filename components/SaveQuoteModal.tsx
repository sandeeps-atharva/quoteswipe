'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { X, Bookmark, Check, Loader2, ImageIcon, Type, ChevronRight, Sparkles, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import { BACKGROUND_IMAGES, FONT_STYLES, BackgroundImage, FontStyle } from '@/lib/constants';
import ImageUploader, { UserBackground } from './ImageUploader';

interface Quote {
  id: string | number;
  text: string;
  author: string;
  category?: string;
  category_icon?: string;
}

interface SaveQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: Quote;
  currentBackground: BackgroundImage;
  currentFont: FontStyle;
  onSave: (customBackground: string | null, fontId?: string) => void;
  isAuthenticated: boolean;
}

// Create a custom background image object from user upload
const createCustomBackground = (url: string, id: string, name: string): BackgroundImage => ({
  id,
  name,
  url,
  thumbnail: url,
  overlay: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.55) 100%)',
  textColor: '#ffffff',
  authorColor: '#e5e5e5',
  categoryBg: 'rgba(255,255,255,0.15)',
  categoryText: '#ffffff',
});

type ModalStep = 'confirm' | 'customize';

export default function SaveQuoteModal({
  isOpen,
  onClose,
  quote,
  currentBackground,
  currentFont,
  onSave,
  isAuthenticated,
}: SaveQuoteModalProps) {
  const [step, setStep] = useState<ModalStep>('confirm');
  const [selectedBackground, setSelectedBackground] = useState<BackgroundImage>(currentBackground);
  const [selectedFont, setSelectedFont] = useState<FontStyle>(currentFont);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'images' | 'fonts'>('images');
  
  // Custom background URL for ImageUploader
  const [selectedCustomBgUrl, setSelectedCustomBgUrl] = useState<string | null>(null);
  const [userBackgroundsCount, setUserBackgroundsCount] = useState(0);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('confirm');
      setSelectedBackground(currentBackground);
      setSelectedFont(currentFont);
      setActiveTab('images');
      setSelectedCustomBgUrl(null);
    }
  }, [isOpen, currentBackground, currentFont]);

  // Handle quick save (with current background)
  const handleQuickSave = useCallback(() => {
    const bgUrl = currentBackground.id !== 'none' ? currentBackground.url : null;
    onSave(bgUrl);
    onClose();
  }, [currentBackground, onSave, onClose]);

  // Handle save with customization
  const handleCustomSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const bgUrl = selectedBackground.id !== 'none' ? selectedBackground.url : null;
      onSave(bgUrl, selectedFont.id);
      onClose();
    } finally {
      setIsSaving(false);
    }
  }, [selectedBackground, selectedFont, onSave, onClose]);

  // Handle custom background selection from ImageUploader
  const handleSelectCustomBackground = useCallback((url: string | null) => {
    setSelectedCustomBgUrl(url);
    if (url) {
      const customBg = createCustomBackground(url, `custom_${Date.now()}`, 'Custom Photo');
      setSelectedBackground(customBg);
    } else {
      setSelectedBackground(BACKGROUND_IMAGES[0]);
    }
  }, []);

  // Track user backgrounds count
  const handleBackgroundsChange = useCallback((backgrounds: UserBackground[]) => {
    setUserBackgroundsCount(backgrounds.length);
  }, []);

  // Get preview colors
  const previewColors = useMemo(() => {
    if (selectedBackground.id !== 'none') {
      return {
        textColor: selectedBackground.textColor || '#ffffff',
        authorColor: selectedBackground.authorColor || '#e5e5e5',
      };
    }
    return {
      textColor: '#1f2937',
      authorColor: '#6b7280',
    };
  }, [selectedBackground]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={`relative w-full bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300 ${
        step === 'confirm' ? 'sm:max-w-sm md:max-w-md' : 'sm:max-w-lg md:max-w-2xl'
      } mx-0 sm:mx-4`}>
        
        {/* Mobile drag handle */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full sm:hidden" />
        
        {/* STEP 1: Confirmation */}
        {step === 'confirm' && (
          <div className="p-5 pt-6 sm:p-6 md:p-8">
            {/* Icon */}
            <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 mx-auto mb-3 sm:mb-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg">
              <Bookmark size={22} className="sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" fill="currentColor" />
            </div>
            
            {/* Title */}
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-center text-gray-900 dark:text-white mb-2">
              Save This Quote
            </h2>
            
            {/* Quote Preview */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
              <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 line-clamp-2">"{quote.text}"</p>
              {quote.author && (
                <p className="text-[10px] sm:text-xs text-gray-500 mt-1">— {quote.author}</p>
              )}
            </div>
            
            {/* Question */}
            <p className="text-center text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-4 sm:mb-6">
              Would you like to customize the background?
            </p>
            
            {/* Action Buttons - Stack on mobile, row on larger screens */}
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={handleQuickSave}
                className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 px-3 sm:px-4 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold rounded-lg sm:rounded-xl text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-all active:scale-95"
              >
                <Check size={16} className="sm:w-[18px] sm:h-[18px]" />
                <span>No, Save Now</span>
              </button>
              <button
                onClick={() => setStep('customize')}
                className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 px-3 sm:px-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-semibold rounded-lg sm:rounded-xl text-sm hover:shadow-lg transition-all active:scale-95"
              >
                <Sparkles size={16} className="sm:w-[18px] sm:h-[18px]" />
                <span>Yes, Customize</span>
                <ChevronRight size={14} className="sm:w-4 sm:h-4" />
              </button>
            </div>
            
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 p-1.5 sm:p-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <X size={16} className="sm:w-[18px] sm:h-[18px] text-gray-500" />
            </button>
          </div>
        )}
        
        {/* STEP 2: Customization */}
        {step === 'customize' && (
          <div className="flex flex-col max-h-[92vh] sm:max-h-[85vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={() => setStep('confirm')}
                  className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <ArrowLeft size={16} className="sm:w-[18px] sm:h-[18px] text-gray-500" />
                </button>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Customize & Save</h2>
                  <p className="text-[10px] sm:text-xs text-gray-500">Choose background & font</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 sm:p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X size={16} className="sm:w-[18px] sm:h-[18px] text-gray-500" />
              </button>
            </div>
            
            {/* Preview - Smaller on mobile */}
            <div className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-800/50 shrink-0">
              <p className="text-[10px] sm:text-xs text-gray-500 text-center mb-2 sm:mb-3">Preview</p>
              <div
                className="mx-auto w-32 sm:w-44 md:w-52 aspect-[4/5] rounded-lg sm:rounded-xl shadow-lg flex flex-col items-center justify-center p-3 sm:p-4 relative overflow-hidden"
                style={{ background: selectedBackground.id === 'none' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : undefined }}
              >
                {/* Background Image */}
                {selectedBackground.id !== 'none' && selectedBackground.url && (
                  <>
                    <div 
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url(${selectedBackground.thumbnail || selectedBackground.url})` }}
                    />
                    <div 
                      className="absolute inset-0"
                      style={{ background: selectedBackground.overlay }}
                    />
                  </>
                )}
                {/* Content */}
                <div className="relative z-10 flex flex-col items-center justify-center text-center">
                  <p
                    className="text-[10px] sm:text-xs md:text-sm leading-relaxed line-clamp-3 sm:line-clamp-4"
                    style={{
                      color: previewColors.textColor,
                      fontFamily: selectedFont.fontFamily,
                      fontWeight: selectedFont.fontWeight,
                      textShadow: selectedBackground.id !== 'none' ? '0 1px 2px rgba(0,0,0,0.3)' : 'none',
                    }}
                  >
                    &ldquo;{quote.text}&rdquo;
                  </p>
                  {quote.author && (
                    <p
                      className="text-[8px] sm:text-[10px] mt-1.5 sm:mt-2"
                      style={{ 
                        color: previewColors.authorColor,
                        textShadow: selectedBackground.id !== 'none' ? '0 1px 2px rgba(0,0,0,0.3)' : 'none',
                      }}
                    >
                      — {quote.author}
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Tabs - More compact on mobile */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 shrink-0">
              <button
                onClick={() => setActiveTab('images')}
                className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-colors ${
                  activeTab === 'images'
                    ? 'text-orange-600 dark:text-orange-400 border-b-2 border-orange-600 dark:border-orange-400'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                <ImageIcon size={14} className="sm:w-4 sm:h-4" />
                <span>Backgrounds</span>
              </button>
              <button
                onClick={() => setActiveTab('fonts')}
                className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-colors ${
                  activeTab === 'fonts'
                    ? 'text-orange-600 dark:text-orange-400 border-b-2 border-orange-600 dark:border-orange-400'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                <Type size={14} className="sm:w-4 sm:h-4" />
                <span>Fonts</span>
              </button>
            </div>
            
            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 custom-scrollbar">
              {activeTab === 'images' && (
                <div className="space-y-3 sm:space-y-4">
                  {/* User's Custom Images via ImageUploader */}
                  {isAuthenticated && (
                    <div>
                      <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider font-medium mb-1.5 sm:mb-2">Your Photos ({userBackgroundsCount}/100)</p>
                      <ImageUploader
                        selectedCustomBackground={selectedCustomBgUrl}
                        onSelectCustomBackground={handleSelectCustomBackground}
                        maxDisplay={12}
                        showUploadButtons={true}
                        showClearOption={false}
                        gridCols={5}
                        autoFetch={step === 'customize'}
                        onBackgroundsChange={handleBackgroundsChange}
                      />
                    </div>
                  )}
                  
                  {/* Preset Backgrounds */}
                  <div>
                    <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider font-medium mb-1.5 sm:mb-2">Presets</p>
                    <div className="grid grid-cols-4 xs:grid-cols-5 sm:grid-cols-5 md:grid-cols-6 gap-1.5 sm:gap-2">
                      {BACKGROUND_IMAGES.map((bg) => (
                        <button
                          key={bg.id}
                          onClick={() => setSelectedBackground(bg)}
                          className={`relative aspect-square rounded-md sm:rounded-lg overflow-hidden border-2 transition-all ${
                            selectedBackground.id === bg.id
                              ? 'border-orange-500 ring-1 sm:ring-2 ring-orange-200 dark:ring-orange-800'
                              : 'border-gray-200 dark:border-gray-700 hover:border-orange-300'
                          }`}
                        >
                          {bg.id === 'none' ? (
                            <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                              <X size={16} className="sm:w-5 sm:h-5 text-gray-400" />
                            </div>
                          ) : bg.thumbnail || bg.url ? (
                            <Image
                              src={bg.thumbnail || bg.url}
                              alt={bg.name}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800" />
                          )}
                          {selectedBackground.id === bg.id && (
                            <div className="absolute inset-0 bg-orange-500/20 flex items-center justify-center">
                              <Check size={16} className="sm:w-5 sm:h-5 text-white drop-shadow-lg" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {activeTab === 'fonts' && (
                <div className="grid grid-cols-3 xs:grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3">
                  {FONT_STYLES.map((font) => (
                    <button
                      key={font.id}
                      onClick={() => setSelectedFont(font)}
                      className={`relative p-2 sm:p-3 rounded-lg sm:rounded-xl border-2 transition-all active:scale-95 ${
                        selectedFont.id === font.id
                          ? 'border-orange-500 ring-1 sm:ring-2 ring-orange-200 dark:ring-orange-800 bg-orange-50 dark:bg-orange-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-orange-300'
                      }`}
                    >
                      <div
                        className="text-lg sm:text-xl md:text-2xl mb-0.5 sm:mb-1 text-gray-900 dark:text-white text-center"
                        style={{ fontFamily: font.fontFamily, fontWeight: font.fontWeight }}
                      >
                        {font.sample}
                      </div>
                      <span className="text-[9px] sm:text-xs font-medium text-gray-600 dark:text-gray-400 block text-center truncate">
                        {font.name}
                      </span>
                      {selectedFont.id === font.id && (
                        <div className="absolute -top-0.5 -right-0.5 sm:top-1 sm:right-1 w-4 h-4 sm:w-5 sm:h-5 bg-orange-500 rounded-full flex items-center justify-center">
                          <Check size={10} className="sm:w-3 sm:h-3 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Footer - More compact on mobile */}
            <div className="p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700 shrink-0 bg-white dark:bg-gray-900">
              {/* Info note */}
              <p className="text-[9px] sm:text-[10px] text-center text-gray-400 dark:text-gray-500 mb-2 sm:mb-3">
                💡 This background will be saved only for this quote
              </p>
              <button
                onClick={handleCustomSave}
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-semibold rounded-lg sm:rounded-xl text-sm hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={16} className="sm:w-[18px] sm:h-[18px] animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Bookmark size={16} className="sm:w-[18px] sm:h-[18px]" fill="currentColor" />
                    <span>Save Quote</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
