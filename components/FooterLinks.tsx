'use client';

import Link from 'next/link';

export default function FooterLinks() {
  return (
    <nav className="flex items-center justify-center gap-1 mt-3 sm:mt-4">
      <Link
        href="/about"
        className="text-xs text-stone-400 dark:text-stone-500 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
      >
        About
      </Link>
      <span className="text-stone-300 dark:text-stone-600">•</span>
      <Link
        href="/contact"
        className="text-xs text-stone-400 dark:text-stone-500 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
      >
        Contact
      </Link>
      <span className="text-stone-300 dark:text-stone-600">•</span>
      <Link
        href="/privacy-policy"
        className="text-xs text-stone-400 dark:text-stone-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
      >
        Privacy
      </Link>
      <span className="text-stone-300 dark:text-stone-600">•</span>
      <Link
        href="/feedback"
        className="text-xs text-stone-400 dark:text-stone-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
      >
        Feedback
      </Link>
    </nav>
  );
}

