'use client';

/**
 * Import Results Component
 *
 * Displays the results of a CSV import operation with success/failure counts.
 */

import { CheckCircle, AlertCircle, FileDown, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ImportResultsProps {
  success: boolean;
  importedCount: number;
  skippedCount: number;
  errorCount: number;
  onDownloadFailed?: () => void;
  className?: string;
}

export function ImportResults({
  success,
  importedCount,
  skippedCount,
  errorCount,
  onDownloadFailed,
  className,
}: ImportResultsProps) {
  const totalProcessed = importedCount + skippedCount + errorCount;

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

        {/* Skipped */}
        <div className="flex flex-col items-center p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <AlertTriangle className="h-6 w-6 text-yellow-500 mb-2" />
          <span className="text-2xl font-bold text-foreground">{skippedCount}</span>
          <span className="text-sm text-muted-foreground">Skipped</span>
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
