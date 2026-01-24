'use client';

import { Button } from '@/components/ui/button';
import { CreatePortfolioDialog } from '@/components/forms/create-portfolio';
import { RefreshCw } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
}

export function DashboardLoadingState({ message = 'Loading portfolio data...' }: LoadingStateProps) {
  return (
    <div className="flex h-96 items-center justify-center">
      <div className="flex items-center gap-3">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <div className="text-lg">{message}</div>
      </div>
    </div>
  );
}

interface ErrorStateProps {
  error: string;
  onRetry: () => void;
}

export function DashboardErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <div className="flex h-96 items-center justify-center">
      <div className="text-center">
        <div className="text-lg text-red-600 mb-2">Error: {error}</div>
        <Button onClick={onRetry} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    </div>
  );
}

export function DashboardEmptyState() {
  return (
    <div className="flex h-96 items-center justify-center">
      <div className="text-center space-y-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Welcome to Portfolio Tracker</h2>
          <p className="text-muted-foreground max-w-md">
            Create your first portfolio to start tracking your investments and
            analyzing your financial performance.
          </p>
        </div>
        <div className="flex gap-2 justify-center">
          <CreatePortfolioDialog />
          <Button variant="outline">Import Data</Button>
        </div>
      </div>
    </div>
  );
}
