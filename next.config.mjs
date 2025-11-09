/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    eslint: {
      ignoreDuringBuilds: true,
    },
    
    // Optimización de imágenes
    images: {
      domains: [
        'gateway.pinata.cloud',
        'ipfs.io',
        'cloudflare-ipfs.com',
      ],
      formats: ['image/avif', 'image/webp'],
    },
    
    // Variables de entorno públicas
    env: {
      NEXT_PUBLIC_SUI_NETWORK: process.env.NEXT_PUBLIC_SUI_NETWORK,
      NEXT_PUBLIC_SUI_RPC_URL: process.env.NEXT_PUBLIC_SUI_RPC_URL,
      NEXT_PUBLIC_PACKAGE_ID: process.env.NEXT_PUBLIC_PACKAGE_ID,
      NEXT_PUBLIC_MARKET_ID: process.env.NEXT_PUBLIC_MARKET_ID,
      NEXT_PUBLIC_PINATA_GATEWAY: process.env.NEXT_PUBLIC_PINATA_GATEWAY,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    },
    
    // Configuración de Webpack
    webpack: (config, { isServer }) => {
      // Solución para módulos de Node.js en el cliente
      if (!isServer) {
        config.resolve.fallback = {
          ...config.resolve.fallback,
          fs: false,
          net: false,
          tls: false,
          crypto: false,
        };
        config.resolve.alias = {
          ...(config.resolve.alias || {}),
          process: 'process/browser',
        };
      }
      
      return config;
    },
    
    // Configuración experimental
    experimental: {
      optimizePackageImports: ['@mui/material', '@mui/icons-material'],
    },
    
    // Headers de seguridad
    async headers() {
      return [
        {
          source: '/:path*',
          headers: [
            {
              key: 'X-DNS-Prefetch-Control',
              value: 'on',
            },
            {
              key: 'Strict-Transport-Security',
              value: 'max-age=63072000; includeSubDomains; preload',
            },
            {
              key: 'X-Content-Type-Options',
              value: 'nosniff',
            },
            {
              key: 'X-Frame-Options',
              value: 'SAMEORIGIN',
            },
            {
              key: 'Referrer-Policy',
              value: 'no-referrer',
            },
            {
              key: 'Permissions-Policy',
              value: 'camera=(), microphone=(), geolocation=()',
            },
            {
              key: 'Content-Security-Policy',
              value: [
                "default-src 'self'",
                "base-uri 'self'",
                "form-action 'self'",
                "frame-ancestors 'self'",
                // Allow rendering protected content via blob: iframe when needed
                "frame-src 'self' blob:",
                "img-src 'self' data: blob: https: gateway.pinata.cloud ipfs.io cloudflare-ipfs.com",
                // Allow media playback from blob URIs (video/audio) and HTTPS
                "media-src 'self' blob: https: data:",
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
                "style-src 'self' 'unsafe-inline' https:",
                "font-src 'self' https: data:",
                "connect-src 'self' https: wss:"
              ].join('; '),
            },
          ],
        },
      ];
    },
  };
  
  // ✅ CORRECTO: Export ES Module
  export default nextConfig;