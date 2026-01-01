'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Sparkles, PenLine, User, Tag, Loader2, Check, Globe, Lock, Image as ImageIcon, Type, ChevronDown, ChevronUp } from 'lucide-react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { isQuotePublic } from '@/lib/helpers';
import { FONT_STYLES, BACKGROUND_IMAGES, FontStyle, BackgroundImage } from '@/lib/constants';
import ImageUploader from './ImageUploader';

interface Category {
  id: string | number;
  name: string;
  icon: string;
}

interface UserQuote {
  id: string | number;
  text: string;
  author: string;
  theme_id?: string;
  font_id?: string;
  background_id?: string;
  custom_background?: string;
  category_id?: string | number;
  category?: string;
  category_icon?: string;
  is_public?: boolean | number;
}

interface CreateQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (quote: UserQuote, cacheInvalidated?: boolean) => void;
  categories: Category[];
  editQuote?: UserQuote | null;
}

export default function CreateQuoteModal({
  isOpen,
  onClose,
  onSuccess,
  categories,
  editQuote,
}: CreateQuoteModalProps) {
  const [text, setText] = useState('');
  const [author, setAuthor] = useState('');
  const [categoryId, setCategoryId] = useState<string | number | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [charCount, setCharCount] = useState(0);
  
  // Customization states
  const [showCustomization, setShowCustomization] = useState(false);
  const [selectedFontId, setSelectedFontId] = useState<string>('elegant');
  const [selectedBackgroundId, setSelectedBackgroundId] = useState<string | null>(null);
  const [customBackground, setCustomBackground] = useState<string | null>(null);

  const isEditing = !!editQuote;
  const maxChars = 500;
  const minChars = 10;

  useEffect(() => {
    if (isOpen) {
      if (editQuote) {
        setText(editQuote.text);
        setAuthor(editQuote.author || '');
        setCategoryId(editQuote.category_id || null);
        setIsPublic(isQuotePublic(editQuote.is_public));
        setSelectedFontId(editQuote.font_id || 'elegant');
        setSelectedBackgroundId(editQuote.background_id || null);
        setCustomBackground(editQuote.custom_background || null);
        if (editQuote.background_id || editQuote.custom_background || editQuote.font_id) {
          setShowCustomization(true);
        }
      } else {
        setText('');
        setAuthor('');
        setCategoryId(null);
        setIsPublic(false);
        setSelectedFontId('elegant');
        setSelectedBackgroundId(null);
        setCustomBackground(null);
        setShowCustomization(false);
      }
      setError('');
      setCharCount(editQuote?.text.length || 0);
    }
  }, [isOpen, editQuote]);

  const handleTextChange = (value: string) => {
    if (value.length <= maxChars) {
      setText(value);
      setCharCount(value.length);
      setError('');
    }
  };

  // Handle selecting a custom background from ImageUploader
  const handleSelectCustomBackground = useCallback((url: string | null) => {
    setCustomBackground(url);
    if (url) {
      setSelectedBackgroundId(null);
    }
  }, []);

  const handleSubmit = async () => {
    if (text.trim().length < minChars) {
      setError(`Quote must be at least ${minChars} characters`);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const endpoint = isEditing 
        ? `/api/user/quotes/${editQuote.id}` 
        : '/api/user/quotes';
      
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          author: author.trim(),
          categoryId,
          isPublic,
          fontId: selectedFontId,
          backgroundId: selectedBackgroundId,
          customBackground: customBackground,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save quote');
      }

      onSuccess(data.quote, data.cacheInvalidated);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  // Get selected font
  const selectedFont = FONT_STYLES.find(f => f.id === selectedFontId) || FONT_STYLES[0];
  
  // Get background for preview
  const previewBackground = (customBackground && customBackground.length > 0 ? customBackground : null) 
    || (selectedBackgroundId ? BACKGROUND_IMAGES.find(b => b.id === selectedBackgroundId)?.url : null) 
    || null;

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
      <div className="relative w-full sm:max-w-lg mx-0 sm:mx-4 bg-white dark:bg-stone-900 rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col border border-stone-200/50 dark:border-stone-700/50">
        {/* Decorative gradient orbs */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-amber-400/20 to-orange-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-gradient-to-br from-rose-400/20 to-pink-400/20 rounded-full blur-3xl pointer-events-none" />
        
        {/* Gradient top bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500" />
        
        {/* Handle bar (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-8 h-1 bg-stone-300 dark:bg-stone-700 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 pt-2 pb-3 sm:px-6 sm:pt-5 sm:pb-4 border-b border-stone-100 dark:border-stone-800 shrink-0 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
                <PenLine size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-stone-900 dark:text-white tracking-tight">
                  {isEditing ? 'Edit Quote' : 'Create Quote'}
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  {isEditing ? 'Update your quote' : 'Write your own inspiration ✨'}
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
           {/* Visibility Toggle */}
           <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-stone-700 dark:text-stone-300 mb-2">
              {isPublic ? (
                <Globe size={14} className="text-emerald-500" />
              ) : (
                <Lock size={14} className="text-stone-400" />
              )}
              Visibility
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setIsPublic(false)}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all ${
                  !isPublic
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
                    : 'border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                }`}
              >
                <Lock size={14} />
                <span className="text-sm font-medium">Private</span>
              </button>
              <button
                onClick={() => setIsPublic(true)}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all ${
                  isPublic
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                    : 'border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                }`}
              >
                <Globe size={14} />
                <span className="text-sm font-medium">Public</span>
              </button>
            </div>
          </div>
          {/* Quote Text */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-stone-700 dark:text-stone-300 mb-2">
              <Sparkles size={14} className="text-amber-500" />
              Your Quote
            </label>
            <div className="relative">
              <textarea
                value={text}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder="Write something inspiring..."
                className="w-full h-28 sm:h-32 px-4 py-3 bg-stone-50 dark:bg-stone-800 border-2 border-stone-200 dark:border-stone-700 rounded-2xl text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-stone-500 resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all text-sm sm:text-base"
                style={{
                  fontFamily: selectedFont.fontFamily,
                  fontWeight: selectedFont.fontWeight,
                }}
                autoFocus
              />
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                <span className={`text-xs font-medium ${
                  charCount < minChars 
                    ? 'text-red-500' 
                    : charCount > maxChars - 50 
                      ? 'text-orange-500' 
                      : 'text-stone-400'
                }`}>
                  {charCount}/{maxChars}
                </span>
              </div>
            </div>
            {charCount > 0 && charCount < minChars && (
              <p className="mt-1.5 text-xs text-red-500">
                {minChars - charCount} more characters needed
              </p>
            )}
          </div>

          {/* Author */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-stone-700 dark:text-stone-300 mb-2">
              <User size={14} className="text-orange-500" />
              Author <span className="text-stone-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Author name (optional)"
              className="w-full px-4 py-2.5 bg-stone-50 dark:bg-stone-800 border-2 border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all text-sm"
              maxLength={100}
            />
          </div>

          {/* Customization Toggle */}
          <button
            onClick={() => setShowCustomization(!showCustomization)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-amber-50 to-rose-50 dark:from-amber-900/20 dark:to-rose-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-700 dark:text-amber-300 hover:from-amber-100 hover:to-rose-100 dark:hover:from-amber-900/30 dark:hover:to-rose-900/30 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 flex items-center justify-center">
                <ImageIcon size={16} className="text-white" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold">Customize Background & Font</p>
                <p className="text-[10px] opacity-70">Add your own style</p>
              </div>
            </div>
            {showCustomization ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>

          {/* Customization Section */}
          {showCustomization && (
            <div className="space-y-4 p-4 bg-stone-50 dark:bg-stone-800/50 rounded-2xl border border-stone-200 dark:border-stone-700">
              {/* Preview */}
              {(previewBackground || text) && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-stone-500 mb-2">Preview</p>
                  <div 
                    className="relative w-full aspect-[4/5] rounded-xl overflow-hidden shadow-lg"
                    style={{
                      background: previewBackground ? undefined : 'linear-gradient(135deg, #f59e0b 0%, #f97316 50%, #e11d48 100%)',
                    }}
                  >
                    {previewBackground && previewBackground.length > 0 && (
                      <>
                        {/* Use native img for base64 data URLs */}
                        {previewBackground.startsWith('data:') ? (
                          <img
                            src={previewBackground}
                            alt="Preview"
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        ) : (
                          <Image
                            src={previewBackground}
                            alt="Preview"
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        )}
                        <div className="absolute inset-0 bg-black/40" />
                      </>
                    )}
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                      <p 
                        className="text-white text-center text-sm leading-relaxed drop-shadow-lg"
                        style={{
                          fontFamily: selectedFont.fontFamily,
                          fontWeight: selectedFont.fontWeight,
                        }}
                      >
                        {text || 'Your quote preview...'}
                      </p>
                      {author && (
                        <p className="text-white/80 text-xs mt-2 drop-shadow">— {author}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Font Selection */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-stone-700 dark:text-stone-300 mb-2">
                  <Type size={14} className="text-amber-500" />
                  Font Style
                </label>
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                  {FONT_STYLES.slice(0, 12).map((font) => (
                    <button
                      key={font.id}
                      onClick={() => setSelectedFontId(font.id)}
                      className={`shrink-0 px-3 py-2 rounded-lg border-2 transition-all ${
                        selectedFontId === font.id
                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/30'
                          : 'border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600'
                      }`}
                    >
                      <span 
                        className="text-lg text-stone-800 dark:text-stone-200"
                        style={{ fontFamily: font.fontFamily, fontWeight: font.fontWeight }}
                      >
                        {font.sample}
                      </span>
                      <p className="text-[9px] text-stone-500 mt-0.5 whitespace-nowrap">{font.name}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Background Selection */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-stone-700 dark:text-stone-300 mb-2">
                  <ImageIcon size={14} className="text-rose-500" />
                  Background
                </label>
                
                {/* Image Uploader Component - Show ALL uploaded images */}
                <ImageUploader
                  selectedCustomBackground={customBackground}
                  onSelectCustomBackground={handleSelectCustomBackground}
                  maxDisplay={100}
                  showUploadButtons={true}
                  showClearOption={true}
                  clearOptionLabel="No Background (Default)"
                  gridCols={3}
                  autoFetch={isOpen}
                />

                {/* Preset backgrounds */}
                <div>
                  <p className="text-xs text-stone-500 mb-2">Presets ({BACKGROUND_IMAGES.filter(bg => bg.url && bg.url.length > 0).length})</p>
                  <div className="grid grid-cols-3 gap-2.5 sm:gap-3 max-h-64 sm:max-h-72 overflow-y-auto">
                    {BACKGROUND_IMAGES.filter(bg => bg.url && bg.url.length > 0).map((bg) => (
                      <button
                        key={bg.id}
                        onClick={() => {
                          setSelectedBackgroundId(bg.id);
                          setCustomBackground(null);
                        }}
                        className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                          selectedBackgroundId === bg.id
                            ? 'border-amber-500 ring-2 ring-amber-500/30'
                            : 'border-transparent hover:border-stone-300'
                        }`}
                      >
                        <Image
                          src={bg.url}
                          alt={bg.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                        {selectedBackgroundId === bg.id && (
                          <div className="absolute inset-0 bg-amber-500/20 flex items-center justify-center">
                            <Check size={16} className="text-white drop-shadow" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Category */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-stone-700 dark:text-stone-300 mb-2">
              <Tag size={14} className="text-rose-500" />
              Category <span className="text-stone-400 font-normal">(optional)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setCategoryId(null)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  categoryId === null
                    ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                }`}
              >
                None
              </button>
              {categories.slice(0, 10).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryId(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                    categoryId === cat.id
                      ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

         

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 border-t border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/50 shrink-0 relative">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-xl font-semibold text-sm hover:bg-stone-300 dark:hover:bg-stone-600 transition-all active:scale-[0.98]"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading || text.trim().length < minChars}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-orange-500/30 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check size={16} />
                  <span>{isEditing ? 'Update' : 'Create'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
