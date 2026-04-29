import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import { ChatWidget } from '@/components/assistant/chat-widget';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

// Proper mobile viewport — no zoom restriction (user can still pinch-zoom for accessibility).
// iOS auto-zoom on input focus is prevented by font-size: 16px in globals.css instead.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',   // respect iPhone notch/home-indicator safe areas
};

export const metadata: Metadata = {
  title: {
    default: 'TaskPilot — IT Helpdesk Automation',
    template: '%s | TaskPilot',
  },
  description:
    'Production-ready PowerShell automation scripts for solo IT admins and small teams. Set up 4 real automations in under 60 minutes.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://taskpilot.vercel.app'),
  openGraph: {
    title: 'TaskPilot — IT Helpdesk Automation',
    description: 'Put your IT on autopilot. 7 ready-to-deploy scripts for $19.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TaskPilot — IT Helpdesk Automation',
    description: 'Put your IT on autopilot. 7 ready-to-deploy scripts for $19.',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans bg-black text-white antialiased`}>
        {children}
        <ChatWidget />
        <Analytics />
      </body>
    </html>
  );
}
