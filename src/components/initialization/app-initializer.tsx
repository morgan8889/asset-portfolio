'use client';

import { useEffect, useState } from 'react';
import { initializePortfolioApp } from '@/lib/db';

interface AppInitializerProps {
  children: React.ReactNode;
}

// Keep track of initialization globally to prevent multiple initializations
let globalInitializationPromise: Promise<void> | null = null;
let globalInitializationComplete = false;

export function AppInitializer({ children }: AppInitializerProps) {
  // Start as initialized if global initialization already completed
  const [isInitialized, setIsInitialized] = useState(globalInitializationComplete);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initialize = async () => {
      // If already initialized globally, just update local state
      if (globalInitializationComplete) {
        setIsInitialized(true);
        return;
      }

      try {
        // Use global promise to ensure only one initialization happens
        if (!globalInitializationPromise) {
          globalInitializationPromise = initializePortfolioApp();
        }
        await globalInitializationPromise;
        globalInitializationComplete = true;
        setIsInitialized(true);
      } catch (err) {
        console.error('Failed to initialize app:', err);
        setError(err instanceof Error ? err.message : 'Initialization failed');
        // Still allow the app to load even if initialization fails
        globalInitializationComplete = true;
        setIsInitialized(true);
      }
    };

    initialize();
  }, []);

  if (!isInitialized) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
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
