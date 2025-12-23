'use client';

import { useState, useEffect, useCallback } from 'react';
import { Upload, Camera, X, Check, Loader2, ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { useBackgroundsSafe, UserBackground } from '@/contexts/BackgroundsContext';

// Re-export the type for consumers
export type { UserBackground };

interface ImageUploaderProps {
  // Selected custom background URL
  selectedCustomBackground: string | null;
  // Callback when a custom background is selected
  onSelectCustomBackground: (url: string | null) => void;
  // Maximum number of images to display
  maxDisplay?: number;
  // Whether to show the upload buttons
  showUploadButtons?: boolean;
  // Whether to show the clear option
  showClearOption?: boolean;
  // Label for the clear option
  clearOptionLabel?: string;
  // Grid columns (default 4)
  gridCols?: 3 | 4 | 5 | 6;
  // Whether the component should fetch images on mount (deprecated - now uses context)
  autoFetch?: boolean;
  // Callback when backgrounds change
  onBackgroundsChange?: (backgrounds: UserBackground[]) => void;
  // Custom class for container
  className?: string;
}

export default function ImageUploader({
  selectedCustomBackground,
  onSelectCustomBackground,
  maxDisplay = 8,
  showUploadButtons = true,
  showClearOption = true,
  clearOptionLabel = 'No Background (Default)',
  gridCols = 4,
  autoFetch = true,
  onBackgroundsChange,
  className = '',
}: ImageUploaderProps) {
  // Use context for preloaded backgrounds
  const backgroundsContext = useBackgroundsSafe();
  
  // Fallback local state if context is not available
  const [localBackgrounds, setLocalBackgrounds] = useState<UserBackground[]>([]);
  const [localLoading, setLocalLoading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Use context data if available, otherwise use local state
  const userBackgrounds = backgroundsContext?.userBackgrounds ?? localBackgrounds;
  const isLoading = backgroundsContext?.isLoading ?? localLoading;
  const isInitialized = backgroundsContext?.isInitialized ?? false;

  // Fallback fetch for when context is not available
  const fetchUserBackgrounds = useCallback(async () => {
    if (backgroundsContext) return; // Skip if context is available
    
    setLocalLoading(true);
    try {
      const response = await fetch('/api/user/upload-background', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });
      if (response.ok) {
        const data = await response.json();
        const backgrounds = data.backgrounds || [];
        setLocalBackgrounds(backgrounds);
        onBackgroundsChange?.(backgrounds);
      }
    } catch (error) {
      console.error('Failed to fetch user backgrounds:', error);
    } finally {
      setLocalLoading(false);
    }
  }, [backgroundsContext, onBackgroundsChange]);

  // Fetch if context not available and autoFetch is true
  useEffect(() => {
    if (!backgroundsContext && autoFetch) {
      fetchUserBackgrounds();
    }
  }, [backgroundsContext, autoFetch, fetchUserBackgrounds]);

  // Notify parent when backgrounds change
  useEffect(() => {
    if (userBackgrounds.length > 0) {
      onBackgroundsChange?.(userBackgrounds);
    }
  }, [userBackgrounds, onBackgroundsChange]);

  // Handle image upload
  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

    setIsUploadingImage(true);
    try {
      // Use FormData for the API
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch('/api/user/upload-background', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const newBackground = data.background as UserBackground;
        
        // Update context or local state
        if (backgroundsContext) {
          backgroundsContext.addBackground(newBackground);
        } else {
          setLocalBackgrounds(prev => [newBackground, ...prev]);
        }
        
        onSelectCustomBackground(newBackground.url);
        toast.success('Image uploaded!');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to process image');
    } finally {
      setIsUploadingImage(false);
      e.target.value = '';
    }
  }, [backgroundsContext, onSelectCustomBackground]);

  // Delete user background
  const handleDeleteBackground = useCallback(async (backgroundId: string, bgUrl: string) => {
    try {
      const response = await fetch('/api/user/upload-background', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backgroundId }),
      });

      if (response.ok) {
        // Update context or local state
        if (backgroundsContext) {
          backgroundsContext.removeBackground(backgroundId);
        } else {
          setLocalBackgrounds(prev => prev.filter(bg => bg.id !== backgroundId));
        }
        
        if (selectedCustomBackground === bgUrl) {
          onSelectCustomBackground(null);
        }
        toast.success('Image deleted');
      } else {
        toast.error('Failed to delete image');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete image');
    }
  }, [backgroundsContext, selectedCustomBackground, onSelectCustomBackground]);

  // Refresh backgrounds
  const refresh = useCallback(() => {
    if (backgroundsContext) {
      backgroundsContext.refreshBackgrounds();
    } else {
      fetchUserBackgrounds();
    }
  }, [backgroundsContext, fetchUserBackgrounds]);

  // Grid columns class
  const gridColsClass = {
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6',
  }[gridCols];

  const validBackgrounds = userBackgrounds.filter(bg => bg && bg.url && bg.url.length > 0);

  return (
    <div className={className}>
      {/* Upload Buttons */}
      {showUploadButtons && (
        <div className="flex gap-2 mb-3">
          <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl cursor-pointer hover:shadow-lg transition-all active:scale-[0.98]">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              disabled={isUploadingImage}
            />
            {isUploadingImage ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Upload size={16} />
            )}
            <span className="text-sm font-medium">Upload Image</span>
          </label>
          <label className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600 transition-all active:scale-[0.98]">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageUpload}
              className="hidden"
              disabled={isUploadingImage}
            />
            <Camera size={16} />
          </label>
        </div>
      )}

      {/* Clear Option */}
      {showClearOption && (
        <button
          onClick={() => onSelectCustomBackground(null)}
          className={`w-full mb-3 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
            !selectedCustomBackground
              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
              : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
          }`}
        >
          {clearOptionLabel}
        </button>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 size={20} className="animate-spin text-gray-400" />
          <span className="ml-2 text-sm text-gray-500">Loading images...</span>
        </div>
      )}

      {/* User's Uploaded Backgrounds */}
      {!isLoading && validBackgrounds.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-gray-500 mb-2">Your Images ({validBackgrounds.length})</p>
          <div className={`grid ${gridColsClass} gap-2 max-h-48 overflow-y-auto`}>
            {validBackgrounds.slice(0, maxDisplay).map((bg) => (
              <div key={bg.id} className="relative group aspect-square">
                <button
                  onClick={() => onSelectCustomBackground(bg.url)}
                  className={`w-full h-full rounded-lg overflow-hidden border-2 transition-all ${
                    selectedCustomBackground === bg.url
                      ? 'border-purple-500 ring-2 ring-purple-500/30'
                      : 'border-transparent hover:border-gray-300'
                  }`}
                >
                  <img
                    src={bg.url}
                    alt={bg.name || 'Background'}
                    className="w-full h-full object-cover"
                  />
                  {selectedCustomBackground === bg.url && (
                    <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center">
                      <Check size={16} className="text-white drop-shadow" />
                    </div>
                  )}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteBackground(bg.id, bg.url);
                  }}
                  className="absolute -top-1 -right-1 z-10 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
          {validBackgrounds.length > maxDisplay && (
            <p className="text-xs text-gray-400 mt-2 text-center">
              +{validBackgrounds.length - maxDisplay} more images
            </p>
          )}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && validBackgrounds.length === 0 && (
        <div className="text-center py-4 text-gray-400">
          <ImageIcon size={24} className="mx-auto mb-2 opacity-50" />
          <p className="text-xs">No uploaded images yet</p>
          {showUploadButtons && (
            <p className="text-xs mt-1">Click "Upload Image" to add your own</p>
          )}
        </div>
      )}
    </div>
  );
}

// Export a hook version that uses the context
export function useImageUploader() {
  const backgroundsContext = useBackgroundsSafe();
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const uploadImage = useCallback(async (file: File): Promise<UserBackground | null> => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return null;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return null;
    }

    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch('/api/user/upload-background', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const newBackground = data.background as UserBackground;
        backgroundsContext?.addBackground(newBackground);
        toast.success('Image uploaded!');
        return newBackground;
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to upload image');
        return null;
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to process image');
      return null;
    } finally {
      setIsUploadingImage(false);
    }
  }, [backgroundsContext]);

  const deleteImage = useCallback(async (backgroundId: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/user/upload-background', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backgroundId }),
      });

      if (response.ok) {
        backgroundsContext?.removeBackground(backgroundId);
        toast.success('Image deleted');
        return true;
      } else {
        toast.error('Failed to delete image');
        return false;
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete image');
      return false;
    }
  }, [backgroundsContext]);

  return {
    userBackgrounds: backgroundsContext?.userBackgrounds ?? [],
    isUploadingImage,
    isLoading: backgroundsContext?.isLoading ?? false,
    fetchUserBackgrounds: backgroundsContext?.refreshBackgrounds ?? (() => Promise.resolve()),
    uploadImage,
    deleteImage,
  };
}

