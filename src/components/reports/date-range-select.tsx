'use client';

/**
 * Date range selector component for export filtering
 * @feature 011-export-functionality
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { DateRangePreset } from '@/types/export';

interface DateRangeSelectProps {
  value: DateRangePreset;
  onValueChange: (value: DateRangePreset) => void;
  disabled?: boolean;
}

const DATE_RANGE_OPTIONS: Array<{ value: DateRangePreset; label: string }> = [
  { value: 'YTD', label: 'Year to Date' },
  { value: '1Y', label: 'Last 12 Months' },
  { value: 'ALL', label: 'All Time' },
];

export function DateRangeSelect({
  value,
  onValueChange,
  disabled = false,
}: DateRangeSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select date range" />
      </SelectTrigger>
      <SelectContent>
        {DATE_RANGE_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
