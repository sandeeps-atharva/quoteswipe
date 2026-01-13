import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow ngrok and other dev origins for cross-origin requests
  allowedDevOrigins: [
    "cc9f056fba92.ngrok-free.app",
    "https://cc9f056fba92.ngrok-free.app",
  ],
  
  // Optimize for production
  reactStrictMode: false, // Disable strict mode to prevent double renders
  
  // Enable gzip/brotli compression for responses
  compress: true,
  
  // Reduce memory usage & optimize packages
  experimental: {
    optimizePackageImports: ['lucide-react', 'react-hot-toast'],
  },
  
  // Configure external image domains
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
        pathname: '/**',
      },
    ],
  },

  // Performance headers for API routes
  async headers() {
    return [
      {
        // API routes - enable caching
        source: '/api/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
        ],
      },
      {
        // Public data endpoints - aggressive caching
        source: '/api/(quotes|categories|initial-data)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=60, stale-while-revalidate=300' },
        ],
      },
    ];
  },
};

export default nextConfig;
