'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { X, Plus, Trash2, Play, Pause, Download, Loader2, Film, Image as ImageIcon, Sparkles, ChevronLeft, ChevronRight, Check, Type, AlignLeft, AlignCenter, AlignRight, Eye, EyeOff, Minus, MoveUp, MoveDown, MoveLeft, MoveRight, Bold, Italic, Underline, RotateCcw, Video, ImagePlus, AlertCircle } from 'lucide-react';
import Image from 'next/image';
import { FONT_STYLES, FontStyle } from '@/lib/constants';

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
  quote?: Quote | null; // Make quote optional for "without quote" mode
}

type TransitionType = 'default' | 'fade' | 'slide' | 'zoom' | 'none';
type TextAlignment = 'left' | 'center' | 'right';
type TextPosition = 'top' | 'center' | 'bottom';
type ReelMode = 'images' | 'video';

interface TextSettings {
  showQuote: boolean;
  alignment: TextAlignment;
  position: TextPosition;
  fontSize: number; // percentage multiplier (100 = default)
  fontFamily: string;
  textColor: string;
  shadowEnabled: boolean;
  // Fine position control (percentage offset from base position)
  offsetX: number; // -50 to 50 (percentage)
  offsetY: number; // -50 to 50 (percentage)
  // Text formatting
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
}

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
const MAX_VIDEO_DURATION = 30; // Maximum video duration in seconds
const MAX_VIDEO_SIZE_MB = 100; // Maximum video file size in MB
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

// Text color options
const TEXT_COLORS = [
  { id: 'white', color: '#ffffff', label: 'White' },
  { id: 'cream', color: '#fef3c7', label: 'Cream' },
  { id: 'gold', color: '#fbbf24', label: 'Gold' },
  { id: 'pink', color: '#f9a8d4', label: 'Pink' },
  { id: 'cyan', color: '#67e8f9', label: 'Cyan' },
  { id: 'lime', color: '#bef264', label: 'Lime' },
  { id: 'black', color: '#1f2937', label: 'Black' },
];

// Default text settings
const DEFAULT_TEXT_SETTINGS: TextSettings = {
  showQuote: true,
  alignment: 'center',
  position: 'center',
  fontSize: 100,
  fontFamily: 'Georgia',
  textColor: '#ffffff',
  shadowEnabled: true,
  offsetX: 0,
  offsetY: 0,
  isBold: false,
  isItalic: false,
  isUnderline: false,
};

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
  const [textSettings, setTextSettings] = useState<TextSettings>(DEFAULT_TEXT_SETTINGS);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [previewKey, setPreviewKey] = useState(0);
  const [showTextSettings, setShowTextSettings] = useState(false);
  // Custom quote text for when creating reel without pre-defined quote
  const [customQuoteText, setCustomQuoteText] = useState('');
  
  // Video mode state
  const [reelMode, setReelMode] = useState<ReelMode>('images');
  const [uploadedVideo, setUploadedVideo] = useState<string | null>(null);
  const [uploadedVideoFile, setUploadedVideoFile] = useState<File | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
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
      setTextSettings({
        ...DEFAULT_TEXT_SETTINGS,
        showQuote: true, // Always allow showing quote
      });
      setShowTextSettings(false);
      setCustomQuoteText(quote?.text || '');
      // Reset video state
      setReelMode('images');
      setUploadedVideo(null);
      setUploadedVideoFile(null);
      setVideoDuration(0);
      setVideoError(null);
      setIsVideoPlaying(false);
    }
  }, [isOpen, quote]);

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

  // Handle video upload
  const handleVideoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setVideoError(null);
    setIsVideoPlaying(false);

    // Check file size (max 100MB)
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > MAX_VIDEO_SIZE_MB) {
      setVideoError(`Video must be less than ${MAX_VIDEO_SIZE_MB}MB. Your file is ${fileSizeMB.toFixed(1)}MB.`);
      return;
    }

    // Check file type
    if (!file.type.startsWith('video/')) {
      setVideoError('Please upload a valid video file.');
      return;
    }

    // Revoke previous video URL if exists
    if (uploadedVideo) {
      URL.revokeObjectURL(uploadedVideo);
    }

    // Create object URL for preview
    const videoUrl = URL.createObjectURL(file);
    
    // Create a temporary video element to check duration
    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    
    tempVideo.onloadedmetadata = () => {
      if (tempVideo.duration > MAX_VIDEO_DURATION) {
        setVideoError(`Video must be ${MAX_VIDEO_DURATION} seconds or less. Your video is ${tempVideo.duration.toFixed(1)} seconds.`);
        URL.revokeObjectURL(videoUrl);
        setUploadedVideo(null);
        setUploadedVideoFile(null);
        return;
      }
      
      setVideoDuration(tempVideo.duration);
      setUploadedVideo(videoUrl);
      setUploadedVideoFile(file);
      setVideoError(null);
    };
    
    tempVideo.onerror = () => {
      setVideoError('Failed to load video. Please try a different file.');
      URL.revokeObjectURL(videoUrl);
      setUploadedVideo(null);
      setUploadedVideoFile(null);
    };
    
    tempVideo.src = videoUrl;

    // Reset input
    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }
  }, [uploadedVideo]);

  // Remove uploaded video
  const removeVideo = useCallback(() => {
    if (uploadedVideo) {
      URL.revokeObjectURL(uploadedVideo);
    }
    setUploadedVideo(null);
    setUploadedVideoFile(null);
    setVideoDuration(0);
    setVideoError(null);
    setIsVideoPlaying(false);
  }, [uploadedVideo]);

  // Toggle video playback
  const toggleVideoPlayback = useCallback(() => {
    const video = videoPreviewRef.current;
    if (!video || !uploadedVideo) return;
    
    if (isVideoPlaying) {
      video.pause();
    } else {
      // Make sure video is ready to play
      if (video.readyState >= 2) { // HAVE_CURRENT_DATA or higher
        video.play().catch((error) => {
          console.error('Video playback error:', error);
          setVideoError('Failed to play video. Try a different format (MP4 recommended).');
        });
      } else {
        // Wait for video to be ready
        const handleCanPlay = () => {
          video.play().catch((error) => {
            console.error('Video playback error:', error);
            setVideoError('Failed to play video. Try a different format (MP4 recommended).');
          });
          video.removeEventListener('canplay', handleCanPlay);
        };
        video.addEventListener('canplay', handleCanPlay);
        video.load(); // Trigger loading
      }
    }
  }, [isVideoPlaying, uploadedVideo]);

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

    // Get the actual quote text to display (from prop or custom input)
    const displayQuoteText = customQuoteText.trim();
    
    // Draw overlay gradient and text (only if showing text and have content)
    if (textSettings.showQuote && displayQuoteText) {
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, 'rgba(0,0,0,0.3)');
      gradient.addColorStop(0.4, 'rgba(0,0,0,0.1)');
      gradient.addColorStop(0.6, 'rgba(0,0,0,0.1)');
      gradient.addColorStop(1, 'rgba(0,0,0,0.4)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Calculate base text position based on settings
      let baseTextY: number;
      switch (textSettings.position) {
        case 'top':
          baseTextY = height * 0.25;
          break;
        case 'bottom':
          baseTextY = height * 0.70;
          break;
        default: // center
          baseTextY = height * 0.45;
      }

      // Set text alignment and base X position
      let baseTextX: number;
      switch (textSettings.alignment) {
        case 'left':
          ctx.textAlign = 'left';
          baseTextX = width * 0.08;
          break;
        case 'right':
          ctx.textAlign = 'right';
          baseTextX = width * 0.92;
          break;
        default: // center
          ctx.textAlign = 'center';
          baseTextX = width / 2;
      }
      
      // Apply fine position offsets
      const textX = baseTextX + (textSettings.offsetX / 100) * width;
      const textY = baseTextY + (textSettings.offsetY / 100) * height;
      
      ctx.textBaseline = 'middle';

      // Build font string with formatting
      const baseFontSize = Math.floor(width * 0.045);
      const fontSize = Math.floor(baseFontSize * (textSettings.fontSize / 100));
      const fontWeight = textSettings.isBold ? '700' : '600';
      const fontStyle = textSettings.isItalic ? 'italic' : 'normal';
      ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px "${textSettings.fontFamily}", serif`;
      ctx.fillStyle = textSettings.textColor;
      
      if (textSettings.shadowEnabled) {
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
      }
      
      const maxTextWidth = width * 0.85;
      const lineHeight = fontSize * 1.5;
      
      const linesDrawn = wrapText(ctx, displayQuoteText, textX, textY, maxTextWidth, lineHeight);
      
      // Draw underline if enabled
      if (textSettings.isUnderline && linesDrawn > 0) {
        ctx.save();
        ctx.strokeStyle = textSettings.textColor;
        ctx.lineWidth = Math.max(2, fontSize * 0.05);
        const underlineY = textY + (linesDrawn * lineHeight / 2) + fontSize * 0.2;
        const underlineWidth = Math.min(maxTextWidth, ctx.measureText(displayQuoteText).width);
        let underlineX = textX;
        if (textSettings.alignment === 'center') {
          underlineX = textX - underlineWidth / 2;
        } else if (textSettings.alignment === 'right') {
          underlineX = textX - underlineWidth;
        }
        ctx.beginPath();
        ctx.moveTo(underlineX, underlineY);
        ctx.lineTo(underlineX + underlineWidth, underlineY);
        ctx.stroke();
        ctx.restore();
      }
      
      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }

    // Logo/Watermark - Bottom Right with logo.svg
    const logoSize = Math.floor(width * 0.045); // Logo icon size
    const logoFontSize = Math.floor(width * 0.022);
    const paddingX = width * 0.03; // Padding from right edge
    const paddingY = height * 0.025; // Padding from bottom edge
    const pillPadding = logoSize * 0.3;
    const pillHeight = logoSize + pillPadding * 2;
    const textWidth = ctx.measureText('QuoteSwipe').width + logoFontSize * 0.5;
    const pillWidth = logoSize + textWidth + pillPadding * 3;
    
    const pillX = width - paddingX - pillWidth;
    const pillY = height - paddingY - pillHeight;
    
    // Draw semi-transparent pill background
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillWidth, pillHeight, pillHeight / 2);
    ctx.fill();
    
    // Draw logo image
    try {
      const logoImg = await loadImage('/logo.svg');
      const logoX = pillX + pillPadding;
      const logoY = pillY + pillPadding;
      ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
    } catch (e) {
      // Fallback: draw a simple circle if logo fails to load
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath();
      ctx.arc(pillX + pillPadding + logoSize / 2, pillY + pillHeight / 2, logoSize / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Draw "QuoteSwipe" text
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 2;
    ctx.font = `600 ${logoFontSize}px "Arial", sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('QuoteSwipe', pillX + pillPadding * 2 + logoSize, pillY + pillHeight / 2);
    
    // Reset
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }, [images, settings.transition, textSettings, customQuoteText]);

  // Generate video from uploaded video with text overlay
  const generateVideoFromUpload = useCallback(async () => {
    if (!uploadedVideo || !uploadedVideoFile) return;

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
      // Create video element for source
      const sourceVideo = document.createElement('video');
      sourceVideo.src = uploadedVideo;
      sourceVideo.muted = true;
      sourceVideo.playsInline = true;
      
      await new Promise<void>((resolve, reject) => {
        sourceVideo.onloadeddata = () => resolve();
        sourceVideo.onerror = () => reject(new Error('Failed to load video'));
        sourceVideo.load();
      });

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
        a.download = `quote-video-${settings.quality}-${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setIsGenerating(false);
        setGenerationProgress(100);
      };

      mediaRecorder.start();

      // Play and render frames
      sourceVideo.currentTime = 0;
      await sourceVideo.play();

      const fps = 30;
      const totalFrames = Math.ceil(videoDuration * fps);
      
      const renderFrame = async (frameNumber: number) => {
        if (frameNumber >= totalFrames || sourceVideo.ended) {
          mediaRecorder.stop();
          return;
        }

        // Draw video frame
        const videoWidth = sourceVideo.videoWidth;
        const videoHeight = sourceVideo.videoHeight;
        const videoRatio = videoWidth / videoHeight;
        const canvasRatio = quality.width / quality.height;
        
        let drawWidth, drawHeight, drawX, drawY;
        if (videoRatio > canvasRatio) {
          drawHeight = quality.height;
          drawWidth = quality.height * videoRatio;
          drawX = (quality.width - drawWidth) / 2;
          drawY = 0;
        } else {
          drawWidth = quality.width;
          drawHeight = quality.width / videoRatio;
          drawX = 0;
          drawY = (quality.height - drawHeight) / 2;
        }

        ctx.clearRect(0, 0, quality.width, quality.height);
        ctx.drawImage(sourceVideo, drawX, drawY, drawWidth, drawHeight);

        // Draw text overlay
        const displayQuoteText = customQuoteText.trim();
        if (textSettings.showQuote && displayQuoteText) {
          // Draw overlay gradient
          const gradient = ctx.createLinearGradient(0, 0, 0, quality.height);
          gradient.addColorStop(0, 'rgba(0,0,0,0.3)');
          gradient.addColorStop(0.4, 'rgba(0,0,0,0.1)');
          gradient.addColorStop(0.6, 'rgba(0,0,0,0.1)');
          gradient.addColorStop(1, 'rgba(0,0,0,0.4)');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, quality.width, quality.height);

          // Calculate text position
          let baseTextY: number;
          switch (textSettings.position) {
            case 'top': baseTextY = quality.height * 0.25; break;
            case 'bottom': baseTextY = quality.height * 0.70; break;
            default: baseTextY = quality.height * 0.45;
          }

          let baseTextX: number;
          switch (textSettings.alignment) {
            case 'left':
              ctx.textAlign = 'left';
              baseTextX = quality.width * 0.08;
              break;
            case 'right':
              ctx.textAlign = 'right';
              baseTextX = quality.width * 0.92;
              break;
            default:
              ctx.textAlign = 'center';
              baseTextX = quality.width / 2;
          }

          const textX = baseTextX + (textSettings.offsetX / 100) * quality.width;
          const textY = baseTextY + (textSettings.offsetY / 100) * quality.height;
          ctx.textBaseline = 'middle';

          const baseFontSize = Math.floor(quality.width * 0.045);
          const fontSize = Math.floor(baseFontSize * (textSettings.fontSize / 100));
          const fontWeight = textSettings.isBold ? '700' : '600';
          const fontStyle = textSettings.isItalic ? 'italic' : 'normal';
          ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px "${textSettings.fontFamily}", serif`;
          ctx.fillStyle = textSettings.textColor;

          if (textSettings.shadowEnabled) {
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
          }

          const maxTextWidth = quality.width * 0.85;
          const lineHeight = fontSize * 1.5;
          wrapText(ctx, displayQuoteText, textX, textY, maxTextWidth, lineHeight);

          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
        }

        // Draw logo
        const logoSize = Math.floor(quality.width * 0.045);
        const logoFontSize = Math.floor(quality.width * 0.022);
        const paddingX = quality.width * 0.03;
        const paddingY = quality.height * 0.025;
        const pillPadding = logoSize * 0.3;
        const pillHeight = logoSize + pillPadding * 2;
        const textWidthLogo = ctx.measureText('QuoteSwipe').width + logoFontSize * 0.5;
        const pillWidth = logoSize + textWidthLogo + pillPadding * 3;
        const pillX = quality.width - paddingX - pillWidth;
        const pillY = quality.height - paddingY - pillHeight;

        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.roundRect(pillX, pillY, pillWidth, pillHeight, pillHeight / 2);
        ctx.fill();

        try {
          const logoImg = await loadImage('/logo.svg');
          ctx.drawImage(logoImg, pillX + pillPadding, pillY + pillPadding, logoSize, logoSize);
        } catch (e) {
          ctx.fillStyle = 'rgba(255,255,255,0.8)';
          ctx.beginPath();
          ctx.arc(pillX + pillPadding + logoSize / 2, pillY + pillHeight / 2, logoSize / 2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 2;
        ctx.font = `600 ${logoFontSize}px "Arial", sans-serif`;
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('QuoteSwipe', pillX + pillPadding * 2 + logoSize, pillY + pillHeight / 2);
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        setGenerationProgress(Math.floor((frameNumber / totalFrames) * 100));

        // Wait for next frame
        await new Promise((resolve) => setTimeout(resolve, 1000 / fps));
        requestAnimationFrame(() => renderFrame(frameNumber + 1));
      };

      await renderFrame(0);

    } catch (error) {
      console.error('Video generation error:', error);
      setIsGenerating(false);
      setVideoError('Failed to generate video. Please try again.');
    }
  }, [uploadedVideo, uploadedVideoFile, videoDuration, settings, textSettings, customQuoteText]);

  // Generate video from images
  const generateVideo = useCallback(async () => {
    if (reelMode === 'video') {
      return generateVideoFromUpload();
    }
    
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
  }, [reelMode, images, settings, totalDuration, drawFrame, generateVideoFromUpload]);

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
                  Create {textSettings.showQuote && customQuoteText.trim() ? 'Quote ' : ''}Reel
                </h2>
                <p className="text-sm text-stone-500 dark:text-stone-400">
                  {reelMode === 'images' 
                    ? `${images.length} images • ${totalDuration.toFixed(1)}s video`
                    : uploadedVideo 
                      ? `Video • ${videoDuration.toFixed(1)}s`
                      : 'No video uploaded'
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Toggle Quote Mode */}
              <button
                onClick={() => setTextSettings(s => ({ ...s, showQuote: !s.showQuote }))}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  textSettings.showQuote
                    ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400'
                }`}
                title={textSettings.showQuote ? 'Click to hide quote' : 'Click to show quote'}
              >
                {textSettings.showQuote ? <Eye size={16} /> : <EyeOff size={16} />}
                <span className="hidden sm:inline">{textSettings.showQuote ? 'With Text' : 'No Text'}</span>
              </button>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center hover:bg-stone-200 dark:hover:bg-stone-700 transition-all"
              >
                <X size={20} className="text-stone-500" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Mode Selector, Image/Video Upload & Quote Text */}
            <div className="space-y-4">
              {/* Mode Selector Tabs */}
              <div className="flex rounded-xl bg-stone-100 dark:bg-stone-800 p-1">
                <button
                  onClick={() => setReelMode('images')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    reelMode === 'images'
                      ? 'bg-white dark:bg-stone-700 text-orange-600 dark:text-orange-400 shadow-sm'
                      : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
                  }`}
                >
                  <ImagePlus size={16} />
                  <span>Images</span>
                </button>
                <button
                  onClick={() => setReelMode('video')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    reelMode === 'video'
                      ? 'bg-white dark:bg-stone-700 text-purple-600 dark:text-purple-400 shadow-sm'
                      : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
                  }`}
                >
                  <Video size={16} />
                  <span>Video</span>
                </button>
              </div>

              {/* Quote Text Input */}
              {textSettings.showQuote && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Type size={16} className="text-orange-500" />
                    <span className="text-sm font-semibold text-stone-700 dark:text-stone-300">
                      Quote Text
                    </span>
                    {!customQuoteText.trim() && (
                      <span className="text-xs text-stone-400">(optional)</span>
                    )}
                  </div>
                  <textarea
                    value={customQuoteText}
                    onChange={(e) => setCustomQuoteText(e.target.value)}
                    placeholder={`Enter your quote text here... (leave empty for ${reelMode === 'images' ? 'image' : 'video'}-only reel)`}
                    className="w-full h-24 px-4 py-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-stone-500 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all"
                  />
                </div>
              )}

              {/* Video Upload Section */}
              {reelMode === 'video' && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Video size={16} className="text-purple-500" />
                      <span className="text-sm font-semibold text-stone-700 dark:text-stone-300">
                        Upload Video
                      </span>
                      <span className="text-xs text-stone-400">(max {MAX_VIDEO_DURATION}s)</span>
                    </div>
                    {uploadedVideo && (
                      <button
                        onClick={removeVideo}
                        className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
                      >
                        <Trash2 size={12} />
                        Remove
                      </button>
                    )}
                  </div>

                  {/* Video Error */}
                  {videoError && (
                    <div className="mb-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-2">
                      <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-red-600 dark:text-red-400">{videoError}</p>
                    </div>
                  )}

                  {/* Video Upload Area */}
                  {!uploadedVideo ? (
                    <label className="flex flex-col items-center justify-center w-full h-40 rounded-xl border-2 border-dashed border-stone-300 dark:border-stone-600 hover:border-purple-400 dark:hover:border-purple-500 bg-stone-50 dark:bg-stone-800/50 cursor-pointer transition-all group">
                      <div className="flex flex-col items-center justify-center p-4 text-center">
                        <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                          <Video size={24} className="text-purple-500" />
                        </div>
                        <p className="text-sm font-medium text-stone-600 dark:text-stone-300 mb-1">
                          Click to upload video
                        </p>
                        <p className="text-xs text-stone-400">
                          MP4, MOV, WebM • Max {MAX_VIDEO_DURATION}s • Max {MAX_VIDEO_SIZE_MB}MB
                        </p>
                      </div>
                      <input
                        ref={videoInputRef}
                        type="file"
                        accept="video/*"
                        onChange={handleVideoUpload}
                        className="hidden"
                      />
                    </label>
                  ) : (
                    <div className="relative rounded-xl overflow-hidden bg-black aspect-[9/16] max-h-[300px]">
                      <video
                        ref={videoPreviewRef}
                        key={uploadedVideo} // Force re-render when URL changes
                        className="w-full h-full object-contain"
                        loop
                        playsInline
                        muted
                        preload="auto"
                        onEnded={() => setIsVideoPlaying(false)}
                        onPause={() => setIsVideoPlaying(false)}
                        onPlay={() => setIsVideoPlaying(true)}
                        onError={(e) => {
                          console.error('Video element error:', e);
                          setVideoError('Failed to load video. Please try a different format (MP4, WebM).');
                        }}
                      >
                        <source src={uploadedVideo || ''} type={uploadedVideoFile?.type || 'video/mp4'} />
                        Your browser does not support the video tag.
                      </video>
                      {/* Play/Pause overlay */}
                      <button
                        onClick={toggleVideoPlayback}
                        className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-all"
                      >
                        <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                          {isVideoPlaying ? (
                            <Pause size={24} className="text-stone-700" />
                          ) : (
                            <Play size={24} className="text-stone-700 ml-1" />
                          )}
                        </div>
                      </button>
                      {/* Duration badge */}
                      <div className="absolute bottom-2 right-2 px-2 py-1 rounded-lg bg-black/70 text-white text-xs font-medium">
                        {videoDuration.toFixed(1)}s
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Image Grid - Only show in images mode */}
              {reelMode === 'images' && (
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
              )}

              {/* Settings - For Images Mode */}
              {reelMode === 'images' && (
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
              </div>
              )}

              {/* Common Settings - Quality & Text */}
              <div className="space-y-4 pt-4 border-t border-stone-200 dark:border-stone-700">
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

                {/* Text Settings - Show when text mode is enabled */}
                {textSettings.showQuote && (
                  <div className="pt-4 border-t border-stone-200 dark:border-stone-700">
                    <button
                      onClick={() => setShowTextSettings(!showTextSettings)}
                      className="flex items-center justify-between w-full text-sm font-semibold text-stone-700 dark:text-stone-300 mb-3"
                    >
                      <div className="flex items-center gap-2">
                        <Type size={16} className="text-orange-500" />
                        <span>Text Settings</span>
                      </div>
                      <ChevronRight 
                        size={16} 
                        className={`transition-transform ${showTextSettings ? 'rotate-90' : ''}`} 
                      />
                    </button>

                    {showTextSettings && (
                      <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
                        {/* Text Formatting - Bold, Italic, Underline */}
                        <div>
                          <label className="text-xs text-stone-600 dark:text-stone-400 mb-2 block">Text Style</label>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => setTextSettings(s => ({ ...s, isBold: !s.isBold }))}
                              className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center ${
                                textSettings.isBold
                                  ? 'bg-orange-500 text-white'
                                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                              }`}
                              title="Bold"
                            >
                              <Bold size={14} />
                            </button>
                            <button
                              onClick={() => setTextSettings(s => ({ ...s, isItalic: !s.isItalic }))}
                              className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center ${
                                textSettings.isItalic
                                  ? 'bg-orange-500 text-white'
                                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                              }`}
                              title="Italic"
                            >
                              <Italic size={14} />
                            </button>
                            <button
                              onClick={() => setTextSettings(s => ({ ...s, isUnderline: !s.isUnderline }))}
                              className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center ${
                                textSettings.isUnderline
                                  ? 'bg-orange-500 text-white'
                                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                              }`}
                              title="Underline"
                            >
                              <Underline size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Text Position (Preset) */}
                        <div>
                          <label className="text-xs text-stone-600 dark:text-stone-400 mb-2 block">Position</label>
                          <div className="flex gap-1.5">
                            {(['top', 'center', 'bottom'] as TextPosition[]).map(pos => (
                              <button
                                key={pos}
                                onClick={() => setTextSettings(s => ({ ...s, position: pos }))}
                                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all capitalize ${
                                  textSettings.position === pos
                                    ? 'bg-orange-500 text-white'
                                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                                }`}
                              >
                                {pos}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Fine Position Control */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-xs text-stone-600 dark:text-stone-400">Fine Position</label>
                            <button
                              onClick={() => setTextSettings(s => ({ ...s, offsetX: 0, offsetY: 0 }))}
                              className="text-xs text-orange-500 hover:text-orange-600 flex items-center gap-1"
                              title="Reset position"
                            >
                              <RotateCcw size={10} />
                              Reset
                            </button>
                          </div>
                          <div className="grid grid-cols-3 gap-1 w-24 mx-auto">
                            {/* Row 1: Up */}
                            <div />
                            <button
                              onClick={() => setTextSettings(s => ({ ...s, offsetY: Math.max(-50, s.offsetY - 5) }))}
                              className="w-7 h-7 rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-600 dark:text-stone-400 hover:bg-orange-100 dark:hover:bg-orange-900/30 hover:text-orange-500 transition-all active:scale-95"
                              title="Move Up"
                            >
                              <MoveUp size={12} />
                            </button>
                            <div />
                            {/* Row 2: Left, indicator, Right */}
                            <button
                              onClick={() => setTextSettings(s => ({ ...s, offsetX: Math.max(-50, s.offsetX - 5) }))}
                              className="w-7 h-7 rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-600 dark:text-stone-400 hover:bg-orange-100 dark:hover:bg-orange-900/30 hover:text-orange-500 transition-all active:scale-95"
                              title="Move Left"
                            >
                              <MoveLeft size={12} />
                            </button>
                            <div className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-[8px] text-orange-600 dark:text-orange-400 font-medium">
                              {textSettings.offsetX},{textSettings.offsetY}
                            </div>
                            <button
                              onClick={() => setTextSettings(s => ({ ...s, offsetX: Math.min(50, s.offsetX + 5) }))}
                              className="w-7 h-7 rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-600 dark:text-stone-400 hover:bg-orange-100 dark:hover:bg-orange-900/30 hover:text-orange-500 transition-all active:scale-95"
                              title="Move Right"
                            >
                              <MoveRight size={12} />
                            </button>
                            {/* Row 3: Down */}
                            <div />
                            <button
                              onClick={() => setTextSettings(s => ({ ...s, offsetY: Math.min(50, s.offsetY + 5) }))}
                              className="w-7 h-7 rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-600 dark:text-stone-400 hover:bg-orange-100 dark:hover:bg-orange-900/30 hover:text-orange-500 transition-all active:scale-95"
                              title="Move Down"
                            >
                              <MoveDown size={12} />
                            </button>
                            <div />
                          </div>
                        </div>

                        {/* Text Alignment */}
                        <div>
                          <label className="text-xs text-stone-600 dark:text-stone-400 mb-2 block">Alignment</label>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => setTextSettings(s => ({ ...s, alignment: 'left' }))}
                              className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center ${
                                textSettings.alignment === 'left'
                                  ? 'bg-orange-500 text-white'
                                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                              }`}
                            >
                              <AlignLeft size={14} />
                            </button>
                            <button
                              onClick={() => setTextSettings(s => ({ ...s, alignment: 'center' }))}
                              className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center ${
                                textSettings.alignment === 'center'
                                  ? 'bg-orange-500 text-white'
                                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                              }`}
                            >
                              <AlignCenter size={14} />
                            </button>
                            <button
                              onClick={() => setTextSettings(s => ({ ...s, alignment: 'right' }))}
                              className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center ${
                                textSettings.alignment === 'right'
                                  ? 'bg-orange-500 text-white'
                                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                              }`}
                            >
                              <AlignRight size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Font Size */}
                        <div>
                          <label className="text-xs text-stone-600 dark:text-stone-400 mb-2 block">
                            Font Size: {textSettings.fontSize}%
                          </label>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setTextSettings(s => ({ ...s, fontSize: Math.max(50, s.fontSize - 10) }))}
                              className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700"
                            >
                              <Minus size={14} />
                            </button>
                            <input
                              type="range"
                              min="50"
                              max="150"
                              value={textSettings.fontSize}
                              onChange={(e) => setTextSettings(s => ({ ...s, fontSize: Number(e.target.value) }))}
                              className="flex-1 h-2 bg-stone-200 dark:bg-stone-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-orange-500"
                            />
                            <button
                              onClick={() => setTextSettings(s => ({ ...s, fontSize: Math.min(150, s.fontSize + 10) }))}
                              className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Font Family */}
                        <div>
                          <label className="text-xs text-stone-600 dark:text-stone-400 mb-2 block">Font Style</label>
                          <div className="grid grid-cols-3 gap-1.5">
                            {FONT_STYLES.slice(0, 6).map((font: FontStyle) => (
                              <button
                                key={font.id}
                                onClick={() => setTextSettings(s => ({ ...s, fontFamily: font.fontFamily }))}
                                className={`py-1.5 px-2 rounded-lg text-xs transition-all ${
                                  textSettings.fontFamily === font.fontFamily
                                    ? 'bg-orange-500 text-white'
                                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                                }`}
                                style={{ fontFamily: font.fontFamily }}
                              >
                                {font.name}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Text Color */}
                        <div>
                          <label className="text-xs text-stone-600 dark:text-stone-400 mb-2 block">Text Color</label>
                          <div className="flex gap-2">
                            {TEXT_COLORS.map(c => (
                              <button
                                key={c.id}
                                onClick={() => setTextSettings(s => ({ ...s, textColor: c.color }))}
                                className={`w-8 h-8 rounded-full transition-all ${
                                  textSettings.textColor === c.color 
                                    ? 'ring-2 ring-orange-500 ring-offset-2 ring-offset-white dark:ring-offset-stone-900' 
                                    : ''
                                }`}
                                style={{ backgroundColor: c.color }}
                                title={c.label}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Text Shadow */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-stone-600 dark:text-stone-400">Text Shadow</span>
                          <button
                            onClick={() => setTextSettings(s => ({ ...s, shadowEnabled: !s.shadowEnabled }))}
                            className={`w-10 h-5 rounded-full transition-all ${
                              textSettings.shadowEnabled 
                                ? 'bg-orange-500' 
                                : 'bg-stone-300 dark:bg-stone-600'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform mx-0.5 ${
                              textSettings.shadowEnabled ? 'translate-x-5' : 'translate-x-0'
                            }`} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
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
                {/* Video Preview Mode */}
                {reelMode === 'video' && uploadedVideo ? (
                  <>
                    {/* Background Video */}
                    <video
                      src={uploadedVideo}
                      className="absolute inset-0 w-full h-full object-cover"
                      loop
                      playsInline
                      muted
                      autoPlay
                    />
                    {/* Overlay - Only show when text is visible */}
                    {textSettings.showQuote && customQuoteText.trim() && (
                      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/40" />
                    )}
                    
                    {/* Quote Content - Only show when enabled and has text */}
                    {textSettings.showQuote && customQuoteText.trim() && (
                      <div 
                        className={`absolute inset-0 flex flex-col p-6 ${
                          textSettings.position === 'top' ? 'justify-start pt-12' :
                          textSettings.position === 'bottom' ? 'justify-end pb-16' :
                          'justify-center'
                        } ${
                          textSettings.alignment === 'left' ? 'items-start text-left' :
                          textSettings.alignment === 'right' ? 'items-end text-right' :
                          'items-center text-center'
                        }`}
                        style={{
                          transform: `translate(${textSettings.offsetX}%, ${textSettings.offsetY}%)`,
                        }}
                      >
                        <p 
                          className="leading-relaxed"
                          style={{ 
                            color: textSettings.textColor,
                            fontFamily: textSettings.fontFamily,
                            fontSize: `${0.875 * (textSettings.fontSize / 100)}rem`,
                            fontWeight: textSettings.isBold ? 700 : 600,
                            fontStyle: textSettings.isItalic ? 'italic' : 'normal',
                            textDecoration: textSettings.isUnderline ? 'underline' : 'none',
                            textShadow: textSettings.shadowEnabled ? '2px 2px 4px rgba(0,0,0,0.5)' : 'none'
                          }}
                        >
                          {customQuoteText}
                        </p>
                      </div>
                    )}

                    {/* Logo Watermark - Bottom Right */}
                    <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full px-2 py-1">
                      <Image
                        src="/logo.svg"
                        alt="QuoteSwipe"
                        width={16}
                        height={16}
                        className="w-4 h-4"
                      />
                      <span className="text-white/90 text-[9px] font-semibold">QuoteSwipe</span>
                    </div>
                  </>
                ) : reelMode === 'images' && images.length > 0 ? (
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
                    {/* Overlay - Only show when text is visible */}
                    {textSettings.showQuote && customQuoteText.trim() && (
                      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/40" />
                    )}
                    
                    {/* Quote Content - Only show when enabled and has text */}
                    {textSettings.showQuote && customQuoteText.trim() && (
                      <div 
                        className={`absolute inset-0 flex flex-col p-6 ${
                          textSettings.position === 'top' ? 'justify-start pt-12' :
                          textSettings.position === 'bottom' ? 'justify-end pb-16' :
                          'justify-center'
                        } ${
                          textSettings.alignment === 'left' ? 'items-start text-left' :
                          textSettings.alignment === 'right' ? 'items-end text-right' :
                          'items-center text-center'
                        }`}
                        style={{
                          transform: `translate(${textSettings.offsetX}%, ${textSettings.offsetY}%)`,
                        }}
                      >
                        <p 
                          className="leading-relaxed"
                          style={{ 
                            color: textSettings.textColor,
                            fontFamily: textSettings.fontFamily,
                            fontSize: `${0.875 * (textSettings.fontSize / 100)}rem`,
                            fontWeight: textSettings.isBold ? 700 : 600,
                            fontStyle: textSettings.isItalic ? 'italic' : 'normal',
                            textDecoration: textSettings.isUnderline ? 'underline' : 'none',
                            textShadow: textSettings.shadowEnabled ? '2px 2px 4px rgba(0,0,0,0.5)' : 'none'
                          }}
                        >
                          {customQuoteText}
                        </p>
                      </div>
                    )}

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

                    {/* Logo Watermark - Bottom Right */}
                    <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full px-2 py-1">
                      <Image
                        src="/logo.svg"
                        alt="QuoteSwipe"
                        width={16}
                        height={16}
                        className="w-4 h-4"
                      />
                      <span className="text-white/90 text-[9px] font-semibold">QuoteSwipe</span>
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-stone-500">
                    {reelMode === 'video' ? (
                      <>
                        <Video size={48} className="mb-2 opacity-50" />
                        <p className="text-sm">Upload video to preview</p>
                      </>
                    ) : (
                      <>
                        <ImageIcon size={48} className="mb-2 opacity-50" />
                        <p className="text-sm">Add images to preview</p>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Preview Controls - Only for Images Mode */}
              {reelMode === 'images' && images.length > 0 && (
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
                disabled={reelMode === 'images' ? images.length < MIN_IMAGES : !uploadedVideo}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 font-semibold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  reelMode === 'video'
                    ? 'bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 text-white hover:shadow-purple-500/30'
                    : 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white hover:shadow-orange-500/30'
                }`}
              >
                <Download size={18} />
                <span>Generate {reelMode === 'video' ? 'Video' : 'Reel'}</span>
              </button>
            </div>
          )}
          
          {reelMode === 'images' && images.length < MIN_IMAGES && (
            <p className="text-center text-xs text-stone-500 mt-2">
              Add at least {MIN_IMAGES} images to generate a reel
            </p>
          )}
          {reelMode === 'video' && !uploadedVideo && (
            <p className="text-center text-xs text-stone-500 mt-2">
              Upload a video (max {MAX_VIDEO_DURATION}s) to add text overlay
            </p>
          )}
        </div>

        {/* Hidden canvas for video generation */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}

