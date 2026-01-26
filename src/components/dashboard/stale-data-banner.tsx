'use client';

/**
 * Stale Data Banner Component
 *
 * Displays a warning when price data is outdated beyond a threshold.
 * Helps users understand when displayed values may not reflect current market.
 *
 * @module components/dashboard/stale-data-banner
 */

import { memo } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils';

interface StaleDataBannerProps {
  /** When prices were last updated */
  lastUpdated: Date | null;
  /** Minutes before data is considered stale (default: 15) */
  thresholdMinutes?: number;
  /** Callback to refresh data */
  onRefresh?: () => void;
  /** Whether a refresh is currently in progress */
  isRefreshing?: boolean;
}

export const StaleDataBanner = memo(function StaleDataBanner({
  lastUpdated,
  thresholdMinutes = 15,
  onRefresh,
  isRefreshing = false,
}: StaleDataBannerProps) {
  // If no last updated time, don't show the banner
  if (!lastUpdated) {
    return null;
  }

  const now = new Date();
  const diffMinutes = (now.getTime() - lastUpdated.getTime()) / (1000 * 60);

  // Only show if data is stale
  if (diffMinutes <= thresholdMinutes) {
    return null;
  }

  return (
    <div
      className={cn(
        'mb-4 flex items-center gap-3 rounded-lg border p-4',
        'border-amber-200 bg-amber-50 text-amber-800'
      )}
      role="alert"
    >
      <AlertCircle className="h-5 w-5 flex-shrink-0 text-amber-600" />
      <span className="flex-1 text-sm">
        Prices last updated {formatRelativeTime(lastUpdated)}. Some values may
        be outdated.
      </span>
      {onRefresh && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="text-amber-700 hover:bg-amber-100 hover:text-amber-900"
        >
          <RefreshCw
            className={cn('mr-1 h-4 w-4', isRefreshing && 'animate-spin')}
          />
          Refresh
        </Button>
      )}
    </div>
  );
});

StaleDataBanner.displayName = 'StaleDataBanner';

/**
 * Stale Data Badge Component
 *
 * Small inline indicator for individual widgets that have stale data.
 */
interface StaleDataBadgeProps {
  isStale: boolean;
  lastUpdated?: Date | null;
}

export const StaleDataBadge = memo(function StaleDataBadge({
  isStale,
  lastUpdated,
}: StaleDataBadgeProps) {
  if (!isStale) {
    return null;
  }

  return (
    <span
      className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700"
      title={
        lastUpdated
          ? `Last updated: ${formatRelativeTime(lastUpdated)}`
          : 'Data may be outdated'
      }
    >
      <AlertCircle className="h-3 w-3" />
      Stale
    </span>
  );
});

StaleDataBadge.displayName = 'StaleDataBadge';
