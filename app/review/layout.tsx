import { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://quoteswipe.com';

export const metadata: Metadata = {
  title: 'Write a Review',
  description: 'Share your experience with QuoteSwipe. Write a public review and help others discover the joy of inspirational quotes.',
  keywords: ['quoteswipe review', 'testimonial', 'user review', 'rating', 'feedback'],
  openGraph: {
    title: 'Write a Review - QuoteSwipe',
    description: 'Share your experience with QuoteSwipe and help others discover inspirational quotes.',
    type: 'website',
    url: `${siteUrl}/review`,
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Write a Review - QuoteSwipe' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Write a Review - QuoteSwipe',
    description: 'Share your QuoteSwipe experience.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: `${siteUrl}/review`,
  },
};

export default function ReviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

