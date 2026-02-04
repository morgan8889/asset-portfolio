'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { usePortfolioStore } from '@/lib/stores';
import { transactionQueries } from '@/lib/db/queries';
import { logger } from '@/lib/utils/logger';

interface DeletePortfolioDialogProps {
  portfolio: {
    id: string;
    name: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLastPortfolio?: boolean;
}

export function DeletePortfolioDialog({
  portfolio,
  open,
  onOpenChange,
  isLastPortfolio = false,
}: DeletePortfolioDialogProps) {
  const { deletePortfolio } = usePortfolioStore();
  const [isDeleting, setIsDeleting] = useState(false);
  const [transactionCount, setTransactionCount] = useState(0);
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  // Load transaction count when dialog opens
  useEffect(() => {
    if (open && portfolio) {
      transactionQueries
        .countByPortfolio(portfolio.id)
        .then(setTransactionCount)
        .catch((error) => {
          logger.error('Failed to count transactions:', error);
          setTransactionCount(0);
        });
    } else {
      // Reset state when dialog closes
      setConfirmChecked(false);
      setConfirmText('');
      setTransactionCount(0);
    }
  }, [open, portfolio]);

  if (!portfolio) return null;

  // Determine confirmation level based on transaction count
  const confirmationLevel =
    transactionCount === 0
      ? 'simple' // Just a confirm button
      : transactionCount <= 10
      ? 'checkbox' // Checkbox confirmation
      : 'typed'; // Must type portfolio name

  const canDelete =
    confirmationLevel === 'simple' ||
    (confirmationLevel === 'checkbox' && confirmChecked) ||
    (confirmationLevel === 'typed' && confirmText === portfolio.name);

  const handleDelete = async () => {
    if (!canDelete) return;

    try {
      setIsDeleting(true);
      await deletePortfolio(portfolio.id);
      onOpenChange(false);
    } catch (error) {
      logger.error('Failed to delete portfolio:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Delete Portfolio
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Last portfolio warning */}
          {isLastPortfolio && (
            <div className="rounded-md bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-yellow-400 dark:text-yellow-600" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Last Portfolio
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                    <p>
                      This is your last portfolio. Deleting it will leave you
                      with no portfolios to track. You'll need to create a new
                      portfolio to continue using the application.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Portfolio info */}
          <div className="rounded-md bg-gray-50 dark:bg-gray-900 p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              You are about to delete:
            </p>
            <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
              {portfolio.name}
            </p>
            {transactionCount > 0 && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                This portfolio contains {transactionCount} transaction
                {transactionCount !== 1 ? 's' : ''}. All transactions will be
                permanently deleted.
              </p>
            )}
          </div>

          {/* Confirmation UI based on transaction count */}
          {confirmationLevel === 'checkbox' && (
            <div className="flex items-start space-x-2">
              <Checkbox
                id="confirm-delete"
                checked={confirmChecked}
                onCheckedChange={(checked) => setConfirmChecked(checked === true)}
              />
              <Label
                htmlFor="confirm-delete"
                className="text-sm font-normal cursor-pointer"
              >
                I understand that this will permanently delete this portfolio
                and all its transactions.
              </Label>
            </div>
          )}

          {confirmationLevel === 'typed' && (
            <div className="space-y-2">
              <Label htmlFor="confirm-name" className="text-sm font-medium">
                To confirm deletion, type the portfolio name:{' '}
                <span className="font-semibold text-red-600">
                  {portfolio.name}
                </span>
              </Label>
              <Input
                id="confirm-name"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type portfolio name"
                className="font-mono"
              />
              {confirmText && confirmText !== portfolio.name && (
                <p className="text-sm text-red-600">
                  Name doesn't match. Please type exactly: {portfolio.name}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={!canDelete || isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Portfolio
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
