'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { usePortfolioStore } from '@/lib/stores';
import { PortfolioType } from '@/types/portfolio';

const portfolioSchema = z.object({
  name: z
    .string()
    .min(1, 'Portfolio name is required')
    .max(50, 'Name too long'),
  type: z.enum(['taxable', 'ira', '401k', 'roth'] as const),
  currency: z.string().default('USD'),
});

type PortfolioFormData = z.infer<typeof portfolioSchema>;

interface CreatePortfolioDialogProps {
  children?: React.ReactNode;
  variant?: 'default' | 'outline';
  mode?: 'create' | 'edit';
  portfolio?: {
    id: string;
    name: string;
    type: PortfolioType;
    currency: string;
  };
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CreatePortfolioDialog({
  children,
  variant = 'default',
  mode = 'create',
  portfolio,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: CreatePortfolioDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTypeChangeWarning, setShowTypeChangeWarning] = useState(false);
  const [transactionCount, setTransactionCount] = useState(0);
  const { createPortfolio, updatePortfolio } = usePortfolioStore();

  // Use controlled or internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<PortfolioFormData>({
    resolver: zodResolver(portfolioSchema),
    defaultValues: mode === 'edit' && portfolio
      ? {
          name: portfolio.name,
          type: portfolio.type,
          currency: portfolio.currency,
        }
      : {
          currency: 'USD',
        },
  });

  const portfolioType = watch('type');
  const initialType = portfolio?.type;

  // Check transaction count when type changes in edit mode
  useEffect(() => {
    if (mode === 'edit' && portfolio && portfolioType && portfolioType !== initialType) {
      // Check if portfolio has transactions
      import('@/lib/db').then(({ db }) => {
        db.transactions
          .where('portfolioId')
          .equals(portfolio.id)
          .count()
          .then(count => {
            setTransactionCount(count);
            if (count > 0) {
              setShowTypeChangeWarning(true);
            }
          });
      });
    }
  }, [portfolioType, mode, portfolio, initialType]);

  const onSubmit = async (data: PortfolioFormData) => {
    try {
      setIsSubmitting(true);

      if (mode === 'edit' && portfolio) {
        // Update existing portfolio
        await updatePortfolio(portfolio.id, {
          name: data.name,
          type: data.type,
          currency: data.currency,
          updatedAt: new Date(),
        });
      } else {
        // Create new portfolio
        await createPortfolio({
          name: data.name,
          type: data.type,
          currency: data.currency,
          settings: {
            rebalanceThreshold: 5,
            taxStrategy: 'fifo',
            autoRebalance: false,
            dividendReinvestment: false,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      reset();
      setOpen(false);
      setShowTypeChangeWarning(false);
    } catch (error) {
      console.error(`Failed to ${mode} portfolio:`, error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant={variant}>
            <Plus className="mr-2 h-4 w-4" />
            Create Portfolio
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>
              {mode === 'edit' ? 'Edit Portfolio' : 'Create New Portfolio'}
            </DialogTitle>
            <DialogDescription>
              {mode === 'edit'
                ? 'Update your portfolio settings and preferences.'
                : 'Set up a new portfolio to start tracking your investments.'}
            </DialogDescription>
          </DialogHeader>

          {showTypeChangeWarning && (
            <div className="rounded-md bg-yellow-50 p-4 my-2">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Type Change Warning
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      This portfolio has {transactionCount} transaction{transactionCount !== 1 ? 's' : ''}.
                      Changing the account type may affect tax calculations and reporting.
                      Please ensure this change is intentional.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Portfolio Name</Label>
              <Input
                id="name"
                placeholder="e.g., Retirement, Trading Account"
                {...register('name')}
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Account Type</Label>
              <Select
                onValueChange={(value: PortfolioType) =>
                  setValue('type', value)
                }
                value={portfolioType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="taxable">Taxable Brokerage</SelectItem>
                  <SelectItem value="ira">Traditional IRA</SelectItem>
                  <SelectItem value="roth">Roth IRA</SelectItem>
                  <SelectItem value="401k">401(k)</SelectItem>
                </SelectContent>
              </Select>
              {errors.type && (
                <p className="text-sm text-red-600">{errors.type.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Base Currency</Label>
              <Select
                onValueChange={(value) => setValue('currency', value)}
                defaultValue="USD"
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                  <SelectItem value="GBP">GBP - British Pound</SelectItem>
                  <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                  <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                </SelectContent>
              </Select>
              {errors.currency && (
                <p className="text-sm text-red-600">
                  {errors.currency.message}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? mode === 'edit' ? 'Updating...' : 'Creating...'
                : mode === 'edit' ? 'Update Portfolio' : 'Create Portfolio'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
