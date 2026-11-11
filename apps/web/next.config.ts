import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../../'),
  transpilePackages: ['@tortuga/config', '@tortuga/database'],
  env: {
    NEXT_PUBLIC_DISCORD_CLIENT_ID:
      process.env.DISCORD_CLIENT_ID ||
      process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID ||
      '1544977635803799605',
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.discordapp.com',
      },
    ],
  },
};

export default nextConfig;
