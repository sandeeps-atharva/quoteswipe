import { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://quoteswipe.com';

export const metadata: Metadata = {
  title: 'Share Feedback',
  description: 'Help us improve QuoteSwipe by sharing your thoughts, bug reports, feature requests, and suggestions. Your voice matters!',
  keywords: ['quoteswipe feedback', 'bug report', 'feature request', 'suggestions', 'improve'],
  openGraph: {
    title: 'Share Your Feedback - QuoteSwipe',
    description: 'Help us improve QuoteSwipe. Share your thoughts, report bugs, or suggest new features.',
    type: 'website',
    url: `${siteUrl}/feedback`,
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Share Feedback - QuoteSwipe' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Share Feedback - QuoteSwipe',
    description: 'Help us improve QuoteSwipe by sharing your feedback.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: `${siteUrl}/feedback`,
  },
};

export default function FeedbackLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

