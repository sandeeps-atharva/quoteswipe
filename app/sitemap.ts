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
    
    return quotes
      .map(q => {
        // Ensure we have a valid ID
        const id = q.id || q._id?.toString();
        if (!id) return null; // Skip invalid entries
        
        // Ensure valid date
        let date = q.updated_at || q.created_at;
        if (!date || !(date instanceof Date)) {
          date = new Date();
        }
        
        return {
          id: String(id), // Ensure it's a string
          updated_at: date instanceof Date ? date : new Date(),
        };
      })
      .filter((q): q is { id: string; updated_at: Date } => q !== null); // Remove null entries
  } catch (error) {
    console.error('Error fetching quote IDs for sitemap:', error);
    return [];
  }
}

// Fetch categories for sitemap
async function getCategories(): Promise<{ slug: string; name: string }[]> {
  try {
    const categoriesCollection = await getCollection('categories');
    const categories = await categoriesCollection
      .find({ is_active: { $ne: false } })
      .project({ slug: 1, name: 1 })
      .toArray();
    
    return categories
      .map(c => {
        // Ensure we have a valid slug
        let slug = c.slug;
        if (!slug && c.name) {
          slug = c.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        }
        if (!slug) return null; // Skip invalid entries
        
        return {
          slug: String(slug),
          name: c.name || '',
        };
      })
      .filter((c): c is { slug: string; name: string } => c !== null); // Remove null entries
  } catch (error) {
    console.error('Error fetching categories for sitemap:', error);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://quoteswipe.com';
  
  // Ensure baseUrl doesn't have trailing slash
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  
  // Static pages - Core
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: cleanBaseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${cleanBaseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${cleanBaseUrl}/photo-quotes`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${cleanBaseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${cleanBaseUrl}/feedback`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${cleanBaseUrl}/review`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    // Legal pages
    {
      url: `${cleanBaseUrl}/privacy-policy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.4,
    },
    {
      url: `${cleanBaseUrl}/terms-of-service`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.4,
    },
    {
      url: `${cleanBaseUrl}/cookie-policy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.4,
    },
  ];

  // Dynamic quote pages
  let quotePages: MetadataRoute.Sitemap = [];
  try {
    const quotes = await getQuoteIds();
    quotePages = quotes
      .filter((quote) => quote.id && quote.id !== 'undefined' && quote.id !== 'null')
      .map((quote) => ({
        url: `${cleanBaseUrl}/quote/${encodeURIComponent(quote.id)}`,
        lastModified: quote.updated_at instanceof Date ? quote.updated_at : new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      }));
  } catch (error) {
    console.error('Error generating quote sitemap entries:', error);
  }

  // Category pages
  let categoryPages: MetadataRoute.Sitemap = [];
  try {
    const categories = await getCategories();
    categoryPages = categories
      .filter((category) => category.slug && category.slug !== 'undefined' && category.slug !== 'null')
      .map((category) => ({
        url: `${cleanBaseUrl}/category/${encodeURIComponent(category.slug)}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }));
  } catch (error) {
    console.error('Error generating category sitemap entries:', error);
  }

  // Combine all pages
  const allPages = [...staticPages, ...categoryPages, ...quotePages];
  
  // Log for debugging
  console.log(`[Sitemap] Generated ${allPages.length} URLs (${staticPages.length} static, ${categoryPages.length} categories, ${quotePages.length} quotes)`);
  
  return allPages;
}

// Enable dynamic generation with revalidation
export const revalidate = 86400; // Revalidate sitemap every 24 hours
