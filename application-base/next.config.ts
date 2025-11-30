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
};

export default nextConfig;
