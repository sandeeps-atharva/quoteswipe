import { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://quoteswipe.com';

export const metadata: Metadata = {
  title: 'About Us',
  description: 'Discover inspiration, one swipe at a time. Learn about QuoteSwipe\'s mission to make wisdom accessible to everyone through curated inspirational quotes.',
  keywords: ['about quoteswipe', 'inspirational quotes app', 'quote discovery platform', 'motivational quotes'],
  openGraph: {
    title: 'About QuoteSwipe - Our Mission & Story',
    description: 'Discover inspiration, one swipe at a time. Explore thousands of curated quotes from history\'s greatest minds.',
    type: 'website',
    url: `${siteUrl}/about`,
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'About QuoteSwipe' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About QuoteSwipe',
    description: 'Learn about QuoteSwipe\'s mission to make wisdom accessible to everyone.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: `${siteUrl}/about`,
  },
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

