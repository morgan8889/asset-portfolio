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
        aria-label={isEnabled ? 'Hide benchmark comparison' : 'Show benchmark comparison'}
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
              className="gap-2 min-w-[120px]"
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
                  'flex flex-col items-start gap-0.5 cursor-pointer',
                  selectedBenchmark === benchmark.symbol && 'bg-accent'
                )}
              >
                <div className="flex items-center gap-2 w-full">
                  <span className="font-medium">{benchmark.name}</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {benchmark.symbol}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground line-clamp-1">
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
