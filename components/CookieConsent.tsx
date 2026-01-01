'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, Cookie } from 'lucide-react';

const COOKIE_CONSENT_KEY = 'qs_cookie_consent';

export default function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-[100] transition-transform duration-300 ${isVisible ? 'translate-y-0' : 'translate-y-full'}`}>
      <div className="bg-stone-900 dark:bg-stone-950 border-t border-stone-800 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Message */}
          <div className="flex items-center gap-3 flex-1">
            <div className="hidden sm:flex w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 items-center justify-center shrink-0">
              <Cookie size={16} className="text-white" />
            </div>
            <p className="text-sm text-stone-300">
              🍪 We use cookies to enhance your experience.{' '}
              <Link 
                href="/cookie-policy" 
                className="text-amber-400 hover:text-amber-300 hover:underline"
              >
                Learn more
              </Link>
            </p>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleAccept}
              className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm font-medium transition-colors shadow-lg shadow-amber-500/20"
            >
              Accept
            </button>
            <button
              onClick={handleAccept}
              className="p-1.5 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-white transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
