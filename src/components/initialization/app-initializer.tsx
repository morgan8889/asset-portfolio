'use client';

import { useEffect, useState } from 'react';
import { initializePortfolioApp } from '@/lib/db';

interface AppInitializerProps {
  children: React.ReactNode;
}

export function AppInitializer({ children }: AppInitializerProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        await initializePortfolioApp();
        setIsInitialized(true);
      } catch (err) {
        console.error('Failed to initialize app:', err);
        setError(err instanceof Error ? err.message : 'Initialization failed');
        // Still allow the app to load even if initialization fails
        setIsInitialized(true);
      }
    };

    initialize();
  }, []);

  if (!isInitialized) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <div className="text-lg">Initializing portfolio tracker...</div>
        </div>
      </div>
    );
  }

  if (error) {
    // Log error but don't block the app
    console.warn('App initialization warning:', error);
  }

  return <>{children}</>;
}