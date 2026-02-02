'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FireConfig, PLANNING_CONSTRAINTS } from '@/types/planning';
import { usePlanningStore } from '@/lib/stores/planning';
import { usePortfolioStore } from '@/lib/stores/portfolio';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils/currency';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const fireConfigSchema = z.object({
  annualExpenses: z.coerce
    .number()
    .min(1, 'Annual expenses must be greater than 0'),
  withdrawalRate: z.coerce
    .number()
    .min(PLANNING_CONSTRAINTS.MIN_WITHDRAWAL_RATE * 100)
    .max(PLANNING_CONSTRAINTS.MAX_WITHDRAWAL_RATE * 100),
  monthlySavings: z.coerce.number().min(0, 'Monthly savings cannot be negative'),
  expectedReturn: z.coerce
    .number()
    .min(PLANNING_CONSTRAINTS.MIN_EXPECTED_RETURN * 100)
    .max(PLANNING_CONSTRAINTS.MAX_EXPECTED_RETURN * 100),
  inflationRate: z.coerce
    .number()
    .min(PLANNING_CONSTRAINTS.MIN_INFLATION_RATE * 100)
    .max(PLANNING_CONSTRAINTS.MAX_INFLATION_RATE * 100),
  retirementAge: z.coerce.number().optional(),
});

type FireConfigFormData = z.infer<typeof fireConfigSchema>;

export function GoalInputForm() {
  const { fireConfig, setFireConfig, resetFireConfig } = usePlanningStore();
  const { currentPortfolio } = usePortfolioStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FireConfigFormData>({
    resolver: zodResolver(fireConfigSchema),
    defaultValues: {
      annualExpenses: fireConfig.annualExpenses,
      withdrawalRate: fireConfig.withdrawalRate * 100,
      monthlySavings: fireConfig.monthlySavings,
      expectedReturn: fireConfig.expectedReturn * 100,
      inflationRate: fireConfig.inflationRate * 100,
      retirementAge: fireConfig.retirementAge,
    },
  });

  const onSubmit = (data: FireConfigFormData) => {
    // Convert percentages to decimals
    setFireConfig({
      annualExpenses: data.annualExpenses,
      withdrawalRate: data.withdrawalRate / 100,
      monthlySavings: data.monthlySavings,
      expectedReturn: data.expectedReturn / 100,
      inflationRate: data.inflationRate / 100,
      retirementAge: data.retirementAge,
    });
  };

  const handleReset = () => {
    resetFireConfig();
    // Reset the form to default values
    const defaultConfig = {
      annualExpenses: 40000,
      withdrawalRate: 4,
      monthlySavings: 0,
      expectedReturn: 7,
      inflationRate: 3,
      retirementAge: undefined,
    };
    reset(defaultConfig);
  };

  // Calculate FIRE number for display
  const fireNumber = fireConfig.annualExpenses / fireConfig.withdrawalRate;
  const currency = currentPortfolio?.currency || 'USD';

  return (
    <Card>
      <CardHeader>
        <CardTitle>FIRE Goal Settings</CardTitle>
        <div className="text-sm text-muted-foreground">
          FIRE Target: <span className="text-lg font-bold text-foreground">{formatCurrency(fireNumber, { currency })}</span>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="annualExpenses">Annual Retirement Income</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        Your desired annual spending in retirement (in today&apos;s
                        dollars)
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                id="annualExpenses"
                type="number"
                step="1000"
                placeholder="40000"
                {...register('annualExpenses')}
              />
              {errors.annualExpenses && (
                <p className="text-sm text-destructive">
                  {errors.annualExpenses.message}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="withdrawalRate">
                  Safe Withdrawal Rate (%)
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        The percentage you can withdraw annually. 4% is the
                        traditional rule.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                id="withdrawalRate"
                type="number"
                step="0.1"
                placeholder="4"
                {...register('withdrawalRate')}
              />
              {errors.withdrawalRate && (
                <p className="text-sm text-destructive">
                  {errors.withdrawalRate.message}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="monthlySavings">Monthly Savings</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        Amount you save/invest each month towards FIRE
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                id="monthlySavings"
                type="number"
                step="100"
                placeholder="1000"
                {...register('monthlySavings')}
              />
              {errors.monthlySavings && (
                <p className="text-sm text-destructive">
                  {errors.monthlySavings.message}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="expectedReturn">Expected Return (%)</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        Expected annual investment return (before inflation)
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                id="expectedReturn"
                type="number"
                step="0.1"
                placeholder="7"
                {...register('expectedReturn')}
              />
              {errors.expectedReturn && (
                <p className="text-sm text-destructive">
                  {errors.expectedReturn.message}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="inflationRate">Inflation Rate (%)</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        Expected annual inflation rate. Projections adjust for
                        this.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                id="inflationRate"
                type="number"
                step="0.1"
                placeholder="3"
                {...register('inflationRate')}
              />
              {errors.inflationRate && (
                <p className="text-sm text-destructive">
                  {errors.inflationRate.message}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="retirementAge">
                  Target Retirement Age (optional)
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        Your goal retirement age for reference
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                id="retirementAge"
                type="number"
                placeholder="60"
                {...register('retirementAge')}
              />
              {errors.retirementAge && (
                <p className="text-sm text-destructive">
                  {errors.retirementAge.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit">Update Goals</Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
            >
              Reset to Defaults
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
