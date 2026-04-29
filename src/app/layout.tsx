import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import { ChatWidget } from '@/components/assistant/chat-widget';
import { ScrollToTop } from '@/components/ui/scroll-to-top';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: {
    default: 'TaskPilot — IT Helpdesk Automation',
    template: '%s | TaskPilot',
  },
  description:
    '9 production-ready PowerShell automation scripts for solo IT admins and small teams. Automate password resets, disk cleanup, user onboarding, health checks, and more.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://taskpilot.vercel.app'),
  openGraph: {
    title: 'TaskPilot — IT Helpdesk Automation',
    description: 'Put your IT on autopilot. 9 ready-to-deploy scripts for $19.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TaskPilot — IT Helpdesk Automation',
    description: 'Put your IT on autopilot. 9 ready-to-deploy scripts for $19.',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans bg-black text-white antialiased`}>
        {children}
        <ChatWidget />
        <ScrollToTop />
        <Analytics />
      </body>
    </html>
  );
}
