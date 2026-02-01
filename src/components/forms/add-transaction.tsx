'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Plus } from 'lucide-react';
import { Decimal } from 'decimal.js';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useTransactionStore, usePortfolioStore } from '@/lib/stores';
import { showSuccessNotification, showErrorNotification } from '@/lib/stores/ui';
import { Transaction, ESPPTransactionMetadata, RSUTransactionMetadata } from '@/types';
import { assetQueries } from '@/lib/db';
import { ESPPTransactionFormFields } from './espp-transaction-form';
import { RSUTransactionFormFields } from './rsu-transaction-form';
import { FormProvider } from 'react-hook-form';

const baseTransactionSchema = z.object({
  type: z.enum([
    'buy',
    'sell',
    'dividend',
    'interest',
    'split',
    'transfer_in',
    'transfer_out',
    'fee',
    'tax',
    'spinoff',
    'merger',
    'reinvestment',
    'espp_purchase',
    'rsu_vest',
  ]),
  assetSymbol: z
    .string()
    .min(1, 'Asset symbol is required')
    .max(10, 'Symbol too long'),
  assetName: z.string().optional(),
  date: z.date({
    required_error: 'Transaction date is required',
  }),
  quantity: z.string().refine(
    (val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    },
    {
      message: 'Quantity must be a positive number',
    }
  ),
  price: z.string().refine(
    (val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0;
    },
    {
      message: 'Price must be a non-negative number',
    }
  ),
  fees: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || val === '') return true;
        const num = parseFloat(val);
        return !isNaN(num) && num >= 0;
      },
      {
        message: 'Fees must be a non-negative number',
      }
    ),
  notes: z.string().max(500, 'Notes too long').optional(),
  // ESPP-specific fields (conditional)
  grantDate: z.date().optional(),
  marketPriceAtGrant: z.string().optional(),
  marketPriceAtPurchase: z.string().optional(),
  discountPercent: z.string().optional(),
  // RSU-specific fields (conditional)
  vestingDate: z.date().optional(),
  grossSharesVested: z.string().optional(),
  sharesWithheld: z.string().optional(),
  vestingPrice: z.string().optional(),
  taxWithheldAmount: z.string().optional(),
});

// Refined schema with conditional validation
const transactionSchema = baseTransactionSchema.refine(
  (data) => {
    if (data.type !== 'espp_purchase') return true;
    return data.grantDate !== undefined;
  },
  {
    message: 'Grant date is required for ESPP transactions',
    path: ['grantDate'],
  }
).refine(
  (data) => {
    if (data.type !== 'espp_purchase') return true;
    if (!data.marketPriceAtGrant) return false;
    const num = parseFloat(data.marketPriceAtGrant);
    return !isNaN(num) && num > 0;
  },
  {
    message: 'Market price at grant is required for ESPP transactions',
    path: ['marketPriceAtGrant'],
  }
).refine(
  (data) => {
    if (data.type !== 'espp_purchase') return true;
    if (!data.marketPriceAtPurchase) return false;
    const num = parseFloat(data.marketPriceAtPurchase);
    return !isNaN(num) && num > 0;
  },
  {
    message: 'Market price at purchase is required for ESPP transactions',
    path: ['marketPriceAtPurchase'],
  }
).refine(
  (data) => {
    if (data.type !== 'espp_purchase') return true;
    if (!data.discountPercent) return false;
    const num = parseFloat(data.discountPercent);
    return !isNaN(num) && num >= 0 && num <= 100;
  },
  {
    message: 'Discount percentage must be between 0 and 100',
    path: ['discountPercent'],
  }
).refine(
  (data) => {
    if (data.type !== 'espp_purchase') return true;
    if (!data.grantDate || !data.date) return true;
    return data.grantDate < data.date;
  },
  {
    message: 'Grant date must be before purchase date',
    path: ['grantDate'],
  }
).refine(
  (data) => {
    if (data.type !== 'rsu_vest') return true;
    return data.vestingDate !== undefined;
  },
  {
    message: 'Vesting date is required for RSU transactions',
    path: ['vestingDate'],
  }
).refine(
  (data) => {
    if (data.type !== 'rsu_vest') return true;
    if (!data.grossSharesVested) return false;
    const num = parseFloat(data.grossSharesVested);
    return !isNaN(num) && num > 0;
  },
  {
    message: 'Gross shares vested is required for RSU transactions',
    path: ['grossSharesVested'],
  }
).refine(
  (data) => {
    if (data.type !== 'rsu_vest') return true;
    if (!data.sharesWithheld) return false;
    const num = parseFloat(data.sharesWithheld);
    return !isNaN(num) && num >= 0;
  },
  {
    message: 'Shares withheld must be 0 or greater',
    path: ['sharesWithheld'],
  }
).refine(
  (data) => {
    if (data.type !== 'rsu_vest') return true;
    if (!data.vestingPrice) return false;
    const num = parseFloat(data.vestingPrice);
    return !isNaN(num) && num > 0;
  },
  {
    message: 'Vesting price is required for RSU transactions',
    path: ['vestingPrice'],
  }
).refine(
  (data) => {
    if (data.type !== 'rsu_vest') return true;
    if (!data.grossSharesVested || !data.sharesWithheld) return true;
    const gross = parseFloat(data.grossSharesVested);
    const withheld = parseFloat(data.sharesWithheld);
    return withheld <= gross;
  },
  {
    message: 'Shares withheld cannot exceed gross shares vested',
    path: ['sharesWithheld'],
  }
);

type TransactionFormValues = z.infer<typeof transactionSchema>;

const transactionTypes = [
  {
    value: 'buy',
    label: 'Buy',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  },
  {
    value: 'sell',
    label: 'Sell',
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  },
  {
    value: 'dividend',
    label: 'Dividend',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  },
  {
    value: 'split',
    label: 'Stock Split',
    color:
      'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  },
  {
    value: 'espp_purchase',
    label: 'ESPP Purchase',
    color:
      'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
  },
  {
    value: 'rsu_vest',
    label: 'RSU Vest',
    color:
      'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
  },
  {
    value: 'transfer_in',
    label: 'Transfer In',
    color:
      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  },
  {
    value: 'transfer_out',
    label: 'Transfer Out',
    color:
      'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  },
];

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
            // ESPP fields
            grantDate: undefined,
            marketPriceAtGrant: '',
            marketPriceAtPurchase: '',
            discountPercent: '',
            // RSU fields
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
            // ESPP fields
            grantDate: undefined,
            marketPriceAtGrant: '',
            marketPriceAtPurchase: '',
            discountPercent: '',
            // RSU fields
            vestingDate: undefined,
            grossSharesVested: '',
            sharesWithheld: '',
            vestingPrice: '',
            taxWithheldAmount: '',
          },
    mode: 'onChange',
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    setValue,
    watch,
    trigger: triggerValidation,
  } = form;

  // Load asset symbol when dialog opens in edit mode
  useEffect(() => {
    if (!open || mode !== 'edit' || !transaction) return;

    let cancelled = false;
    const controller = new AbortController();

    setLoadingAsset(true);

    assetQueries.getById(transaction.assetId)
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
  const watchedDate = watch('date');
  const watchedSymbol = watch('assetSymbol');
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
  const resolveAsset = async (symbol: string, name?: string, price?: number) => {
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
      throw error; // Re-throw if it's a different error
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
      // Build common transaction fields
      const quantity = new Decimal(data.quantity);
      const price = new Decimal(data.price);
      const transactionData: any = {
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
        const marketPriceAtPurchase = new Decimal(data.marketPriceAtPurchase || '0');
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

      const asset = await resolveAsset(data.assetSymbol, data.assetName, parseFloat(data.price));

      if (mode === 'edit' && transaction && asset) {
        await updateTransaction(transaction.id, { ...transactionData, assetId: asset.id });
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

      const errorMessage = error instanceof Error
        ? error.message
        : 'Please try again.';

      showErrorNotification(
        `Failed to ${action} transaction`,
        errorMessage
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedTypeInfo = transactionTypes.find(
    (t) => t.value === watchedType
  );

  const dialogTitle = mode === 'edit' ? 'Edit Transaction' : 'Add New Transaction';
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
          {/* Transaction Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Transaction Type *</Label>
            <Select
              value={watchedType}
              onValueChange={(value: string) =>
                setValue('type', value as any, { shouldValidate: true })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select transaction type" />
              </SelectTrigger>
              <SelectContent>
                {transactionTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <Badge className={type.color} variant="secondary">
                        {type.label}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-sm text-red-600">{errors.type.message}</p>
            )}
          </div>

          {/* Asset Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="assetSymbol">Asset Symbol *</Label>
              <Input
                id="assetSymbol"
                placeholder="AAPL, BTC, SPY"
                {...register('assetSymbol')}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  setValue('assetSymbol', value, { shouldValidate: true });
                }}
                className={errors.assetSymbol ? 'border-red-500' : ''}
              />
              {errors.assetSymbol && (
                <p className="text-sm text-red-600">
                  {errors.assetSymbol.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="assetName">Asset Name (Optional)</Label>
              <Input
                id="assetName"
                placeholder="Apple Inc."
                {...register('assetName')}
              />
            </div>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>Transaction Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !watchedDate && 'text-muted-foreground',
                    errors.date && 'border-red-500'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {watchedDate ? format(watchedDate, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="p-4">
                  <Input
                    type="date"
                    value={watchedDate ? format(watchedDate, 'yyyy-MM-dd') : ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        setValue('date', new Date(e.target.value), {
                          shouldValidate: true,
                        });
                      }
                    }}
                    max={format(new Date(), 'yyyy-MM-dd')}
                    min="1900-01-01"
                  />
                </div>
              </PopoverContent>
            </Popover>
            {errors.date && (
              <p className="text-sm text-red-600">{errors.date.message}</p>
            )}
          </div>

          {/* Quantity and Price */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">
                Quantity *{watchedType === 'dividend' && ' (Shares held)'}
              </Label>
              <Input
                id="quantity"
                type="number"
                step="any"
                placeholder="100"
                {...register('quantity')}
                className={errors.quantity ? 'border-red-500' : ''}
              />
              {errors.quantity && (
                <p className="text-sm text-red-600">
                  {errors.quantity.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">
                {watchedType === 'dividend'
                  ? 'Dividend per Share *'
                  : 'Price per Share *'}
              </Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                placeholder="150.00"
                {...register('price')}
                className={errors.price ? 'border-red-500' : ''}
              />
              {errors.price && (
                <p className="text-sm text-red-600">{errors.price.message}</p>
              )}
            </div>
          </div>

          {/* Fees and Total */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fees">Fees & Commissions</Label>
              <Input
                id="fees"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register('fees')}
                className={errors.fees ? 'border-red-500' : ''}
              />
              {errors.fees && (
                <p className="text-sm text-red-600">{errors.fees.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Total Transaction Value</Label>
              <div className="rounded-md bg-muted p-3">
                <span className="text-lg font-semibold">
                  ${calculateTotal().toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* ESPP-specific fields */}
          {watchedType === 'espp_purchase' && (
            <FormProvider {...form}>
              <ESPPTransactionFormFields />
            </FormProvider>
          )}

          {/* RSU-specific fields */}
          {watchedType === 'rsu_vest' && (
            <FormProvider {...form}>
              <RSUTransactionFormFields />
            </FormProvider>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes about this transaction..."
              rows={3}
              {...register('notes')}
              className={errors.notes ? 'border-red-500' : ''}
            />
            {errors.notes && (
              <p className="text-sm text-red-600">{errors.notes.message}</p>
            )}
          </div>

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
