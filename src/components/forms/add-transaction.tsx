'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';
import { Decimal } from 'decimal.js';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useTransactionStore, usePortfolioStore } from '@/lib/stores';
import {
  showSuccessNotification,
  showErrorNotification,
} from '@/lib/stores/ui';
import {
  Transaction,
  ESPPTransactionMetadata,
  RSUTransactionMetadata,
} from '@/types';
import { assetQueries } from '@/lib/db';
import {
  transactionSchema,
  transactionTypes,
  type TransactionFormValues,
} from './transaction-schema';
import { TransactionFormFields } from './transaction-form-fields';

interface TransactionDialogProps {
  mode?: 'create' | 'edit';
  transaction?: Transaction;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

/**
 * TransactionDialog component
 *
 * Can be used in controlled or uncontrolled mode:
 *
 * Uncontrolled (component manages its own state):
 * ```tsx
 * <TransactionDialog trigger={<Button>Add Transaction</Button>} />
 * ```
 *
 * Controlled (parent manages state):
 * ```tsx
 * <TransactionDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   mode="edit"
 *   transaction={selectedTransaction}
 * />
 * ```
 */
function TransactionDialog({
  mode = 'create',
  transaction,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  trigger,
}: TransactionDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingAsset, setLoadingAsset] = useState(false);
  const { createTransaction, updateTransaction, importing } =
    useTransactionStore();
  const { currentPortfolio } = usePortfolioStore();

  // Use controlled state if provided, otherwise use internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen =
    controlledOnOpenChange !== undefined
      ? controlledOnOpenChange
      : setInternalOpen;

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues:
      mode === 'edit' && transaction
        ? {
            type: transaction.type,
            assetSymbol: transaction.assetId,
            assetName: '',
            date: new Date(transaction.date),
            quantity: transaction.quantity.toString(),
            price: transaction.price.toString(),
            fees: transaction.fees.toString(),
            notes: transaction.notes || '',
            grantDate: undefined,
            marketPriceAtGrant: '',
            marketPriceAtPurchase: '',
            discountPercent: '',
            vestingDate: undefined,
            grossSharesVested: '',
            sharesWithheld: '',
            vestingPrice: '',
            taxWithheldAmount: '',
          }
        : {
            type: 'buy',
            assetSymbol: '',
            assetName: '',
            date: new Date(),
            quantity: '',
            price: '',
            fees: '0',
            notes: '',
            grantDate: undefined,
            marketPriceAtGrant: '',
            marketPriceAtPurchase: '',
            discountPercent: '',
            vestingDate: undefined,
            grossSharesVested: '',
            sharesWithheld: '',
            vestingPrice: '',
            taxWithheldAmount: '',
          },
    mode: 'onChange',
  });

  const {
    handleSubmit,
    formState: { isValid },
    reset,
    setValue,
    watch,
  } = form;

  // Load asset symbol when dialog opens in edit mode
  useEffect(() => {
    if (!open || mode !== 'edit' || !transaction) return;

    let cancelled = false;
    const controller = new AbortController();

    setLoadingAsset(true);

    assetQueries
      .getById(transaction.assetId)
      .then((asset) => {
        if (cancelled || controller.signal.aborted) return;
        if (!asset) {
          console.error('Asset not found:', transaction.assetId);
          return;
        }
        setValue('assetSymbol', asset.symbol, { shouldValidate: true });
        setValue('assetName', asset.name || '');
      })
      .catch((error) => {
        if (!cancelled && !controller.signal.aborted) {
          console.error('Failed to load asset:', error);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingAsset(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [open, mode, transaction, setValue]);

  const watchedType = watch('type');
  const watchedQuantity = watch('quantity');
  const watchedPrice = watch('price');
  const watchedFees = watch('fees');

  const calculateTotal = () => {
    const quantity = parseFloat(watchedQuantity || '0');
    const price = parseFloat(watchedPrice || '0');
    const fees = parseFloat(watchedFees || '0');

    const subtotal = quantity * price;
    return watchedType === 'buy' ? subtotal + fees : subtotal - fees;
  };

  // Resolve asset by symbol, creating if needed
  const resolveAsset = async (
    symbol: string,
    name?: string,
    price?: number
  ) => {
    const existing = await assetQueries.getBySymbol(symbol);
    if (existing) return existing;

    try {
      const id = await assetQueries.create({
        symbol: symbol.toUpperCase(),
        name: name || symbol.toUpperCase(),
        type: 'stock',
        exchange: '',
        currency: 'USD',
        currentPrice: price ?? 0,
        metadata: {},
      });
      return assetQueries.getById(id);
    } catch (error) {
      // Handle race condition - asset might have been created between check and create
      const retryExisting = await assetQueries.getBySymbol(symbol);
      if (retryExisting) return retryExisting;
      throw error;
    }
  };

  const onSubmit = async (data: TransactionFormValues) => {
    if (!currentPortfolio) {
      showErrorNotification(
        'No Portfolio Selected',
        'Please select a portfolio first'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const quantity = new Decimal(data.quantity);
      const price = new Decimal(data.price);
      const transactionData: Omit<Transaction, 'id' | 'portfolioId' | 'assetId' | 'currency'> = {
        type: data.type as Transaction['type'],
        date: data.date,
        quantity,
        price,
        totalAmount: quantity.mul(price),
        fees: new Decimal(data.fees || '0'),
        notes: data.notes || '',
      };

      // Add ESPP metadata if applicable
      if (data.type === 'espp_purchase') {
        const marketPriceAtPurchase = new Decimal(
          data.marketPriceAtPurchase || '0'
        );
        const bargainElement = marketPriceAtPurchase.minus(price);

        const esppMetadata: ESPPTransactionMetadata = {
          grantDate: data.grantDate!.toISOString(),
          purchaseDate: data.date.toISOString(),
          marketPriceAtGrant: data.marketPriceAtGrant || '0',
          marketPriceAtPurchase: data.marketPriceAtPurchase || '0',
          discountPercent: parseFloat(data.discountPercent || '0'),
          bargainElement: bargainElement.toString(),
        };
        transactionData.metadata = esppMetadata;
      }

      // Add RSU metadata if applicable
      if (data.type === 'rsu_vest') {
        const rsuMetadata: RSUTransactionMetadata = {
          vestingDate: data.vestingDate!.toISOString(),
          grossSharesVested: data.grossSharesVested || '0',
          sharesWithheld: data.sharesWithheld || '0',
          netShares: quantity.toString(),
          vestingPrice: data.vestingPrice || '0',
          taxWithheldAmount: data.taxWithheldAmount,
        };
        transactionData.metadata = rsuMetadata;
      }

      const asset = await resolveAsset(
        data.assetSymbol,
        data.assetName,
        parseFloat(data.price)
      );

      if (mode === 'edit' && transaction && asset) {
        await updateTransaction(transaction.id, {
          ...transactionData,
          assetId: asset.id,
        });
        showSuccessNotification(
          'Transaction Updated',
          `Successfully updated transaction for ${asset.symbol}`
        );
      } else if (asset) {
        await createTransaction({
          ...transactionData,
          portfolioId: currentPortfolio.id!,
          assetId: asset.id,
          currency: currentPortfolio.currency || 'USD',
        });
        showSuccessNotification(
          'Transaction Added',
          `Successfully added ${data.type} transaction for ${asset.symbol}`
        );
      }

      setOpen(false);
      reset();
    } catch (error) {
      const action = mode === 'edit' ? 'update' : 'add';
      console.error(`Failed to ${action} transaction:`, error);

      const errorMessage =
        error instanceof Error ? error.message : 'Please try again.';

      showErrorNotification(`Failed to ${action} transaction`, errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedTypeInfo = transactionTypes.find(
    (t) => t.value === watchedType
  );

  const dialogTitle =
    mode === 'edit' ? 'Edit Transaction' : 'Add New Transaction';
  const submitButtonText =
    mode === 'edit' ? 'Update Transaction' : 'Add Transaction';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      {!trigger && mode === 'create' && (
        <DialogTrigger asChild>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Transaction
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        {loadingAsset ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-muted-foreground">Loading asset data...</div>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {dialogTitle}
                {selectedTypeInfo && (
                  <Badge className={selectedTypeInfo.color} variant="secondary">
                    {selectedTypeInfo.label}
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription>
                {mode === 'edit'
                  ? 'Update the transaction details below. All fields marked with * are required.'
                  : 'Add a new transaction to your portfolio. All fields marked with * are required.'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <TransactionFormFields
                form={form}
                calculateTotal={calculateTotal}
              />

              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setOpen(false);
                    reset();
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!isValid || isSubmitting || importing}
                  className="min-w-[100px]"
                >
                  {importing
                    ? 'Import in progress...'
                    : isSubmitting
                      ? mode === 'edit'
                        ? 'Updating...'
                        : 'Adding...'
                      : submitButtonText}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Export wrapper for backward compatibility
export function AddTransactionDialog() {
  return <TransactionDialog mode="create" />;
}

// Export the full component for edit mode usage
export { TransactionDialog };
