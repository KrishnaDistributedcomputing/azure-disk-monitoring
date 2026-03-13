import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Azure Disk Monitoring — Single Pane of Glass',
  description: 'Disk performance monitoring POC for Azure Virtual Machines',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-900">{children}</body>
    </html>
  );
}
