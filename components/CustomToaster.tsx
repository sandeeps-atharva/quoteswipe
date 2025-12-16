'use client';

import { Toaster, toast } from 'react-hot-toast';

export default function CustomToaster() {
  return (
    <Toaster
      position="top-center"
      containerStyle={{
        top: 16,
      }}
      toastOptions={{
        duration: 3500,
        style: {
          background: 'transparent',
          boxShadow: 'none',
          padding: 0,
          maxWidth: '380px',
        },
      }}
    >
      {(t) => (
        <div
          className={`${
            t.visible ? 'toast-enter' : 'toast-exit'
          } group relative flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 ${
            t.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800/60'
              : t.type === 'error'
              ? 'bg-red-50 dark:bg-red-950/80 border-red-200 dark:border-red-800/60'
              : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700'
          }`}
          style={{
            boxShadow: '0 4px 20px -4px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.02)',
          }}
        >
          {/* Icon */}
          <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${
            t.type === 'success'
              ? 'bg-emerald-500'
              : t.type === 'error'
              ? 'bg-red-500'
              : 'bg-blue-500'
          }`}>
            {t.type === 'success' ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            ) : t.type === 'error' ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
            )}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium leading-snug ${
              t.type === 'success'
                ? 'text-emerald-900 dark:text-emerald-100'
                : t.type === 'error'
                ? 'text-red-900 dark:text-red-100'
                : 'text-gray-900 dark:text-white'
            }`}>
              {typeof t.message === 'function' ? t.message(t) : t.message}
            </p>
          </div>
          
          {/* Close Button */}
          <button
            onClick={() => toast.dismiss(t.id)}
            className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center opacity-60 hover:opacity-100 transition-all hover:scale-105 active:scale-95 ${
              t.type === 'success'
                ? 'hover:bg-emerald-200 dark:hover:bg-emerald-800/50 text-emerald-600 dark:text-emerald-400'
                : t.type === 'error'
                ? 'hover:bg-red-200 dark:hover:bg-red-800/50 text-red-600 dark:text-red-400'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          
          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 right-0 h-[3px] overflow-hidden rounded-b-xl">
            <div 
              className={`h-full rounded-full ${
                t.type === 'success'
                  ? 'bg-emerald-500'
                  : t.type === 'error'
                  ? 'bg-red-500'
                  : 'bg-blue-500'
              }`}
              style={{
                animation: 'shrink 3500ms linear forwards',
              }}
            />
          </div>
        </div>
      )}
    </Toaster>
  );
}
