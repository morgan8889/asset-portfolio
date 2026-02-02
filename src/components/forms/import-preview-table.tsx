'use client';

/**
 * Import Preview Table Component
 *
 * Displays a preview of CSV data with column mappings and validation status.
 */

import { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react';
import type {
  ParsedRow,
  ColumnMapping,
  TransactionField,
} from '@/types/csv-import';

interface ImportPreviewTableProps {
  rows: ParsedRow[];
  mappings: ColumnMapping[];
  maxRows?: number;
  showValidationStatus?: boolean;
  className?: string;
}

const FIELD_LABELS: Record<TransactionField, string> = {
  date: 'Date',
  symbol: 'Symbol',
  quantity: 'Quantity',
  price: 'Price',
  type: 'Type',
  fees: 'Fees',
  notes: 'Notes',
  grantDate: 'Grant Date',
  vestingDate: 'Vesting Date',
  discountPercent: 'Discount %',
  sharesWithheld: 'Shares Withheld',
  ordinaryIncomeAmount: 'Ordinary Income',
};

export function ImportPreviewTable({
  rows,
  mappings,
  maxRows = 10,
  showValidationStatus = true,
  className,
}: ImportPreviewTableProps) {
  const displayRows = useMemo(() => rows.slice(0, maxRows), [rows, maxRows]);

  const mappedFields = useMemo(() => {
    return mappings
      .filter((m) => m.transactionField !== null)
      .sort((a, b) => {
        const order: TransactionField[] = [
          'date',
          'symbol',
          'quantity',
          'price',
          'type',
          'fees',
          'notes',
        ];
        const aIndex = order.indexOf(a.transactionField!);
        const bIndex = order.indexOf(b.transactionField!);
        return aIndex - bIndex;
      });
  }, [mappings]);

  const formatCellValue = (row: ParsedRow, field: TransactionField): string => {
    const value = row.parsed[field];

    if (value === null || value === undefined) {
      return '-';
    }

    if (field === 'date' && value instanceof Date) {
      return value.toLocaleDateString();
    }

    if (field === 'quantity' || field === 'price' || field === 'fees') {
      return value.toString();
    }

    return String(value);
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.9) {
      return (
        <Badge variant="default" className="ml-2 text-xs">
          Auto
        </Badge>
      );
    }
    if (confidence >= 0.7) {
      return (
        <Badge variant="secondary" className="ml-2 text-xs">
          Likely
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="ml-2 text-xs">
        Manual
      </Badge>
    );
  };

  const getRowStatusIcon = (row: ParsedRow) => {
    if (!row.isValid) {
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    }
    if (row.errors.length > 0) {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  if (displayRows.length === 0) {
    return (
      <div className={cn('py-8 text-center text-muted-foreground', className)}>
        No data to preview
      </div>
    );
  }

  return (
    <div className={cn('w-full', className)}>
      <div className="overflow-hidden rounded-md border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {showValidationStatus && (
                  <TableHead className="w-[50px] text-center">Status</TableHead>
                )}
                <TableHead className="w-[60px] text-center">Row</TableHead>
                {mappedFields.map((mapping) => (
                  <TableHead key={mapping.csvColumnIndex}>
                    <div className="flex items-center">
                      <span>{FIELD_LABELS[mapping.transactionField!]}</span>
                      {getConfidenceBadge(mapping.confidence)}
                    </div>
                    <div className="mt-0.5 text-xs font-normal text-muted-foreground">
                      {mapping.csvColumn}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayRows.map((row, index) => (
                <TableRow
                  key={index}
                  className={cn(!row.isValid && 'bg-destructive/5')}
                >
                  {showValidationStatus && (
                    <TableCell className="text-center">
                      {getRowStatusIcon(row)}
                    </TableCell>
                  )}
                  <TableCell className="text-center text-muted-foreground">
                    {row.rowNumber}
                  </TableCell>
                  {mappedFields.map((mapping) => {
                    const field = mapping.transactionField!;
                    const hasError = row.errors.some((e) => e.field === field);
                    const errorMessage = row.errors.find(
                      (e) => e.field === field
                    )?.message;

                    return (
                      <TableCell
                        key={mapping.csvColumnIndex}
                        className={cn(hasError && 'text-destructive')}
                        title={errorMessage}
                      >
                        {formatCellValue(row, field)}
                        {hasError && (
                          <AlertCircle className="ml-1 inline-block h-3 w-3" />
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {rows.length > maxRows && (
        <p className="mt-3 text-center text-sm text-muted-foreground">
          Showing {maxRows} of {rows.length} rows
        </p>
      )}
    </div>
  );
}
