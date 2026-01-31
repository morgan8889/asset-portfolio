'use client';

import { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  MinusCircle,
  TrendingUp,
} from 'lucide-react';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { RebalancingPlan, RebalancingAction } from '@/types/allocation';
import Decimal from 'decimal.js';

interface RebalancingTableProps {
  plan: RebalancingPlan | null;
}

const actionIcons: Record<RebalancingAction, React.ReactNode> = {
  BUY: <ArrowUpCircle className="h-4 w-4 text-green-600" />,
  SELL: <ArrowDownCircle className="h-4 w-4 text-red-600" />,
  HOLD: <MinusCircle className="h-4 w-4 text-muted-foreground" />,
};

const actionLabels: Record<RebalancingAction, string> = {
  BUY: 'Buy',
  SELL: 'Sell',
  HOLD: 'Hold',
};

const actionVariants: Record<
  RebalancingAction,
  'default' | 'destructive' | 'secondary'
> = {
  BUY: 'default',
  SELL: 'destructive',
  HOLD: 'secondary',
};

export function RebalancingTable({ plan }: RebalancingTableProps) {
  const totalValue = useMemo(() => {
    return plan ? new Decimal(plan.totalValue).toNumber() : 0;
  }, [plan]);

  const actionSummary = useMemo(() => {
    if (!plan) return { buy: 0, sell: 0, hold: 0 };

    return plan.items.reduce(
      (acc, item) => {
        const amount = new Decimal(item.amount).toNumber();
        if (item.action === 'BUY') acc.buy += amount;
        else if (item.action === 'SELL') acc.sell += amount;
        else acc.hold += 1;
        return acc;
      },
      { buy: 0, sell: 0, hold: 0 }
    );
  }, [plan]);

  if (!plan) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Rebalancing Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center text-muted-foreground">
            <p className="mb-2 text-lg font-medium">No rebalancing plan</p>
            <p className="text-sm">
              Select a target model to generate rebalancing recommendations.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Rebalancing Plan
          </CardTitle>
          <Badge variant="outline">{plan.targetModelName}</Badge>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>Portfolio Value: {formatCurrency(totalValue)}</span>
          <span>•</span>
          <span>
            Actions:{' '}
            {actionSummary.buy > 0 &&
              `${formatCurrency(actionSummary.buy)} to buy`}
            {actionSummary.buy > 0 && actionSummary.sell > 0 && ', '}
            {actionSummary.sell > 0 &&
              `${formatCurrency(actionSummary.sell)} to sell`}
          </span>
        </div>
      </CardHeader>

      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Current</TableHead>
              <TableHead className="text-right">Target</TableHead>
              <TableHead className="text-right">Drift</TableHead>
              <TableHead className="text-right">Action</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plan.items.map((item) => {
              const currentValue = new Decimal(item.currentValue).toNumber();
              const amount = new Decimal(item.amount).toNumber();
              const isDrifted = Math.abs(item.driftPercent) > 0.5; // More than 0.5% drift

              return (
                <TableRow
                  key={item.category}
                  className={isDrifted ? 'bg-muted/30' : ''}
                >
                  <TableCell className="font-medium">{item.category}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end">
                      <span className="font-medium">
                        {formatCurrency(currentValue)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatPercentage(item.currentPercent)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-muted-foreground">
                      {formatPercentage(item.targetPercent)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={`font-medium ${
                        item.driftPercent > 0
                          ? 'text-red-600'
                          : item.driftPercent < 0
                            ? 'text-green-600'
                            : 'text-muted-foreground'
                      }`}
                    >
                      {item.driftPercent > 0 ? '+' : ''}
                      {item.driftPercent.toFixed(1)}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant={actionVariants[item.action]}
                      className="ml-auto flex w-fit items-center gap-1"
                    >
                      {actionIcons[item.action]}
                      {actionLabels[item.action]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {item.action !== 'HOLD' && (
                      <span className="font-medium">
                        {formatCurrency(amount)}
                      </span>
                    )}
                    {item.action === 'HOLD' && (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* Summary */}
        <div className="mt-6 rounded-lg border bg-muted/30 p-4">
          <h4 className="mb-3 text-sm font-medium">Rebalancing Summary</h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Buy</div>
              <div className="text-lg font-semibold text-green-600">
                {formatCurrency(actionSummary.buy)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Sell</div>
              <div className="text-lg font-semibold text-red-600">
                {formatCurrency(actionSummary.sell)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">On Target</div>
              <div className="text-lg font-semibold text-muted-foreground">
                {actionSummary.hold}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
