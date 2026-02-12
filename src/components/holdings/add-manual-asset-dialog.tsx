'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { Decimal } from 'decimal.js';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { useToast } from '@/components/ui/use-toast';
import { usePortfolioStore } from '@/lib/stores';
import { db } from '@/lib/db/schema';
import { Asset, Holding, Transaction } from '@/types';
import type { AssetId, HoldingId, TransactionId } from '@/types/storage';

// Manual asset form validation schema
const manualAssetFormSchema = z.object({
  name: z.string().min(1, 'Asset name is required').max(200, 'Name too long'),
  type: z.enum(['other', 'bond', 'commodity', 'cash'], {
    required_error: 'Asset type is required',
  }),
  currentValue: z
    .string()
    .transform((val) => val.replace(/,/g, ''))
    .pipe(z.string().regex(/^\d+(\.\d+)?$/, 'Enter a valid amount'))
    .refine(
      (val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0,
      'Must be a valid positive number'
    ),
  purchasePrice: z
    .string()
    .transform((val) => val.replace(/,/g, ''))
    .pipe(z.string().regex(/^\d+(\.\d+)?$/, 'Enter a valid amount'))
    .refine(
      (val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0,
      'Must be a valid positive number'
    ),
  purchaseDate: z.string().min(1, 'Purchase date is required'),
  quantity: z
    .string()
    .transform((val) => val.replace(/,/g, ''))
    .pipe(z.string().regex(/^\d+(\.\d+)?$/, 'Enter a valid quantity'))
    .refine(
      (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
      'Must be a valid positive number'
    ),
  notes: z.string().max(1000, 'Notes too long').optional(),
});

type ManualAssetFormValues = z.infer<typeof manualAssetFormSchema>;

interface AddManualAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portfolioId: string;
  onSuccess?: () => void;
}

export function AddManualAssetDialog({
  open,
  onOpenChange,
  portfolioId,
  onSuccess,
}: AddManualAssetDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { loadHoldings } = usePortfolioStore();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ManualAssetFormValues>({
    resolver: zodResolver(manualAssetFormSchema),
    defaultValues: {
      name: '',
      type: 'other',
      currentValue: '',
      purchasePrice: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      quantity: '1',
      notes: '',
    },
  });

  const selectedType = watch('type');

  const onSubmit = async (data: ManualAssetFormValues) => {
    setIsSubmitting(true);
    try {
      const purchasePrice = new Decimal(data.purchasePrice);
      const currentValue = new Decimal(data.currentValue);
      const quantity = new Decimal(data.quantity);

      // Validate values
      if (purchasePrice.isNegative()) {
        throw new Error('Purchase price cannot be negative');
      }
      if (currentValue.isNegative()) {
        throw new Error('Current value cannot be negative');
      }
      if (quantity.lessThanOrEqualTo(0)) {
        throw new Error('Quantity must be greater than zero');
      }

      const assetId = uuidv4() as AssetId;
      const holdingId = uuidv4() as HoldingId;
      const transactionId = uuidv4() as TransactionId;

      // Get portfolio for currency
      const portfolio = await db.portfolios.get(portfolioId);
      if (!portfolio) {
        throw new Error('Portfolio not found');
      }

      // Generate safe symbol from name (alphanumeric + underscore only, max 50 chars)
      const sanitizedSymbol = data.name
        .toUpperCase()
        .replace(/[^A-Z0-9\s]/g, '') // Remove special characters
        .replace(/\s+/g, '_') // Replace spaces with underscores
        .substring(0, 50); // Limit length

      // Create Asset
      const asset: Asset = {
        id: assetId,
        symbol: sanitizedSymbol || 'ASSET', // Fallback if name has no valid chars
        name: data.name,
        type: data.type,
        currency: portfolio.currency,
        currentPrice: currentValue.div(quantity).toNumber(), // Price per unit
        priceUpdatedAt: new Date(),
        metadata: {},
        valuationMethod: 'MANUAL',
      };

      await db.assets.add(asset);

      // Calculate holding values
      const totalCurrentValue = currentValue;
      const totalCostBasis = purchasePrice;
      const averageCost = purchasePrice.div(quantity);
      const unrealizedGain = totalCurrentValue.sub(totalCostBasis);
      const unrealizedGainPercent = totalCostBasis.isZero()
        ? 0
        : unrealizedGain.div(totalCostBasis).mul(100).toNumber();

      // Create Holding
      const holding: Holding = {
        id: holdingId,
        portfolioId,
        assetId,
        quantity,
        costBasis: totalCostBasis,
        averageCost,
        currentValue: totalCurrentValue,
        unrealizedGain,
        unrealizedGainPercent,
        lots: [],
        lastUpdated: new Date(),
        ownershipPercentage: 100,
      };

      // The database hooks will automatically serialize Decimal fields to strings
      await db.holdings.add(holding as unknown as import('@/types').HoldingStorage);

      // Create initial buy transaction
      const transaction: Transaction = {
        id: transactionId,
        portfolioId,
        assetId,
        type: 'buy',
        date: new Date(data.purchaseDate),
        quantity,
        price: averageCost,
        totalAmount: totalCostBasis,
        fees: new Decimal(0),
        currency: portfolio.currency,
        notes: data.notes || `Initial ${data.type} asset acquisition`,
      };

      // The database hooks will automatically serialize Decimal fields to strings
      await db.transactions.add(transaction as unknown as import('@/types').TransactionStorage);

      toast({
        title: 'Asset Added',
        description: `${data.name} has been added to your portfolio.`,
      });

      // Reload holdings to reflect the new asset
      try {
        await loadHoldings(portfolioId);
      } catch (loadError) {
        console.error('Error reloading holdings:', loadError);
        // Asset was added successfully, just refresh failed
        toast({
          title: 'Refresh Needed',
          description:
            'Asset added successfully. Please refresh the page to see it.',
          variant: 'default',
        });
      }

      reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error adding manual asset:', error);
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to add asset. Please try again.',
        variant: 'destructive',
      });
      // Don't close dialog on error - let user retry
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    reset();
    onOpenChange(false);
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      other: 'Other (Art, Collectibles, etc.)',
      bond: 'Bonds',
      commodity: 'Commodities (Gold, Silver, etc.)',
      cash: 'Cash & Cash Equivalents',
    };
    return labels[type] || type;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Add Manual Asset</DialogTitle>
          <DialogDescription>
            Add art, collectibles, bonds, commodities, or other manually-valued
            assets to your portfolio.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type">Asset Type *</Label>
            <Select
              value={selectedType}
              onValueChange={(value) =>
                setValue('type', value as ManualAssetFormValues['type'])
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select asset type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="other">
                  Other (Art, Collectibles, etc.)
                </SelectItem>
                <SelectItem value="bond">Bonds</SelectItem>
                <SelectItem value="commodity">
                  Commodities (Gold, Silver, etc.)
                </SelectItem>
                <SelectItem value="cash">Cash & Cash Equivalents</SelectItem>
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-sm text-red-600">{errors.type.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Asset Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Gold Bars, Picasso Painting, US Treasury Bond"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="text"
                placeholder="1"
                {...register('quantity')}
              />
              {errors.quantity && (
                <p className="text-sm text-red-600">
                  {errors.quantity.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Number of units owned
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currentValue">Total Current Value *</Label>
              <Input
                id="currentValue"
                type="text"
                placeholder="0.00"
                {...register('currentValue')}
              />
              {errors.currentValue && (
                <p className="text-sm text-red-600">
                  {errors.currentValue.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="purchasePrice">Total Purchase Price *</Label>
              <Input
                id="purchasePrice"
                type="text"
                placeholder="0.00"
                {...register('purchasePrice')}
              />
              {errors.purchasePrice && (
                <p className="text-sm text-red-600">
                  {errors.purchasePrice.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="purchaseDate">Purchase Date *</Label>
              <Input
                id="purchaseDate"
                type="date"
                {...register('purchaseDate')}
              />
              {errors.purchaseDate && (
                <p className="text-sm text-red-600">
                  {errors.purchaseDate.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any additional information about this asset..."
              rows={3}
              {...register('notes')}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Asset'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
