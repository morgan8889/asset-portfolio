'use client';

import { UseFormReturn } from 'react-hook-form';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { FormProvider } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ESPPTransactionFormFields } from './espp-transaction-form';
import { RSUTransactionFormFields } from './rsu-transaction-form';
import {
  TransactionFormValues,
  transactionTypes,
} from './transaction-schema';

interface TransactionFormFieldsProps {
  form: UseFormReturn<TransactionFormValues>;
  calculateTotal: () => number;
}

export function TransactionFormFields({
  form,
  calculateTotal,
}: TransactionFormFieldsProps) {
  const {
    register,
    formState: { errors },
    setValue,
    watch,
  } = form;

  const watchedType = watch('type');
  const watchedDate = watch('date');

  return (
    <>
      {/* Transaction Type */}
      <div className="space-y-2">
        <Label htmlFor="type">Transaction Type *</Label>
        <Select
          value={watchedType}
          onValueChange={(value: string) =>
            setValue('type', value as TransactionFormValues['type'], { shouldValidate: true })
          }
        >
          <SelectTrigger id="type">
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
                value={
                  watchedDate ? format(watchedDate, 'yyyy-MM-dd') : ''
                }
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
            <p className="text-sm text-red-600">
              {errors.price.message}
            </p>
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
            <p className="text-sm text-red-600">
              {errors.fees.message}
            </p>
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
    </>
  );
}
