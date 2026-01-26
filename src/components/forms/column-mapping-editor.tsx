'use client';

/**
 * Column Mapping Editor Component
 *
 * Allows users to view and modify auto-detected column mappings
 * for CSV imports. Shows confidence scores and highlights required fields.
 */

import React, { useState, useCallback } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Building2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ColumnMapping, TransactionField } from '@/types/csv-import';
import {
  REQUIRED_FIELDS,
  OPTIONAL_FIELDS,
  FIELD_LABELS,
} from '@/types/csv-import';
import { getSupportedBrokerages } from '@/lib/services/brokerage-formats';
import {
  hasAllRequiredMappings,
  getUnmappedRequiredFields,
} from '@/lib/services/column-detector';

interface ColumnMappingEditorProps {
  /** Current column mappings */
  mappings: ColumnMapping[];
  /** Callback when a mapping is changed */
  onMappingChange: (index: number, field: TransactionField | null) => void;
  /** Sample data from first row for context */
  sampleData?: Record<string, string>;
  /** Whether the editor is in read-only mode */
  readOnly?: boolean;
  /** Detected brokerage (if any) */
  detectedBrokerage?: {
    id: string;
    name: string;
    confidence: number;
  };
  /** Callback to apply brokerage preset mappings */
  onApplyBrokeragePreset?: (brokerageId: string) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Get confidence level styling based on confidence score
 */
function getConfidenceBadge(confidence: number, isUserOverride: boolean) {
  if (isUserOverride) {
    return (
      <Badge
        variant="outline"
        className="border-blue-200 bg-blue-50 text-blue-700"
      >
        Manual
      </Badge>
    );
  }

  if (confidence >= 0.9) {
    return (
      <Badge
        variant="outline"
        className="border-green-200 bg-green-50 text-green-700"
      >
        High ({Math.round(confidence * 100)}%)
      </Badge>
    );
  }

  if (confidence >= 0.6) {
    return (
      <Badge
        variant="outline"
        className="border-yellow-200 bg-yellow-50 text-yellow-700"
      >
        Medium ({Math.round(confidence * 100)}%)
      </Badge>
    );
  }

  if (confidence > 0) {
    return (
      <Badge
        variant="outline"
        className="border-orange-200 bg-orange-50 text-orange-700"
      >
        Low ({Math.round(confidence * 100)}%)
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="border-gray-200 bg-gray-50 text-gray-500"
    >
      Not Mapped
    </Badge>
  );
}

/**
 * Check if a field is already mapped to another column
 */
function isFieldAlreadyMapped(
  field: TransactionField,
  mappings: ColumnMapping[],
  currentIndex: number
): boolean {
  return mappings.some(
    (m, idx) => idx !== currentIndex && m.transactionField === field
  );
}

// Re-export for backward compatibility with existing imports
export { hasAllRequiredMappings, getUnmappedRequiredFields };

export function ColumnMappingEditor({
  mappings,
  onMappingChange,
  sampleData,
  readOnly = false,
  detectedBrokerage,
  onApplyBrokeragePreset,
  className,
}: ColumnMappingEditorProps) {
  const unmappedRequired = getUnmappedRequiredFields(mappings);
  const hasUnmappedRequired = unmappedRequired.length > 0;
  const supportedBrokerages = getSupportedBrokerages();
  const [selectedOverride, setSelectedOverride] = useState<string>('');

  const handleBrokerageOverride = useCallback(
    (brokerageId: string) => {
      if (brokerageId === 'auto') {
        // Reset to auto-detection
        setSelectedOverride('');
        return;
      }
      if (brokerageId && onApplyBrokeragePreset) {
        onApplyBrokeragePreset(brokerageId);
        setSelectedOverride(brokerageId);
      }
    },
    [onApplyBrokeragePreset]
  );

  return (
    <Card
      className={cn('w-full', className)}
      data-testid="column-mapping-editor"
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              Column Mapping
              {hasUnmappedRequired && (
                <Badge variant="destructive">
                  {unmappedRequired.length} required field
                  {unmappedRequired.length > 1 ? 's' : ''} unmapped
                </Badge>
              )}
            </CardTitle>
            {hasUnmappedRequired && (
              <p className="mt-1 text-sm text-muted-foreground">
                Missing required fields:{' '}
                {unmappedRequired.map((f) => FIELD_LABELS[f]).join(', ')}
              </p>
            )}
          </div>

          {/* Brokerage Format Override */}
          {onApplyBrokeragePreset && (
            <div className="flex items-center gap-2">
              <Select
                value={selectedOverride || (detectedBrokerage?.id ?? 'auto')}
                onValueChange={handleBrokerageOverride}
                disabled={readOnly}
              >
                <SelectTrigger
                  className="w-48"
                  aria-label="Select brokerage format"
                >
                  <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Apply brokerage preset..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">
                    <span className="text-muted-foreground">
                      — Auto Detect —
                    </span>
                  </SelectItem>
                  {supportedBrokerages.map((brokerage) => (
                    <SelectItem key={brokerage.id} value={brokerage.id}>
                      {brokerage.name}
                      {detectedBrokerage?.id === brokerage.id && ' ✓'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Detected Brokerage Info */}
        {detectedBrokerage && !selectedOverride && (
          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="h-4 w-4" />
            <span>
              Auto-detected: <strong>{detectedBrokerage.name}</strong> (
              {Math.round(detectedBrokerage.confidence * 100)}% confidence)
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {mappings.map((mapping, index) => {
          const isRequired =
            mapping.transactionField !== null &&
            REQUIRED_FIELDS.includes(mapping.transactionField);
          const isMapped = mapping.transactionField !== null;

          return (
            <div
              key={`${mapping.csvColumn}-${index}`}
              className={cn(
                'flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center',
                !isMapped && 'border-dashed bg-muted/30',
                isMapped && 'bg-background'
              )}
            >
              {/* CSV Column Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">
                    {mapping.csvColumn}
                  </Label>
                  {getConfidenceBadge(
                    mapping.confidence,
                    mapping.isUserOverride
                  )}
                </div>
                {sampleData && sampleData[mapping.csvColumn] && (
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    Sample: {sampleData[mapping.csvColumn]}
                  </p>
                )}
              </div>

              {/* Arrow indicator */}
              <div className="hidden items-center text-muted-foreground sm:flex">
                →
              </div>

              {/* Field Selector */}
              <div className="w-full sm:w-48">
                <Select
                  value={mapping.transactionField ?? 'unmapped'}
                  onValueChange={(value) => {
                    const newField =
                      value === 'unmapped' ? null : (value as TransactionField);
                    onMappingChange(index, newField);
                  }}
                  disabled={readOnly}
                >
                  <SelectTrigger
                    className={cn(
                      'w-full',
                      !isMapped && 'border-dashed',
                      isRequired && 'border-primary'
                    )}
                    aria-label={`Map ${mapping.csvColumn} to field`}
                  >
                    <SelectValue placeholder="Select field..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unmapped">
                      <span className="text-muted-foreground">
                        — Not Mapped —
                      </span>
                    </SelectItem>

                    {/* Required Fields */}
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                      Required *
                    </div>
                    {REQUIRED_FIELDS.map((field) => {
                      const alreadyMapped = isFieldAlreadyMapped(
                        field,
                        mappings,
                        index
                      );
                      return (
                        <SelectItem
                          key={field}
                          value={field}
                          disabled={alreadyMapped}
                          className={cn(alreadyMapped && 'opacity-50')}
                        >
                          {FIELD_LABELS[field]}
                          {alreadyMapped && ' (mapped)'}
                        </SelectItem>
                      );
                    })}

                    {/* Optional Fields */}
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                      Optional
                    </div>
                    {OPTIONAL_FIELDS.map((field) => {
                      const alreadyMapped = isFieldAlreadyMapped(
                        field,
                        mappings,
                        index
                      );
                      return (
                        <SelectItem
                          key={field}
                          value={field}
                          disabled={alreadyMapped}
                          className={cn(alreadyMapped && 'opacity-50')}
                        >
                          {FIELD_LABELS[field]}
                          {alreadyMapped && ' (mapped)'}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Required indicator */}
              {isRequired && (
                <span
                  className="text-xs font-medium text-primary"
                  title="Required field"
                >
                  *
                </span>
              )}
            </div>
          );
        })}

        {mappings.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No columns detected. Please upload a CSV file.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default ColumnMappingEditor;
