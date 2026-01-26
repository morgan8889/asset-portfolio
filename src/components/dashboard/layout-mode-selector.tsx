'use client';

/**
 * Layout Mode Selector Component
 *
 * Toggle between grid and stacking layout modes.
 */

import { memo } from 'react';
import { LayoutGrid, Rows } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { LayoutMode } from '@/types/dashboard';

interface LayoutModeSelectorProps {
  /** Current layout mode */
  value: LayoutMode;
  /** Callback when layout mode changes */
  onValueChange: (mode: LayoutMode) => void;
  /** Whether the selector is disabled */
  disabled?: boolean;
}

export const LayoutModeSelector = memo(function LayoutModeSelector({
  value,
  onValueChange,
  disabled = false,
}: LayoutModeSelectorProps) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(newValue) => {
        // Only trigger if a value was selected (not deselected)
        if (newValue) {
          onValueChange(newValue as LayoutMode);
        }
      }}
      disabled={disabled}
      className="justify-start"
      aria-label="Layout mode"
    >
      <ToggleGroupItem value="grid" aria-label="Grid layout" className="gap-2">
        <LayoutGrid className="h-4 w-4" />
        Grid
      </ToggleGroupItem>
      <ToggleGroupItem
        value="stacking"
        aria-label="Stacking layout"
        className="gap-2"
      >
        <Rows className="h-4 w-4" />
        Stack
      </ToggleGroupItem>
    </ToggleGroup>
  );
});

LayoutModeSelector.displayName = 'LayoutModeSelector';
