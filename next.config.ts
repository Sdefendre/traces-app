import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Static export for production (Electron loads from /out). Omit in dev so API routes work.
  ...(process.env.BUILD_STATIC === '1' && { output: 'export' }),
  images: { unoptimized: true },
  typescript: { ignoreBuildErrors: false },
  // The sidebar's Settings gear lives bottom-left; keep the dev overlay badge off it.
  devIndicators: { position: 'bottom-right' },
};

export default nextConfig;
