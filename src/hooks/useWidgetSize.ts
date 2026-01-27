/**
 * Widget Size Detection Hook
 *
 * Provides real-time widget dimension tracking using ResizeObserver.
 * Used to conditionally show/hide features based on available space.
 *
 * @module hooks/useWidgetSize
 */

import { useEffect, useState, RefObject } from 'react';

/**
 * Widget dimensions in pixels.
 */
export interface WidgetSize {
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
}

/**
 * Size thresholds for Category Breakdown widget features.
 * Determines when to show/hide the pie chart visualization.
 */
export const CATEGORY_BREAKDOWN_THRESHOLDS = {
  /**
   * Minimum width to show pie chart.
   * 150px allows chart display at 1x column width.
   */
  minWidthForChart: 150,

  /**
   * Minimum height to show pie chart.
   * 350px requires 2h row span (widget minHeight is 300px for 1h).
   * This ensures 1x × 1h shows only progress bars, while 1x × 2h shows chart.
   */
  minHeightForChart: 350,

  /**
   * Width threshold for side-by-side layout (chart next to progress bars).
   * Below this, chart stacks vertically below progress bars.
   */
  sideByWidthThreshold: 400,
} as const;

/**
 * Detects and tracks widget dimensions using ResizeObserver.
 * Returns { width: 0, height: 0 } until the ref is attached and first observation occurs.
 *
 * @param ref - React ref to the widget container element
 * @returns Current widget dimensions in pixels
 *
 * @example
 * ```tsx
 * const containerRef = useRef<HTMLDivElement>(null);
 * const { width, height } = useWidgetSize(containerRef);
 *
 * const showChart = width >= CATEGORY_BREAKDOWN_THRESHOLDS.minWidthForChart &&
 *                   height >= CATEGORY_BREAKDOWN_THRESHOLDS.minHeightForChart;
 *
 * return (
 *   <div ref={containerRef}>
 *     {showChart ? <Chart /> : <SimpleView />}
 *   </div>
 * );
 * ```
 */
export function useWidgetSize(ref: RefObject<HTMLElement>): WidgetSize {
  const [size, setSize] = useState<WidgetSize>({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Create ResizeObserver to track dimension changes
    const observer = new ResizeObserver((entries) => {
      // Only process the first entry (should only be one)
      const entry = entries[0];
      if (!entry) return;

      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });

    // Start observing
    observer.observe(element);

    // Cleanup on unmount
    return () => {
      observer.disconnect();
    };
  }, [ref]);

  return size;
}
