// Re-export all widget components
export { TotalValueWidget } from './total-value-widget';
export { GainLossWidget } from './gain-loss-widget';
export { DayChangeWidget } from './day-change-widget';
export { CategoryBreakdownWidget } from './category-breakdown-widget';
export { GrowthChartWidget } from './growth-chart-widget';
export { TopPerformersWidget } from './top-performers-widget';
export { BiggestLosersWidget } from './biggest-losers-widget';
export { RecentActivityWidget } from './recent-activity-widget';

// Shared utilities for building widgets
export {
  WidgetSkeleton,
  WidgetCard,
  MetricValue,
  getTrendDirection,
  getTrendColorClass,
  type TrendDirection,
} from './shared';
