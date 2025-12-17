import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import pool from '@/lib/db';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://quoteswipe.com';

interface QuotePageProps {
  params: Promise<{ id: string }>;
}

interface Quote {
  id: string;
  text: string;
  author: string;
  category: string;
  category_icon: string;
  category_id: string | number;
}

async function getQuote(id: string): Promise<Quote | null> {
  try {
    const [quotes] = await pool.execute(
      `SELECT 
        q.id,
        q.text,
        q.author,
        c.name as category,
        c.icon as category_icon,
        c.id as category_id
      FROM quotes q
      INNER JOIN categories c ON q.category_id = c.id
      WHERE q.id = ?`,
      [id]
    ) as any[];

    if (!Array.isArray(quotes) || quotes.length === 0) {
      return null;
    }

    return quotes[0];
  } catch (error) {
    console.error('Get quote error:', error);
    return null;
  }
}

// Truncate text for meta descriptions
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

export default async function QuotePage({ params }: QuotePageProps) {
  const { id } = await params;
  // Verify quote exists before redirecting
  const quote = await getQuote(id);
  if (!quote) {
    redirect('/');
  }
  // Redirect to home page with quote ID - SwipeQuotes will handle loading it
  redirect(`/?quote=${id}`);
}

export async function generateMetadata({ params }: QuotePageProps): Promise<Metadata> {
  const { id } = await params;
  const quote = await getQuote(id);

  if (!quote) {
    return {
      title: 'Quote Not Found',
      description: 'The requested quote could not be found.',
      robots: { index: false, follow: true },
    };
  }

  const truncatedQuote = truncateText(quote.text, 100);
  const fullTitle = `"${truncatedQuote}" - ${quote.author}`;
  const description = `Read this inspiring ${quote.category.toLowerCase()} quote by ${quote.author}. Discover more motivational quotes on QuoteSwipe.`;

  return {
    title: fullTitle,
    description: description,
    keywords: [
      `${quote.author} quotes`,
      `${quote.category} quotes`,
      'inspirational quotes',
      'motivational quotes',
      quote.author,
      quote.category,
    ],
    authors: [{ name: quote.author }],
    openGraph: {
      title: fullTitle,
      description: description,
      type: 'article',
      url: `${siteUrl}/quote/${quote.id}`,
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
      section: quote.category,
      tags: [quote.category, 'quotes', 'inspiration', quote.author],
    },
    twitter: {
      card: 'summary_large_image',
      title: `"${truncatedQuote}" - ${quote.author}`,
      description: `${quote.category} quote by ${quote.author}`,
      images: ['/og-image.png'],
    },
    alternates: {
      canonical: `${siteUrl}/quote/${quote.id}`,
    },
    other: {
      // Structured data for the quote
      'quote:author': quote.author,
      'quote:category': quote.category,
    },
  };
}

// Generate static params for popular quotes (optional optimization)
// export async function generateStaticParams() {
//   try {
//     const [quotes] = await pool.execute(
//       'SELECT id FROM quotes ORDER BY likes_count DESC LIMIT 100'
//     ) as any[];
//     return quotes.map((quote: { id: number }) => ({
//       id: quote.id.toString(),
//     }));
//   } catch {
//     return [];
//   }
// }

