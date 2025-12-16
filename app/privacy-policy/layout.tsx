import { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://quoteswipe.com';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Learn how QuoteSwipe collects, uses, and protects your personal information. We are committed to your privacy and data security.',
  keywords: ['privacy policy', 'data protection', 'personal information', 'GDPR', 'user privacy'],
  openGraph: {
    title: 'Privacy Policy - QuoteSwipe',
    description: 'Learn how QuoteSwipe protects your privacy and handles your data securely.',
    type: 'website',
    url: `${siteUrl}/privacy-policy`,
  },
  twitter: {
    card: 'summary',
    title: 'Privacy Policy - QuoteSwipe',
    description: 'Learn how QuoteSwipe protects your privacy.',
  },
  alternates: {
    canonical: `${siteUrl}/privacy-policy`,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function PrivacyPolicyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

