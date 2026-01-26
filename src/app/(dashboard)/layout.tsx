'use client';

import { useEffect } from 'react';

import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { AppInitializer } from '@/components/initialization/app-initializer';
import { useUIStore } from '@/lib/stores';
import { initializeDatabase } from '@/lib/db';
import { cn } from '@/lib/utils';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sidebarOpen } = useUIStore();

  useEffect(() => {
    // Initialize database when the app starts
    initializeDatabase().catch((error) => {
      console.error('Failed to initialize database:', error);
    });
  }, []);

  return (
    <AppInitializer>
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex">
          <Sidebar />
          <main
            className={cn(
              'flex-1 transition-all duration-300 ease-in-out',
              // On mobile (< 768px), no margin; sidebar is hidden or overlay
              // On desktop, use sidebar-dependent margin
              'ml-0 md:ml-16',
              sidebarOpen && 'md:ml-64'
            )}
          >
            <div className="container mx-auto p-6">{children}</div>
          </main>
        </div>
      </div>
    </AppInitializer>
  );
}
