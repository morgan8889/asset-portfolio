'use client';

/**
 * Duplicate Review Component
 *
 * Displays detected duplicate transactions and allows users to choose
 * how to handle them: skip, import anyway, or review individually.
 */

import { useState } from 'react';
import { format } from 'date-fns';
import Decimal from 'decimal.js';
import {
  AlertTriangle,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  Copy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { DuplicateMatch, DuplicateHandling } from '@/types/csv-import';

interface DuplicateReviewProps {
  duplicates: DuplicateMatch[];
  handling: DuplicateHandling;
  onHandlingChange: (handling: DuplicateHandling) => void;
  className?: string;
}

/** Format a Decimal, number, or string to 2 decimal places */
const fmt = (value: Decimal | number | string): string =>
  value instanceof Decimal
    ? value.toFixed(2)
    : (typeof value === 'string' ? parseFloat(value) : value).toFixed(2);

/** Format a date for display */
const fmtDate = (date: Date | string): string =>
  format(typeof date === 'string' ? new Date(date) : date, 'MMM d, yyyy');

/**
 * Individual duplicate match row with comparison
 */
function DuplicateRow({ match }: { match: DuplicateMatch }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <TableRow className="cursor-pointer hover:bg-muted/50">
          <TableCell>
            <div className="flex items-center gap-2">
              {isOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              Row {match.importRowNumber}
            </div>
          </TableCell>
          <TableCell>{match.importData.parsed.symbol}</TableCell>
          <TableCell>{fmtDate(match.importData.parsed.date!)}</TableCell>
          <TableCell>{fmt(match.importData.parsed.quantity!)}</TableCell>
          <TableCell>${fmt(match.importData.parsed.price!)}</TableCell>
          <TableCell>
            <Badge
              variant={
                match.matchConfidence === 'exact' ? 'destructive' : 'secondary'
              }
              className="text-xs"
            >
              {match.matchConfidence === 'exact' ? 'Exact Match' : 'Similar'}
            </Badge>
          </TableCell>
        </TableRow>
      </CollapsibleTrigger>
      <CollapsibleContent asChild>
        <TableRow className="bg-muted/30">
          <TableCell colSpan={6} className="py-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-medium text-muted-foreground">
                  <Copy className="h-4 w-4" />
                  Importing (CSV Row {match.importRowNumber})
                </div>
                <div className="space-y-1 pl-6">
                  <div>Date: {fmtDate(match.importData.parsed.date!)}</div>
                  <div>Symbol: {match.importData.parsed.symbol}</div>
                  <div>Quantity: {fmt(match.importData.parsed.quantity!)}</div>
                  <div>Price: ${fmt(match.importData.parsed.price!)}</div>
                  <div>Type: {match.importData.parsed.type || 'buy'}</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-medium text-muted-foreground">
                  <Check className="h-4 w-4" />
                  Existing Transaction
                </div>
                <div className="space-y-1 pl-6">
                  <div>Date: {fmtDate(match.existingTransaction.date)}</div>
                  <div>Symbol: {match.existingTransaction.symbol}</div>
                  <div>Quantity: {fmt(match.existingTransaction.quantity)}</div>
                  <div>Price: ${fmt(match.existingTransaction.price)}</div>
                  <div>Type: {match.existingTransaction.type}</div>
                </div>
              </div>
            </div>
          </TableCell>
        </TableRow>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function DuplicateReview({
  duplicates,
  handling,
  onHandlingChange,
  className,
}: DuplicateReviewProps) {
  const [showAll, setShowAll] = useState(false);

  const displayedDuplicates = showAll ? duplicates : duplicates.slice(0, 5);
  const hasMore = duplicates.length > 5;

  if (duplicates.length === 0) {
    return null;
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          Potential Duplicates Detected
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {duplicates.length} transaction{duplicates.length !== 1 ? 's' : ''}{' '}
          may already exist in your portfolio. Choose how to handle them.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Handling Options */}
        <RadioGroup
          value={handling}
          onValueChange={(value: string) =>
            onHandlingChange(value as DuplicateHandling)
          }
          className="space-y-3"
        >
          <div className="flex items-start space-x-3">
            <RadioGroupItem value="skip" id="skip" className="mt-1" />
            <div>
              <Label htmlFor="skip" className="cursor-pointer font-medium">
                Skip duplicates
              </Label>
              <p className="text-sm text-muted-foreground">
                Do not import transactions that already exist (recommended)
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <RadioGroupItem value="import" id="import" className="mt-1" />
            <div>
              <Label htmlFor="import" className="cursor-pointer font-medium">
                Import anyway
              </Label>
              <p className="text-sm text-muted-foreground">
                Import all transactions, even if they appear to be duplicates
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <RadioGroupItem value="review" id="review" className="mt-1" />
            <div>
              <Label htmlFor="review" className="cursor-pointer font-medium">
                Review each one
              </Label>
              <p className="text-sm text-muted-foreground">
                Skip duplicates for now and review them individually later
              </p>
            </div>
          </div>
        </RadioGroup>

        {/* Duplicate List */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Row</TableHead>
                <TableHead>Symbol</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Match</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedDuplicates.map((dup) => (
                <DuplicateRow key={dup.importRowNumber} match={dup} />
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Show More/Less */}
        {hasMore && (
          <div className="text-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll
                ? 'Show Less'
                : `Show All ${duplicates.length} Duplicates`}
            </Button>
          </div>
        )}

        {/* Summary */}
        <div className="border-t pt-3 text-sm text-muted-foreground">
          {handling === 'skip' && (
            <p>
              <X className="mr-1 inline h-4 w-4 text-yellow-500" />
              {duplicates.length} transaction
              {duplicates.length !== 1 ? 's' : ''} will be skipped
            </p>
          )}
          {handling === 'import' && (
            <p>
              <Check className="mr-1 inline h-4 w-4 text-green-500" />
              All transactions will be imported, including potential duplicates
            </p>
          )}
          {handling === 'review' && (
            <p>
              <AlertTriangle className="mr-1 inline h-4 w-4 text-yellow-500" />
              {duplicates.length} potential duplicate
              {duplicates.length !== 1 ? 's' : ''} will be skipped for later
              review
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default DuplicateReview;
