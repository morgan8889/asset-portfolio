'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Transaction } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getTransactionTypeBadge } from '@/components/tables/transaction-table';

interface DeleteTransactionDialogProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function DeleteTransactionDialog({
  transaction,
  open,
  onOpenChange,
  onConfirm,
}: DeleteTransactionDialogProps) {
  if (!transaction) return null;

  const total = parseFloat(transaction.totalAmount.toString());

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Transaction?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                This action cannot be undone. This will permanently delete this
                transaction and recalculate your holdings.
              </p>

              {/* Transaction details for verification */}
              <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    Asset:
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    {transaction.assetId}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    Type:
                  </span>
                  {getTransactionTypeBadge(transaction.type)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    Date:
                  </span>
                  <span className="text-sm text-foreground">
                    {formatDate(transaction.date)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    Quantity:
                  </span>
                  <span className="text-sm text-foreground">
                    {transaction.quantity.toString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    Price:
                  </span>
                  <span className="text-sm text-foreground">
                    {formatCurrency(parseFloat(transaction.price.toString()))}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t pt-2">
                  <span className="text-sm font-semibold text-foreground">
                    Total:
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete Transaction
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
