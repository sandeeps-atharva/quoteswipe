'use client';

import Image from 'next/image';

interface ThematicLoaderProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
  overlay?: boolean;
}

/**
 * Quote Bubble themed loader used across the application
 * Provides consistent loading feedback with the app's branding
 */
export default function ThematicLoader({
  message = 'Loading...',
  size = 'md',
  fullScreen = false,
  overlay = false,
}: ThematicLoaderProps) {
  const sizeClasses = {
    sm: {
      container: 'gap-3',
      logoSize: 56,
      spinner: 'w-4 h-4 border-2',
      spinnerContainer: 'w-5 h-5',
      text: 'text-sm',
    },
    md: {
      container: 'gap-4',
      logoSize: 80,
      spinner: 'w-4 h-4 border-2',
      spinnerContainer: 'w-6 h-6',
      text: 'text-base',
    },
    lg: {
      container: 'gap-5',
      logoSize: 100,
      spinner: 'w-5 h-5 border-2',
      spinnerContainer: 'w-7 h-7',
      text: 'text-lg',
    },
  };

  const s = sizeClasses[size];

  const loaderContent = (
    <div
      className={`flex flex-col items-center ${s.container} animate-in fade-in zoom-in duration-200`}
    >
      {/* Logo with spinning indicator */}
      <div className="relative">
        <Image
          src="/logo.svg"
          alt="QuoteSwipe"
          width={s.logoSize}
          height={s.logoSize}
          className="drop-shadow-xl"
          priority
        />
        <div
          className={`absolute -bottom-0.5 -right-0.5 ${s.spinnerContainer} bg-gradient-to-br from-amber-500 to-rose-500 rounded-full flex items-center justify-center shadow-lg`}
        >
          <div
            className={`${s.spinner} border-white border-t-transparent rounded-full animate-spin`}
          ></div>
        </div>
      </div>

      {/* Message */}
      <p className={`text-gray-600 dark:text-gray-300 font-medium ${s.text}`}>
        {message}
      </p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50/50 via-orange-50/30 to-rose-50/50 dark:from-stone-950 dark:via-stone-900 dark:to-stone-950 flex items-center justify-center">
        {loaderContent}
      </div>
    );
  }

  if (overlay) {
    return (
      <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center">
        {loaderContent}
      </div>
    );
  }

  return loaderContent;
}

/**
 * Modal fallback loader - used with React.Suspense
 */
export function ModalLoader() {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <ThematicLoader message="Loading..." size="md" />
    </div>
  );
}

/**
 * Navigation loader - shown when navigating between quotes
 */
export function NavigationLoader() {
  return (
    <ThematicLoader message="Opening quote..." size="md" overlay />
  );
}

/**
 * App initialization loader - shown on first load
 */
export function AppLoader() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/50 via-orange-50/30 to-rose-50/50 dark:from-stone-950 dark:via-stone-900 dark:to-stone-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-5 animate-in fade-in zoom-in duration-300">
        {/* Logo with spinning indicator */}
        <div className="relative">
          <Image
            src="/logo.svg"
            alt="QuoteSwipe"
            width={100}
            height={100}
            className="drop-shadow-xl"
            priority
          />
          <div className="absolute -bottom-0.5 -right-0.5 w-7 h-7 bg-gradient-to-br from-amber-500 to-rose-500 rounded-full flex items-center justify-center shadow-lg">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>

        {/* App name */}
        <div className="text-center">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            QuoteSwipe
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Loading your quotes...
          </p>
        </div>
      </div>
    </div>
  );
}
