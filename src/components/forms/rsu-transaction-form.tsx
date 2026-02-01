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
 * RSU Transaction Form Fields Component
 *
 * Renders additional fields required for RSU (Restricted Stock Unit) transactions.
 * Should be rendered conditionally when transaction type is 'rsu_vest'.
 *
 * Fields collected:
 * - Vesting Date: When RSU shares vested
 * - Gross Shares Vested: Total shares that vested
 * - Shares Withheld: Shares withheld for taxes
 * - Vesting Price: FMV at vesting (used for tax basis)
 * - Tax Withheld Amount: Dollar amount withheld for taxes
 *
 * Net shares = Gross shares - Shares withheld
 */
export function RSUTransactionFormFields() {
  const {
    register,
    formState: { errors },
    setValue,
    watch,
  } = useFormContext();

  const watchedVestingDate = watch('vestingDate');
  const watchedGrossShares = watch('grossSharesVested');
  const watchedSharesWithheld = watch('sharesWithheld');
  const watchedVestingPrice = watch('vestingPrice');
  const watchedTaxWithheld = watch('taxWithheldAmount');

  // Calculate net shares and tax withholding
  const calculateNetShares = () => {
    const gross = parseFloat(watchedGrossShares || '0');
    const withheld = parseFloat(watchedSharesWithheld || '0');
    return gross - withheld;
  };

  const calculateTaxValue = () => {
    const withheld = parseFloat(watchedSharesWithheld || '0');
    const price = parseFloat(watchedVestingPrice || '0');
    return withheld * price;
  };

  const netShares = calculateNetShares();
  const calculatedTaxValue = calculateTaxValue();

  return (
    <div className="space-y-4 rounded-lg border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-800 dark:bg-indigo-950">
      <div className="flex items-start gap-2">
        <InfoIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
        <div className="flex-1 text-sm text-indigo-900 dark:text-indigo-100">
          <strong>RSU Vesting Event</strong>
          <p className="mt-1 text-indigo-700 dark:text-indigo-300">
            Restricted Stock Units vest over time. When they vest, you receive shares
            but some are typically withheld to cover taxes. The FMV at vesting becomes
            your cost basis.
          </p>
        </div>
      </div>

      {/* Vesting Date */}
      <div className="space-y-2">
        <Label htmlFor="vestingDate">Vesting Date *</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-full justify-start text-left font-normal',
                !watchedVestingDate && 'text-muted-foreground',
                errors.vestingDate && 'border-red-500'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {watchedVestingDate
                ? format(new Date(watchedVestingDate), 'PPP')
                : 'Select vesting date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-4">
              <Input
                type="date"
                value={
                  watchedVestingDate
                    ? format(new Date(watchedVestingDate), 'yyyy-MM-dd')
                    : ''
                }
                onChange={(e) => {
                  if (e.target.value) {
                    setValue('vestingDate', new Date(e.target.value), {
                      shouldValidate: true,
                    });
                  }
                }}
                max={format(new Date(), 'yyyy-MM-dd')}
                min="2000-01-01"
              />
            </div>
          </PopoverContent>
        </Popover>
        {errors.vestingDate && (
          <p className="text-sm text-red-600">{String(errors.vestingDate.message)}</p>
        )}
        <p className="text-xs text-muted-foreground">
          The date when your RSUs vested and became yours
        </p>
      </div>

      {/* Share Quantities */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="grossSharesVested">Gross Shares Vested *</Label>
          <Input
            id="grossSharesVested"
            type="number"
            step="any"
            placeholder="100"
            {...register('grossSharesVested')}
            className={errors.grossSharesVested ? 'border-red-500' : ''}
          />
          {errors.grossSharesVested && (
            <p className="text-sm text-red-600">
              {String(errors.grossSharesVested.message)}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Total shares that vested
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="sharesWithheld">Shares Withheld for Tax *</Label>
          <Input
            id="sharesWithheld"
            type="number"
            step="any"
            placeholder="30"
            {...register('sharesWithheld')}
            className={errors.sharesWithheld ? 'border-red-500' : ''}
          />
          {errors.sharesWithheld && (
            <p className="text-sm text-red-600">
              {String(errors.sharesWithheld.message)}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Shares sold to cover taxes
          </p>
        </div>
      </div>

      {/* Vesting Price and Tax Amount */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="vestingPrice">Vesting Price (FMV) *</Label>
          <Input
            id="vestingPrice"
            type="number"
            step="0.01"
            placeholder="150.00"
            {...register('vestingPrice')}
            className={errors.vestingPrice ? 'border-red-500' : ''}
          />
          {errors.vestingPrice && (
            <p className="text-sm text-red-600">
              {String(errors.vestingPrice.message)}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Fair market value per share at vesting
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="taxWithheldAmount">Tax Amount Withheld (Optional)</Label>
          <Input
            id="taxWithheldAmount"
            type="number"
            step="0.01"
            placeholder="4500.00"
            {...register('taxWithheldAmount')}
            className={errors.taxWithheldAmount ? 'border-red-500' : ''}
          />
          {errors.taxWithheldAmount && (
            <p className="text-sm text-red-600">
              {String(errors.taxWithheldAmount.message)}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Total tax withheld in dollars
          </p>
        </div>
      </div>

      {/* Calculated Values */}
      {netShares > 0 && (
        <Alert className="bg-green-50 dark:bg-green-950">
          <AlertDescription className="text-sm">
            <strong>Net Shares Received:</strong> {netShares.toFixed(4)} shares
            <br />
            <strong>Cost Basis:</strong> ${watchedVestingPrice || '0'} per share
            {calculatedTaxValue > 0 && (
              <>
                <br />
                <strong>Estimated Tax Withheld:</strong> ${calculatedTaxValue.toFixed(2)}
                {watchedTaxWithheld && parseFloat(watchedTaxWithheld) > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {' '}(Entered: ${parseFloat(watchedTaxWithheld).toFixed(2)})
                  </span>
                )}
              </>
            )}
            <br />
            <span className="text-xs text-muted-foreground">
              The vesting price becomes your cost basis for tax purposes when you sell.
            </span>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
