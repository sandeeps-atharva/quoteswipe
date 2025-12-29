import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://quoteswipe.com';
  
  return {
    rules: [
      // Main crawler rules
      {
        userAgent: '*',
        allow: [
          '/',
          '/about',
          '/contact',
          '/feedback',
          '/review',
          '/quote/',
          '/category/',
          '/photo-quotes',
          '/privacy',
          '/terms',
          '/privacy-policy',
          '/terms-of-service',
          '/cookie-policy',
        ],
        disallow: [
          '/api/',
          '/admin/',
          '/reset-password',
          '/_next/',
          '/private/',
          '/*.json$',
          '/*?*', // Disallow URL parameters to avoid duplicate content
        ],
      },
      // Google specific rules
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/reset-password',
        ],
      },
      // Google Image bot - allow images
      {
        userAgent: 'Googlebot-Image',
        allow: [
          '/*.png$',
          '/*.jpg$',
          '/*.jpeg$',
          '/*.webp$',
          '/*.svg$',
          '/og-image.png',
        ],
      },
      // Bing
      {
        userAgent: 'Bingbot',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/reset-password',
        ],
        crawlDelay: 1,
      },
      // DuckDuckGo
      {
        userAgent: 'DuckDuckBot',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
        ],
      },
      // Block AI training bots
      {
        userAgent: 'GPTBot',
        disallow: ['/'],
      },
      {
        userAgent: 'ChatGPT-User',
        disallow: ['/'],
      },
      {
        userAgent: 'CCBot',
        disallow: ['/'],
      },
      {
        userAgent: 'anthropic-ai',
        disallow: ['/'],
      },
      {
        userAgent: 'Claude-Web',
        disallow: ['/'],
      },
      // Block common bad bots
      {
        userAgent: 'AhrefsBot',
        crawlDelay: 10,
      },
      {
        userAgent: 'SemrushBot',
        crawlDelay: 10,
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}

