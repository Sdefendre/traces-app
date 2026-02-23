import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Traces',
  description: 'Knowledge Management System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-void text-text-primary antialiased">
        {children}
      </body>
    </html>
  );
}
