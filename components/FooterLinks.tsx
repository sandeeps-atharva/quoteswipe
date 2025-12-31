'use client';

import Link from 'next/link';

export default function FooterLinks() {
  return (
    <nav className="flex items-center justify-center gap-1 mt-3 sm:mt-4">
      <Link
        href="/about"
        className="text-xs text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
      >
        About
      </Link>
      <span className="text-gray-300 dark:text-gray-600">•</span>
      <Link
        href="/contact"
        className="text-xs text-gray-400 dark:text-gray-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
      >
        Contact
      </Link>
      <span className="text-gray-300 dark:text-gray-600">•</span>
      <Link
        href="/privacy-policy"
        className="text-xs text-gray-400 dark:text-gray-500 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
      >
        Privacy
      </Link>
      <span className="text-gray-300 dark:text-gray-600">•</span>
      <Link
        href="/feedback"
        className="text-xs text-gray-400 dark:text-gray-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
      >
        Feedback
      </Link>
    </nav>
  );
}

