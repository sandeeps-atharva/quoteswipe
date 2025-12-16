import { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://quoteswipe.com';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Read the terms and conditions for using QuoteSwipe. These terms govern your use of our quote discovery and sharing service.',
  keywords: ['terms of service', 'terms and conditions', 'user agreement', 'legal terms'],
  openGraph: {
    title: 'Terms of Service - QuoteSwipe',
    description: 'Terms and conditions for using QuoteSwipe quote discovery service.',
    type: 'website',
    url: `${siteUrl}/terms-of-service`,
  },
  twitter: {
    card: 'summary',
    title: 'Terms of Service - QuoteSwipe',
    description: 'Terms and conditions for using QuoteSwipe.',
  },
  alternates: {
    canonical: `${siteUrl}/terms-of-service`,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function TermsOfServiceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

