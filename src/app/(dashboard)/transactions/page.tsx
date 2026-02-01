'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Import } from 'lucide-react';
import { AddTransactionDialog } from '@/components/forms/add-transaction';
import { CsvImportDialog } from '@/components/forms/csv-import-dialog';
import { TransactionTable } from '@/components/tables/transaction-table';
import { usePortfolioStore } from '@/lib/stores/portfolio';

export default function TransactionsPage() {
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const { currentPortfolio } = usePortfolioStore();

  // Portfolio ID for import operations (null if none selected)
  const portfolioId = currentPortfolio?.id ?? null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground">
            Track your investment activity
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setImportDialogOpen(true)}
          >
            <Import className="mr-2 h-4 w-4" />
            Import CSV
          </Button>
          <AddTransactionDialog />
        </div>
      </div>

      <TransactionTable />

      <CsvImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        portfolioId={portfolioId}
      />
    </div>
  );
}
