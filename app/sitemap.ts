import { MetadataRoute } from 'next';
import pool from '@/lib/db';

// Fetch quote IDs for dynamic sitemap generation
async function getQuoteIds(): Promise<{ id: string; updated_at: Date }[]> {
  try {
    const [quotes] = await pool.execute(
      `SELECT id, COALESCE(updated_at, created_at, NOW()) as updated_at 
       FROM quotes 
       ORDER BY id DESC 
       LIMIT 5000`
    ) as any[];
    
    return Array.isArray(quotes) ? quotes : [];
  } catch (error) {
    console.error('Error fetching quote IDs for sitemap:', error);
    return [];
  }
}

// Fetch category names for dynamic sitemap
async function getCategories(): Promise<{ name: string; updated_at: Date }[]> {
  try {
    const [categories] = await pool.execute(
      `SELECT name, COALESCE(updated_at, created_at, NOW()) as updated_at 
       FROM categories 
       WHERE is_active = 1
       ORDER BY name`
    ) as any[];
    
    return Array.isArray(categories) ? categories : [];
  } catch (error) {
    console.error('Error fetching categories for sitemap:', error);
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

