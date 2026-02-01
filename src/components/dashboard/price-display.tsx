'use client';

/**
 * PriceDisplay Component
 *
 * Feature: 005-live-market-data
 *
 * Displays live price data with:
 * - Current price with currency symbol
 * - Price change and percentage
 * - "Updated X ago" timestamp
 * - Staleness indicator
 * - Market state badge (optional)
 * - Loading and error states
 */

import { useMemo } from 'react';
import Decimal from 'decimal.js';
import { cn } from '@/lib/utils';
import { LivePriceData, StalenessLevel, MarketState } from '@/types/market';
import { formatDataAge } from '@/lib/utils/staleness';
import {
  MarketStatusBadge,
  MarketStatusDot,
} from '@/components/ui/market-status-badge';

interface PriceDisplayProps {
  priceData?: LivePriceData;
  loading?: boolean;
  error?: string | null;
  showTimestamp?: boolean;
  showStaleness?: boolean;
  showMarketState?: boolean;
  showChange?: boolean;
  size?: 'sm' | 'md' | 'lg';
  align?: 'left' | 'right';
  className?: string;
}

const currencySymbols: Record<string, string> = {
  USD: '$',
  GBP: '£',
  EUR: '€',
};

function formatCurrency(price: string | number, currency: string): string {
  const symbol = currencySymbols[currency] || currency + ' ';
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return `${symbol}${numPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getStalenessColor(staleness: StalenessLevel): string {
  switch (staleness) {
    case 'fresh':
      return 'text-green-600 dark:text-green-400';
    case 'aging':
      return 'text-yellow-600 dark:text-yellow-400';
    case 'stale':
      return 'text-red-600 dark:text-red-400';
    default:
      return 'text-muted-foreground';
  }
}

function getStalenessBgColor(staleness: StalenessLevel): string {
  switch (staleness) {
    case 'fresh':
      return 'bg-green-500';
    case 'aging':
      return 'bg-yellow-500';
    case 'stale':
      return 'bg-red-500';
    default:
      return 'bg-gray-400';
  }
}

function getMarketStateLabel(state: MarketState): string {
  switch (state) {
    case 'PRE':
      return 'Pre-Market';
    case 'REGULAR':
      return 'Open';
    case 'POST':
      return 'After Hours';
    case 'CLOSED':
      return 'Closed';
    default:
      return state;
  }
}

function getMarketStateColor(state: MarketState): string {
  switch (state) {
    case 'REGULAR':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'PRE':
    case 'POST':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'CLOSED':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

const sizeClasses = {
  sm: {
    price: 'text-sm font-medium',
    change: 'text-xs',
    timestamp: 'text-xs',
    dot: 'w-1.5 h-1.5',
    badge: 'text-xs px-1.5 py-0.5',
  },
  md: {
    price: 'text-base font-semibold',
    change: 'text-sm',
    timestamp: 'text-sm',
    dot: 'w-2 h-2',
    badge: 'text-xs px-2 py-0.5',
  },
  lg: {
    price: 'text-xl font-bold',
    change: 'text-base',
    timestamp: 'text-sm',
    dot: 'w-2.5 h-2.5',
    badge: 'text-sm px-2 py-1',
  },
};

export function PriceDisplay({
  priceData,
  loading = false,
  error = null,
  showTimestamp = true,
  showStaleness = true,
  showMarketState = false,
  showChange = true,
  size = 'md',
  align = 'left',
  className,
}: PriceDisplayProps) {
  const classes = sizeClasses[size];

  const formattedAge = useMemo(() => {
    if (!priceData?.timestamp) return null;
    return formatDataAge(priceData.timestamp);
  }, [priceData?.timestamp]);

  // Loading state
  if (loading) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className="animate-pulse">
          <div
            className={cn(
              'h-5 w-20 rounded bg-muted',
              size === 'sm' && 'h-4 w-16'
            )}
          />
          {showChange && (
            <div
              className={cn(
                'mt-1 h-4 w-14 rounded bg-muted',
                size === 'sm' && 'h-3 w-12'
              )}
            />
          )}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <span className={cn(classes.price, 'text-muted-foreground')}>--</span>
        <span className="text-xs text-red-500" title={error}>
          Error
        </span>
      </div>
    );
  }

  // No data state
  if (!priceData) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <span className={cn(classes.price, 'text-muted-foreground')}>--</span>
      </div>
    );
  }

  const changeValue = parseFloat(priceData.change);
  const isPositive = changeValue >= 0;
  const changeColor = isPositive
    ? 'text-green-600 dark:text-green-400'
    : 'text-red-600 dark:text-red-400';

  return (
    <div
      className={cn(
        'flex flex-col',
        align === 'right' ? 'items-end' : 'items-start',
        className
      )}
    >
      {/* Main price row */}
      <div
        className={cn(
          'flex items-center gap-2',
          align === 'right' ? 'justify-end' : 'justify-start'
        )}
      >
        {/* Staleness indicator dot */}
        {showStaleness && (
          <span
            className={cn(
              'shrink-0 rounded-full',
              classes.dot,
              getStalenessBgColor(priceData.staleness)
            )}
            title={`Data is ${priceData.staleness}`}
          />
        )}

        {/* Price */}
        <span className={cn(classes.price)}>
          {formatCurrency(priceData.displayPrice, priceData.displayCurrency)}
        </span>

        {/* Market state badge */}
        {showMarketState && (
          <MarketStatusBadge
            state={priceData.marketState}
            size={size}
            showLabel={size !== 'sm'}
          />
        )}
      </div>

      {/* Change row */}
      {showChange && (
        <div
          className={cn(
            'flex items-center gap-1',
            classes.change,
            changeColor,
            align === 'right' ? 'justify-end' : 'justify-start'
          )}
        >
          <span>
            {isPositive ? '+' : ''}
            {formatCurrency(priceData.change, priceData.displayCurrency)}
          </span>
          <span>
            ({isPositive ? '+' : ''}
            {priceData.changePercent.toFixed(2)}%)
          </span>
        </div>
      )}

      {/* Timestamp row */}
      {showTimestamp && formattedAge && (
        <div
          className={cn(
            'flex items-center gap-1',
            classes.timestamp,
            getStalenessColor(priceData.staleness),
            align === 'right' ? 'justify-end' : 'justify-start'
          )}
        >
          <span>Updated {formattedAge}</span>
        </div>
      )}
    </div>
  );
}

export default PriceDisplay;
