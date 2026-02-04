'use client';

import * as React from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { usePortfolioStore } from '@/lib/stores/portfolio';
import { useCsvImportStore } from '@/lib/stores/csv-import';
import { Portfolio } from '@/types';
import { PORTFOLIO_TYPE_LABELS } from '@/lib/constants/portfolio';

interface PortfolioSelectorProps {
  className?: string;
}

export function PortfolioSelector({ className }: PortfolioSelectorProps) {
  const { currentPortfolio, setCurrentPortfolio, getSortedPortfolios, portfolios } =
    usePortfolioStore();
  const { isProcessing } = useCsvImportStore();

  const sortedPortfolios = React.useMemo(
    () => getSortedPortfolios(),
    [portfolios, getSortedPortfolios]
  );
  const isDisabled = isProcessing;

  const handleSelectPortfolio = (portfolio: Portfolio) => {
    // Don't re-select the same portfolio
    if (currentPortfolio?.id !== portfolio.id) {
      setCurrentPortfolio(portfolio);
    }
  };

  if (!currentPortfolio) {
    return null;
  }

  const selectorButton = (
    <Button
      variant="outline"
      role="button"
      aria-label="Select portfolio"
      disabled={isDisabled}
      className={cn(
        'flex items-center gap-2 px-3 py-2',
        isDisabled && 'cursor-not-allowed opacity-50',
        className
      )}
    >
      <div className="flex flex-col items-start">
        <span className="font-medium">{currentPortfolio.name}</span>
        <Badge variant="secondary" className="mt-1 text-xs">
          {PORTFOLIO_TYPE_LABELS[currentPortfolio.type] || currentPortfolio.type}
        </Badge>
      </div>
      <ChevronDown className="ml-2 h-4 w-4 text-muted-foreground" />
    </Button>
  );

  if (isDisabled) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{selectorButton}</TooltipTrigger>
          <TooltipContent>
            <p>Cannot switch portfolios during CSV import</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{selectorButton}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {sortedPortfolios.map((portfolio) => {
          const isSelected = portfolio.id === currentPortfolio.id;

          return (
            <DropdownMenuItem
              key={portfolio.id}
              role="menuitem"
              data-state={isSelected ? 'checked' : 'unchecked'}
              onClick={() => handleSelectPortfolio(portfolio)}
              className="flex items-center justify-between"
            >
              <div className="flex flex-col">
                <span className="font-medium">{portfolio.name}</span>
                <span className="text-xs text-muted-foreground">
                  {PORTFOLIO_TYPE_LABELS[portfolio.type] || portfolio.type}
                </span>
              </div>
              {isSelected && <Check className="h-4 w-4" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
