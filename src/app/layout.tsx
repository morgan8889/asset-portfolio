import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from 'next-themes';

import '@/styles/globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: {
    default: 'Portfolio Tracker',
    template: '%s | Portfolio Tracker',
  },
  description:
    'A modern, privacy-first financial portfolio tracking application with interactive visualizations for multi-asset investment management and financial planning.',
  keywords: [
    'portfolio',
    'investment',
    'finance',
    'tracking',
    'stocks',
    'crypto',
    'etf',
    'trading',
    'analytics',
  ],
  authors: [
    {
      name: 'Portfolio Tracker Team',
    },
  ],
  creator: 'Portfolio Tracker Team',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://portfoliotracker.app',
    title: 'Portfolio Tracker',
    description:
      'A modern, privacy-first financial portfolio tracking application',
    siteName: 'Portfolio Tracker',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Portfolio Tracker',
    description:
      'A modern, privacy-first financial portfolio tracking application',
    creator: '@portfoliotracker',
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
  metadataBase: new URL('https://portfoliotracker.app'),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
