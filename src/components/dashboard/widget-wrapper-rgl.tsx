'use client';

/**
 * Widget Wrapper (React-Grid-Layout)
 *
 * Wrapper component for dashboard widgets using react-grid-layout.
 * Provides consistent styling and drag handle for RGL items.
 */

import { ReactNode, memo } from 'react';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WidgetId } from '@/types/dashboard';

interface WidgetWrapperRGLProps {
  id: WidgetId;
  children: ReactNode;
  disabled?: boolean;
}

const WidgetWrapperRGLComponent = ({
  id,
  children,
  disabled = false,
}: WidgetWrapperRGLProps) => {
  return (
    <div
      className={cn(
        // Just positioning - widgets have their own Card with borders
        // This matches legacy wrapper behavior and prevents double borders
        'group relative h-full',
        'flex flex-col'
      )}
      data-widget={id}
    >
      {/* Drag handle (only visible when not disabled) */}
      {!disabled && (
        <div
          className="drag-handle absolute left-2 top-2 z-10 cursor-grab rounded p-1 opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100 active:cursor-grabbing"
          title="Drag to reorder"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      )}

      {/* Widget content - widgets have their own Card with borders */}
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
};

export const WidgetWrapperRGL = memo(WidgetWrapperRGLComponent);
WidgetWrapperRGL.displayName = 'WidgetWrapperRGL';
