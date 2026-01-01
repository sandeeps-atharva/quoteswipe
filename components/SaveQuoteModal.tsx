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
      {/* Backdrop with warm gradient */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-md"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-rose-500/10" />
      </div>
      
      {/* Modal */}
      <div className={`relative w-full bg-white dark:bg-stone-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300 border border-stone-200/50 dark:border-stone-700/50 ${
        step === 'confirm' ? 'sm:max-w-sm md:max-w-md' : 'sm:max-w-lg md:max-w-2xl'
      } mx-0 sm:mx-4`}>
        
        {/* Decorative gradient orbs */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-amber-400/20 to-orange-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-gradient-to-br from-rose-400/20 to-pink-400/20 rounded-full blur-3xl pointer-events-none" />
        
        {/* Mobile drag handle */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-stone-300 dark:bg-stone-700 rounded-full sm:hidden" />
        
        {/* STEP 1: Confirmation */}
        {step === 'confirm' && (
          <div className="p-5 pt-6 sm:p-6 md:p-8 relative">
            {/* Icon */}
            <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
              <Bookmark size={24} className="sm:w-7 sm:h-7 text-white" fill="currentColor" />
            </div>
            
            {/* Title */}
            <h2 className="text-xl sm:text-2xl font-bold text-center text-stone-900 dark:text-white mb-2">
              Save This Quote
            </h2>
            
            {/* Quote Preview */}
            <div className="bg-gradient-to-br from-amber-50 to-rose-50 dark:from-stone-800 dark:to-stone-800 rounded-xl p-4 mb-5 border border-amber-200/50 dark:border-stone-700">
              <p className="text-sm text-stone-700 dark:text-stone-300 line-clamp-2">"{quote.text}"</p>
              {quote.author && (
                <p className="text-xs text-stone-500 mt-2">— {quote.author}</p>
              )}
            </div>
            
            {/* Question */}
            <p className="text-center text-sm text-stone-600 dark:text-stone-400 mb-5">
              Would you like to customize the background?
            </p>
            
            {/* Action Buttons */}
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={handleQuickSave}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-semibold rounded-xl text-sm hover:bg-stone-200 dark:hover:bg-stone-700 transition-all active:scale-95"
              >
                <Check size={18} />
                <span>No, Save Now</span>
              </button>
              <button
                onClick={() => setStep('customize')}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white font-semibold rounded-xl text-sm hover:shadow-lg hover:shadow-orange-500/30 transition-all active:scale-95"
              >
                <Sparkles size={18} />
                <span>Yes, Customize</span>
                <ChevronRight size={16} />
              </button>
            </div>
            
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
            >
              <X size={18} className="text-stone-500" />
            </button>
          </div>
        )}
        
        {/* STEP 2: Customization */}
        {step === 'customize' && (
          <div className="flex flex-col max-h-[92vh] sm:max-h-[85vh] relative">
            {/* Header */}
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-stone-200 dark:border-stone-700 shrink-0">
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={() => setStep('confirm')}
                  className="p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                >
                  <ArrowLeft size={18} className="text-stone-500" />
                </button>
                <div>
                  <h2 className="text-lg font-bold text-stone-900 dark:text-white">Customize & Save</h2>
                  <p className="text-xs text-stone-500">Choose background & font</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              >
                <X size={18} className="text-stone-500" />
              </button>
            </div>
            
            {/* Preview */}
            <div className="p-3 sm:p-4 bg-stone-50 dark:bg-stone-800/50 shrink-0">
              <p className="text-xs text-stone-500 text-center mb-3">Preview</p>
              <div
                className="mx-auto w-36 sm:w-48 aspect-[4/5] rounded-xl shadow-lg flex flex-col items-center justify-center p-4 relative overflow-hidden"
                style={{ background: selectedBackground.id === 'none' ? 'linear-gradient(135deg, #f59e0b 0%, #f97316 50%, #e11d48 100%)' : undefined }}
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
                    className="text-xs sm:text-sm leading-relaxed line-clamp-4"
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
                      className="text-[10px] mt-2"
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
            
            {/* Tabs */}
            <div className="flex border-b border-stone-200 dark:border-stone-700 shrink-0">
              <button
                onClick={() => setActiveTab('images')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'images'
                    ? 'text-amber-600 dark:text-amber-400 border-b-2 border-amber-500'
                    : 'text-stone-500 dark:text-stone-400'
                }`}
              >
                <ImageIcon size={16} />
                <span>Backgrounds</span>
              </button>
              <button
                onClick={() => setActiveTab('fonts')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'fonts'
                    ? 'text-amber-600 dark:text-amber-400 border-b-2 border-amber-500'
                    : 'text-stone-500 dark:text-stone-400'
                }`}
              >
                <Type size={16} />
                <span>Fonts</span>
              </button>
            </div>
            
            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 custom-scrollbar">
              {activeTab === 'images' && (
                <div className="space-y-4">
                  {/* User's Custom Images via ImageUploader */}
                  {isAuthenticated && (
                    <div>
                      <p className="text-xs text-stone-500 uppercase tracking-wider font-medium mb-2">Your Photos ({userBackgroundsCount}/100)</p>
                      <ImageUploader
                        selectedCustomBackground={selectedCustomBgUrl}
                        onSelectCustomBackground={handleSelectCustomBackground}
                        maxDisplay={100}
                        showUploadButtons={true}
                        showClearOption={false}
                        gridCols={3}
                        autoFetch={step === 'customize'}
                        onBackgroundsChange={handleBackgroundsChange}
                      />
                    </div>
                  )}
                  
                  {/* Preset Backgrounds */}
                  <div>
                    <p className="text-xs text-stone-500 uppercase tracking-wider font-medium mb-2">Presets</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                      {BACKGROUND_IMAGES.map((bg) => (
                        <button
                          key={bg.id}
                          onClick={() => setSelectedBackground(bg)}
                          className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                            selectedBackground.id === bg.id
                              ? 'border-amber-500 ring-2 ring-amber-200 dark:ring-amber-800'
                              : 'border-stone-200 dark:border-stone-700 hover:border-amber-300'
                          }`}
                        >
                          {bg.id === 'none' ? (
                            <div className="w-full h-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
                              <X size={18} className="text-stone-400" />
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
                            <div className="w-full h-full bg-gradient-to-br from-stone-200 to-stone-300 dark:from-stone-700 dark:to-stone-800" />
                          )}
                          {selectedBackground.id === bg.id && (
                            <div className="absolute inset-0 bg-amber-500/20 flex items-center justify-center">
                              <Check size={18} className="text-white drop-shadow-lg" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {activeTab === 'fonts' && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {FONT_STYLES.map((font) => (
                    <button
                      key={font.id}
                      onClick={() => setSelectedFont(font)}
                      className={`relative p-3 rounded-xl border-2 transition-all active:scale-95 ${
                        selectedFont.id === font.id
                          ? 'border-amber-500 ring-2 ring-amber-200 dark:ring-amber-800 bg-amber-50 dark:bg-amber-900/20'
                          : 'border-stone-200 dark:border-stone-700 hover:border-amber-300'
                      }`}
                    >
                      <div
                        className="text-xl md:text-2xl mb-1 text-stone-900 dark:text-white text-center"
                        style={{ fontFamily: font.fontFamily, fontWeight: font.fontWeight }}
                      >
                        {font.sample}
                      </div>
                      <span className="text-[10px] sm:text-xs font-medium text-stone-600 dark:text-stone-400 block text-center truncate">
                        {font.name}
                      </span>
                      {selectedFont.id === font.id && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
                          <Check size={12} className="text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="p-3 sm:p-4 border-t border-stone-200 dark:border-stone-700 shrink-0 bg-white dark:bg-stone-900">
              {/* Info note */}
              <p className="text-[10px] text-center text-stone-400 dark:text-stone-500 mb-3">
                💡 This background will be saved only for this quote
              </p>
              <button
                onClick={handleCustomSave}
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white font-semibold rounded-xl text-sm hover:shadow-lg hover:shadow-orange-500/30 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Bookmark size={18} fill="currentColor" />
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
