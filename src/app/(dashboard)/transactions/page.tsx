'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Import } from 'lucide-react';

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
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Transaction
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            No transactions found. Add your first transaction to get started.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}