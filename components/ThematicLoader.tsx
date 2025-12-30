'use client';

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
      container: 'p-6 gap-3',
      emoji: 'text-4xl',
      spinner: 'w-5 h-5',
      spinnerContainer: 'w-5 h-5',
      text: 'text-sm',
    },
    md: {
      container: 'p-8 gap-4',
      emoji: 'text-5xl',
      spinner: 'w-4 h-4 border-2',
      spinnerContainer: 'w-6 h-6',
      text: 'text-base',
    },
    lg: {
      container: 'p-10 gap-5',
      emoji: 'text-6xl',
      spinner: 'w-5 h-5 border-2',
      spinnerContainer: 'w-7 h-7',
      text: 'text-lg',
    },
  };

  const s = sizeClasses[size];

  const loaderContent = (
    <div
      className={`bg-white dark:bg-gray-900 rounded-3xl shadow-2xl flex flex-col items-center ${s.container} animate-in fade-in zoom-in duration-200`}
    >
      {/* Quote Bubble with spinning indicator */}
      <div className="relative animate-bounce">
        <span className={s.emoji}>💬</span>
        <div
          className={`absolute -bottom-1 -right-1 ${s.spinnerContainer} bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center shadow-lg`}
        >
          <div
            className={`${s.spinner} border-white border-t-transparent rounded-full animate-spin`}
          ></div>
        </div>
      </div>

      {/* Message */}
      <p className={`text-gray-700 dark:text-gray-300 font-medium ${s.text}`}>
        {message}
      </p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-pink-50 dark:from-gray-900 dark:via-indigo-950 dark:to-pink-950 flex items-center justify-center">
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-pink-50 dark:from-gray-900 dark:via-indigo-950 dark:to-pink-950 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-10 shadow-2xl flex flex-col items-center gap-5 animate-in fade-in zoom-in duration-300">
        {/* Quote Bubble with spinning indicator */}
        <div className="relative animate-bounce">
          <span className="text-6xl">💬</span>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center shadow-lg">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>

        {/* App name */}
        <div className="text-center">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-pink-600 bg-clip-text text-transparent">
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

