import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { PwaRegister } from '@/components/pwa/pwa-register';
import { AppBadgeSync } from '@/components/pwa/app-badge-sync';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Nexum',
  description: 'Property Management System',
  applicationName: 'Nexum',
  appleWebApp: { capable: true, title: 'Nexum', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0f172a',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <PwaRegister />
        <AuthProvider>
          <AppBadgeSync />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
