'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * ScrollableDialogContent Component
 *
 * A wrapper for dialog content sections that adds visual scroll indicators
 * (fade effects) at the top and bottom when content overflows.
 *
 * Usage:
 * ```tsx
 * <DialogContent className="flex max-h-[85vh] flex-col">
 *   <DialogHeader>...</DialogHeader>
 *   <ScrollableDialogContent>
 *     {/* Your scrollable content here *\/}
 *   </ScrollableDialogContent>
 *   <DialogFooter>...</DialogFooter>
 * </DialogContent>
 * ```
 */
export const ScrollableDialogContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [showTopIndicator, setShowTopIndicator] = React.useState(false);
  const [showBottomIndicator, setShowBottomIndicator] = React.useState(false);

  // Merge refs
  React.useImperativeHandle(ref, () => contentRef.current!);

  // Check scroll position to show/hide indicators
  const checkScroll = React.useCallback(() => {
    const element = contentRef.current;
    if (!element) return;

    const { scrollTop, scrollHeight, clientHeight } = element;
    const threshold = 10; // 10px threshold for showing indicators

    setShowTopIndicator(scrollTop > threshold);
    setShowBottomIndicator(scrollTop + clientHeight < scrollHeight - threshold);
  }, []);

  // Check scroll on mount and when content changes
  React.useEffect(() => {
    checkScroll();
  }, [checkScroll, children]);

  // Add scroll listener
  React.useEffect(() => {
    const element = contentRef.current;
    if (!element) return;

    element.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);

    return () => {
      element.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [checkScroll]);

  return (
    <div className="relative flex-1">
      {/* Top fade indicator */}
      <div
        className={cn(
          'pointer-events-none absolute left-0 right-0 top-0 z-10 h-8 bg-gradient-to-b from-background to-transparent transition-opacity duration-200',
          showTopIndicator ? 'opacity-100' : 'opacity-0'
        )}
        aria-hidden="true"
      />

      {/* Scrollable content */}
      <div
        ref={contentRef}
        className={cn('flex-1 overflow-y-auto', className)}
        {...props}
      >
        {children}
      </div>

      {/* Bottom fade indicator */}
      <div
        className={cn(
          'pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-8 bg-gradient-to-t from-background to-transparent transition-opacity duration-200',
          showBottomIndicator ? 'opacity-100' : 'opacity-0'
        )}
        aria-hidden="true"
      />
    </div>
  );
});

ScrollableDialogContent.displayName = 'ScrollableDialogContent';
