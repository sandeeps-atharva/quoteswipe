'use client';

import React, { useState, useEffect } from 'react';
import { X, Download, Share, MoreVertical, Plus, Zap, Smartphone, Rocket } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const STORAGE_KEY = 'quoteswipe_install_dismissed';
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

export default function InstallAppModal() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [platform, setPlatform] = useState<'android' | 'ios' | 'desktop' | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error);
    }

    // Check if already installed
    const standalone = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone === true;
    setIsStandalone(standalone);
    if (standalone) return;

    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream;
    const isAndroid = /android/.test(userAgent);
    
    if (isIOS) {
      setPlatform('ios');
    } else if (isAndroid) {
      setPlatform('android');
    } else {
      setPlatform('desktop');
    }

    // Check if dismissed recently
    const dismissedAt = localStorage.getItem(STORAGE_KEY);
    if (dismissedAt && Date.now() - parseInt(dismissedAt) < DISMISS_DURATION) {
      return;
    }

    // iOS: Show modal after delay
    if (isIOS) {
      const timer = setTimeout(() => setShowModal(true), 5000);
      return () => clearTimeout(timer);
    }

    // Android/Desktop: Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowModal(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', () => {
      setShowModal(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setIsInstalling(true);
    
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'dismissed') {
        handleDismiss();
      }
    } catch (error) {
      console.error('Install error:', error);
    } finally {
      setIsInstalling(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowModal(false);
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
  };

  if (isStandalone || !showModal) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={handleDismiss}
      />
      
      {/* Modal - Bottom sheet on mobile, centered on desktop */}
      <div className="relative w-full sm:max-w-[360px] bg-white dark:bg-stone-900 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-300">
        
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 p-1.5 text-white/70 hover:text-white rounded-full hover:bg-white/20 transition-colors"
        >
          <X size={18} className="sm:w-5 sm:h-5" />
        </button>

        {/* Header */}
        <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 px-5 pt-6 pb-10 sm:px-6 sm:pt-8 sm:pb-12 text-center text-white relative overflow-hidden">
          {/* Background circles */}
          <div className="absolute inset-0 overflow-hidden opacity-20">
            <div className="absolute -top-10 -left-10 w-40 h-40 border-2 border-white rounded-full" />
            <div className="absolute -bottom-10 -right-10 w-32 h-32 border-2 border-white rounded-full" />
          </div>
          
          {/* App icon */}
          <div className="relative inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-[18px] sm:rounded-2xl shadow-xl mb-3 sm:mb-4">
            <span className="text-3xl sm:text-4xl">💭</span>
          </div>
          
          <h2 className="text-lg sm:text-xl font-bold mb-0.5 sm:mb-1">Install QuoteSwipe</h2>
          <p className="text-white/80 text-xs sm:text-sm">Get the full app experience</p>
        </div>

        {/* Content */}
        <div className="px-4 py-4 sm:px-6 sm:py-5 -mt-5 sm:-mt-6 bg-white dark:bg-stone-900 rounded-t-[24px] relative">
          
          {/* Benefits - Horizontal on mobile, vertical on desktop */}
          <div className="flex sm:flex-col gap-2 sm:gap-3 mb-4 sm:mb-5 overflow-x-auto pb-1 sm:pb-0 -mx-1 px-1 sm:mx-0 sm:px-0">
            <div className="flex items-center gap-2 sm:gap-3 bg-stone-50 dark:bg-stone-800 rounded-xl px-3 py-2 sm:py-2.5 flex-shrink-0 min-w-[120px] sm:min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                <Zap size={14} className="sm:w-4 sm:h-4 text-amber-600" />
              </div>
              <span className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 whitespace-nowrap">Quick access</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 bg-stone-50 dark:bg-stone-800 rounded-xl px-3 py-2 sm:py-2.5 flex-shrink-0 min-w-[120px] sm:min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                <Smartphone size={14} className="sm:w-4 sm:h-4 text-orange-600" />
              </div>
              <span className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 whitespace-nowrap">Native feel</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 bg-stone-50 dark:bg-stone-800 rounded-xl px-3 py-2 sm:py-2.5 flex-shrink-0 min-w-[120px] sm:min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center flex-shrink-0">
                <Rocket size={14} className="sm:w-4 sm:h-4 text-rose-600" />
              </div>
              <span className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 whitespace-nowrap">No store</span>
            </div>
          </div>

          {/* iOS Instructions */}
          {platform === 'ios' && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl p-3 sm:p-4 mb-4 sm:mb-5">
              <p className="text-[10px] sm:text-xs text-amber-600 dark:text-amber-400 uppercase font-semibold mb-2 sm:mb-3">
                How to install on iPhone
              </p>
              <div className="flex gap-4 sm:gap-0 sm:flex-col sm:space-y-2">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-amber-500 flex items-center justify-center text-white text-[10px] sm:text-xs font-bold flex-shrink-0">1</div>
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm text-stone-700 dark:text-stone-300">
                    <span>Tap</span>
                    <Share size={14} className="text-amber-500" />
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-amber-500 flex items-center justify-center text-white text-[10px] sm:text-xs font-bold flex-shrink-0">2</div>
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm text-stone-700 dark:text-stone-300">
                    <Plus size={14} className="text-amber-500" />
                    <span className="truncate">Add to Home</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Android Instructions (when no prompt available) */}
          {platform === 'android' && !deferredPrompt && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl p-3 sm:p-4 mb-4 sm:mb-5">
              <p className="text-[10px] sm:text-xs text-emerald-600 dark:text-emerald-400 uppercase font-semibold mb-2 sm:mb-3">
                How to install on Android
              </p>
              <div className="flex gap-4 sm:gap-0 sm:flex-col sm:space-y-2">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-emerald-500 flex items-center justify-center text-white text-[10px] sm:text-xs font-bold flex-shrink-0">1</div>
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm text-stone-700 dark:text-stone-300">
                    <span>Tap</span>
                    <MoreVertical size={14} className="text-stone-500" />
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-emerald-500 flex items-center justify-center text-white text-[10px] sm:text-xs font-bold flex-shrink-0">2</div>
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm text-stone-700 dark:text-stone-300">
                    <Download size={14} className="text-emerald-500" />
                    <span className="truncate">Install app</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-2 sm:gap-3">
            <button
              onClick={handleDismiss}
              className="flex-1 py-2.5 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm font-medium text-stone-600 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 rounded-xl hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors active:scale-[0.98]"
            >
              Not now
            </button>
            
            {(platform === 'android' || platform === 'desktop') && deferredPrompt ? (
              <button
                onClick={handleInstall}
                disabled={isInstalling}
                className="flex-1 py-2.5 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 rounded-xl shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 sm:gap-2 active:scale-[0.98]"
              >
                {isInstalling ? (
                  <>
                    <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Installing</span>
                  </>
                ) : (
                  <>
                    <Download size={14} className="sm:w-4 sm:h-4" />
                    <span>Install App</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleDismiss}
                className="flex-1 py-2.5 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 rounded-xl shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/30 transition-all flex items-center justify-center gap-1.5 active:scale-[0.98]"
              >
                Got it!
              </button>
            )}
          </div>

          {/* Safe area padding for iPhone */}
          <div className="h-[env(safe-area-inset-bottom)] sm:hidden" />
        </div>
      </div>
    </div>
  );
}
