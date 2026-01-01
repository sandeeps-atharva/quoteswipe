'use client';

import { X } from 'lucide-react';
import { ReactNode, useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  showCloseButton?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
  variant?: 'default' | 'glass' | 'gradient';
}

export default function Modal({
  isOpen,
  onClose,
  children,
  title,
  showCloseButton = true,
  size = 'md',
  className = '',
  variant = 'default',
}: ModalProps) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-4xl',
  };

  const variantClasses = {
    default: 'bg-white dark:bg-stone-900 border border-stone-200/50 dark:border-stone-700/50',
    glass: 'bg-white/80 dark:bg-stone-900/80 backdrop-blur-xl border border-white/20 dark:border-stone-700/30',
    gradient: 'bg-gradient-to-br from-white via-amber-50/30 to-rose-50/30 dark:from-stone-900 dark:via-stone-800 dark:to-stone-900 border border-amber-200/30 dark:border-amber-900/30',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Backdrop with warm gradient overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-md">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-rose-500/5" />
      </div>
      
      {/* Modal Container */}
      <div
        className={`
          relative ${variantClasses[variant]} rounded-2xl sm:rounded-3xl 
          shadow-2xl shadow-stone-900/20 dark:shadow-black/40
          ${sizeClasses[size]} w-full 
          p-5 sm:p-6 md:p-8 
          max-h-[90vh] overflow-y-auto overflow-x-hidden scrollbar-hide
          animate-scale-in
          ${className}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative gradient orbs - contained within bounds */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-amber-400/20 to-orange-400/20 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-br from-rose-400/20 to-pink-400/20 rounded-full blur-3xl pointer-events-none translate-y-1/2 -translate-x-1/2" />
        
        {/* Close button */}
        {showCloseButton && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 sm:p-2.5 
              bg-stone-100/80 dark:bg-stone-800/80 hover:bg-stone-200 dark:hover:bg-stone-700 
              rounded-xl transition-all duration-200 z-10 group
              hover:scale-105 active:scale-95"
            aria-label="Close modal"
          >
            <X size={18} className="text-stone-500 dark:text-stone-400 group-hover:text-stone-700 dark:group-hover:text-stone-200 transition-colors" />
          </button>
        )}

        {/* Title */}
        {title && (
          <div className="mb-5 sm:mb-6 pr-10">
            <h2 className="text-xl sm:text-2xl font-bold text-stone-800 dark:text-stone-100">
              {title}
            </h2>
            <div className="mt-2 h-1 w-12 bg-gradient-to-r from-amber-500 to-rose-500 rounded-full" />
          </div>
        )}

        {/* Content */}
        <div className="relative z-10">
          {children}
        </div>
      </div>
    </div>
  );
}
