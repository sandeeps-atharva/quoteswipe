import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow ngrok and other dev origins for cross-origin requests
  allowedDevOrigins: [
    "cc9f056fba92.ngrok-free.app",
    "https://cc9f056fba92.ngrok-free.app",
  ],
};

export default nextConfig;
