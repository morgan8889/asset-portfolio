'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { RebalancingPlan } from '@/types/analysis';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface RebalancingTableProps {
  rebalancingPlan: RebalancingPlan | null;
  isCalculating?: boolean;
}

export function RebalancingTable({
  rebalancingPlan,
  isCalculating,
}: RebalancingTableProps) {
  if (isCalculating) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Rebalancing Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
            <p className="mt-2 text-sm text-muted-foreground">
              Calculating rebalancing...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!rebalancingPlan) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Rebalancing Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-sm text-muted-foreground">
            Select a target model to view rebalancing actions
          </p>
        </CardContent>
      </Card>
    );
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'buy':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'sell':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'hold':
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActionVariant = (action: string) => {
    switch (action) {
      case 'buy':
        return 'default';
      case 'sell':
        return 'destructive';
      case 'hold':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rebalancing Actions</CardTitle>
        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          <span>
            Total to Buy: ${rebalancingPlan.totalBuyAmount.toFixed(2)}
          </span>
          <span>
            Total to Sell: ${rebalancingPlan.totalSellAmount.toFixed(2)}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset Type</TableHead>
              <TableHead className="text-right">Current %</TableHead>
              <TableHead className="text-right">Target %</TableHead>
              <TableHead className="text-right">Drift</TableHead>
              <TableHead className="text-right">Action</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rebalancingPlan.actions.map((action) => (
              <TableRow key={action.assetType}>
                <TableCell className="font-medium">
                  {action.assetTypeName}
                </TableCell>
                <TableCell className="text-right">
                  {action.currentPercent.toFixed(1)}%
                </TableCell>
                <TableCell className="text-right">
                  {action.targetPercent.toFixed(1)}%
                </TableCell>
                <TableCell
                  className={`text-right font-medium ${
                    action.differencePercent > 0
                      ? 'text-green-600 dark:text-green-400'
                      : action.differencePercent < 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-500'
                  }`}
                >
                  {action.differencePercent > 0 ? '+' : ''}
                  {action.differencePercent.toFixed(1)}%
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant={getActionVariant(action.action)}>
                    <span className="flex items-center gap-1">
                      {getActionIcon(action.action)}
                      {action.action.toUpperCase()}
                    </span>
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {action.action !== 'hold' ? `$${action.amount.toFixed(2)}` : '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
