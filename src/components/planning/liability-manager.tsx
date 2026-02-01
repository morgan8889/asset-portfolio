'use client';

import { useState } from 'react';
import { Plus, Edit2, Trash2, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Liability } from '@/types/planning';
import { usePlanningStore } from '@/lib/stores/planning';
import { usePortfolioStore } from '@/lib/stores/portfolio';
import { formatCurrency, formatPercentage } from '@/lib/utils/currency';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';

const liabilitySchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name cannot exceed 100 characters')
    .regex(/^[a-zA-Z0-9\s\-',.&()]+$/, 'Name contains invalid characters'),
  balance: z.coerce.number().min(0, 'Balance cannot be negative'),
  interestRate: z.coerce
    .number()
    .min(0, 'Interest rate cannot be negative')
    .max(100, 'Interest rate cannot exceed 100%'),
  payment: z.coerce.number().min(0, 'Payment cannot be negative'),
  startDate: z.string().min(1, 'Start date is required'),
  termMonths: z.coerce.number().optional(),
});

type LiabilityFormData = z.infer<typeof liabilitySchema>;

interface LiabilityManagerProps {
  portfolioId: string;
}

export function LiabilityManager({ portfolioId }: LiabilityManagerProps) {
  const { currentPortfolio } = usePortfolioStore();
  const { liabilities, addLiability, updateLiability, deleteLiability } =
    usePlanningStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLiability, setEditingLiability] = useState<Liability | null>(
    null
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [liabilityToDelete, setLiabilityToDelete] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LiabilityFormData>({
    resolver: zodResolver(liabilitySchema),
  });

  const onSubmit = async (data: LiabilityFormData) => {
    try {
      // Convert interest rate percentage to decimal
      const interestRateDecimal = data.interestRate / 100;

      if (editingLiability) {
        await updateLiability(editingLiability.id, {
          ...data,
          interestRate: interestRateDecimal,
        });
      } else {
        await addLiability({
          ...data,
          portfolioId,
          interestRate: interestRateDecimal,
        });
      }

      setIsDialogOpen(false);
      reset();
      setEditingLiability(null);
    } catch (error) {
      console.error('Failed to save liability:', error);
    }
  };

  const handleEdit = (liability: Liability) => {
    setEditingLiability(liability);
    reset({
      name: liability.name,
      balance: liability.balance,
      interestRate: liability.interestRate * 100, // Convert to percentage
      payment: liability.payment,
      startDate: liability.startDate,
      termMonths: liability.termMonths,
    });
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setLiabilityToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (liabilityToDelete) {
      await deleteLiability(liabilityToDelete);
      setLiabilityToDelete(null);
    }
    setDeleteDialogOpen(false);
  };

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      reset();
      setEditingLiability(null);
    }
  };

  const currency = currentPortfolio?.currency || 'USD';

  const totalLiabilities = liabilities.reduce(
    (sum, liability) => sum + liability.balance,
    0
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">Liabilities & Debt</h3>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-sm">
                    Note: Historical net worth calculations currently use the current balance
                    for all past dates. Future updates will calculate historical balances
                    based on payment schedules and interest rates.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-sm text-muted-foreground">
            Total: {formatCurrency(totalLiabilities, { currency })}
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Liability
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingLiability ? 'Edit Liability' : 'Add Liability'}
              </DialogTitle>
              <DialogDescription>
                Enter details about your debt or liability
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="Home Mortgage"
                    {...register('name')}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="balance">Current Balance</Label>
                  <Input
                    id="balance"
                    type="number"
                    step="0.01"
                    placeholder="250000"
                    {...register('balance')}
                  />
                  {errors.balance && (
                    <p className="text-sm text-destructive">
                      {errors.balance.message}
                    </p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="interestRate">Interest Rate (%)</Label>
                  <Input
                    id="interestRate"
                    type="number"
                    step="0.01"
                    placeholder="4.5"
                    {...register('interestRate')}
                  />
                  {errors.interestRate && (
                    <p className="text-sm text-destructive">
                      {errors.interestRate.message}
                    </p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="payment">Monthly Payment</Label>
                  <Input
                    id="payment"
                    type="number"
                    step="0.01"
                    placeholder="1500"
                    {...register('payment')}
                  />
                  {errors.payment && (
                    <p className="text-sm text-destructive">
                      {errors.payment.message}
                    </p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    {...register('startDate')}
                  />
                  {errors.startDate && (
                    <p className="text-sm text-destructive">
                      {errors.startDate.message}
                    </p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="termMonths">
                    Original Term (months, optional)
                  </Label>
                  <Input
                    id="termMonths"
                    type="number"
                    placeholder="360"
                    {...register('termMonths')}
                  />
                  {errors.termMonths && (
                    <p className="text-sm text-destructive">
                      {errors.termMonths.message}
                    </p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleDialogClose(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingLiability ? 'Update' : 'Add'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {liabilities.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No liabilities added yet. Click &quot;Add Liability&quot; to get started.
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead className="text-right">Interest Rate</TableHead>
              <TableHead className="text-right">Monthly Payment</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {liabilities.map((liability) => (
              <TableRow key={liability.id}>
                <TableCell className="font-medium">{liability.name}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(liability.balance, { currency })}
                </TableCell>
                <TableCell className="text-right">
                  {formatPercentage(liability.interestRate)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(liability.payment, { currency })}
                </TableCell>
                <TableCell>
                  {format(new Date(liability.startDate), 'MMM d, yyyy')}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(liability)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(liability.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Liability</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this liability? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
