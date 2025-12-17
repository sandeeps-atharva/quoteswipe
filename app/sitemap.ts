import { MetadataRoute } from 'next';
import { getCollection } from '@/lib/db';

// Fetch quote IDs for dynamic sitemap generation
async function getQuoteIds(): Promise<{ id: string; updated_at: Date }[]> {
  try {
    const quotesCollection = await getCollection('quotes');
    const quotes = await quotesCollection
      .find({})
      .sort({ _id: -1 })
      .limit(5000)
      .project({ id: 1, _id: 1, updated_at: 1, created_at: 1 })
      .toArray();
    
    return quotes.map(q => ({
      id: q.id || q._id?.toString(),
      updated_at: q.updated_at || q.created_at || new Date()
    }));
  } catch (error) {
    console.error('Error fetching quote IDs for sitemap:', error);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://quoteswipe.com';
  
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/feedback`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/review`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/privacy-policy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/terms-of-service`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/cookie-policy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.4,
    },
  ];

  // Dynamic quote pages
  let quotePages: MetadataRoute.Sitemap = [];
  try {
    const quotes = await getQuoteIds();
    quotePages = quotes.map((quote) => ({
      url: `${baseUrl}/quote/${quote.id}`,
      lastModified: new Date(quote.updated_at),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));
  } catch (error) {
    console.error('Error generating quote sitemap entries:', error);
  }

  return [...staticPages, ...quotePages];
}

// Enable dynamic generation with revalidation
export const revalidate = 86400; // Revalidate sitemap every 24 hours
