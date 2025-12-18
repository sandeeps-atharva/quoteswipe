import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import { getCollection, toObjectId } from '@/lib/db';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://quoteswipe.com';

interface UserQuotePageProps {
  params: Promise<{ id: string }>;
}

interface UserQuote {
  id: string | number;
  text: string;
  author: string;
  category: string | null;
  category_icon: string | null;
  is_public: boolean;
  creator_name: string;
}

async function getUserQuote(id: string): Promise<UserQuote | null> {
  try {
    const userQuotesCollection = await getCollection('user_quotes');
    const categoriesCollection = await getCollection('categories');
    const usersCollection = await getCollection('users');

    // Find public user quote by id or _id
    const quote = await userQuotesCollection.findOne({
      $and: [
        { $or: [{ id: id }, { _id: toObjectId(id) as any }] },
        { is_public: true }
      ]
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

    // Get creator name
    let creator: any = null;
    if (quote.user_id) {
      creator = await usersCollection.findOne({ _id: toObjectId(quote.user_id) as any }) as any;
    }

    return {
      id: quote.id || quote._id?.toString(),
      text: quote.text,
      author: quote.author,
      is_public: quote.is_public,
      category: category?.name || null,
      category_icon: category?.icon || null,
      creator_name: creator?.name || 'Anonymous',
    };
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
  const hasAuthor = Boolean(quote.author);
  const fullTitle = hasAuthor ? `"${truncatedQuote}" — ${quote.author}` : `"${truncatedQuote}"`;
  const description = hasAuthor 
    ? `Read this ${category.toLowerCase()} quote by ${quote.author}. Created by ${quote.creator_name} on QuoteSwipe.`
    : `Read this ${category.toLowerCase()} quote. Created by ${quote.creator_name} on QuoteSwipe.`;

  const keywords = [
    `${category} quotes`,
    'inspirational quotes',
    'user created quotes',
    category,
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
      url: `${siteUrl}/user-quote/${quote.id}`,
      siteName: 'QuoteSwipe',
      images: [
        {
          url: '/og-image.png',
          width: 1200,
          height: 630,
          alt: hasAuthor ? `Quote by ${quote.author}` : `${category} Quote`,
        },
      ],
      ...(hasAuthor && { authors: [quote.author] }),
      section: category,
      tags: [category, 'quotes', 'user-created', ...(hasAuthor ? [quote.author] : [])],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description: hasAuthor ? `${category} quote by ${quote.author}` : `${category} quote`,
      images: ['/og-image.png'],
    },
    alternates: {
      canonical: `${siteUrl}/user-quote/${quote.id}`,
    },
    other: {
      ...(hasAuthor && { 'quote:author': quote.author }),
      'quote:category': category,
      'quote:creator': quote.creator_name,
    },
  };
}
