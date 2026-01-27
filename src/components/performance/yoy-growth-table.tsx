/**
 * Year-over-Year Growth Table Component
 *
 * Displays annual CAGR metrics in a table format with color-coded indicators.
 * Shows complete calendar years plus current year (YTD) performance.
 *
 * @module components/performance/yoy-growth-table
 */

'use client';

import { format } from 'date-fns';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { YearOverYearMetric } from '@/types/performance';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface YoYGrowthTableProps {
  metrics: YearOverYearMetric[];
  className?: string;
}

/**
 * Format CAGR percentage with appropriate sign and color.
 */
function formatCAGR(cagr: number): {
  text: string;
  color: string;
  icon: React.ReactNode;
} {
  const formattedValue = Math.abs(cagr).toFixed(2);

  if (cagr > 0) {
    return {
      text: `+${formattedValue}%`,
      color: 'text-green-600 dark:text-green-400',
      icon: <TrendingUp className="h-4 w-4" />,
    };
  } else if (cagr < 0) {
    return {
      text: `-${formattedValue}%`,
      color: 'text-red-600 dark:text-red-400',
      icon: <TrendingDown className="h-4 w-4" />,
    };
  } else {
    return {
      text: '0.00%',
      color: 'text-gray-600 dark:text-gray-400',
      icon: <Minus className="h-4 w-4" />,
    };
  }
}

/**
 * Year-over-Year Growth Table Component.
 *
 * Renders a table showing annual CAGR for each calendar year.
 * Includes visual indicators (icons and colors) for positive/negative growth.
 *
 * @example
 * ```tsx
 * <YoYGrowthTable metrics={yoyMetrics} />
 * ```
 */
export function YoYGrowthTable({ metrics, className }: YoYGrowthTableProps) {
  // If no metrics, show informational message
  if (metrics.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Year-over-Year Growth</CardTitle>
          <CardDescription>
            Annual CAGR calculated for each calendar year
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Year-over-year growth requires at least 1 year of portfolio
              history.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Complete at least one full year of transactions to see annual
              performance metrics.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Year-over-Year Growth</CardTitle>
        <CardDescription>
          Compound Annual Growth Rate (CAGR) for each calendar year
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Period</TableHead>
                <TableHead className="text-right">Start Date</TableHead>
                <TableHead className="text-right">End Date</TableHead>
                <TableHead className="text-right">Start Value</TableHead>
                <TableHead className="text-right">End Value</TableHead>
                <TableHead className="text-right">CAGR</TableHead>
                <TableHead className="text-center">Days</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.map((metric, index) => {
                const cagrFormatted = formatCAGR(metric.cagr);

                return (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {metric.label}
                        {metric.isPartialYear && (
                          <Badge variant="secondary" className="text-xs">
                            Partial
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {format(metric.startDate, 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {format(metric.endDate, 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      ${metric.startValue.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      ${metric.endValue.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div
                        className={`flex items-center justify-end gap-1 font-semibold ${cagrFormatted.color}`}
                      >
                        {cagrFormatted.icon}
                        <span className="font-mono">{cagrFormatted.text}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">
                      {metric.daysInPeriod}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Summary note */}
        <div className="mt-4 rounded-md bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground">
            <strong>Note:</strong> CAGR (Compound Annual Growth Rate) is
            calculated using Time-Weighted Return methodology, which accounts
            for the timing of deposits and withdrawals. Partial years are
            annualized for comparison purposes.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
