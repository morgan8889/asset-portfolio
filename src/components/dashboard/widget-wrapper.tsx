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
import { WidgetId, WidgetDefinition, WIDGET_DEFINITIONS } from '@/types/dashboard';

interface WidgetWrapperProps {
  /** Unique widget identifier */
  id: WidgetId;
  /** Widget content to render */
  children: ReactNode;
  /** Whether drag-drop is disabled (e.g., on mobile) */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export const WidgetWrapper = memo(function WidgetWrapper({
  id,
  children,
  disabled = false,
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        // Grid column span based on widget definition
        definition.colSpan === 2 ? 'md:col-span-2' : 'col-span-1',
        // Drag state styling
        isDragging && 'z-50 opacity-90 shadow-xl',
        'relative group',
        className
      )}
      data-widget={id}
      {...attributes}
    >
      {/* Drag handle - only visible when hovering and not disabled */}
      {!disabled && (
        <div
          {...listeners}
          className={cn(
            'absolute left-2 top-2 z-10 cursor-grab p-1',
            'opacity-0 group-hover:opacity-100 transition-opacity',
            'rounded hover:bg-muted',
            isDragging && 'cursor-grabbing'
          )}
          aria-label={`Drag to reorder ${definition.displayName}`}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
      {children}
    </div>
  );
});

WidgetWrapper.displayName = 'WidgetWrapper';
