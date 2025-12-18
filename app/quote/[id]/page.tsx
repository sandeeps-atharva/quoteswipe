import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import { getCollection, toObjectId } from '@/lib/db';

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
    const quotesCollection = await getCollection('quotes');
    const categoriesCollection = await getCollection('categories');

    // Find quote by id or _id
    const quote = await quotesCollection.findOne({
      $or: [{ id: id }, { _id: toObjectId(id) as any }]
    }) as any;

    if (!quote) {
      return null;
    }

    // Get category
    let category: any = null;
    if (quote.category_id) {
      category = await categoriesCollection.findOne({
        $or: [{ id: quote.category_id }, { _id: quote.category_id }]
      }) as any;
    }

    return {
      id: quote.id || quote._id?.toString(),
      text: quote.text,
      author: quote.author,
      category: category?.name || 'General',
      category_icon: category?.icon || '💭',
      category_id: quote.category_id,
    };
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
  const hasAuthor = Boolean(quote.author);
  const fullTitle = hasAuthor ? `"${truncatedQuote}" — ${quote.author}` : `"${truncatedQuote}"`;
  const description = hasAuthor 
    ? `Read this inspiring ${quote.category.toLowerCase()} quote by ${quote.author}. Discover more motivational quotes on QuoteSwipe.`
    : `Read this inspiring ${quote.category.toLowerCase()} quote. Discover more motivational quotes on QuoteSwipe.`;

  const keywords = [
    `${quote.category} quotes`,
    'inspirational quotes',
    'motivational quotes',
    quote.category,
    ...(hasAuthor ? [`${quote.author} quotes`, quote.author] : []),
  ];

  return {
    title: fullTitle,
    description: description,
    keywords: keywords,
    ...(hasAuthor && { authors: [{ name: quote.author }] }),
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
          alt: hasAuthor ? `Quote by ${quote.author}` : `${quote.category} Quote`,
        },
      ],
      ...(hasAuthor && { authors: [quote.author] }),
      section: quote.category,
      tags: [quote.category, 'quotes', 'inspiration', ...(hasAuthor ? [quote.author] : [])],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description: hasAuthor ? `${quote.category} quote by ${quote.author}` : `${quote.category} quote`,
      images: ['/og-image.png'],
    },
    alternates: {
      canonical: `${siteUrl}/quote/${quote.id}`,
    },
    other: {
      // Structured data for the quote
      ...(hasAuthor && { 'quote:author': quote.author }),
      'quote:category': quote.category,
    },
  };
}
