'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';

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
      <div className="bg-gray-900 dark:bg-gray-950 border-t border-gray-800 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Message */}
          <p className="text-sm text-gray-300 flex-1">
            🍪 We use cookies to enhance your experience.{' '}
            <Link 
              href="/cookie-policy" 
              className="text-blue-400 hover:text-blue-300 hover:underline"
            >
              Learn more
            </Link>
          </p>

          {/* Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleAccept}
              className="px-4 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors"
            >
              Accept
            </button>
            <button
              onClick={handleAccept}
              className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
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
