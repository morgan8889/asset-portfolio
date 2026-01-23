'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Import } from 'lucide-react';
import { AddTransactionDialog } from '@/components/forms/add-transaction';
import { TransactionTable } from '@/components/tables/transaction-table';

export default function TransactionsPage() {
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
          <Button variant="outline">
            <Import className="mr-2 h-4 w-4" />
            Import CSV
          </Button>
          <AddTransactionDialog />
        </div>
      </div>

      <TransactionTable />
    </div>
  );
}