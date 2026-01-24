'use client';

/**
 * Import Results Component
 *
 * Displays the results of a CSV import operation with success/failure counts
 * and detailed error breakdown with expandable rows.
 */

import { useState } from 'react';
import { CheckCircle, AlertCircle, FileDown, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { ImportError } from '@/types/csv-import';

interface ImportResultsProps {
  success: boolean;
  importedCount: number;
  skippedCount: number;
  errorCount: number;
  /** Detailed errors for expandable view */
  errors?: ImportError[];
  onDownloadFailed?: () => void;
  className?: string;
}

export function ImportResults({
  success,
  importedCount,
  skippedCount,
  errorCount,
  errors = [],
  onDownloadFailed,
  className,
}: ImportResultsProps) {
  const [showErrors, setShowErrors] = useState(false);
  const totalProcessed = importedCount + skippedCount + errorCount;

  // Group errors by row for display
  const errorsByRow = errors.reduce((acc, error) => {
    if (!acc[error.rowNumber]) {
      acc[error.rowNumber] = [];
    }
    acc[error.rowNumber].push(error);
    return acc;
  }, {} as Record<number, ImportError[]>);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Main Status */}
      <div className="flex flex-col items-center justify-center py-6">
        {success ? (
          <>
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            <h3 className="text-xl font-semibold text-foreground">
              Import Successful
            </h3>
            <p className="text-muted-foreground mt-1">
              Your transactions have been imported to your portfolio.
            </p>
          </>
        ) : (
          <>
            <AlertCircle className="h-16 w-16 text-destructive mb-4" />
            <h3 className="text-xl font-semibold text-foreground">
              Import Completed with Errors
            </h3>
            <p className="text-muted-foreground mt-1">
              Some transactions could not be imported.
            </p>
          </>
        )}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4">
        {/* Imported */}
        <div className="flex flex-col items-center p-4 rounded-lg bg-green-500/10 border border-green-500/20">
          <CheckCircle className="h-6 w-6 text-green-500 mb-2" />
          <span className="text-2xl font-bold text-foreground">{importedCount}</span>
          <span className="text-sm text-muted-foreground">Imported</span>
        </div>

        {/* Skipped (Duplicates) */}
        <div className="flex flex-col items-center p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <AlertTriangle className="h-6 w-6 text-yellow-500 mb-2" />
          <span className="text-2xl font-bold text-foreground">{skippedCount}</span>
          <span className="text-sm text-muted-foreground">
            {skippedCount === 1 ? 'Duplicate Skipped' : 'Duplicates Skipped'}
          </span>
        </div>

        {/* Errors */}
        <div className="flex flex-col items-center p-4 rounded-lg bg-destructive/10 border border-destructive/20">
          <AlertCircle className="h-6 w-6 text-destructive mb-2" />
          <span className="text-2xl font-bold text-foreground">{errorCount}</span>
          <span className="text-sm text-muted-foreground">Errors</span>
        </div>
      </div>

      {/* Total Summary */}
      <div className="text-center text-sm text-muted-foreground">
        {totalProcessed} total rows processed
      </div>

      {/* Error Details - Expandable */}
      {errorCount > 0 && errors.length > 0 && (
        <Collapsible open={showErrors} onOpenChange={setShowErrors}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between py-2"
            >
              <span className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                View Error Details ({Object.keys(errorsByRow).length} rows)
              </span>
              {showErrors ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 max-h-[200px] overflow-y-auto rounded-md border bg-muted/30 p-3">
              {Object.entries(errorsByRow)
                .sort(([a], [b]) => Number(a) - Number(b))
                .slice(0, 10)
                .map(([rowNum, rowErrors]) => (
                  <div key={rowNum} className="mb-2 last:mb-0">
                    <div className="text-sm font-medium text-foreground">
                      Row {rowNum}
                    </div>
                    {rowErrors.map((error, idx) => (
                      <div
                        key={idx}
                        className="ml-4 text-sm text-muted-foreground"
                      >
                        <span className="font-medium">{error.field}:</span>{' '}
                        {error.message}
                        {error.value && (
                          <span className="ml-1 text-xs text-muted-foreground/70">
                            (value: &quot;{error.value}&quot;)
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              {Object.keys(errorsByRow).length > 10 && (
                <div className="mt-2 text-sm text-muted-foreground text-center">
                  ... and {Object.keys(errorsByRow).length - 10} more rows
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Download Failed Rows */}
      {errorCount > 0 && onDownloadFailed && (
        <div className="flex flex-col items-center gap-2 pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            Download the failed rows to review and fix the issues.
          </p>
          <Button
            variant="outline"
            onClick={onDownloadFailed}
            className="gap-2"
          >
            <FileDown className="h-4 w-4" />
            Download Failed Rows
          </Button>
        </div>
      )}

      {/* Success Actions */}
      {success && importedCount > 0 && (
        <div className="text-center pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            Your portfolio has been updated with {importedCount} new transaction
            {importedCount === 1 ? '' : 's'}.
          </p>
        </div>
      )}
    </div>
  );
}
