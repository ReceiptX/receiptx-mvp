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
    // Exclude problematic packages from server-side bundling
    serverComponentsExternalPackages: [
      'thread-stream',
      'pino',
      'pino-pretty',
      '@walletconnect/logger',
    ],
  },
  
  // Webpack configuration to skip problematic files
  webpack: (config) => {
    config.module.rules.push({
      test: /LICENSE|\.md|thread-stream\/test|\/bench\.js$/,
      use: 'null-loader',
    });

    return config;
  },
  
  // Production optimizations
  compress: true,
  poweredByHeader: false,
  
  // Turbopack configuration (Next.js 16 default bundler)
  turbopack: {
    // Turbopack doesn't support IgnorePlugin yet
    // This acknowledges Turbopack is being used
  },
  
  // Transpile problematic packages
  transpilePackages: [
    '@privy-io/react-auth',
    '@walletconnect/ethereum-provider',
  ],
};

export default nextConfig;
