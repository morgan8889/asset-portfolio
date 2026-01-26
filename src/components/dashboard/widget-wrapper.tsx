'use client';

/**
 * Widget Wrapper Component
 *
 * Provides drag-and-drop functionality using dnd-kit for dashboard widgets.
 * Wraps individual widgets with sortable behavior and visual feedback.
 *
 * @module components/dashboard/widget-wrapper
 */

import { memo, ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  WidgetId,
  WIDGET_DEFINITIONS,
  WidgetSpan,
  WidgetRowSpan,
  LayoutMode,
} from '@/types/dashboard';

interface WidgetWrapperProps {
  /** Unique widget identifier */
  id: WidgetId;
  /** Widget content to render */
  children: ReactNode;
  /** Whether drag-drop is disabled (e.g., on mobile) */
  disabled?: boolean;
  /** Column span for this widget (1 or 2) */
  span?: WidgetSpan;
  /** Row span for this widget (1, 2, or 3) - used with dense packing */
  rowSpan?: WidgetRowSpan;
  /** Current layout mode */
  layoutMode?: LayoutMode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Row span class mapping for dense packing layout.
 * Responsive: larger row spans reduce on smaller viewports to maintain aspect ratios.
 */
const ROW_SPAN_CLASSES: Record<WidgetRowSpan, string> = {
  1: 'row-span-1',
  2: 'row-span-1 md:row-span-2',
  3: 'row-span-1 md:row-span-2 lg:row-span-3',
};

export const WidgetWrapper = memo(function WidgetWrapper({
  id,
  children,
  disabled = false,
  span = 1,
  rowSpan = 1,
  layoutMode = 'grid',
  className,
}: WidgetWrapperProps) {
  const definition = WIDGET_DEFINITIONS[id];

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    minHeight: definition.minHeight,
  };

  // Compute column span class
  // In stacking mode, all widgets are full width (span is ignored)
  // In grid mode, span 2 widgets stretch across 2 columns on md+ screens
  const spanClass =
    layoutMode === 'stacking'
      ? 'col-span-1'
      : span === 2
        ? 'md:col-span-2'
        : 'col-span-1';

  // Compute row span class for dense packing
  // In stacking mode, row spans are ignored
  const rowSpanClass =
    layoutMode === 'stacking' ? '' : ROW_SPAN_CLASSES[rowSpan];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        // Grid column span based on config span
        spanClass,
        // Grid row span for dense packing
        rowSpanClass,
        // Drag state styling
        isDragging && 'z-50 opacity-90 shadow-xl',
        'group relative',
        className
      )}
      data-widget={id}
      {...attributes}
    >
      {/* Drag handle - only visible when hovering/focusing and not disabled */}
      {!disabled && (
        <button
          type="button"
          {...listeners}
          className={cn(
            'absolute left-2 top-2 z-10 cursor-grab p-1',
            'opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100',
            'rounded hover:bg-muted focus:bg-muted',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            isDragging && 'cursor-grabbing opacity-100'
          )}
          aria-label={`Reorder ${definition.displayName} widget. Press Space to pick up, arrow keys to move, Space to drop, or Escape to cancel.`}
          aria-describedby={`widget-${id}-instructions`}
          tabIndex={0}
        >
          <GripVertical
            className="h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
        </button>
      )}
      {/* Screen reader instructions */}
      <span id={`widget-${id}-instructions`} className="sr-only">
        Use Space to pick up this widget, arrow keys to move it, Space to place
        it, or Escape to cancel reordering.
      </span>
      {children}
    </div>
  );
});

WidgetWrapper.displayName = 'WidgetWrapper';
