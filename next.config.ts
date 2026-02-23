import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
  // Disable SSR — everything is client-side inside Electron
  typescript: { ignoreBuildErrors: false },
};

export default nextConfig;
