import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

import { ThemeProvider } from '@/components/ThemeProvider';
import { CommandPalette } from '@/components/CommandPalette';

export const metadata: Metadata = {
  title: 'TortuCord • Next-Gen Discord Automation Platform',
  description:
    'High-performance Discord bot cloud platform with onboarding, auto-roles, reaction roles, automod, leveling, and visual embed builder.',
  icons: {
    icon: '/logo.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased selection:bg-turtle-500/30 selection:text-turtle-300">
        <ThemeProvider>
          <div className="relative min-h-screen flex flex-col">
            {children}
          </div>
          <CommandPalette />
        </ThemeProvider>
      </body>
    </html>
  );
}
