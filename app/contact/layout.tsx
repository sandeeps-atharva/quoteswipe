import { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://quoteswipe.com';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Get in touch with the QuoteSwipe team. We\'re here to help with questions, suggestions, partnership inquiries, or feedback.',
  keywords: ['contact quoteswipe', 'customer support', 'feedback', 'help', 'support'],
  openGraph: {
    title: 'Contact QuoteSwipe - Get in Touch',
    description: 'Reach out to the QuoteSwipe team for questions, suggestions, or partnership opportunities.',
    type: 'website',
    url: `${siteUrl}/contact`,
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Contact QuoteSwipe' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contact QuoteSwipe',
    description: 'Get in touch with the QuoteSwipe team.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: `${siteUrl}/contact`,
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

