'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Home, Search, ArrowLeft, Quote } from 'lucide-react';

const inspirationalQuotes = [
  { text: "Not all those who wander are lost.", author: "J.R.R. Tolkien" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "In the middle of difficulty lies opportunity.", author: "Albert Einstein" },
  { text: "Every moment is a fresh beginning.", author: "T.S. Eliot" },
  { text: "The journey of a thousand miles begins with one step.", author: "Lao Tzu" },
];

export default function NotFound() {
  const [quote, setQuote] = useState(inspirationalQuotes[0]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Pick a random quote
    const randomQuote = inspirationalQuotes[Math.floor(Math.random() * inspirationalQuotes.length)];
    setQuote(randomQuote);
  }, []);

  return (
    <div className="min-h-screen bg-[#FFFBF7] dark:bg-[#0C0A09] flex items-center justify-center p-4 overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-pink-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl" />
      </div>

      <div className={`relative z-10 max-w-lg w-full text-center transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        {/* Logo */}
        <div className="mb-6">
          <Image 
            src="/logo.svg" 
            alt="QuoteSwipe" 
            width={80} 
            height={80} 
            className="mx-auto w-16 h-16 sm:w-20 sm:h-20"
          />
        </div>

        {/* 404 Text */}
        <div className="relative mb-6">
          <h1 className="text-8xl sm:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-orange-500 to-rose-600 select-none">
            404
          </h1>
          <div className="absolute inset-0 text-8xl sm:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-orange-500 to-rose-600 blur-2xl opacity-30 select-none">
            404
          </div>
        </div>

        {/* Message */}
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white mb-2">
          Page Not Found
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8 text-sm sm:text-base">
          Looks like this page went on an adventure without us.
        </p>

        {/* Inspirational Quote Card */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 mb-8 shadow-xl shadow-amber-500/5 border border-white/50 dark:border-gray-700/50 relative overflow-hidden">
          <Quote className="absolute top-3 left-3 w-8 h-8 text-amber-500/20 dark:text-amber-400/20" />
          <p className="text-gray-700 dark:text-gray-300 italic text-base sm:text-lg mb-3 relative z-10 font-serif">
            "{quote.text}"
          </p>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            — {quote.author}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-600 to-rose-600 text-white font-semibold rounded-xl hover:from-amber-600 hover:to-rose-600 transition-all shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/30 hover:scale-105 active:scale-95"
          >
            <Home className="w-5 h-5" />
            Go Home
          </Link>
          
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-white dark:hover:bg-gray-800 transition-all border border-gray-200 dark:border-gray-700 hover:scale-105 active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
            Go Back
          </button>
        </div>

        {/* Search suggestion */}
        <p className="mt-8 text-gray-500 dark:text-gray-400 text-sm flex items-center justify-center gap-2">
          <Search className="w-4 h-4" />
          Try searching for quotes on the home page
        </p>
      </div>
    </div>
  );
}

