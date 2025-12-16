'use client';

import { useState, useEffect } from 'react';
import { Instagram, MessageCircle, Download, Share2, Link2, Check, Copy, X, Sparkles, Image as ImageIcon } from 'lucide-react';
import { toPng } from 'html-to-image';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: {
    id: number | string;
    text: string;
    author: string;
    category: string;
    category_icon?: string;
    likes_count?: number;
    dislikes_count?: number;
    isUserQuote?: boolean;
    is_public?: number | boolean;
  };
  preGeneratedImage?: string | null;
}

export default function ShareModal({ isOpen, onClose, quote, preGeneratedImage }: ShareModalProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Check if this is a user quote and if it's public
  const isUserQuote = quote.isUserQuote || String(quote.id).startsWith('user_');
  const isPublicQuote = !isUserQuote || quote.is_public === 1 || quote.is_public === true;
  
  // Get the quote URL (only meaningful for public quotes)
  const getQuoteUrl = () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    // For user quotes, use the user quote path; for regular quotes, use the standard path
    if (isUserQuote) {
      const userQuoteId = String(quote.id).replace('user_', '');
      return `${baseUrl}/user-quote/${userQuoteId}`;
    }
    return `${baseUrl}/quote/${quote.id}`;
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setLinkCopied(false);
    
    // If pre-generated image is provided, use it directly
    if (preGeneratedImage) {
      setImageUrl(preGeneratedImage);
      setIsGenerating(false);
    } else {
      setImageUrl(null);
    setTimeout(() => generateImage(), 100);
    }
  }, [isOpen, quote.id, preGeneratedImage]);

  // Copy link to clipboard
  const handleCopyLink = async () => {
    const url = getQuoteUrl();
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const generateImage = async () => {
    setIsGenerating(true);
    
    try {
      // Find the actual QuoteCard element on screen
      const quoteCardElement = document.querySelector(`[data-quote-id="${quote.id}"][data-quote-card="true"]`) as HTMLElement;
      
      if (!quoteCardElement) {
        console.error('QuoteCard element not found');
        setIsGenerating(false);
        return;
      }

      // Wait for any animations to complete
      await new Promise(resolve => setTimeout(resolve, 300));

      // Store original styles
      const originalTransform = quoteCardElement.style.transform;
      const originalTransition = quoteCardElement.style.transition;
      
      // Reset transform for clean capture
      quoteCardElement.style.transform = 'none';
      quoteCardElement.style.transition = 'none';
      
      // Wait for style update
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Capture the QuoteCard with high resolution for Instagram
      // Use square corners for proper image sharing
      const dataUrl = await toPng(quoteCardElement, {
        quality: 1.0,
        pixelRatio: 3, // High resolution for sharp image
        cacheBust: true,
        width: quoteCardElement.offsetWidth,
        height: quoteCardElement.offsetHeight,
        style: {
          borderRadius: '0px', // Square corners for sharing
          overflow: 'hidden',
        },
      });

      // Restore original styles
      quoteCardElement.style.transform = originalTransform;
      quoteCardElement.style.transition = originalTransition;

      setImageUrl(dataUrl);
    } catch (error) {
      console.error('Error generating image:', error);
      
      // Fallback: try with lower settings
      try {
        const quoteCardElement = document.querySelector(`[data-quote-id="${quote.id}"][data-quote-card="true"]`) as HTMLElement;
        if (quoteCardElement) {
          const dataUrl = await toPng(quoteCardElement, {
            quality: 0.95,
            pixelRatio: 2,
            style: {
              borderRadius: '0px', // Square corners for sharing
              overflow: 'hidden',
            },
          });
          setImageUrl(dataUrl);
        }
      } catch (fallbackError) {
        console.error('Fallback image generation failed:', fallbackError);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!imageUrl) return;

    const link = document.createElement('a');
    const authorName = quote.author.replace(/\s+/g, '-').toLowerCase();
    const quoteIdStr = String(quote.id).replace('user_', 'my-');
    link.download = `quote-${quoteIdStr}-${authorName}.png`;
    link.href = imageUrl;
    link.click();
  };

  const handleInstagramShare = () => {
    if (!imageUrl) {
      generateImage().then(() => {
        setTimeout(() => handleInstagramShare(), 500);
      });
      return;
    }

    // Instagram doesn't support direct web sharing to Stories
    // Download the image first, then open Instagram
    handleDownload();
    
    // Open Instagram Stories creation page
    setTimeout(() => {
      const link = document.createElement('a');
      link.href = 'https://www.instagram.com/create/story/';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.click();
    }, 300);
  };

  const handleWhatsAppShare = () => {
    if (!imageUrl) {
      generateImage().then(() => {
        setTimeout(() => handleWhatsAppShare(), 500);
      });
      return;
    }

    // Download image first
    handleDownload();
    
    // Open WhatsApp with text (include URL only for public quotes)
    const shareUrl = isPublicQuote ? getQuoteUrl() : '';
    const text = isPublicQuote 
      ? `"${quote.text}" - ${quote.author}\n\n${shareUrl}`
      : `"${quote.text}" - ${quote.author}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    
    // Try native share API first (mobile)
    const quoteIdStr = String(quote.id).replace('user_', 'my-');
    if (navigator.share) {
      fetch(imageUrl)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], `quote-${quoteIdStr}.png`, { type: 'image/png' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            navigator.share({
              files: [file],
              title: 'Quote',
              text: `"${quote.text}" - ${quote.author}`,
            });
          } else {
            window.open(url, '_blank');
          }
        })
        .catch(() => {
          window.open(url, '_blank');
        });
    } else {
      window.open(url, '_blank');
    }
  };

  const handlePinterestShare = () => {
    if (!imageUrl) {
      generateImage().then(() => {
        setTimeout(() => handlePinterestShare(), 500);
      });
      return;
    }

    const description = `"${quote.text}" - ${quote.author}`;
    
    // Pinterest requires a URL, use current page for private quotes
    const shareUrl = isPublicQuote ? getQuoteUrl() : (typeof window !== 'undefined' ? window.location.origin : '');
    const url = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(shareUrl)}&media=${encodeURIComponent(imageUrl)}&description=${encodeURIComponent(description)}`;
    window.open(url, '_blank', 'width=750,height=600');
  };

  const handleGenericShare = () => {
    const quoteIdStr = String(quote.id).replace('user_', 'my-');
    const shareUrl = isPublicQuote ? getQuoteUrl() : '';
    
    if (navigator.share && imageUrl) {
      fetch(imageUrl)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], `quote-${quoteIdStr}.png`, { type: 'image/png' });
          if (navigator.canShare({ files: [file] })) {
            navigator.share({
              files: [file],
              title: 'Quote',
              text: `"${quote.text}" - ${quote.author}`,
            });
          } else if (isPublicQuote) {
            navigator.share({
              title: 'Quote',
              text: `"${quote.text}" - ${quote.author}`,
              url: shareUrl,
            });
          } else {
            // Private quote - just share text
            navigator.share({
              title: 'Quote',
              text: `"${quote.text}" - ${quote.author}`,
            });
          }
        })
        .catch(() => {
          if (isPublicQuote) {
            navigator.share({
              title: 'Quote',
              text: `"${quote.text}" - ${quote.author}`,
              url: shareUrl,
            });
          } else {
            navigator.share({
              title: 'Quote',
              text: `"${quote.text}" - ${quote.author}`,
            });
          }
        });
    } else if (isPublicQuote) {
      // Copy link to clipboard for public quotes
      navigator.clipboard.writeText(shareUrl).then(() => {
        alert('Link copied to clipboard!');
      });
    } else {
      // For private quotes, copy quote text
      const quoteText = `"${quote.text}" - ${quote.author}`;
      navigator.clipboard.writeText(quoteText).then(() => {
        alert('Quote copied to clipboard!');
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full sm:max-w-md mx-0 sm:mx-4 bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="relative px-4 pt-4 pb-3 sm:px-6 sm:pt-5 sm:pb-4 border-b border-gray-100 dark:border-gray-800">
          {/* Drag indicator (mobile) */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full sm:hidden" />
          
          <div className="flex items-center justify-between mt-2 sm:mt-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                <Share2 size={16} className="sm:w-5 sm:h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Share Quote</h2>
                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Choose your platform</p>
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
        <div className="px-4 py-4 sm:px-6 sm:py-5 overflow-y-auto max-h-[calc(90vh-80px)]">
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center py-8 sm:py-12">
              <div className="relative">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-3 border-blue-200 dark:border-blue-900 border-t-blue-500 animate-spin" />
                <Sparkles size={16} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-500 animate-pulse" />
              </div>
              <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">Creating your image...</p>
            </div>
          ) : (
            <>
              {/* Preview Card */}
              {imageUrl && (
                <div className="mb-4 sm:mb-5 p-3 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850 rounded-2xl">
                  <div className="flex items-center gap-2 mb-2">
                    <ImageIcon size={12} className="text-gray-400" />
                    <span className="text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400">Preview</span>
                  </div>
                  <div className="flex justify-center">
                    <div className="relative w-28 sm:w-36 aspect-[4/5] rounded-xl overflow-hidden shadow-lg ring-1 ring-gray-200 dark:ring-gray-700">
                      <img
                        src={imageUrl}
                        alt="Quote preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Copy Link - Only for public quotes */}
              {isPublicQuote ? (
                <div className="mb-4 sm:mb-5">
                  <div className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl">
                    <Link2 size={14} className="flex-shrink-0 text-gray-400" />
                    <span className="flex-1 text-xs sm:text-sm text-gray-600 dark:text-gray-300 truncate font-mono">
                      {getQuoteUrl()}
                    </span>
                    <button
                      onClick={handleCopyLink}
                      className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all active:scale-95 ${
                        linkCopied 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100'
                      }`}
                    >
                      {linkCopied ? (
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
              ) : (
                <div className="mb-4 sm:mb-5 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800/50">
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600 dark:text-amber-400">
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    <span className="text-xs sm:text-sm font-medium text-amber-700 dark:text-amber-300">
                      Private quote - no shareable link
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] sm:text-xs text-amber-600 dark:text-amber-400">
                    Make your quote public to get a shareable link
                  </p>
                </div>
              )}

              {/* Share Options */}
              <div className="grid grid-cols-4 gap-2 sm:gap-3">
                {/* Download */}
            <button
              onClick={handleDownload}
                  className="group flex flex-col items-center gap-1.5 sm:gap-2 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/50 dark:to-cyan-950/50 hover:shadow-md hover:scale-[1.02] active:scale-95 transition-all"
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-shadow">
                    <Download size={18} className="sm:w-6 sm:h-6 text-white" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-semibold text-gray-700 dark:text-gray-300">Save</span>
            </button>

                {/* Instagram */}
            <button
              onClick={handleInstagramShare}
                  className="group flex flex-col items-center gap-1.5 sm:gap-2 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-pink-50 to-orange-50 dark:from-pink-950/50 dark:to-orange-950/50 hover:shadow-md hover:scale-[1.02] active:scale-95 transition-all"
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-pink-500 via-red-500 to-orange-500 flex items-center justify-center shadow-lg shadow-pink-500/20 group-hover:shadow-pink-500/40 transition-shadow">
                    <Instagram size={18} className="sm:w-6 sm:h-6 text-white" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-semibold text-gray-700 dark:text-gray-300">Insta</span>
            </button>

                {/* WhatsApp */}
            <button
              onClick={handleWhatsAppShare}
                  className="group flex flex-col items-center gap-1.5 sm:gap-2 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50 hover:shadow-md hover:scale-[1.02] active:scale-95 transition-all"
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/20 group-hover:shadow-green-500/40 transition-shadow">
                    <MessageCircle size={18} className="sm:w-6 sm:h-6 text-white" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-semibold text-gray-700 dark:text-gray-300">WhatsApp</span>
            </button>

                {/* Pinterest */}
            <button
              onClick={handlePinterestShare}
                  className="group flex flex-col items-center gap-1.5 sm:gap-2 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/50 dark:to-rose-950/50 hover:shadow-md hover:scale-[1.02] active:scale-95 transition-all"
            >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg shadow-red-500/20 group-hover:shadow-red-500/40 transition-shadow">
              <svg
                      width="18"
                      height="18"
                viewBox="0 0 24 24"
                      fill="currentColor"
                      className="sm:w-6 sm:h-6 text-white"
              >
                      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.237 2.636 7.855 6.356 9.312-.088-.791-.167-2.005.035-2.868.181-.78 1.172-4.97 1.172-4.97s-.299-.599-.299-1.484c0-1.391.806-2.428 1.809-2.428.853 0 1.265.64 1.265 1.408 0 .858-.546 2.14-.828 3.33-.236.995.5 1.807 1.481 1.807 1.778 0 3.144-1.874 3.144-4.58 0-2.393-1.72-4.068-4.177-4.068-2.845 0-4.515 2.135-4.515 4.34 0 .859.331 1.781.744 2.281a.3.3 0 01.069.288l.278 1.133c.044.183.145.223.334.134 1.249-.581 1.735-2.407 1.735-3.874 0-3.154 2.292-6.052 6.608-6.052 3.469 0 6.165 2.473 6.165 5.776 0 3.447-2.173 6.22-5.19 6.22-1.013 0-1.965-.527-2.292-1.155l-.623 2.378c-.226.869-.835 1.958-1.244 2.621.937.29 1.931.446 2.962.446 5.523 0 10-4.477 10-10S17.523 2 12 2z" />
              </svg>
                  </div>
                  <span className="text-[10px] sm:text-xs font-semibold text-gray-700 dark:text-gray-300">Pinterest</span>
            </button>
              </div>

              {/* More Options */}
            <button
              onClick={handleGenericShare}
                className="w-full mt-3 sm:mt-4 flex items-center justify-center gap-2 px-4 py-2.5 sm:py-3 bg-gray-100 dark:bg-gray-800 rounded-xl sm:rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all active:scale-[0.98]"
            >
                <Share2 size={14} className="sm:w-4 sm:h-4 text-gray-600 dark:text-gray-400" />
                <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">More sharing options</span>
            </button>
        </>
      )}
            </div>
          </div>
        </div>
  );
}
