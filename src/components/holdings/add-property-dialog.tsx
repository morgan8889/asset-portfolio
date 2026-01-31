'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { addPropertyAsset } from '@/lib/services/property-service';
import { usePortfolioStore } from '@/lib/stores';

// Property form validation schema
const propertyFormSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Property name is required')
      .max(200, 'Name too long'),
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
    address: z.string().max(500, 'Address too long').optional(),
    ownershipPercentage: z
      .number()
      .min(0, 'Must be between 0 and 100')
      .max(100, 'Cannot exceed 100'),
    isRental: z.boolean().default(false),
    monthlyRent: z.string().optional(),
    notes: z.string().max(1000, 'Notes too long').optional(),
  })
  .refine(
    (data) =>
      !data.isRental || (data.monthlyRent && parseFloat(data.monthlyRent) > 0),
    {
      message: 'Monthly rent is required for rental properties',
      path: ['monthlyRent'],
    }
  );

type PropertyFormValues = z.infer<typeof propertyFormSchema>;

interface AddPropertyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portfolioId: string;
  onSuccess?: () => void;
}

export function AddPropertyDialog({
  open,
  onOpenChange,
  portfolioId,
  onSuccess,
}: AddPropertyDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { loadHoldings } = usePortfolioStore();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<PropertyFormValues>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: {
      name: '',
      currentValue: '',
      purchasePrice: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      address: '',
      ownershipPercentage: 100,
      isRental: false,
      monthlyRent: '',
      notes: '',
    },
  });

  const isRental = watch('isRental');

  const onSubmit = async (data: PropertyFormValues) => {
    setIsSubmitting(true);
    try {
      await addPropertyAsset(portfolioId, {
        name: data.name,
        type: 'real_estate',
        purchasePrice: data.purchasePrice,
        currentValue: data.currentValue,
        purchaseDate: new Date(data.purchaseDate),
        address: data.address,
        ownershipPercentage: data.ownershipPercentage,
        isRental: data.isRental,
        monthlyRent: data.monthlyRent,
        notes: data.notes,
      });

      toast({
        title: 'Property Added',
        description: `${data.name} has been added to your portfolio.`,
      });

      // Reload holdings to reflect the new property
      try {
        await loadHoldings(portfolioId);
      } catch (loadError) {
        console.error('Error reloading holdings:', loadError);
        // Property was added successfully, just refresh failed
        toast({
          title: 'Refresh Needed',
          description:
            'Property added successfully. Please refresh the page to see it.',
          variant: 'default',
        });
      }

      reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error adding property:', error);
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to add property. Please try again.',
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Real Estate Property</DialogTitle>
          <DialogDescription>
            Add a residential or commercial property to your portfolio. Values
            are manually updated.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Property Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Downtown Condo, Main Street Office"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="purchasePrice">Purchase Price *</Label>
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
              <Label htmlFor="currentValue">Current Estimated Value *</Label>
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

            <div className="space-y-2">
              <Label htmlFor="ownershipPercentage">Ownership % *</Label>
              <Input
                id="ownershipPercentage"
                type="number"
                min="0"
                max="100"
                step="0.01"
                {...register('ownershipPercentage', { valueAsNumber: true })}
              />
              {errors.ownershipPercentage && (
                <p className="text-sm text-red-600">
                  {errors.ownershipPercentage.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address (Optional)</Label>
            <Input
              id="address"
              placeholder="123 Main St, City, State ZIP"
              {...register('address')}
            />
          </div>

          <div className="flex items-center space-x-2 rounded-lg border p-4">
            <Switch
              id="isRental"
              {...register('isRental')}
              checked={isRental}
            />
            <Label htmlFor="isRental" className="cursor-pointer">
              This is a rental property
            </Label>
          </div>

          {isRental && (
            <div className="space-y-2 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/20">
              <Label htmlFor="monthlyRent">Monthly Rent *</Label>
              <Input
                id="monthlyRent"
                type="text"
                placeholder="0.00"
                {...register('monthlyRent')}
              />
              {errors.monthlyRent && (
                <p className="text-sm text-red-600">
                  {errors.monthlyRent.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Annual yield will be calculated automatically
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any additional information about this property..."
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
              {isSubmitting ? 'Adding...' : 'Add Property'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
