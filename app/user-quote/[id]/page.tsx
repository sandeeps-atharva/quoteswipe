import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import pool from '@/lib/db';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://quoteswipe.com';

interface UserQuotePageProps {
  params: Promise<{ id: string }>;
}

interface UserQuote {
  id: number;
  text: string;
  author: string;
  category: string | null;
  category_icon: string | null;
  is_public: number;
  creator_name: string;
}

async function getUserQuote(id: string): Promise<UserQuote | null> {
  try {
    const [quotes] = await pool.execute(
      `SELECT 
        uq.id,
        uq.text,
        uq.author,
        uq.is_public,
        c.name as category,
        c.icon as category_icon,
        u.name as creator_name
      FROM user_quotes uq
      LEFT JOIN categories c ON uq.category_id = c.id
      LEFT JOIN users u ON uq.user_id = u.id
      WHERE uq.id = ? AND uq.is_public = 1`,
      [id]
    ) as any[];

    if (!Array.isArray(quotes) || quotes.length === 0) {
      return null;
    }

    return quotes[0];
  } catch (error) {
    console.error('Get user quote error:', error);
    return null;
  }
}

// Truncate text for meta descriptions
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

export default async function UserQuotePage({ params }: UserQuotePageProps) {
  const { id } = await params;
  // Verify quote exists and is public before redirecting
  const quote = await getUserQuote(id);
  if (!quote) {
    redirect('/');
  }
  // Redirect to home page with user quote ID - SwipeQuotes will handle loading it
  redirect(`/?user_quote=${id}`);
}

export async function generateMetadata({ params }: UserQuotePageProps): Promise<Metadata> {
  const { id } = await params;
  const quote = await getUserQuote(id);

  if (!quote) {
    return {
      title: 'Quote Not Found',
      description: 'The requested quote could not be found or is private.',
      robots: { index: false, follow: true },
    };
  }

  const truncatedQuote = truncateText(quote.text, 100);
  const category = quote.category || 'Personal';
  const fullTitle = `"${truncatedQuote}" - ${quote.author}`;
  const description = `Read this ${category.toLowerCase()} quote by ${quote.author}. Created by ${quote.creator_name} on QuoteSwipe.`;

  return {
    title: fullTitle,
    description: description,
    keywords: [
      `${quote.author} quotes`,
      `${category} quotes`,
      'inspirational quotes',
      'user created quotes',
      quote.author,
      category,
    ],
    authors: [{ name: quote.author }],
    openGraph: {
      title: fullTitle,
      description: description,
      type: 'article',
      url: `${siteUrl}/user-quote/${quote.id}`,
      siteName: 'QuoteSwipe',
      images: [
        {
          url: '/og-image.png',
          width: 1200,
          height: 630,
          alt: `Quote by ${quote.author}`,
        },
      ],
      authors: [quote.author],
      section: category,
      tags: [category, 'quotes', 'user-created', quote.author],
    },
    twitter: {
      card: 'summary_large_image',
      title: `"${truncatedQuote}" - ${quote.author}`,
      description: `${category} quote by ${quote.author}`,
      images: ['/og-image.png'],
    },
    alternates: {
      canonical: `${siteUrl}/user-quote/${quote.id}`,
    },
    other: {
      'quote:author': quote.author,
      'quote:category': category,
      'quote:creator': quote.creator_name,
    },
  };
}

