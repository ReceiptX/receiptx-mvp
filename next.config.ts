import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== 'production';

const scriptSrc = [
  "'self'",
  'https://auth.privy.io',
  'https://app.privy.io',
  'https://*.privy.io',
  "'unsafe-inline'", // allow inline scripts required by Privy/auth widgets
];
if (isDev) {
  scriptSrc.push("'unsafe-eval'", 'blob:');
}

const connectSrc = [
  "'self'",
  'https://*.supabase.co',
  'wss://*.supabase.co',
  'https://auth.privy.io',
  'https://api.privy.io',
  'https://api.ocr.space',
  'https://*.walletconnect.com',
];
if (isDev) {
  connectSrc.push('ws://localhost:3000', 'ws://127.0.0.1:3000');
}

const csp = [
  "default-src 'self';",
  `script-src ${scriptSrc.join(' ')};`,
  `connect-src ${connectSrc.join(' ')};`,
  "img-src 'self' data: blob: https://*.supabase.co https://images.privy.io;",
  "style-src 'self' 'unsafe-inline';",
  "font-src 'self' data:;",
  "frame-src https://auth.privy.io https://app.privy.io https://*.privy.io;",
  "base-uri 'self';",
  "form-action 'self';",
  "object-src 'none';",
  "upgrade-insecure-requests;",
].join(' ');

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: csp,
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(self), microphone=(), geolocation=(self)',
  },
  {
    key: 'Cross-Origin-Opener-Policy',
    value: 'same-origin-allow-popups',
  },
  {
    key: 'Cross-Origin-Embedder-Policy',
    value: 'require-corp',
  },
];

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

  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
  
};

export default nextConfig;
