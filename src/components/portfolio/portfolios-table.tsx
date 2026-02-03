'use client';

import { useMemo, useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { usePortfolioStore } from '@/lib/stores/portfolio';
import { formatCurrency } from '@/lib/utils/format';
import { calculateTotalValue, calculateGainPercent } from '@/lib/services/metrics-service';
import { holdingQueries } from '@/lib/db';
import Decimal from 'decimal.js';

const portfolioTypeLabels: Record<string, string> = {
  taxable: 'Taxable',
  ira: 'IRA',
  '401k': '401(k)',
  roth: 'Roth IRA',
};

interface PortfoliosTableProps {
  onView: (portfolioId: string) => void;
  onEdit?: (portfolioId: string) => void;
  onDelete?: (portfolioId: string) => void;
}

export function PortfoliosTable({
  onView,
  onEdit,
  onDelete,
}: PortfoliosTableProps) {
  const { getSortedPortfolios, currentPortfolio } = usePortfolioStore();
  const [portfolioMetrics, setPortfolioMetrics] = useState<
    Map<string, { totalValue: Decimal; ytdReturn: number; holdings: number }>
  >(new Map());

  const portfolios = useMemo(() => getSortedPortfolios(), [getSortedPortfolios]);

  // Load metrics for all portfolios
  useEffect(() => {
    async function loadMetrics() {
      const metricsMap = new Map();

      for (const portfolio of portfolios) {
        try {
          const holdings = await holdingQueries.getByPortfolio(portfolio.id);
          const totalValue = calculateTotalValue(holdings);
          const totalCost = holdings.reduce(
            (sum, h) => sum.plus(h.costBasis),
            new Decimal(0)
          );
          const totalGain = holdings.reduce(
            (sum, h) => sum.plus(h.unrealizedGain),
            new Decimal(0)
          );
          const ytdReturn = calculateGainPercent(totalGain, totalCost);

          metricsMap.set(portfolio.id, {
            totalValue,
            ytdReturn,
            holdings: holdings.length,
          });
        } catch (error) {
          console.error(`Failed to load metrics for portfolio ${portfolio.id}:`, error);
          metricsMap.set(portfolio.id, {
            totalValue: new Decimal(0),
            ytdReturn: 0,
            holdings: 0,
          });
        }
      }

      setPortfolioMetrics(metricsMap);
    }

    loadMetrics();
  }, [portfolios]);

  const getPortfolioMetrics = (portfolioId: string) => {
    return (
      portfolioMetrics.get(portfolioId) || {
        totalValue: new Decimal(0),
        ytdReturn: 0,
        holdings: 0,
      }
    );
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Total Value</TableHead>
            <TableHead className="text-right">YTD Return</TableHead>
            <TableHead className="text-right">Holdings</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {portfolios.map((portfolio) => {
            const metrics = getPortfolioMetrics(portfolio.id);
            const isCurrent = currentPortfolio?.id === portfolio.id;

            return (
              <TableRow key={portfolio.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {portfolio.name}
                    {isCurrent && (
                      <Badge variant="secondary" className="text-xs">
                        Current
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {portfolioTypeLabels[portfolio.type] || portfolio.type}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(metrics.totalValue, portfolio.currency)}
                </TableCell>
                <TableCell className="text-right">
                  <span
                    className={
                      metrics.ytdReturn >= 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    }
                  >
                    {metrics.ytdReturn >= 0 ? '+' : ''}
                    {metrics.ytdReturn.toFixed(2)}%
                  </span>
                </TableCell>
                <TableCell className="text-right">{metrics.holdings}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onView(portfolio.id)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(portfolio.id)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(portfolio.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
