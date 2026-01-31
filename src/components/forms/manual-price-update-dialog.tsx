'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
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
import { Asset } from '@/types/asset';
import { usePortfolioStore } from '@/lib/stores';

const formSchema = z.object({
  price: z
    .string()
    .min(1, 'Price is required')
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: 'Price must be a positive number',
    }),
});

type FormValues = z.infer<typeof formSchema>;

interface ManualPriceUpdateDialogProps {
  asset: Asset;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManualPriceUpdateDialog({
  asset,
  open,
  onOpenChange,
}: ManualPriceUpdateDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const updateAsset = usePortfolioStore((state) => state.updateAsset);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      price: asset.currentPrice?.toString() || '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      const newPrice = parseFloat(values.price);

      // Update the asset with new price
      await updateAsset(asset.id, {
        currentPrice: newPrice,
        priceUpdatedAt: new Date(),
      });

      alert(
        `Price updated successfully: ${asset.symbol} price set to ${asset.currency}${newPrice.toFixed(2)}`
      );

      onOpenChange(false);
      reset();
    } catch (error) {
      console.error('Failed to update price:', error);
      alert(
        `Failed to update price: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Update Manual Price</DialogTitle>
          <DialogDescription>
            Update the current market value for {asset.name} ({asset.symbol}).
            This asset requires manual price updates.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="price">Current Price ({asset.currency})</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register('price')}
            />
            {errors.price && (
              <p className="text-sm text-red-600">{errors.price.message}</p>
            )}
            <p className="text-sm text-muted-foreground">
              Enter the current estimated market value per unit
            </p>
          </div>

          <div className="rounded-md bg-muted p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Previous Price:</span>
              <span className="font-medium">
                {asset.currentPrice
                  ? `${asset.currency}${asset.currentPrice.toFixed(2)}`
                  : 'Not set'}
              </span>
            </div>
            {asset.priceUpdatedAt && (
              <div className="mt-1 flex justify-between">
                <span className="text-muted-foreground">Last Updated:</span>
                <span className="font-medium">
                  {new Date(asset.priceUpdatedAt).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update Price'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
