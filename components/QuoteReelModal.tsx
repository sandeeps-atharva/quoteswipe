'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { X, Plus, Trash2, Play, Pause, Download, Loader2, Film, Image as ImageIcon, Sparkles, RotateCcw, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import Image from 'next/image';

// ============================================================================
// Types & Interfaces
// ============================================================================

interface Quote {
  id: string | number;
  text: string;
  author: string;
  category?: string;
}

interface QuoteReelModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: Quote;
}

type TransitionType = 'default' | 'fade' | 'slide' | 'zoom' | 'none';

interface ReelSettings {
  duration: number; // seconds per image
  transition: TransitionType;
  quality: '1080p' | '4k';
}

// ============================================================================
// Constants
// ============================================================================

const MAX_IMAGES = 20; // Allow up to 20 images
const MIN_IMAGES = 2; // Minimum images required
const QUALITY_OPTIONS = {
  '1080p': { width: 1080, height: 1920, label: 'HD (1080p)', bitrate: 8000000 },
  '4k': { width: 2160, height: 3840, label: '4K Ultra HD', bitrate: 35000000 },
};

const TRANSITIONS: { id: TransitionType; label: string; icon: string }[] = [
  { id: 'default', label: 'Default', icon: '⚡' },
  { id: 'fade', label: 'Fade', icon: '🌅' },
  { id: 'slide', label: 'Slide', icon: '➡️' },
  { id: 'zoom', label: 'Zoom', icon: '🔍' },
  { id: 'none', label: 'Cut', icon: '✂️' },
];

// Duration options in seconds (including fast options)
const DURATION_OPTIONS = [
  { value: 0.3, label: '0.3s' },
  { value: 0.4, label: '0.4s' },
  { value: 0.5, label: '0.5s' },
  { value: 0.8, label: '0.8s' },
  { value: 1, label: '1s' },
  { value: 2, label: '2s' },
  { value: 3, label: '3s' },
  { value: 4, label: '4s' },
  { value: 5, label: '5s' },
];

const DEFAULT_TRANSITION: TransitionType = 'default';

// ============================================================================
// Helper Functions
// ============================================================================

const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img');
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

const wrapText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number => {
  const words = text.split(' ');
  let line = '';
  let lines: string[] = [];

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      lines.push(line.trim());
      line = words[n] + ' ';
    } else {
      line = testLine;
    }
  }
  lines.push(line.trim());

  // Center vertically
  const totalHeight = lines.length * lineHeight;
  let startY = y - totalHeight / 2;

  lines.forEach((l, i) => {
    ctx.fillText(l, x, startY + i * lineHeight);
  });

  return lines.length;
};

// ============================================================================
// Main Component
// ============================================================================

export default function QuoteReelModal({
  isOpen,
  onClose,
  quote,
}: QuoteReelModalProps) {
  // State
  const [images, setImages] = useState<string[]>([]);
  const [settings, setSettings] = useState<ReelSettings>({
    duration: 1,
    transition: DEFAULT_TRANSITION,
    quality: '4k',
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [previewKey, setPreviewKey] = useState(0);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate total duration
  const totalDuration = images.length * settings.duration;

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setImages([]);
      setCurrentImageIndex(0);
      setIsPlaying(false);
      setIsGenerating(false);
      setGenerationProgress(0);
    }
  }, [isOpen]);

  // Preview playback
  useEffect(() => {
    if (isPlaying && images.length > 0) {
      playIntervalRef.current = setInterval(() => {
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
      }, settings.duration * 1000);
    }

    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, [isPlaying, images.length, settings.duration]);

  // Handle image upload
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remainingSlots = MAX_IMAGES - images.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    filesToProcess.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setImages((prev) => {
          if (prev.length < MAX_IMAGES) {
            return [...prev, result];
          }
          return prev;
        });
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [images.length]);

  // Remove image
  const removeImage = useCallback((index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    if (currentImageIndex >= index && currentImageIndex > 0) {
      setCurrentImageIndex((prev) => prev - 1);
    }
  }, [currentImageIndex]);

  // Reorder images
  const moveImage = useCallback((fromIndex: number, direction: 'left' | 'right') => {
    const toIndex = direction === 'left' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= images.length) return;

    setImages((prev) => {
      const newImages = [...prev];
      [newImages[fromIndex], newImages[toIndex]] = [newImages[toIndex], newImages[fromIndex]];
      return newImages;
    });
  }, [images.length]);

  // Draw frame on canvas
  const drawFrame = useCallback(async (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    imageIndex: number,
    transitionProgress: number = 1, // 0-1, 1 = fully visible
    nextImageIndex?: number
  ) => {
    const img = await loadImage(images[imageIndex]);
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw background image (cover fit)
    const imgRatio = img.width / img.height;
    const canvasRatio = width / height;
    let drawWidth, drawHeight, drawX, drawY;

    if (imgRatio > canvasRatio) {
      drawHeight = height;
      drawWidth = height * imgRatio;
      drawX = (width - drawWidth) / 2;
      drawY = 0;
    } else {
      drawWidth = width;
      drawHeight = width / imgRatio;
      drawX = 0;
      drawY = (height - drawHeight) / 2;
    }

    // Handle transitions
    ctx.save();
    
    if (settings.transition === 'fade' && transitionProgress < 1 && nextImageIndex !== undefined) {
      // Draw current image
      ctx.globalAlpha = 1 - transitionProgress;
      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
      
      // Draw next image
      const nextImg = await loadImage(images[nextImageIndex]);
      const nextImgRatio = nextImg.width / nextImg.height;
      let nextDrawWidth, nextDrawHeight, nextDrawX, nextDrawY;
      
      if (nextImgRatio > canvasRatio) {
        nextDrawHeight = height;
        nextDrawWidth = height * nextImgRatio;
        nextDrawX = (width - nextDrawWidth) / 2;
        nextDrawY = 0;
      } else {
        nextDrawWidth = width;
        nextDrawHeight = width / nextImgRatio;
        nextDrawX = 0;
        nextDrawY = (height - nextDrawHeight) / 2;
      }
      
      ctx.globalAlpha = transitionProgress;
      ctx.drawImage(nextImg, nextDrawX, nextDrawY, nextDrawWidth, nextDrawHeight);
    } else if (settings.transition === 'zoom' && transitionProgress < 1) {
      const scale = 1 + (transitionProgress * 0.1);
      ctx.translate(width / 2, height / 2);
      ctx.scale(scale, scale);
      ctx.translate(-width / 2, -height / 2);
      ctx.globalAlpha = 1 - transitionProgress;
      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
    } else if (settings.transition === 'slide' && transitionProgress < 1 && nextImageIndex !== undefined) {
      // Slide current image out
      const offset = width * transitionProgress;
      ctx.drawImage(img, drawX - offset, drawY, drawWidth, drawHeight);
      
      // Slide next image in
      const nextImg = await loadImage(images[nextImageIndex]);
      ctx.drawImage(nextImg, drawX + width - offset, drawY, drawWidth, drawHeight);
    } else {
      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
    }
    
    ctx.restore();

    // Draw overlay gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(0,0,0,0.3)');
    gradient.addColorStop(0.4, 'rgba(0,0,0,0.1)');
    gradient.addColorStop(0.6, 'rgba(0,0,0,0.1)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Draw quote text
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Quote text
    const fontSize = Math.floor(width * 0.045);
    ctx.font = `600 ${fontSize}px "Georgia", serif`;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    const maxTextWidth = width * 0.85;
    const lineHeight = fontSize * 1.5;
    const quoteText = `"${quote.text}"`;
    
    wrapText(ctx, quoteText, width / 2, height * 0.45, maxTextWidth, lineHeight);

    // Author
    const authorFontSize = Math.floor(width * 0.028);
    ctx.font = `500 ${authorFontSize}px "Arial", sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText(`— ${quote.author}`, width / 2, height * 0.65);

    // Logo/Watermark
    ctx.font = `500 ${Math.floor(width * 0.018)}px "Arial", sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText('QuoteSwipe', width / 2, height * 0.95);

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }, [images, quote, settings.transition]);

  // Generate video
  const generateVideo = useCallback(async () => {
    if (images.length === 0) return;

    setIsGenerating(true);
    setGenerationProgress(0);

    const quality = QUALITY_OPTIONS[settings.quality];
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = quality.width;
    canvas.height = quality.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      // Create MediaRecorder
      const stream = canvas.captureStream(30); // 30 FPS
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: quality.bitrate,
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        
        // Download
        const a = document.createElement('a');
        a.href = url;
        a.download = `quote-reel-${settings.quality}-${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setIsGenerating(false);
        setGenerationProgress(100);
      };

      mediaRecorder.start();

      // Render frames
      const fps = 30;
      const totalFrames = Math.ceil(totalDuration * fps);
      const framesPerImage = Math.ceil(settings.duration * fps);
      // Transition duration: 30% of image duration, max 0.5s, min 0.1s
      const transitionDuration = Math.min(0.5, Math.max(0.1, settings.duration * 0.3));
      const transitionFrames = Math.floor(fps * transitionDuration);

      for (let frame = 0; frame < totalFrames; frame++) {
        const imageIndex = Math.floor(frame / framesPerImage) % images.length;
        const frameInImage = frame % framesPerImage;
        
        // Check if we're in transition period
        const isTransitioning = frameInImage >= (framesPerImage - transitionFrames);
        let transitionProgress = 0;
        let nextImageIndex: number | undefined;

        if (isTransitioning && settings.transition !== 'none' && settings.transition !== 'default') {
          transitionProgress = (frameInImage - (framesPerImage - transitionFrames)) / transitionFrames;
          nextImageIndex = (imageIndex + 1) % images.length;
        }

        await drawFrame(ctx, quality.width, quality.height, imageIndex, transitionProgress, nextImageIndex);
        
        // Update progress
        setGenerationProgress(Math.floor((frame / totalFrames) * 100));

        // Wait for next frame
        await new Promise((resolve) => setTimeout(resolve, 1000 / fps));
      }

      mediaRecorder.stop();
    } catch (error) {
      console.error('Video generation error:', error);
      setIsGenerating(false);
    }
  }, [images, settings, totalDuration, drawFrame]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-4xl mx-4 bg-white dark:bg-stone-900 rounded-3xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Gradient top bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500" />

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-stone-200 dark:border-stone-700 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 flex items-center justify-center shadow-lg">
                <Film size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-stone-900 dark:text-white">
                  Create Quote Reel
                </h2>
                <p className="text-sm text-stone-500 dark:text-stone-400">
                  {images.length} images • {totalDuration.toFixed(1)}s video
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center hover:bg-stone-200 dark:hover:bg-stone-700 transition-all"
            >
              <X size={20} className="text-stone-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Image Selector */}
            <div className="space-y-4">
              {/* Image Grid */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ImageIcon size={16} className="text-orange-500" />
                    <span className="text-sm font-semibold text-stone-700 dark:text-stone-300">
                      Background Images ({images.length})
                    </span>
                  </div>
                  {images.length > 0 && (
                    <button
                      onClick={() => setImages([])}
                      className="text-xs text-red-500 hover:text-red-600 font-medium"
                    >
                      Clear All
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-[200px] overflow-y-auto custom-scrollbar p-1">
                  {/* Add Button - Always first */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={images.length >= MAX_IMAGES}
                    className="aspect-[9/16] rounded-xl border-2 border-dashed border-stone-300 dark:border-stone-600 flex flex-col items-center justify-center hover:border-orange-400 hover:bg-orange-50/50 dark:hover:bg-orange-950/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus size={20} className="text-stone-400" />
                    <span className="text-[10px] text-stone-400 mt-1">Add</span>
                  </button>
                  
                  {/* Uploaded Images */}
                  {images.map((img, index) => (
                    <div key={index} className="aspect-[9/16] relative">
                      <div className="relative w-full h-full rounded-xl overflow-hidden group">
                        <Image
                          src={img}
                          alt={`Image ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                        {/* Order badge */}
                        <div className="absolute top-1 left-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center">
                          <span className="text-white text-xs font-bold">{index + 1}</span>
                        </div>
                        {/* Actions on hover */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                          {index > 0 && (
                            <button
                              onClick={() => moveImage(index, 'left')}
                              className="w-6 h-6 rounded-full bg-white/90 flex items-center justify-center"
                            >
                              <ChevronLeft size={14} className="text-stone-800" />
                            </button>
                          )}
                          <button
                            onClick={() => removeImage(index)}
                            className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center"
                          >
                            <Trash2 size={12} className="text-white" />
                          </button>
                          {index < images.length - 1 && (
                            <button
                              onClick={() => moveImage(index, 'right')}
                              className="w-6 h-6 rounded-full bg-white/90 flex items-center justify-center"
                            >
                              <ChevronRight size={14} className="text-stone-800" />
                            </button>
                          )}
                        </div>
                        {/* Current indicator */}
                        {currentImageIndex === index && isPlaying && (
                          <div className="absolute inset-0 border-2 border-orange-500 rounded-xl pointer-events-none" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>

              {/* Settings */}
              <div className="space-y-4 pt-4 border-t border-stone-200 dark:border-stone-700">
                {/* Duration */}
                <div>
                  <label className="text-sm font-semibold text-stone-700 dark:text-stone-300 mb-2 block">
                    Duration per image
                  </label>
                  <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                    {DURATION_OPTIONS.map((d) => (
                      <button
                        key={d.value}
                        onClick={() => setSettings((s) => ({ ...s, duration: d.value }))}
                        className={`shrink-0 py-2 px-3 rounded-xl text-xs font-medium transition-all ${
                          settings.duration === d.value
                            ? 'bg-orange-500 text-white'
                            : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Transition */}
                <div>
                  <label className="text-sm font-semibold text-stone-700 dark:text-stone-300 mb-2 block">
                    Transition Effect
                  </label>
                  <div className="flex gap-2">
                    {TRANSITIONS.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setSettings((s) => ({ ...s, transition: t.id }))}
                        className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                          settings.transition === t.id
                            ? 'bg-orange-500 text-white'
                            : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                        }`}
                      >
                        <span>{t.icon}</span>
                        <span className="hidden sm:inline">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quality */}
                <div>
                  <label className="text-sm font-semibold text-stone-700 dark:text-stone-300 mb-2 block">
                    Video Quality
                  </label>
                  <div className="flex gap-2">
                    {Object.entries(QUALITY_OPTIONS).map(([key, value]) => (
                      <button
                        key={key}
                        onClick={() => setSettings((s) => ({ ...s, quality: key as '1080p' | '4k' }))}
                        className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all ${
                          settings.quality === key
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                            : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                        }`}
                      >
                        {value.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Preview */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={16} className="text-orange-500" />
                <span className="text-sm font-semibold text-stone-700 dark:text-stone-300">
                  Preview
                </span>
              </div>

              {/* Preview Card */}
              <div className="relative mx-auto w-full max-w-[240px] aspect-[9/16] rounded-2xl overflow-hidden shadow-2xl bg-stone-800">
                {images.length > 0 ? (
                  <>
                    {/* Background Image */}
                    <div 
                      className="absolute inset-0 transition-all duration-500"
                      style={{
                        backgroundImage: `url(${images[currentImageIndex]})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                    />
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/40" />
                    
                    {/* Quote Content */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                      <p className="text-white text-sm font-semibold leading-relaxed drop-shadow-lg">
                        &ldquo;{quote.text}&rdquo;
                      </p>
                      <p className="text-white/80 text-xs mt-3 drop-shadow">
                        — {quote.author}
                      </p>
                    </div>

                    {/* Progress Dots */}
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
                      {images.map((_, i) => (
                        <div
                          key={i}
                          className={`w-1.5 h-1.5 rounded-full transition-all ${
                            i === currentImageIndex
                              ? 'bg-white w-4'
                              : 'bg-white/50'
                          }`}
                        />
                      ))}
                    </div>

                    {/* Watermark */}
                    <div className="absolute bottom-8 left-0 right-0 text-center">
                      <span className="text-white/50 text-[10px]">QuoteSwipe</span>
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-stone-500">
                    <ImageIcon size={48} className="mb-2 opacity-50" />
                    <p className="text-sm">Add images to preview</p>
                  </div>
                )}
              </div>

              {/* Preview Controls */}
              {images.length > 0 && (
                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)}
                    className="w-10 h-10 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center hover:bg-stone-200 dark:hover:bg-stone-700 transition-all"
                  >
                    <ChevronLeft size={20} className="text-stone-600 dark:text-stone-400" />
                  </button>
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                      isPlaying
                        ? 'bg-orange-500 text-white'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                    }`}
                  >
                    {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
                  </button>
                  <button
                    onClick={() => setCurrentImageIndex((prev) => (prev + 1) % images.length)}
                    className="w-10 h-10 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center hover:bg-stone-200 dark:hover:bg-stone-700 transition-all"
                  >
                    <ChevronRight size={20} className="text-stone-600 dark:text-stone-400" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-stone-200 dark:border-stone-700 shrink-0 bg-stone-50 dark:bg-stone-800/50">
          {isGenerating ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-stone-600 dark:text-stone-400">
                  Generating {settings.quality} video...
                </span>
                <span className="font-semibold text-orange-500">{generationProgress}%</span>
              </div>
              <div className="h-2 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"
                  style={{ width: `${generationProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 px-4 bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 font-semibold rounded-xl hover:bg-stone-300 dark:hover:bg-stone-600 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={generateVideo}
                disabled={images.length < MIN_IMAGES}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-orange-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download size={18} />
                <span>Generate Reel</span>
              </button>
            </div>
          )}
          
          {images.length < MIN_IMAGES && (
            <p className="text-center text-xs text-stone-500 mt-2">
              Add at least {MIN_IMAGES} images to generate a reel
            </p>
          )}
        </div>

        {/* Hidden canvas for video generation */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}

