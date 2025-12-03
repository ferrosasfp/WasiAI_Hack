import {createRequire} from 'module';
import createNextIntlPlugin from 'next-intl/plugin';
const require = createRequire(import.meta.url);

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    // Transpile ESM packages that may require bundling through Next
    transpilePackages: [
      '@mysten/dapp-kit',
      '@radix-ui/primitive',
      '@radix-ui/react-slot',
      '@radix-ui/react-compose-refs',
      '@radix-ui/react-context',
      '@radix-ui/react-id',
      '@radix-ui/react-use-controllable-state',
      '@radix-ui/react-dismissable-layer',
      '@radix-ui/react-focus-scope',
      '@radix-ui/react-focus-guards',
      '@radix-ui/react-portal',
      '@radix-ui/react-presence',
      '@radix-ui/react-primitive',
      '@radix-ui/react-menu',
      '@radix-ui/react-popper',
      '@radix-ui/react-roving-focus',
      '@radix-ui/react-use-callback-ref',
      '@radix-ui/react-use-escape-keydown',
      '@radix-ui/react-use-layout-effect',
      '@radix-ui/react-use-size',
      '@radix-ui/react-collection',
      '@radix-ui/react-arrow',
      '@floating-ui/react-dom',
      '@floating-ui/dom'
    ],
    eslint: {
      ignoreDuringBuilds: true,
    },
    
    // Optimización de imágenes
    images: {
      remotePatterns: [
        {
          protocol: 'http',
          hostname: 'localhost',
          pathname: '/api/ipfs/**',
        },
        {
          protocol: 'https',
          hostname: 'gateway.pinata.cloud',
          pathname: '/ipfs/**',
        },
        {
          protocol: 'https',
          hostname: 'ipfs.io',
          pathname: '/ipfs/**',
        },
        {
          protocol: 'https',
          hostname: 'cloudflare-ipfs.com',
          pathname: '/ipfs/**',
        },
        {
          protocol: 'https',
          hostname: 'images.unsplash.com',
          pathname: '/**',
        },
      ],
      formats: ['image/avif', 'image/webp'],
      deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
      imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
      minimumCacheTTL: 60 * 60 * 24 * 7, // 7 days
      dangerouslyAllowSVG: true,
      contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
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
      // Fallbacks sólo para cliente
      if (!isServer) {
        config.resolve.fallback = {
          ...config.resolve.fallback,
          fs: false,
          net: false,
          tls: false,
          crypto: false,
          ws: false,
        };
      }

      // Aliases compartidos (server y client)
      const sharedAliases = {
        process: 'process/browser',
        '@react-native-async-storage/async-storage': false,
      };
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        ...sharedAliases,
      };

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

    // Redirects para forzar uso de rutas con locale
    async redirects() {
      return [
        {
          source: '/publish/wizard/:path*',
          destination: '/en/publish/wizard/:path*',
          permanent: false,
          locale: false,
        },
        {
          source: '/models/:path*',
          destination: '/en/models/:path*',
          permanent: false,
          locale: false,
        },
        {
          source: '/evm/:path*',
          destination: '/en/evm/:path*',
          permanent: false,
          locale: false,
        },
        {
          source: '/licenses',
          destination: '/en/licenses',
          permanent: false,
          locale: false,
        },
        {
          source: '/',
          destination: '/en',
          permanent: false,
          locale: false,
        },
      ]
    },
  };
  
  // ✅ Export con plugin next-intl para detección de config
  const withNextIntl = createNextIntlPlugin();
  export default withNextIntl(nextConfig);