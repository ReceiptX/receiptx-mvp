import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  productionBrowserSourceMaps: false,
  
  // Disable TypeScript build errors for Netlify deployment
  typescript: {
    ignoreBuildErrors: false,
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
  
  // Server external packages (moved from experimental in Next.js 16)
  serverExternalPackages: [
    '@reown/appkit',
    '@reown/appkit-utils',
    '@reown/appkit-controllers',
    'thread-stream',
    'pino',
  ],
  
  // Enable experimental features
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
  
  // Webpack configuration to skip problematic files
  webpack: (config, { isServer }) => {
    // Ignore README and other non-code files from node_modules
    config.module.rules.push({
      test: /\.md$/,
      type: 'asset/source',
    });
    
    // Ignore specific problematic files
    config.resolve.alias = {
      ...config.resolve.alias,
    };
    
    // Don't try to parse README files as modules
    config.module.noParse = /README\.md$/;

    return config;
  },
  
  // Production optimizations
  compress: true,
  poweredByHeader: false,
  
  // Turbopack configuration (Next.js 16 default bundler)
  turbopack: {
    resolveExtensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
  },
  
  // Transpile problematic packages
  transpilePackages: [
    '@privy-io/react-auth',
  ],
  
  // Enable experimental features
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
};

export default nextConfig;
