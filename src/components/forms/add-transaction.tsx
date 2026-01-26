'use client';

import { useState } from 'react';
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

const transactionSchema = z.object({
  type: z.enum([
    'buy',
    'sell',
    'dividend',
    'split',
    'transfer_in',
    'transfer_out',
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
});

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

export function AddTransactionDialog() {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createTransaction } = useTransactionStore();
  const { currentPortfolio } = usePortfolioStore();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    setValue,
    watch,
    trigger,
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: 'buy',
      assetSymbol: '',
      assetName: '',
      date: new Date(),
      quantity: '',
      price: '',
      fees: '0',
      notes: '',
    },
    mode: 'onChange',
  });

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

  const onSubmit = async (data: TransactionFormValues) => {
    if (!currentPortfolio) {
      alert('Please select a portfolio first');
      return;
    }

    setIsSubmitting(true);
    try {
      await createTransaction({
        portfolioId: currentPortfolio.id!,
        assetId: data.assetSymbol.toUpperCase(),
        type: data.type as any,
        date: data.date,
        quantity: new Decimal(data.quantity),
        price: new Decimal(data.price),
        totalAmount: new Decimal(data.quantity).mul(new Decimal(data.price)),
        fees: new Decimal(data.fees || '0'),
        currency: 'USD',
        notes: data.notes || '',
      });

      setOpen(false);
      reset();
    } catch (error) {
      console.error('Failed to add transaction:', error);
      alert('Failed to add transaction. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedTypeInfo = transactionTypes.find(
    (t) => t.value === watchedType
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Transaction
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Add New Transaction
            {selectedTypeInfo && (
              <Badge className={selectedTypeInfo.color} variant="secondary">
                {selectedTypeInfo.label}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Add a new transaction to your portfolio. All fields marked with *
            are required.
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
              disabled={!isValid || isSubmitting}
              className="min-w-[100px]"
            >
              {isSubmitting ? 'Adding...' : 'Add Transaction'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
