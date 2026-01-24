'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AddTransactionDialog } from '@/components/forms/add-transaction';
import { getTransactionTypeBadge } from '@/components/tables/transaction-table';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Activity, Calendar } from 'lucide-react';
import { useDashboardContext } from './DashboardProvider';
import { Transaction } from '@/types';

export function RecentActivity() {
  // Use recentTransactions from context (already sorted and limited to 5)
  const { transactions, recentTransactions, transactionsLoading } = useDashboardContext();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {transactionsLoading ? (
          <LoadingState />
        ) : recentTransactions.length === 0 ? (
          <EmptyState />
        ) : (
          <TransactionList
            recentTransactions={recentTransactions}
            totalCount={transactions.length}
          />
        )}
      </CardContent>
    </Card>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="flex items-center gap-3">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        <div>Loading activity...</div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center text-muted-foreground py-8">
      <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
      <p className="text-lg font-medium mb-2">No recent activity</p>
      <p className="text-sm">Add your first transaction to see activity here</p>
      <div className="mt-4">
        <AddTransactionDialog />
      </div>
    </div>
  );
}

interface TransactionListProps {
  recentTransactions: Transaction[];
  totalCount: number;
}

function TransactionList({ recentTransactions, totalCount }: TransactionListProps) {
  return (
    <div className="space-y-4">
      {recentTransactions.map((transaction) => (
        <div
          key={transaction.id}
          className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{transaction.assetId}</span>
                {getTransactionTypeBadge(transaction.type)}
              </div>
              <div className="text-sm text-muted-foreground">{formatDate(transaction.date)}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-medium">
              {formatCurrency(Number(transaction.totalAmount))}
            </div>
            <div className="text-sm text-muted-foreground">
              {transaction.quantity.toString()} shares
            </div>
          </div>
        </div>
      ))}
      {totalCount > 5 && (
        <div className="text-center pt-2">
          <Button variant="outline" size="sm">
            View All Transactions
          </Button>
        </div>
      )}
    </div>
  );
}
