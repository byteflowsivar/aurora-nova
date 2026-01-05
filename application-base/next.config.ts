import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Movido de experimental a raíz según Next.js 15
  serverExternalPackages: [
    '@prisma/client',
    'bcryptjs',
    'pino',
    'pino-pretty',
    'thread-stream',
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '9000',
        pathname: '/products/**',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
