'use client';

import { useMemo, useEffect, useState } from 'react';
import { CreatePortfolioDialog } from '@/components/forms/create-portfolio';
import { DeletePortfolioDialog } from '@/components/forms/delete-portfolio-dialog';
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
import { formatCurrency } from '@/lib/utils/currency';
import { calculateTotalValue, calculateYtdReturn } from '@/lib/services/metrics-service';
import { holdingQueries } from '@/lib/db';
import Decimal from 'decimal.js';
import { Portfolio, PortfolioType } from '@/types/portfolio';
import { PORTFOLIO_TYPE_LABELS } from '@/lib/constants/portfolio';
import { logger } from '@/lib/utils/logger';

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
  // Subscribe directly to portfolios array (re-renders only when it changes)
  const portfolios = usePortfolioStore((state) => state.portfolios);
  const currentPortfolio = usePortfolioStore((state) => state.currentPortfolio);
  const [portfolioMetrics, setPortfolioMetrics] = useState<
    Map<string, { totalValue: Decimal; ytdReturn: number | null; holdings: number }>
  >(new Map());
  const [editingPortfolio, setEditingPortfolio] = useState<{
    id: string;
    name: string;
    type: PortfolioType;
    currency: string;
  } | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const [deletingPortfolio, setDeletingPortfolio] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Use the store's getSortedPortfolios method for consistency
  const getSortedPortfolios = usePortfolioStore((state) => state.getSortedPortfolios);
  const sortedPortfolios = useMemo(() => {
    return getSortedPortfolios();
  }, [portfolios, getSortedPortfolios]);

  // Load metrics for all portfolios
  useEffect(() => {
    let mounted = true; // Track if component is still mounted

    async function loadMetrics() {
      // Parallelize metrics loading for better performance
      const metricsPromises = portfolios.map(async (portfolio) => {
        try {
          const holdings = await holdingQueries.getByPortfolio(portfolio.id);
          const totalValue = calculateTotalValue(holdings);

          // Calculate YTD return using the extracted service function
          const ytdResult = await calculateYtdReturn(portfolio.id);
          const ytdReturn = ytdResult.return;

          return {
            portfolioId: portfolio.id,
            metrics: {
              totalValue,
              ytdReturn,
              holdings: holdings.length,
            },
          };
        } catch (error) {
          logger.error(`Failed to load metrics for portfolio ${portfolio.id}`, error);
          return {
            portfolioId: portfolio.id,
            metrics: {
              totalValue: new Decimal(0),
              ytdReturn: null,
              holdings: 0,
            },
          };
        }
      });

      const results = await Promise.all(metricsPromises);

      // Only update state if component is still mounted
      if (mounted) {
        const metricsMap = new Map();
        results.forEach(({ portfolioId, metrics }) => {
          metricsMap.set(portfolioId, metrics);
        });

        setPortfolioMetrics(metricsMap);
      }
    }

    if (portfolios.length > 0) {
      loadMetrics();
    }

    // Cleanup function to prevent state updates on unmounted component
    return () => {
      mounted = false;
    };
  }, [portfolios]);

  const getPortfolioMetrics = (portfolioId: string) => {
    return (
      portfolioMetrics.get(portfolioId) || {
        totalValue: new Decimal(0),
        ytdReturn: null,
        holdings: 0,
      }
    );
  };

  const handleEdit = (portfolio: Portfolio) => {
    setEditingPortfolio({
      id: portfolio.id,
      name: portfolio.name,
      type: portfolio.type,
      currency: portfolio.currency,
    });
    setEditDialogOpen(true);
    if (onEdit) {
      onEdit(portfolio.id);
    }
  };

  const handleDelete = (portfolio: Portfolio) => {
    setDeletingPortfolio({
      id: portfolio.id,
      name: portfolio.name,
    });
    setDeleteDialogOpen(true);
    if (onDelete) {
      onDelete(portfolio.id);
    }
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
          {sortedPortfolios.map((portfolio) => {
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
                    {PORTFOLIO_TYPE_LABELS[portfolio.type] || portfolio.type}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(metrics.totalValue, portfolio.currency)}
                </TableCell>
                <TableCell className="text-right">
                  {metrics.ytdReturn === null ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
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
                  )}
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
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Edit"
                      onClick={() => handleEdit(portfolio)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Delete"
                      onClick={() => handleDelete(portfolio)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {editingPortfolio && (
        <CreatePortfolioDialog
          mode="edit"
          portfolio={editingPortfolio}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
        />
      )}

      <DeletePortfolioDialog
        portfolio={deletingPortfolio}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        isLastPortfolio={sortedPortfolios.length === 1}
      />
    </div>
  );
}
