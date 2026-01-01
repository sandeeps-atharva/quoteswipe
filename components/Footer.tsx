'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const links = [
    { href: '/about', label: 'About Us' },
    { href: '/privacy-policy', label: 'Privacy Policy' },
    { href: '/terms-of-service', label: 'Terms of Service' },
    { href: '/cookie-policy', label: 'Cookie Policy' },
    { href: '/contact', label: 'Contact' },
  ];

  return (
    <footer className="border-t border-stone-200/50 dark:border-stone-800/50 bg-white/30 dark:bg-stone-900/30 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Logo and Description */}
        <div className="flex flex-col items-center mb-6">
          <Link href="/" className="flex items-center gap-2 mb-3">
            <Image src="/logo.svg" alt="QuoteSwipe" width={32} height={32} className="w-8 h-8" />
            <span className="text-lg font-bold bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 bg-clip-text text-transparent">
              QuoteSwipe
            </span>
          </Link>
          <p className="text-sm text-stone-500 dark:text-stone-400 text-center max-w-md">
            Discover inspiration, one swipe at a time. Explore thousands of curated quotes from the world's greatest minds.
          </p>
        </div>

        {/* Links */}
        <div className="flex flex-wrap justify-center gap-4 sm:gap-6 mb-6">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-stone-600 dark:text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Social Links */}
        <div className="flex justify-center gap-4 mb-6">
          {[
            { name: 'Twitter', url: 'https://twitter.com/quoteswipe' },
            { name: 'Instagram', url: 'https://www.instagram.com/quote_swipe/' },
            { name: 'Facebook', url: 'https://facebook.com/quoteswipe' },
          ].map((social) => (
            <a
              key={social.name}
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-white/50 dark:bg-stone-800/50 backdrop-blur-sm rounded-lg text-sm text-stone-600 dark:text-stone-400 hover:bg-gradient-to-r hover:from-amber-500/10 hover:to-rose-500/10 dark:hover:from-amber-500/20 dark:hover:to-rose-500/20 hover:text-amber-600 dark:hover:text-amber-400 transition-all border border-stone-200/50 dark:border-stone-700/50"
            >
              {social.name}
            </a>
          ))}
        </div>

        {/* Copyright */}
        <div className="text-center">
          <p className="text-sm text-stone-500 dark:text-stone-600">
            © {currentYear} QuoteSwipe. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
