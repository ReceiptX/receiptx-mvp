import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  productionBrowserSourceMaps: false,
  
  // Disable TypeScript build errors for Netlify deployment
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // Skip ESLint during builds to prevent memory issues
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Optimize images
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'api.ocr.space',
      },
    ],
  },
  
  // Enable experimental features
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
  
  // Production optimizations
  compress: true,
  poweredByHeader: false,
  
  // Turbopack configuration (Next.js 16 default bundler)
  turbopack: {
    // Empty config to acknowledge Turbopack is being used
    // This silences the webpack config warning
  },
};

export default nextConfig;
