import { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://quoteswipe.com';

export const metadata: Metadata = {
  title: 'About Us - QuoteSwipe Features & Mission',
  description: 'Discover inspiration, one swipe at a time. Learn about QuoteSwipe - the free quote app with 12K+ quotes, 210+ categories, 60+ themes, custom quote creation, and multi-language support.',
  keywords: [
    'about quoteswipe',
    'inspirational quotes app',
    'quote discovery platform',
    'motivational quotes app',
    'free quotes app',
    'quote maker',
    'daily quotes app',
    'best quote app',
    'quote sharing app',
    'create custom quotes',
    'save favorite quotes',
    'quote categories',
  ],
  openGraph: {
    title: 'About QuoteSwipe - Free Quote Discovery App | 12K+ Quotes',
    description: 'Discover inspiration daily with QuoteSwipe. 12K+ quotes, 210+ categories, create custom quote cards, share on Instagram & WhatsApp. 100% Free!',
    type: 'website',
    url: `${siteUrl}/about`,
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'About QuoteSwipe - Free Quote Discovery App' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About QuoteSwipe - Free Quote App',
    description: '12K+ quotes, 210+ categories, custom quote cards. Swipe to discover daily inspiration!',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: `${siteUrl}/about`,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

