'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useTheme } from '@/contexts/ThemeContext';
import { ReactNode } from 'react';

interface LegalPageLayoutProps {
  children: ReactNode;
  title: string;
  icon: ReactNode;
  description?: string;
  lastUpdated?: string;
}

export default function LegalPageLayout({
  children,
  title,
  icon,
  description,
  lastUpdated = 'December 2024',
}: LegalPageLayoutProps) {
  const { theme } = useTheme();

  return (
    <div className="min-h-screen bg-[#FFFBF7] dark:bg-[#0C0A09]">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 flex items-center gap-2 sm:gap-4">
          <Link 
            href="/"
            className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700 dark:text-gray-300" />
          </Link>
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Image src="/logo.svg" alt="QuoteSwipe" width={32} height={32} className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0" />
            <h1 className="text-base sm:text-lg md:text-xl font-bold bg-gradient-to-r from-amber-600 to-rose-600 bg-clip-text text-transparent truncate">
              {title}
            </h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-12">
        {/* Hero Section */}
        <div className="text-center mb-8 sm:mb-10 md:mb-12">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-500 to-rose-500 shadow-lg sm:shadow-xl shadow-amber-500/25 dark:shadow-rose-500/20 mb-4 sm:mb-6">
            <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 flex items-center justify-center [&>*]:w-full [&>*]:h-full">
              {icon}
            </div>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-3 md:mb-4 px-2">
            {title}
          </h2>
          {description && (
            <p className="text-sm sm:text-base md:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto px-2">
              {description}
            </p>
          )}
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-500 mt-3 sm:mt-4">
            Last updated: {lastUpdated}
          </p>
        </div>

        {/* Page Content */}
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200/50 dark:border-gray-800/50 mt-10 sm:mt-12 md:mt-16 bg-white/30 dark:bg-gray-900/30 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 py-6 sm:py-8">
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4 md:gap-6 text-xs sm:text-sm text-stone-600 dark:text-stone-400">
            <Link href="/about" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors">About</Link>
            <Link href="/privacy-policy" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors">Privacy</Link>
            <Link href="/terms-of-service" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors">Terms</Link>
            <Link href="/cookie-policy" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors">Cookies</Link>
            <Link href="/contact" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors">Contact</Link>
            <Link href="/feedback" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors">Feedback</Link>
          </div>
          <p className="text-center text-xs sm:text-sm text-gray-500 dark:text-gray-600 mt-3 sm:mt-4">
            © {new Date().getFullYear()} QuoteSwipe. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

// Card component for sections
export function SectionCard({ 
  children, 
  icon, 
  title,
  className = '' 
}: { 
  children: ReactNode; 
  icon?: ReactNode; 
  title?: string;
  className?: string;
}) {
  return (
    <div className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 shadow-md sm:shadow-lg shadow-blue-500/5 dark:shadow-pink-500/5 border border-white/50 dark:border-gray-700/50 ${className}`}>
      {(icon || title) && (
        <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
          {icon && (
            <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-gradient-to-br from-amber-500/10 to-rose-500/10 dark:from-amber-500/20 dark:to-rose-500/20 flex-shrink-0">
              <div className="w-5 h-5 sm:w-6 sm:h-6 [&>*]:w-full [&>*]:h-full">
                {icon}
              </div>
            </div>
          )}
          {title && (
            <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

// Gradient button component
export function GradientButton({ 
  children, 
  href,
  className = '' 
}: { 
  children: ReactNode; 
  href?: string;
  className?: string;
}) {
  const buttonClasses = `inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-amber-600 to-rose-600 text-white text-sm sm:text-base font-medium rounded-lg sm:rounded-xl hover:from-amber-600 hover:to-rose-600 transition-all shadow-lg shadow-amber-500/25 dark:shadow-rose-500/20 ${className}`;
  
  if (href) {
    return (
      <Link href={href} className={buttonClasses}>
        {children}
      </Link>
    );
  }
  
  return (
    <button className={buttonClasses}>
      {children}
    </button>
  );
}

// Contact CTA section
export function ContactCTA() {
  return (
    <div className="mt-8 sm:mt-10 md:mt-12 text-center p-4 sm:p-6 md:p-8 bg-gradient-to-r from-amber-500/5 to-rose-500/5 dark:from-amber-500/10 dark:to-rose-500/10 rounded-xl sm:rounded-2xl border border-amber-200/50 dark:border-rose-800/50 backdrop-blur-sm">
      <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-1 sm:mb-2">
        Have Questions?
      </h3>
      <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-3 sm:mb-4">
        We're here to help. Feel free to reach out to us.
      </p>
      <GradientButton href="/contact">
        Contact Us
      </GradientButton>
    </div>
  );
}

// List item with gradient bullet
export function ListItem({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2 sm:gap-3 text-sm sm:text-base text-gray-600 dark:text-gray-400">
      <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-amber-500 to-rose-500 mt-1.5 sm:mt-2 flex-shrink-0" />
      {children}
    </li>
  );
}
