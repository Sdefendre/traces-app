'use client';

import dynamic from 'next/dynamic';

// Dynamic import to avoid SSR issues with Three.js and Electron APIs
const AppShell = dynamic(
  () => import('@/components/layout/AppShell').then((m) => ({ default: m.AppShell })),
  { ssr: false }
);

export default function Home() {
  return <AppShell />;
}
