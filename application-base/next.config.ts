import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Movido de experimental a raíz según Next.js 15
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],
};

export default nextConfig;
