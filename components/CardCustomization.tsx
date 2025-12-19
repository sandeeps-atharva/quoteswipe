'use client';

import { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react';
import { X, Palette, Type, Check, Sparkles, Moon, Sun, Loader2, ImageIcon, Upload, Trash2, Plus, Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import Image from 'next/image';
import { CARD_THEMES, FONT_STYLES, BACKGROUND_IMAGES, CardTheme, FontStyle, BackgroundImage } from '@/lib/constants';

// Re-export for backward compatibility
export { CARD_THEMES, FONT_STYLES, BACKGROUND_IMAGES };
export type { CardTheme, FontStyle, BackgroundImage };

// Custom images storage key (for non-authenticated users)
const CUSTOM_IMAGES_KEY = 'quoteswipe_custom_images';
const MAX_CUSTOM_IMAGES = 100; // Maximum number of custom images

interface CustomImageData {
  id: string;
  url: string;
  name: string;
  createdAt: number;
}

// Create a custom background image object
const createCustomBackground = (imageData: CustomImageData): BackgroundImage => ({
  id: imageData.id,
  name: imageData.name,
  url: imageData.url,
  thumbnail: imageData.url,
  overlay: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.55) 100%)',
  textColor: '#ffffff',
  authorColor: '#e5e5e5',
  categoryBg: 'rgba(255,255,255,0.15)',
  categoryText: '#ffffff',
});

// Generate unique ID
const generateImageId = () => `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

interface CardCustomizationProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: CardTheme;
  currentFont: FontStyle;
  currentBackground: BackgroundImage;
  onThemeChange: (theme: CardTheme) => void;
  onFontChange: (font: FontStyle) => void;
  onBackgroundChange: (bg: BackgroundImage) => void;
  onSave: (theme: CardTheme, font: FontStyle, background: BackgroundImage) => Promise<void>;
  isAuthenticated: boolean;
}

function CardCustomization({
  isOpen,
  onClose,
  currentTheme,
  currentFont,
  currentBackground,
  onThemeChange,
  onFontChange,
  onBackgroundChange,
  onSave,
  isAuthenticated,
}: CardCustomizationProps) {
  const [activeTab, setActiveTab] = useState<'themes' | 'fonts' | 'images'>('themes');
  const [isSaving, setIsSaving] = useState(false);
  const [showLightThemes, setShowLightThemes] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  // Local state for selections (only applied on save)
  const [selectedTheme, setSelectedTheme] = useState<CardTheme>(currentTheme);
  const [selectedFont, setSelectedFont] = useState<FontStyle>(currentFont);
  const [selectedBackground, setSelectedBackground] = useState<BackgroundImage>(currentBackground);
  
  // Multiple custom images state
  const [customImages, setCustomImages] = useState<CustomImageData[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);

  // Load custom images - from server if authenticated, localStorage otherwise
  useEffect(() => {
    const loadCustomImages = async () => {
      if (isAuthenticated) {
        // Load from server for authenticated users
        setIsLoadingImages(true);
        try {
          const response = await fetch('/api/user/upload-background');
          if (response.ok) {
            const data = await response.json();
            setCustomImages(data.backgrounds || []);
          }
        } catch (e) {
          console.error('Failed to load custom images from server:', e);
        } finally {
          setIsLoadingImages(false);
        }
      } else {
        // Load from localStorage for guests
        try {
          const savedImages = localStorage.getItem(CUSTOM_IMAGES_KEY);
          if (savedImages) {
            const parsed = JSON.parse(savedImages) as CustomImageData[];
            setCustomImages(parsed);
          } else {
            // Migration: Check for old single image format
            const oldImage = localStorage.getItem('quoteswipe_custom_bg');
            if (oldImage) {
              const migratedImage: CustomImageData = {
                id: 'custom_migrated',
                url: oldImage,
                name: 'My Photo',
                createdAt: Date.now(),
              };
              setCustomImages([migratedImage]);
              localStorage.setItem(CUSTOM_IMAGES_KEY, JSON.stringify([migratedImage]));
              localStorage.removeItem('quoteswipe_custom_bg');
            }
          }
        } catch (e) {
          console.error('Failed to load custom images:', e);
        }
      }
    };

    if (isOpen) {
      loadCustomImages();
    }
  }, [isOpen, isAuthenticated]);

  // Convert custom images to BackgroundImage objects
  const customBackgrounds = useMemo(() => 
    customImages.map(img => createCustomBackground(img)),
  [customImages]);

  // Reset local state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedTheme(currentTheme);
      setSelectedFont(currentFont);
      setSelectedBackground(currentBackground);
      setShowLightThemes(!currentTheme.isDark);
    }
  }, [isOpen, currentTheme, currentFont, currentBackground]);

  // Memoized theme lists
  const lightThemes = useMemo(() => CARD_THEMES.filter(t => !t.isDark), []);
  const darkThemes = useMemo(() => CARD_THEMES.filter(t => t.isDark), []);
  const displayedThemes = useMemo(() => showLightThemes ? lightThemes : darkThemes, [showLightThemes, lightThemes, darkThemes]);

  // Get preview colors (background image overrides theme colors when selected)
  const previewColors = useMemo(() => {
    if (selectedBackground.id !== 'none') {
      return {
        textColor: selectedBackground.textColor,
        authorColor: selectedBackground.authorColor,
      };
    }
    return {
      textColor: selectedTheme.textColor,
      authorColor: selectedTheme.authorColor,
    };
  }, [selectedBackground, selectedTheme]);

  // Save custom images to localStorage
  const saveCustomImages = useCallback((images: CustomImageData[]) => {
    try {
      localStorage.setItem(CUSTOM_IMAGES_KEY, JSON.stringify(images));
      setCustomImages(images);
    } catch (e) {
      console.error('Failed to save custom images:', e);
      toast.error('Storage full. Try removing some images.');
    }
  }, []);

  // Compress image before upload for faster uploads
  const compressImage = useCallback((file: File, maxWidth = 800, quality = 0.7): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = document.createElement('img');
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob(
            (blob) => blob ? resolve(blob) : reject(new Error('Failed to compress')),
            'image/jpeg',
            quality
          );
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = event.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }, []);

  // Handle image upload - to server if authenticated, localStorage otherwise
  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check max images limit
    if (customImages.length >= MAX_CUSTOM_IMAGES) {
      toast.error(`Maximum ${MAX_CUSTOM_IMAGES} custom images allowed. Remove some to add more.`);
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setIsUploading(true);

    try {
      if (isAuthenticated) {
        // Compress image before upload for faster uploads
        const compressedBlob = await compressImage(file);
        const compressedFile = new File([compressedBlob], file.name, { type: 'image/jpeg' });
        
        const formData = new FormData();
        formData.append('image', compressedFile);
        
        const response = await fetch('/api/user/upload-background', {
          method: 'POST',
          body: formData,
        });
        
        if (response.ok) {
          const data = await response.json();
          const newImageData = data.background;
          
          setCustomImages(prev => [...prev, newImageData]);
          
          const newBackground = createCustomBackground(newImageData);
          setSelectedBackground(newBackground);
          
          toast.success('Image uploaded! 📸');
        } else {
          const error = await response.json();
          toast.error(error.error || 'Failed to upload image');
        }
        
        setIsUploading(false);
      } else {
        // Compress and store in localStorage for guests
        const compressedBlob = await compressImage(file);
        const reader = new FileReader();
        reader.onload = (event) => {
          const resizedBase64 = event.target?.result as string;
          
          const newImageData: CustomImageData = {
            id: generateImageId(),
            url: resizedBase64,
            name: `Photo ${customImages.length + 1}`,
            createdAt: Date.now(),
          };
          
          try {
            const updatedImages = [...customImages, newImageData];
            saveCustomImages(updatedImages);
            
            const newBackground = createCustomBackground(newImageData);
            setSelectedBackground(newBackground);
            
            toast.success('Image uploaded! 📸 Login to sync.');
          } catch (storageError) {
            toast.error('Storage full. Remove some images first.');
          }
          
          setIsUploading(false);
        };
        reader.onerror = () => {
          toast.error('Failed to read image');
          setIsUploading(false);
        };
        reader.readAsDataURL(compressedBlob);
      }
    } catch (error) {
      toast.error('Failed to upload image');
      setIsUploading(false);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [customImages, saveCustomImages, isAuthenticated, compressImage]);

  // Handle remove specific custom image - from server if authenticated
  const handleRemoveCustomImage = useCallback(async (imageId: string) => {
    setDeletingImageId(imageId);
    
    try {
      if (isAuthenticated) {
        // Delete from server
        const response = await fetch('/api/user/upload-background', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ backgroundId: imageId }),
        });
        
        if (response.ok) {
          setCustomImages(prev => prev.filter(img => img.id !== imageId));
          if (selectedBackground.id === imageId) {
            setSelectedBackground(BACKGROUND_IMAGES[0]);
          }
          toast.success('Image removed');
        } else {
          toast.error('Failed to remove image');
        }
      } else {
        // Remove from localStorage
        const updatedImages = customImages.filter(img => img.id !== imageId);
        saveCustomImages(updatedImages);
        
        if (selectedBackground.id === imageId) {
          setSelectedBackground(BACKGROUND_IMAGES[0]);
        }
        
        toast.success('Image removed');
      }
    } catch (error) {
      toast.error('Failed to remove image');
    } finally {
      setDeletingImageId(null);
    }
  }, [customImages, selectedBackground.id, saveCustomImages, isAuthenticated]);

  // Memoized handlers
  const handleCancel = useCallback(() => {
    setSelectedTheme(currentTheme);
    setSelectedFont(currentFont);
    setSelectedBackground(currentBackground);
    onClose();
  }, [currentTheme, currentFont, currentBackground, onClose]);

  const handleSave = useCallback(async () => {
    if (!isAuthenticated) {
      toast.error('Please login to save your preferences');
      return;
    }
    
    setIsSaving(true);
    try {
      // Update parent state
      onThemeChange(selectedTheme);
      onFontChange(selectedFont);
      onBackgroundChange(selectedBackground);
      // Pass selected values directly to save (don't rely on async state update)
      await onSave(selectedTheme, selectedFont, selectedBackground);
      toast.success('Card style saved! ✨');
      onClose();
    } catch (error) {
      toast.error('Failed to save preferences');
    } finally {
      setIsSaving(false);
    }
  }, [isAuthenticated, selectedTheme, selectedFont, selectedBackground, onThemeChange, onFontChange, onBackgroundChange, onSave, onClose]);

  const handleThemeSelect = useCallback((theme: CardTheme) => {
    setSelectedTheme(theme);
    // When selecting a theme, reset background image to "none" so theme shows
    setSelectedBackground(BACKGROUND_IMAGES[0]); // "none" is the first item
  }, []);

  const handleFontSelect = useCallback((font: FontStyle) => {
    setSelectedFont(font);
  }, []);

  const handleBackgroundSelect = useCallback((bg: BackgroundImage) => {
    setSelectedBackground(bg);
    // Background image overrides theme visually, no need to reset theme
  }, []);

  const handleTabChange = useCallback((tab: 'themes' | 'fonts' | 'images') => {
    setActiveTab(tab);
  }, []);

  const handleToggleLightThemes = useCallback((isLight: boolean) => {
    setShowLightThemes(isLight);
  }, []);

  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const triggerCameraInput = useCallback(() => {
    cameraInputRef.current?.click();
  }, []);

  // Handle camera capture - reuse compression logic
  const handleCameraCapture = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check max images limit
    if (customImages.length >= MAX_CUSTOM_IMAGES) {
      toast.error(`Maximum ${MAX_CUSTOM_IMAGES} photos allowed. Remove some to add more.`);
      return;
    }

    setIsCapturing(true);

    try {
      // Compress image for faster upload
      const compressedBlob = await compressImage(file);
      
      if (isAuthenticated) {
        const compressedFile = new File([compressedBlob], 'camera.jpg', { type: 'image/jpeg' });
        const formData = new FormData();
        formData.append('image', compressedFile);
        
        const response = await fetch('/api/user/upload-background', {
          method: 'POST',
          body: formData,
        });
        
        if (response.ok) {
          const data = await response.json();
          const newImageData = data.background;
          
          setCustomImages(prev => [...prev, newImageData]);
          
          const newBackground = createCustomBackground(newImageData);
          setSelectedBackground(newBackground);
          
          toast.success('Photo captured! 📷');
        } else {
          const error = await response.json();
          toast.error(error.error || 'Failed to save photo');
        }
      } else {
        // Store in localStorage for guests
        const reader = new FileReader();
        reader.onload = (event) => {
          const resizedBase64 = event.target?.result as string;
          
          const newImageData: CustomImageData = {
            id: generateImageId(),
            url: resizedBase64,
            name: `Camera ${customImages.length + 1}`,
            createdAt: Date.now(),
          };
          
          try {
            const updatedImages = [...customImages, newImageData];
            saveCustomImages(updatedImages);
            
            const newBackground = createCustomBackground(newImageData);
            setSelectedBackground(newBackground);
            
            toast.success('Photo captured! 📷 Login to sync.');
          } catch (storageError) {
            toast.error('Storage full. Remove some photos first.');
          }
          
          setIsCapturing(false);
        };
        reader.onerror = () => {
          toast.error('Failed to read photo');
          setIsCapturing(false);
        };
        reader.readAsDataURL(compressedBlob);
        return; // Exit early, setIsCapturing handled in callbacks
      }
    } catch (error) {
      toast.error('Failed to capture photo');
    }
    
    setIsCapturing(false);

    // Reset camera input
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
    }
  }, [customImages, saveCustomImages, isAuthenticated, compressImage]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleCancel}
      />
      
      {/* Hidden file input for gallery */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />
      
      {/* Hidden camera input for taking photos */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCameraCapture}
        className="hidden"
      />
      
      {/* Modal - Full width on mobile, centered on desktop */}
      <div className="relative w-full sm:w-auto sm:max-w-lg sm:mx-4 bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-slide-up sm:animate-scale-in max-h-[90vh] sm:max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-500 to-pink-500 flex items-center justify-center">
              <Palette className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Customize Card</h2>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Personalize your quote cards</p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="p-1.5 sm:p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 shrink-0">
          <button
            onClick={() => handleTabChange('themes')}
            className={`flex-1 flex items-center justify-center gap-1 sm:gap-1.5 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-colors relative ${
              activeTab === 'themes'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Sparkles size={14} />
            <span className="hidden xs:inline">Themes</span>
            <span className="xs:hidden">Color</span>
            {/* Active indicator - shows when theme is being used (no image selected) */}
            {selectedBackground.id === 'none' && (
              <span className="ml-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            )}
          </button>
          <button
            onClick={() => handleTabChange('images')}
            className={`flex-1 flex items-center justify-center gap-1 sm:gap-1.5 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-colors relative ${
              activeTab === 'images'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <ImageIcon size={14} />
            <span className="hidden xs:inline">Images</span>
            <span className="xs:hidden">Image</span>
            {/* Active indicator - shows when an image is selected */}
            {selectedBackground.id !== 'none' && (
              <span className="ml-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            )}
          </button>
          <button
            onClick={() => handleTabChange('fonts')}
            className={`flex-1 flex items-center justify-center gap-1 sm:gap-1.5 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-colors ${
              activeTab === 'fonts'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Type size={14} />
            Fonts
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="p-3 sm:p-4 overflow-y-auto flex-1 custom-scrollbar">
          {activeTab === 'themes' && (
            <div className="space-y-3 sm:space-y-4">
              {/* Light/Dark Toggle */}
              <div className="flex items-center justify-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-full">
                <button
                  onClick={() => handleToggleLightThemes(true)}
                  className={`flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${
                    showLightThemes
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  <Sun size={12} className="sm:w-3.5 sm:h-3.5" />
                  Light
                </button>
                <button
                  onClick={() => handleToggleLightThemes(false)}
                  className={`flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${
                    !showLightThemes
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  <Moon size={12} className="sm:w-3.5 sm:h-3.5" />
                  Dark
                </button>
              </div>

              {/* Theme Grid */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3">
                {displayedThemes.map((theme) => (
                  <ThemeButton
                    key={theme.id}
                    theme={theme}
                    isSelected={selectedTheme.id === theme.id}
                    onClick={handleThemeSelect}
                  />
                ))}
              </div>
            </div>
          )}

          {activeTab === 'images' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 shrink-0">
                  {customImages.length}/{MAX_CUSTOM_IMAGES}
                </p>
                <div className="flex items-center gap-1">
                  {/* Camera capture button */}
                  <button
                    onClick={triggerCameraInput}
                    disabled={isCapturing || isUploading || customImages.length >= MAX_CUSTOM_IMAGES}
                    className="flex items-center justify-center gap-1 h-7 px-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[11px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Take a photo"
                  >
                    {isCapturing ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Camera size={12} />
                    )}
                    <span>Camera</span>
                  </button>
                  
                  {/* File upload button */}
                  <button
                    onClick={triggerFileInput}
                    disabled={isUploading || isCapturing || customImages.length >= MAX_CUSTOM_IMAGES}
                    className="flex items-center justify-center gap-1 h-7 px-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-[11px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Upload from gallery"
                  >
                    {isUploading ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Upload size={12} />
                    )}
                    <span>Upload</span>
                  </button>
                </div>
              </div>
              
              {/* Custom Images Section - show loader or images */}
              <div className="space-y-2">
                <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-medium">
                  Your Photos
                </p>
                {isLoadingImages ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 size={20} className="animate-spin text-purple-500" />
                    <span className="ml-2 text-xs text-gray-500">Loading...</span>
                  </div>
                ) : customImages.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3">
                    {customBackgrounds.map((bg) => (
                      <CustomImageButton
                        key={bg.id}
                        background={bg}
                        isSelected={selectedBackground.id === bg.id}
                        isDeleting={deletingImageId === bg.id}
                        onClick={handleBackgroundSelect}
                        onDelete={() => handleRemoveCustomImage(bg.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-gray-400 text-center py-3">
                    No photos yet. Tap Capture or Upload to add.
                  </p>
                )}
              </div>
              
              {/* Preset Images Section - always visible */}
              <div className="space-y-2">
                <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-medium">
                  Preset Backgrounds
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3">
                  {BACKGROUND_IMAGES.map((bg) => (
                    <ImageButton
                      key={bg.id}
                      background={bg}
                      isSelected={selectedBackground.id === bg.id}
                      onClick={handleBackgroundSelect}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'fonts' && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3">
              {FONT_STYLES.map((font) => (
                <FontButton
                  key={font.id}
                  font={font}
                  isSelected={selectedFont.id === font.id}
                  onClick={handleFontSelect}
                />
              ))}
            </div>
          )}
        </div>

        {/* Preview */}
        <div className="p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 shrink-0">
          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 text-center mb-2 sm:mb-3">Preview</p>
          <div
            className="mx-auto w-32 sm:w-40 aspect-[4/5] rounded-lg sm:rounded-xl shadow-lg flex flex-col items-center justify-center p-3 sm:p-4 relative overflow-hidden"
            style={{ background: selectedTheme.background }}
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
            <div className="relative z-10 flex flex-col items-center justify-center">
              <p
                className="text-[10px] sm:text-xs text-center leading-relaxed"
                style={{
                  color: previewColors.textColor,
                  fontFamily: selectedFont.fontFamily,
                  fontWeight: selectedFont.fontWeight,
                  textShadow: selectedBackground.id !== 'none' ? '0 1px 2px rgba(0,0,0,0.3)' : 'none',
                }}
              >
                &ldquo;The best is yet to come.&rdquo;
              </p>
              <p
                className="text-[8px] sm:text-[10px] mt-1 sm:mt-2"
                style={{ 
                  color: previewColors.authorColor,
                  textShadow: selectedBackground.id !== 'none' ? '0 1px 2px rgba(0,0,0,0.3)' : 'none',
                }}
              >
                — Preview
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700 shrink-0">
          <button
            onClick={handleCancel}
            className="flex-1 py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg sm:rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg sm:rounded-xl bg-gradient-to-r from-blue-600 to-pink-600 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-1.5 sm:gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span className="hidden sm:inline">Saving...</span>
                <span className="sm:hidden">...</span>
              </>
            ) : (
              <>
                <Check size={14} />
                {isAuthenticated ? 'Save' : 'Apply'}
              </>
            )}
          </button>
        </div>

        {!isAuthenticated && (
          <div className="px-3 sm:px-4 pb-3 sm:pb-4 shrink-0">
            <p className="text-[10px] sm:text-xs text-center text-gray-500 dark:text-gray-400">
              💡 Login to save preferences permanently
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Memoized Theme Button Component
interface ThemeButtonProps {
  theme: CardTheme;
  isSelected: boolean;
  onClick: (theme: CardTheme) => void;
}

const ThemeButton = memo(function ThemeButton({ theme, isSelected, onClick }: ThemeButtonProps) {
  const handleClick = useCallback(() => {
    onClick(theme);
  }, [onClick, theme]);

  return (
    <button
      onClick={handleClick}
      className={`relative p-1.5 sm:p-2 rounded-lg sm:rounded-xl border-2 transition-all active:scale-95 ${
        isSelected
          ? 'border-blue-500 ring-1 sm:ring-2 ring-blue-200 dark:ring-blue-800'
          : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      <div
        className="w-full aspect-[4/5] rounded-md sm:rounded-lg mb-1 sm:mb-2 flex items-center justify-center overflow-hidden"
        style={{ background: theme.background }}
      >
        <span
          className="text-[8px] sm:text-[10px] font-medium px-1 text-center leading-tight"
          style={{ color: theme.textColor }}
        >
          Aa
        </span>
      </div>
      <span className="text-[9px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 block text-center truncate">
        {theme.name}
      </span>
      {isSelected && (
        <div className="absolute -top-0.5 -right-0.5 sm:top-1 sm:right-1 w-4 h-4 sm:w-5 sm:h-5 bg-blue-500 rounded-full flex items-center justify-center">
          <Check size={10} className="text-white sm:w-3 sm:h-3" />
        </div>
      )}
    </button>
  );
});

// Memoized Custom Image Button Component (with delete)
interface CustomImageButtonProps {
  background: BackgroundImage;
  isSelected: boolean;
  isDeleting: boolean;
  onClick: (bg: BackgroundImage) => void;
  onDelete: () => void;
}

const CustomImageButton = memo(function CustomImageButton({ background, isSelected, isDeleting, onClick, onDelete }: CustomImageButtonProps) {
  const handleClick = useCallback(() => {
    if (!isDeleting) onClick(background);
  }, [onClick, background, isDeleting]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isDeleting) onDelete();
  }, [onDelete, isDeleting]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      className={`relative p-1.5 sm:p-2 rounded-lg sm:rounded-xl border-2 transition-all group cursor-pointer ${
        isDeleting ? 'opacity-60 pointer-events-none' : 'active:scale-95'
      } ${
        isSelected
          ? 'border-blue-500 ring-1 sm:ring-2 ring-blue-200 dark:ring-blue-800'
          : 'border-purple-400 dark:border-purple-600'
      }`}
    >
      <div className="w-full aspect-[4/5] rounded-md sm:rounded-lg mb-1 sm:mb-2 overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center relative">
        {background.url && (
          <Image
            src={background.url}
            alt={background.name}
            width={80}
            height={100}
            className={`w-full h-full object-cover ${isDeleting ? 'blur-sm' : ''}`}
            unoptimized
          />
        )}
        {/* Loading overlay when deleting */}
        {isDeleting && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <Loader2 size={20} className="text-white animate-spin" />
          </div>
        )}
        {/* Delete button - visible on mobile, hover on desktop */}
        {!isDeleting && (
          <button
            onClick={handleDelete}
            className="absolute top-0.5 right-0.5 p-1.5 bg-red-500 rounded-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100 active:scale-90 transition-all shadow-lg z-10"
          >
            <Trash2 size={12} className="text-white" />
          </button>
        )}
      </div>
      <span className="text-[9px] sm:text-xs font-medium text-purple-600 dark:text-purple-400 block text-center truncate">
        {isDeleting ? 'Deleting...' : background.name}
      </span>
      {isSelected && !isDeleting && (
        <div className="absolute -top-0.5 -right-0.5 sm:top-1 sm:right-1 w-4 h-4 sm:w-5 sm:h-5 bg-blue-500 rounded-full flex items-center justify-center">
          <Check size={10} className="text-white sm:w-3 sm:h-3" />
        </div>
      )}
      {!isSelected && !isDeleting && (
        <div className="absolute -top-0.5 -right-0.5 sm:top-1 sm:right-1 w-4 h-4 sm:w-5 sm:h-5 bg-purple-500 rounded-full flex items-center justify-center">
          <span className="text-[8px] text-white">✨</span>
        </div>
      )}
    </div>
  );
});

// Memoized Image Button Component (for presets)
interface ImageButtonProps {
  background: BackgroundImage;
  isSelected: boolean;
  onClick: (bg: BackgroundImage) => void;
}

const ImageButton = memo(function ImageButton({ background, isSelected, onClick }: ImageButtonProps) {
  const handleClick = useCallback(() => {
    onClick(background);
  }, [onClick, background]);

  return (
    <button
      onClick={handleClick}
      className={`relative p-1.5 sm:p-2 rounded-lg sm:rounded-xl border-2 transition-all active:scale-95 ${
        isSelected
          ? 'border-blue-500 ring-1 sm:ring-2 ring-blue-200 dark:ring-blue-800'
          : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      <div className="w-full aspect-[4/5] rounded-md sm:rounded-lg mb-1 sm:mb-2 overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        {background.id === 'none' ? (
          <div className="flex flex-col items-center justify-center text-gray-400">
            <X size={16} />
            <span className="text-[8px] mt-0.5">None</span>
          </div>
        ) : background.thumbnail || background.url ? (
          <Image
            src={background.thumbnail || background.url}
            alt={background.name}
            width={80}
            height={100}
            className="w-full h-full object-cover"
            unoptimized
          />
        ) : (
          <ImageIcon size={16} className="text-gray-400" />
        )}
      </div>
      <span className="text-[9px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 block text-center truncate">
        {background.name}
      </span>
      {isSelected && (
        <div className="absolute -top-0.5 -right-0.5 sm:top-1 sm:right-1 w-4 h-4 sm:w-5 sm:h-5 bg-blue-500 rounded-full flex items-center justify-center">
          <Check size={10} className="text-white sm:w-3 sm:h-3" />
        </div>
      )}
    </button>
  );
});

// Memoized Font Button Component
interface FontButtonProps {
  font: FontStyle;
  isSelected: boolean;
  onClick: (font: FontStyle) => void;
}

const FontButton = memo(function FontButton({ font, isSelected, onClick }: FontButtonProps) {
  const handleClick = useCallback(() => {
    onClick(font);
  }, [onClick, font]);

  return (
    <button
      onClick={handleClick}
      className={`relative p-2 sm:p-3 rounded-lg sm:rounded-xl border-2 transition-all active:scale-95 ${
        isSelected
          ? 'border-blue-500 ring-1 sm:ring-2 ring-blue-200 dark:ring-blue-800'
          : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      <div
        className="text-xl sm:text-2xl mb-1 text-gray-900 dark:text-white text-center"
        style={{ fontFamily: font.fontFamily, fontWeight: font.fontWeight }}
      >
        {font.sample}
      </div>
      <span className="text-[9px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 block text-center truncate">
        {font.name}
      </span>
      {isSelected && (
        <div className="absolute -top-0.5 -right-0.5 sm:top-1 sm:right-1 w-4 h-4 sm:w-5 sm:h-5 bg-blue-500 rounded-full flex items-center justify-center">
          <Check size={10} className="text-white sm:w-3 sm:h-3" />
        </div>
      )}
    </button>
  );
});

export default memo(CardCustomization);
