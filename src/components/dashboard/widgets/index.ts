// Re-export all widget components
export { TotalValueWidget } from './total-value-widget';
export { GainLossWidget } from './gain-loss-widget';
export { DayChangeWidget } from './day-change-widget';
export { CategoryBreakdownWidget } from './category-breakdown-widget';
export { GrowthChartWidget } from './growth-chart-widget';
export { RecentActivityWidget } from './recent-activity-widget';
export { TaxExposureWidget, TaxExposureEmptyState } from './tax-exposure-widget';
export { PerformanceListWidget } from './performance-list-widget';

// Shared utilities for building widgets
export {
  WidgetSkeleton,
  WidgetCard,
  MetricValue,
  getTrendDirection,
  getTrendColorClass,
  type TrendDirection,
} from './shared';
