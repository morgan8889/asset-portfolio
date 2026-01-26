'use client';

/**
 * Benchmark Selector Component
 *
 * Dropdown selector for choosing benchmark indices to compare portfolio performance.
 * Supports S&P 500, Dow Jones, NASDAQ and other major indices.
 *
 * @module components/performance/benchmark-selector
 */

import { memo } from 'react';
import { ChevronDown, TrendingUp } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { BenchmarkInfo } from '@/types/performance';

// =============================================================================
// Types
// =============================================================================

export interface BenchmarkSelectorProps {
  /** Currently selected benchmark symbol */
  selectedBenchmark: string;
  /** List of available benchmarks */
  benchmarks: BenchmarkInfo[];
  /** Whether benchmark comparison is enabled */
  isEnabled: boolean;
  /** Callback when benchmark selection changes */
  onBenchmarkChange: (symbol: string) => void;
  /** Callback when benchmark toggle changes */
  onToggle: () => void;
  /** Loading state */
  isLoading?: boolean;
  /** Optional className */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export const BenchmarkSelector = memo(function BenchmarkSelector({
  selectedBenchmark,
  benchmarks,
  isEnabled,
  onBenchmarkChange,
  onToggle,
  isLoading = false,
  className,
}: BenchmarkSelectorProps) {
  const selectedInfo = benchmarks.find((b) => b.symbol === selectedBenchmark);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Toggle button */}
      <Button
        variant={isEnabled ? 'default' : 'outline'}
        size="sm"
        onClick={onToggle}
        disabled={isLoading}
        className="gap-2"
        aria-label={
          isEnabled ? 'Hide benchmark comparison' : 'Show benchmark comparison'
        }
        aria-pressed={isEnabled}
      >
        <TrendingUp className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Compare</span>
      </Button>

      {/* Benchmark dropdown */}
      {isEnabled && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={isLoading}
              className="min-w-[120px] gap-2"
              aria-label={`Select benchmark index, currently ${selectedInfo?.name || selectedBenchmark}`}
            >
              <span className="truncate">
                {selectedInfo?.name || selectedBenchmark}
              </span>
              <ChevronDown className="h-4 w-4 shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[250px]">
            <DropdownMenuLabel>Select Benchmark</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {benchmarks.map((benchmark) => (
              <DropdownMenuItem
                key={benchmark.symbol}
                onClick={() => onBenchmarkChange(benchmark.symbol)}
                className={cn(
                  'flex cursor-pointer flex-col items-start gap-0.5',
                  selectedBenchmark === benchmark.symbol && 'bg-accent'
                )}
              >
                <div className="flex w-full items-center gap-2">
                  <span className="font-medium">{benchmark.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {benchmark.symbol}
                  </span>
                </div>
                <span className="line-clamp-1 text-xs text-muted-foreground">
                  {benchmark.description}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
});

export default BenchmarkSelector;
