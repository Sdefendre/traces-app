import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Static export for production (Electron loads from /out). Omit in dev so API routes work.
  ...(process.env.BUILD_STATIC === '1' && { output: 'export' }),
  images: { unoptimized: true },
  typescript: { ignoreBuildErrors: false },
};

export default nextConfig;
