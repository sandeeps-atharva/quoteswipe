import { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://quoteswipe.com';

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description: 'Understand how QuoteSwipe uses cookies and similar technologies. Learn about your choices for managing and controlling cookies.',
  keywords: ['cookie policy', 'cookies', 'tracking', 'browser cookies', 'analytics'],
  openGraph: {
    title: 'Cookie Policy - QuoteSwipe',
    description: 'How QuoteSwipe uses cookies and tracking technologies.',
    type: 'website',
    url: `${siteUrl}/cookie-policy`,
  },
  twitter: {
    card: 'summary',
    title: 'Cookie Policy - QuoteSwipe',
    description: 'How QuoteSwipe uses cookies.',
  },
  alternates: {
    canonical: `${siteUrl}/cookie-policy`,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function CookiePolicyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

