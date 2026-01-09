'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, Camera, X, Check, Loader2, ImageIcon, Trash2, Images } from 'lucide-react';
import toast from 'react-hot-toast';
import { useBackgroundsSafe, UserBackground } from '@/contexts/BackgroundsContext';

// Re-export the type for consumers
export type { UserBackground };

/**
 * Compress image before upload to reduce file size by ~90%
 * - Resizes large images to max 1200px width
 * - Converts to JPEG with 80% quality
 * - Tries WebP first for smaller file sizes
 * 
 * Example: 3MB photo → ~150-250KB (92-95% reduction)
 */
const compressImage = (file: File, maxWidth = 1200, quality = 0.8): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = document.createElement('img');
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        
        // Scale down if larger than maxWidth
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        
        // Also limit height for very tall images
        const maxHeight = 1600;
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
        
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        // Use high-quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        
        // Try WebP first (smaller file size), fallback to JPEG
        canvas.toBlob(
          (webpBlob) => {
            if (webpBlob && webpBlob.size < file.size) {
              // WebP worked and is smaller
              resolve(webpBlob);
            } else {
              // Fallback to JPEG
              canvas.toBlob(
                (jpegBlob) => {
                  if (jpegBlob) {
                    resolve(jpegBlob);
                  } else {
                    reject(new Error('Failed to compress image'));
                  }
                },
                'image/jpeg',
                quality
              );
            }
          },
          'image/webp',
          quality
        );
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

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

// Upload progress state
interface UploadProgress {
  total: number;
  completed: number;
  failed: number;
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
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  
  // Bulk upload state
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const bulkInputRef = useRef<HTMLInputElement>(null);

  // Use context data if available, otherwise use local state
  const userBackgrounds = backgroundsContext?.userBackgrounds ?? localBackgrounds;
  const isLoading = backgroundsContext?.isLoading ?? localLoading;
  const isInitialized = backgroundsContext?.isInitialized ?? false;

  // Lazy load: Trigger background fetch when component mounts (modal opens)
  useEffect(() => {
    if (backgroundsContext?.ensureLoaded && autoFetch) {
      backgroundsContext.ensureLoaded();
    }
  }, [backgroundsContext, autoFetch]);

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

  // Upload a single file (helper function) - with compression
  const uploadSingleFile = useCallback(async (file: File): Promise<UserBackground | null> => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      return null;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return null;
    }

    try {
      // Compress image before upload (reduces size by ~90%)
      const compressedBlob = await compressImage(file, 1200, 0.8);
      
      // Create a new File from the compressed Blob
      const compressedFile = new File(
        [compressedBlob], 
        file.name.replace(/\.[^/.]+$/, compressedBlob.type === 'image/webp' ? '.webp' : '.jpg'),
        { type: compressedBlob.type }
      );
      
      // Log compression results for debugging
      const originalKB = (file.size / 1024).toFixed(1);
      const compressedKB = (compressedFile.size / 1024).toFixed(1);
      const reduction = (((file.size - compressedFile.size) / file.size) * 100).toFixed(0);
      console.log(`Image compressed: ${originalKB}KB → ${compressedKB}KB (${reduction}% smaller)`);
      
      const formData = new FormData();
      formData.append('image', compressedFile);
      
      const response = await fetch('/api/user/upload-background', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        return data.background as UserBackground;
      }
      return null;
    } catch (error) {
      console.error('Upload error:', error);
      return null;
    }
  }, []);

  // Handle single image upload
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
      const newBackground = await uploadSingleFile(file);
      
      if (newBackground) {
        // Update context or local state
        if (backgroundsContext) {
          backgroundsContext.addBackground(newBackground);
        } else {
          setLocalBackgrounds(prev => [newBackground, ...prev]);
        }
        
        onSelectCustomBackground(newBackground.url);
        toast.success('Image uploaded!');
      } else {
        toast.error('Failed to upload image');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to process image');
    } finally {
      setIsUploadingImage(false);
      e.target.value = '';
    }
  }, [backgroundsContext, onSelectCustomBackground, uploadSingleFile]);

  // Handle bulk image upload
  const handleBulkUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Convert FileList to array and filter valid images
    const validFiles = Array.from(files).filter(file => {
      if (!file.type.startsWith('image/')) {
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) {
      toast.error('No valid images selected (max 5MB each)');
      e.target.value = '';
      return;
    }

    // Limit to 10 images at once
    const filesToUpload = validFiles.slice(0, 10);
    if (validFiles.length > 10) {
      toast.error(`Only uploading first 10 images (${validFiles.length} selected)`);
    }

    // Initialize progress
    setUploadProgress({ total: filesToUpload.length, completed: 0, failed: 0 });
    setIsUploadingImage(true);

    // Track upload results
    const uploadResults: { lastBg: UserBackground | null; completed: number; failed: number } = {
      lastBg: null,
      completed: 0,
      failed: 0,
    };

    // Upload files with concurrency limit (3 at a time)
    const concurrencyLimit = 3;
    const uploadQueue = [...filesToUpload];

    const processFile = async (file: File) => {
      const result = await uploadSingleFile(file);
      
      if (result) {
        // Update context or local state
        if (backgroundsContext) {
          backgroundsContext.addBackground(result);
        } else {
          setLocalBackgrounds(prev => [result, ...prev]);
        }
        uploadResults.lastBg = result;
        uploadResults.completed++;
      } else {
        uploadResults.failed++;
      }
      
      // Update progress
      setUploadProgress(prev => prev ? {
        ...prev,
        completed: uploadResults.completed,
        failed: uploadResults.failed,
      } : null);
    };

    // Process files with concurrency limit
    while (uploadQueue.length > 0) {
      const batch = uploadQueue.splice(0, concurrencyLimit);
      await Promise.all(batch.map(processFile));
    }

    // Show result toast
    if (uploadResults.completed > 0) {
      toast.success(`${uploadResults.completed} image${uploadResults.completed > 1 ? 's' : ''} uploaded!`);
      if (uploadResults.lastBg) {
        onSelectCustomBackground(uploadResults.lastBg.url);
      }
    }
    if (uploadResults.failed > 0) {
      toast.error(`${uploadResults.failed} image${uploadResults.failed > 1 ? 's' : ''} failed to upload`);
    }

    // Reset state
    setIsUploadingImage(false);
    setUploadProgress(null);
    e.target.value = '';
  }, [backgroundsContext, onSelectCustomBackground, uploadSingleFile]);

  // Delete user background
  const handleDeleteBackground = useCallback(async (backgroundId: string, bgUrl: string) => {
    setDeletingImageId(backgroundId);
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
    } finally {
      setDeletingImageId(null);
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
      {/* Upload Progress Bar */}
      {uploadProgress && (
        <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-900/30 rounded-xl border border-amber-200 dark:border-amber-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
              Uploading {uploadProgress.completed}/{uploadProgress.total} images...
            </span>
            <Loader2 size={16} className="animate-spin text-amber-500" />
          </div>
          <div className="w-full bg-amber-200 dark:bg-amber-800 rounded-full h-2">
            <div 
              className="bg-amber-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(uploadProgress.completed / uploadProgress.total) * 100}%` }}
            />
          </div>
          {uploadProgress.failed > 0 && (
            <p className="text-xs text-red-500 mt-1">{uploadProgress.failed} failed</p>
          )}
        </div>
      )}

      {/* Upload Buttons */}
      {showUploadButtons && !uploadProgress && (
        <div className="flex gap-2 mb-3">
          {/* Single Upload */}
          <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-amber-500 to-rose-500 text-white rounded-xl cursor-pointer hover:shadow-lg transition-all active:scale-[0.98]">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              disabled={isUploadingImage}
            />
            {isUploadingImage && !uploadProgress ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Upload size={16} />
            )}
            <span className="text-sm font-medium hidden sm:inline">Upload</span>
          </label>
          
          {/* Bulk Upload */}
          <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl cursor-pointer hover:shadow-lg transition-all active:scale-[0.98]">
            <input
              ref={bulkInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleBulkUpload}
              className="hidden"
              disabled={isUploadingImage}
            />
            <Images size={16} />
            <span className="text-sm font-medium hidden sm:inline">Bulk</span>
          </label>
          
          {/* Camera */}
          <label className="flex items-center justify-center gap-2 px-3 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600 transition-all active:scale-[0.98]">
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
              ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
              : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:border-stone-300'
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
          <div className={`grid ${gridColsClass} gap-2.5 sm:gap-3 max-h-64 sm:max-h-72 overflow-y-auto`}>
            {validBackgrounds.slice(0, maxDisplay).map((bg) => {
              const isDeleting = deletingImageId === bg.id;
              return (
                <div key={bg.id} className="relative group aspect-square">
                  <button
                    onClick={() => !isDeleting && onSelectCustomBackground(bg.url)}
                    disabled={isDeleting}
                    className={`w-full h-full rounded-lg overflow-hidden border-2 transition-all ${
                      isDeleting ? 'opacity-60 cursor-not-allowed' : ''
                    } ${
                      selectedCustomBackground === bg.url
                        ? 'border-purple-500 ring-2 ring-purple-500/30'
                        : 'border-transparent hover:border-gray-300'
                    }`}
                  >
                    <img
                      src={bg.url}
                      alt={bg.name || 'Background'}
                      className={`w-full h-full object-cover ${isDeleting ? 'blur-sm' : ''}`}
                    />
                    {/* Selection indicator */}
                    {selectedCustomBackground === bg.url && !isDeleting && (
                      <div className="absolute inset-0 bg-amber-500/20 flex items-center justify-center">
                        <Check size={16} className="text-white drop-shadow" />
                      </div>
                    )}
                    {/* Loading overlay when deleting */}
                    {isDeleting && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Loader2 size={20} className="text-white animate-spin" />
                      </div>
                    )}
                  </button>
                  {/* Delete button - Always visible on mobile, hover on desktop */}
                  {!isDeleting && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteBackground(bg.id, bg.url);
                      }}
                      className="absolute top-0.5 right-0.5 z-10 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 active:scale-90 transition-all shadow-lg"
                      title="Delete image"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              );
            })}
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
      // Compress image before upload (reduces size by ~90%)
      const compressedBlob = await compressImage(file, 1200, 0.8);
      
      // Create a new File from the compressed Blob
      const compressedFile = new File(
        [compressedBlob], 
        file.name.replace(/\.[^/.]+$/, compressedBlob.type === 'image/webp' ? '.webp' : '.jpg'),
        { type: compressedBlob.type }
      );
      
      // Log compression results
      const originalKB = (file.size / 1024).toFixed(1);
      const compressedKB = (compressedFile.size / 1024).toFixed(1);
      const reduction = (((file.size - compressedFile.size) / file.size) * 100).toFixed(0);
      console.log(`Image compressed: ${originalKB}KB → ${compressedKB}KB (${reduction}% smaller)`);
      
      const formData = new FormData();
      formData.append('image', compressedFile);
      
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

