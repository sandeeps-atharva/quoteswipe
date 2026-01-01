'use client';

import { UserQuote } from '@/types/quotes';
import { CardTheme, FontStyle, BackgroundImage, BACKGROUND_IMAGES } from '@/lib/constants';
import { isQuotePublic } from '@/lib/helpers';
import QuoteCard from './QuoteCard';

interface ViewUserQuoteModalProps {
  quote: UserQuote;
  onClose: () => void;
  onEdit: (quote: UserQuote) => void;
  onShare: (quote: UserQuote) => void;
  cardTheme: CardTheme;
  fontStyle: FontStyle;
  backgroundImage: BackgroundImage;
}

export default function ViewUserQuoteModal({
  quote,
  onClose,
  onEdit,
  onShare,
  cardTheme,
  fontStyle,
  backgroundImage,
}: ViewUserQuoteModalProps) {
  // Determine background for this quote
  const quoteBackground = quote.custom_background
    ? {
        id: 'user_custom',
        name: 'Custom',
        url: quote.custom_background,
        thumbnail: quote.custom_background,
        overlay: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.55) 100%)',
        textColor: '#ffffff',
        authorColor: '#e5e5e5',
        categoryBg: 'rgba(255,255,255,0.15)',
        categoryText: '#ffffff',
      }
    : quote.background_id
      ? BACKGROUND_IMAGES.find(bg => bg.id === quote.background_id) || backgroundImage
      : backgroundImage;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop with warm gradient */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-rose-500/10" />
      </div>

      {/* Quote Card Container */}
      <div className="relative w-full max-w-md animate-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full text-sm font-medium transition-all backdrop-blur-sm"
        >
          <span>Close</span>
          <span className="text-lg">×</span>
        </button>

        {/* Action buttons */}
        <div className="absolute -top-12 left-0 flex items-center gap-2">
          <button
            onClick={() => onEdit(quote)}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-full text-sm font-medium transition-all shadow-lg shadow-amber-500/30"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
              <path d="m15 5 4 4" />
            </svg>
            Edit
          </button>
          <button
            onClick={() => onShare(quote)}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white rounded-full text-sm font-medium transition-all shadow-lg shadow-rose-500/30"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" x2="15.42" y1="13.51" y2="17.49" />
              <line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
            </svg>
            Share
          </button>
        </div>

        {/* Quote Card */}
        <div
          className="aspect-[4/5] overflow-hidden shadow-2xl flex items-center justify-center"
          style={{ borderRadius: '24px' }}
        >
          <QuoteCard
            quote={{
              id: quote.id,
              text: quote.text,
              author: quote.author,
              category: quote.category || 'Personal',
              category_icon: quote.category_icon || '✨',
            }}
            index={0}
            currentIndex={0}
            dragOffset={{ x: 0, y: 0 }}
            swipeDirection={null}
            isDragging={false}
            isAnimating={false}
            totalQuotes={1}
            onDragStart={() => {}}
            onDragMove={() => {}}
            cardTheme={cardTheme}
            fontStyle={fontStyle}
            backgroundImage={quoteBackground}
          />
        </div>

        {/* Quote info */}
        <div className="mt-4 text-center">
          <span
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm ${
              isQuotePublic(quote.is_public)
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                : 'bg-stone-500/20 text-stone-300 border border-stone-400/30'
            }`}
          >
            {isQuotePublic(quote.is_public) ? (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                  <path d="M2 12h20" />
                </svg>
                Public - Visible to everyone
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Private - Only you can see
              </>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
