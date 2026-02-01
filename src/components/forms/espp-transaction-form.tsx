'use client';

import { useFormContext } from 'react-hook-form';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';

/**
 * ESPP Transaction Form Fields Component
 *
 * Renders additional fields required for ESPP (Employee Stock Purchase Plan) transactions.
 * Should be rendered conditionally when transaction type is 'espp_purchase'.
 *
 * Fields collected:
 * - Grant Date: When the ESPP offering period began
 * - Market Price at Grant: FMV when grant was issued
 * - Market Price at Purchase: FMV when shares were purchased
 * - Discount Percent: ESPP discount (typically 15%)
 *
 * The bargain element is auto-calculated as:
 * bargainElement = marketPriceAtPurchase - purchasePrice
 */
export function ESPPTransactionFormFields() {
  const {
    register,
    formState: { errors },
    setValue,
    watch,
  } = useFormContext();

  const watchedGrantDate = watch('grantDate');
  const watchedPurchaseDate = watch('date');
  const watchedPurchasePrice = watch('price');
  const watchedMarketPriceAtPurchase = watch('marketPriceAtPurchase');
  const watchedDiscountPercent = watch('discountPercent');

  // Calculate bargain element
  const calculateBargainElement = () => {
    const marketPrice = parseFloat(watchedMarketPriceAtPurchase || '0');
    const purchasePrice = parseFloat(watchedPurchasePrice || '0');
    return marketPrice - purchasePrice;
  };

  const bargainElement = calculateBargainElement();

  return (
    <div className="space-y-4 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
      <div className="flex items-start gap-2">
        <InfoIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        <div className="flex-1 text-sm text-blue-900 dark:text-blue-100">
          <strong>ESPP Transaction</strong>
          <p className="mt-1 text-blue-700 dark:text-blue-300">
            Employee Stock Purchase Plans allow you to buy company stock at a discount.
            The discount is taxed differently depending on how long you hold the shares.
          </p>
        </div>
      </div>

      {/* Grant Date */}
      <div className="space-y-2">
        <Label htmlFor="grantDate">Grant Date (Offering Period Start) *</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-full justify-start text-left font-normal',
                !watchedGrantDate && 'text-muted-foreground',
                errors.grantDate && 'border-red-500'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {watchedGrantDate
                ? format(new Date(watchedGrantDate), 'PPP')
                : 'Select grant date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-4">
              <Input
                type="date"
                value={
                  watchedGrantDate
                    ? format(new Date(watchedGrantDate), 'yyyy-MM-dd')
                    : ''
                }
                onChange={(e) => {
                  if (e.target.value) {
                    setValue('grantDate', new Date(e.target.value), {
                      shouldValidate: true,
                    });
                  }
                }}
                max={
                  watchedPurchaseDate
                    ? format(new Date(watchedPurchaseDate), 'yyyy-MM-dd')
                    : format(new Date(), 'yyyy-MM-dd')
                }
                min="2000-01-01"
              />
            </div>
          </PopoverContent>
        </Popover>
        {errors.grantDate && (
          <p className="text-sm text-red-600">{String(errors.grantDate.message)}</p>
        )}
        <p className="text-xs text-muted-foreground">
          The date when your ESPP offering period began (typically 6 months before purchase)
        </p>
      </div>

      {/* Market Prices */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="marketPriceAtGrant">Market Price at Grant *</Label>
          <Input
            id="marketPriceAtGrant"
            type="number"
            step="0.01"
            placeholder="100.00"
            {...register('marketPriceAtGrant')}
            className={errors.marketPriceAtGrant ? 'border-red-500' : ''}
          />
          {errors.marketPriceAtGrant && (
            <p className="text-sm text-red-600">
              {String(errors.marketPriceAtGrant.message)}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Fair market value when grant was issued
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="marketPriceAtPurchase">Market Price at Purchase *</Label>
          <Input
            id="marketPriceAtPurchase"
            type="number"
            step="0.01"
            placeholder="120.00"
            {...register('marketPriceAtPurchase')}
            className={errors.marketPriceAtPurchase ? 'border-red-500' : ''}
          />
          {errors.marketPriceAtPurchase && (
            <p className="text-sm text-red-600">
              {String(errors.marketPriceAtPurchase.message)}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Fair market value when you purchased shares
          </p>
        </div>
      </div>

      {/* Discount Percentage */}
      <div className="space-y-2">
        <Label htmlFor="discountPercent">ESPP Discount Percentage *</Label>
        <div className="flex items-center gap-2">
          <Input
            id="discountPercent"
            type="number"
            step="0.1"
            min="0"
            max="100"
            placeholder="15"
            {...register('discountPercent')}
            className={cn(
              'flex-1',
              errors.discountPercent && 'border-red-500'
            )}
          />
          <span className="text-sm text-muted-foreground">%</span>
        </div>
        {errors.discountPercent && (
          <p className="text-sm text-red-600">
            {String(errors.discountPercent.message)}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Typical ESPP discount is 15% (check your plan documents)
        </p>
      </div>

      {/* Calculated Bargain Element */}
      {bargainElement > 0 && (
        <Alert className="bg-green-50 dark:bg-green-950">
          <AlertDescription className="text-sm">
            <strong>Bargain Element:</strong> ${bargainElement.toFixed(2)} per share
            <br />
            <span className="text-xs text-muted-foreground">
              This is the discount you received. It may be taxed as ordinary income depending
              on when you sell the shares (qualifying vs. disqualifying disposition).
            </span>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
