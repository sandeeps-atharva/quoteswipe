import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow ngrok and other dev origins for cross-origin requests
  allowedDevOrigins: [
    "cc9f056fba92.ngrok-free.app",
    "https://cc9f056fba92.ngrok-free.app",
  ],
  
  // Optimize for production
  reactStrictMode: false, // Disable strict mode to prevent double renders
  
  // Reduce memory usage
  experimental: {
    optimizePackageImports: ['lucide-react', 'react-hot-toast'],
  },
};

export default nextConfig;
