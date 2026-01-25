'use client';

/**
 * Import Error Report Component
 *
 * Displays detailed error information for failed CSV import rows.
 * Shows row number, original data, and specific error messages.
 */

import React, { useState } from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChevronDown, ChevronRight, AlertCircle, AlertTriangle, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ImportError, ErrorSeverity, TransactionField } from '@/types/csv-import';
import { FIELD_LABELS } from '@/types/csv-import';

interface ImportErrorReportProps {
  /** List of import errors */
  errors: ImportError[];
  /** Callback to download failed rows as CSV */
  onDownloadFailed?: () => void;
  /** Maximum number of errors to show initially */
  initialDisplayCount?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Get icon for error severity
 */
function getSeverityIcon(severity: ErrorSeverity) {
  if (severity === 'error') {
    return <AlertCircle className="h-4 w-4 text-destructive" />;
  }
  return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
}

/**
 * Get badge variant for error severity
 */
function getSeverityBadge(severity: ErrorSeverity) {
  if (severity === 'error') {
    return (
      <Badge variant="destructive" className="text-xs">
        Error
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs">
      Warning
    </Badge>
  );
}

/**
 * Group errors by row number for display
 */
function groupErrorsByRow(errors: ImportError[]): Map<number, ImportError[]> {
  const grouped = new Map<number, ImportError[]>();

  for (const error of errors) {
    const existing = grouped.get(error.rowNumber) ?? [];
    existing.push(error);
    grouped.set(error.rowNumber, existing);
  }

  return grouped;
}

/**
 * Single error row component
 */
function ErrorRow({
  rowNumber,
  errors,
}: {
  rowNumber: number;
  errors: ImportError[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const hasMultipleErrors = errors.length > 1;
  const primaryError = errors[0];
  const hasOnlyWarnings = errors.every((e) => e.severity === 'warning');

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <TableRow
          className={cn(
            'cursor-pointer hover:bg-muted/50',
            hasOnlyWarnings ? 'bg-yellow-50/50' : 'bg-red-50/50'
          )}
        >
          <TableCell className="font-mono text-sm">
            <div className="flex items-center gap-2">
              {hasMultipleErrors ? (
                isOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )
              ) : (
                <div className="w-4" />
              )}
              Row {rowNumber}
            </div>
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-2">
              {getSeverityIcon(primaryError.severity)}
              {FIELD_LABELS[primaryError.field]}
            </div>
          </TableCell>
          <TableCell className="font-mono text-sm max-w-[150px] truncate">
            {primaryError.value || '(empty)'}
          </TableCell>
          <TableCell className="text-sm">
            {primaryError.message}
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-2">
              {getSeverityBadge(primaryError.severity)}
              {hasMultipleErrors && (
                <Badge variant="outline" className="text-xs">
                  +{errors.length - 1} more
                </Badge>
              )}
            </div>
          </TableCell>
        </TableRow>
      </CollapsibleTrigger>

      {hasMultipleErrors && (
        <CollapsibleContent asChild>
          <>
            {errors.slice(1).map((error, idx) => (
              <TableRow
                key={`${rowNumber}-${idx}`}
                className={cn(
                  'bg-muted/30',
                  error.severity === 'warning' ? 'bg-yellow-50/30' : 'bg-red-50/30'
                )}
              >
                <TableCell className="pl-10">
                  <span className="text-muted-foreground text-sm">↳</span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getSeverityIcon(error.severity)}
                    {FIELD_LABELS[error.field]}
                  </div>
                </TableCell>
                <TableCell className="font-mono text-sm max-w-[150px] truncate">
                  {error.value || '(empty)'}
                </TableCell>
                <TableCell className="text-sm">
                  {error.message}
                </TableCell>
                <TableCell>
                  {getSeverityBadge(error.severity)}
                </TableCell>
              </TableRow>
            ))}
          </>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}

export function ImportErrorReport({
  errors,
  onDownloadFailed,
  initialDisplayCount = 10,
  className,
}: ImportErrorReportProps) {
  const [showAll, setShowAll] = useState(false);

  const groupedErrors = groupErrorsByRow(errors);
  const rowNumbers = Array.from(groupedErrors.keys()).sort((a, b) => a - b);
  const displayedRows = showAll ? rowNumbers : rowNumbers.slice(0, initialDisplayCount);
  const hasMore = rowNumbers.length > initialDisplayCount;

  const errorCount = errors.filter((e) => e.severity === 'error').length;
  const warningCount = errors.filter((e) => e.severity === 'warning').length;

  if (errors.length === 0) {
    return null;
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Import Errors
          </CardTitle>
          {onDownloadFailed && (
            <Button variant="outline" size="sm" onClick={onDownloadFailed}>
              <Download className="h-4 w-4 mr-2" />
              Download Failed Rows
            </Button>
          )}
        </div>
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>{rowNumbers.length} rows with issues</span>
          {errorCount > 0 && (
            <span className="text-destructive">{errorCount} errors</span>
          )}
          {warningCount > 0 && (
            <span className="text-yellow-600">{warningCount} warnings</span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Row</TableHead>
                <TableHead className="w-[120px]">Field</TableHead>
                <TableHead className="w-[150px]">Value</TableHead>
                <TableHead>Error Message</TableHead>
                <TableHead className="w-[120px]">Severity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedRows.map((rowNumber) => (
                <ErrorRow
                  key={rowNumber}
                  rowNumber={rowNumber}
                  errors={groupedErrors.get(rowNumber) ?? []}
                />
              ))}
            </TableBody>
          </Table>
        </div>

        {hasMore && !showAll && (
          <div className="mt-4 text-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAll(true)}
            >
              Show All {rowNumbers.length} Rows
            </Button>
          </div>
        )}

        {showAll && hasMore && (
          <div className="mt-4 text-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAll(false)}
            >
              Show Less
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ImportErrorReport;
