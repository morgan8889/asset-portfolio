'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import {
  Menu,
  Moon,
  Sun,
  Settings,
  User,
  WifiOff,
  RefreshCw,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useUIStore, usePriceStore } from '@/lib/stores';

export function Header() {
  const { theme, setTheme } = useTheme();
  const { toggleSidebar } = useUIStore();
  const { isOnline, refreshAllPrices, loading: priceLoading } = usePriceStore();
  const [mounted, setMounted] = useState(false);

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="md:hidden"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle sidebar</span>
          </Button>

          <div className="flex items-center space-x-2">
            <div className="h-6 w-6 rounded bg-primary" />
            <span className="hidden font-bold sm:inline-block">
              Portfolio Tracker
            </span>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="flex items-center space-x-1">
            {/* Offline Indicator */}
            {mounted && !isOnline && (
              <div className="flex items-center gap-1.5 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                <WifiOff className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Offline</span>
              </div>
            )}

            {/* Manual Refresh Button */}
            {mounted && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => refreshAllPrices()}
                disabled={priceLoading || !isOnline}
                aria-label="Refresh prices"
                title={isOnline ? 'Refresh prices' : 'Offline'}
              >
                <RefreshCw
                  className={`h-5 w-5 ${priceLoading ? 'animate-spin' : ''}`}
                />
              </Button>
            )}

            {mounted && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </Button>
            )}

            <Button variant="ghost" size="icon" aria-label="Settings">
              <Settings className="h-5 w-5" />
            </Button>

            <Button variant="ghost" size="icon" aria-label="User menu">
              <User className="h-5 w-5" />
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
}
