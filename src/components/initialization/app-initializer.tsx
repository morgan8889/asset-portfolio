'use client';

import { useEffect, useState, useRef } from 'react';
import { initializePortfolioApp } from '@/lib/db';

interface AppInitializerProps {
  children: React.ReactNode;
}

// Keep track of initialization globally to prevent multiple initializations
let globalInitializationPromise: Promise<void> | null = null;

export function AppInitializer({ children }: AppInitializerProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initializationStarted = useRef(false);

  useEffect(() => {
    const initialize = async () => {
      // Prevent multiple initializations
      if (initializationStarted.current) {
        return;
      }
      initializationStarted.current = true;

      try {
        // Use global promise to ensure only one initialization happens
        if (!globalInitializationPromise) {
          globalInitializationPromise = initializePortfolioApp();
        }
        await globalInitializationPromise;
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