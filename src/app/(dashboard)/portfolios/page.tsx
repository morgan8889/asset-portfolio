'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { usePortfolioStore } from '@/lib/stores/portfolio';
import { PortfoliosTable } from '@/components/portfolio/portfolios-table';
import { useState, useEffect } from 'react';
import { CreatePortfolioDialog } from '@/components/forms/create-portfolio';

export default function PortfoliosPage() {
  const router = useRouter();
  const { portfolios, error, loading } = usePortfolioStore();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Load portfolios from IndexedDB on mount
  useEffect(() => {
    let isMounted = true;
    const { loadPortfolios } = usePortfolioStore.getState();

    async function load() {
      if (isMounted) {
        await loadPortfolios();
      }
    }

    load();

    // Cleanup function to prevent setting state on unmounted component
    return () => {
      isMounted = false;
    };
  }, []);

  const handleViewPortfolio = (portfolioId: string) => {
    const portfolio = portfolios.find((p) => p.id === portfolioId);
    if (portfolio) {
      usePortfolioStore.getState().setCurrentPortfolio(portfolio);
      router.push('/');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Portfolios</h1>
          <p className="text-muted-foreground">
            Manage your investment portfolios
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Portfolio
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">Error: {error}</p>
        </div>
      )}

      {!error && portfolios.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <h3 className="text-lg font-semibold">No portfolios yet</h3>
          <p className="mb-4 mt-2 text-sm text-muted-foreground">
            Get started by creating your first portfolio
          </p>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Your First Portfolio
          </Button>
        </div>
      ) : (
        <PortfoliosTable onView={handleViewPortfolio} />
      )}

      <CreatePortfolioDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  );
}
