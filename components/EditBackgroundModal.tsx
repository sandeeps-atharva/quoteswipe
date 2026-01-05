'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { X, Check, Loader2, ImageIcon, Palette, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { BACKGROUND_IMAGES, BackgroundImage } from '@/lib/constants';
import ImageUploader, { UserBackground } from './ImageUploader';

interface Quote {
  id: string | number;
  text: string;
  author: string;
  category?: string;
  category_icon?: string;
}

interface EditBackgroundModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: Quote;
  currentBackground: BackgroundImage;
  onApply: (background: BackgroundImage) => void;
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

export default function EditBackgroundModal({
  isOpen,
  onClose,
  quote,
  currentBackground,
  onApply,
  isAuthenticated,
}: EditBackgroundModalProps) {
  const [selectedBackground, setSelectedBackground] = useState<BackgroundImage>(currentBackground);
  const [isApplying, setIsApplying] = useState(false);
  const [selectedCustomBgUrl, setSelectedCustomBgUrl] = useState<string | null>(null);
  const [userBackgroundsCount, setUserBackgroundsCount] = useState(0);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedBackground(currentBackground);
      setSelectedCustomBgUrl(null);
    }
  }, [isOpen, currentBackground]);

  // Handle apply
  const handleApply = useCallback(() => {
    setIsApplying(true);
    onApply(selectedBackground);
    setTimeout(() => {
      setIsApplying(false);
      onClose();
    }, 200);
  }, [selectedBackground, onApply, onClose]);

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
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center">
      {/* Backdrop with violet gradient */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-md"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-fuchsia-500/10" />
      </div>
      
      {/* Modal */}
      <div className="relative w-full sm:max-w-lg mx-0 sm:mx-4 bg-white dark:bg-stone-900 rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[85vh] sm:max-h-[90vh] overflow-hidden flex flex-col border border-stone-200/50 dark:border-stone-700/50">
        {/* Decorative gradient orbs */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-violet-400/20 to-purple-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-gradient-to-br from-fuchsia-400/20 to-pink-400/20 rounded-full blur-3xl pointer-events-none" />
        
        {/* Gradient top bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500" />
        
        {/* Handle bar (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-8 h-1 bg-stone-300 dark:bg-stone-700 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 pt-2 pb-3 sm:px-6 sm:pt-5 sm:pb-4 border-b border-stone-100 dark:border-stone-800 shrink-0 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
                <Palette size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-stone-900 dark:text-white tracking-tight">
                  Edit Background
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  For this quote only ✨
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center hover:bg-stone-200 dark:hover:bg-stone-700 transition-all duration-200"
            >
              <X size={18} className="text-stone-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5 space-y-4 custom-scrollbar relative">
          {/* Preview Card */}
          <div className="bg-stone-50 dark:bg-stone-800/50 rounded-2xl p-4">
            <p className="text-xs text-stone-500 dark:text-stone-400 text-center mb-3 font-medium">Preview</p>
            <div
              className="mx-auto w-40 sm:w-52 aspect-[4/5] rounded-xl sm:rounded-2xl shadow-xl flex flex-col items-center justify-center p-4 sm:p-5 relative overflow-hidden border border-white/20 transition-all duration-500"
              style={{ background: selectedBackground.id === 'none' ? 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 50%, #d946ef 100%)' : undefined }}
            >
              {/* Background Image with smooth transition */}
              {selectedBackground.id !== 'none' && selectedBackground.url && (
                <>
                  <div 
                    className="absolute inset-0 bg-cover bg-center transition-all duration-500"
                    style={{ backgroundImage: `url(${selectedBackground.thumbnail || selectedBackground.url})` }}
                  />
                  <div 
                    className="absolute inset-0 transition-all duration-500"
                    style={{ background: selectedBackground.overlay }}
                  />
                </>
              )}
              {/* Content */}
              <div className="relative z-10 flex flex-col items-center justify-center text-center">
                <p
                  className="text-xs sm:text-sm leading-relaxed line-clamp-4 font-medium"
                  style={{
                    color: previewColors.textColor,
                    textShadow: selectedBackground.id !== 'none' ? '0 2px 8px rgba(0,0,0,0.4)' : 'none',
                  }}
                >
                  &ldquo;{quote.text}&rdquo;
                </p>
                {quote.author && (
                  <p
                    className="text-[10px] sm:text-xs mt-2 sm:mt-3 font-medium"
                    style={{ 
                      color: previewColors.authorColor,
                      textShadow: selectedBackground.id !== 'none' ? '0 1px 4px rgba(0,0,0,0.4)' : 'none',
                    }}
                  >
                    — {quote.author}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* User's Custom Images via ImageUploader */}
          {isAuthenticated && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={14} className="text-violet-500" />
                <p className="text-xs text-stone-600 dark:text-stone-400 uppercase tracking-wider font-semibold">Your Photos ({userBackgroundsCount})</p>
              </div>
              <ImageUploader
                selectedCustomBackground={selectedCustomBgUrl}
                onSelectCustomBackground={handleSelectCustomBackground}
                maxDisplay={100}
                showUploadButtons={true}
                showClearOption={false}
                gridCols={4}
                autoFetch={isOpen}
                onBackgroundsChange={handleBackgroundsChange}
              />
            </div>
          )}
          
          {/* Preset Backgrounds */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ImageIcon size={14} className="text-fuchsia-500" />
              <p className="text-xs text-stone-600 dark:text-stone-400 uppercase tracking-wider font-semibold">Preset Backgrounds</p>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5">
              {BACKGROUND_IMAGES.map((bg) => (
                <button
                  key={bg.id}
                  onClick={() => {
                    setSelectedBackground(bg);
                    setSelectedCustomBgUrl(null);
                  }}
                  className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all hover:scale-105 active:scale-95 ${
                    selectedBackground.id === bg.id
                      ? 'border-violet-500 ring-2 ring-violet-300 dark:ring-violet-700 shadow-lg shadow-violet-500/20'
                      : 'border-stone-200 dark:border-stone-700 hover:border-violet-300'
                  }`}
                >
                  {bg.id === 'none' ? (
                    <div className="w-full h-full bg-gradient-to-br from-stone-100 to-stone-200 dark:from-stone-800 dark:to-stone-700 flex items-center justify-center">
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
                    <div className="absolute inset-0 bg-violet-500/30 flex items-center justify-center">
                      <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-lg">
                        <Check size={14} className="text-violet-600" />
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 border-t border-stone-100 dark:border-stone-800 shrink-0 bg-white dark:bg-stone-900 relative">
          {/* Info note */}
          <p className="text-[11px] text-center text-stone-400 dark:text-stone-500 mb-3">
            💡 This background will only apply to this quote
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-semibold rounded-xl text-sm hover:bg-stone-200 dark:hover:bg-stone-700 transition-all active:scale-95"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={isApplying}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 text-white font-semibold rounded-xl text-sm hover:shadow-lg hover:shadow-violet-500/30 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isApplying ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Applying...</span>
                </>
              ) : (
                <>
                  <Check size={18} />
                  <span>Apply</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
