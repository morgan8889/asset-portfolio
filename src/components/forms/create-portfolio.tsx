'use client';

import { useState } from 'react';
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
}

export function CreatePortfolioDialog({
  children,
  variant = 'default',
}: CreatePortfolioDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createPortfolio } = usePortfolioStore();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<PortfolioFormData>({
    resolver: zodResolver(portfolioSchema),
    defaultValues: {
      currency: 'USD',
    },
  });

  const portfolioType = watch('type');

  const onSubmit = async (data: PortfolioFormData) => {
    try {
      setIsSubmitting(true);

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

      reset();
      setOpen(false);
    } catch (error) {
      console.error('Failed to create portfolio:', error);
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
            <DialogTitle>Create New Portfolio</DialogTitle>
            <DialogDescription>
              Set up a new portfolio to start tracking your investments.
            </DialogDescription>
          </DialogHeader>

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
              {isSubmitting ? 'Creating...' : 'Create Portfolio'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
