'use client';

import { useMemo, memo } from 'react';
import { Cell, PieChart, Pie, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { AllocationData, AllocationBreakdown } from '@/types/allocation';
import Decimal from 'decimal.js';

interface AllocationDonutChartProps {
  data: AllocationData;
  onCategoryClick?: (category: string) => void;
}

// Color palette for allocations
const COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#f97316', // orange
  '#84cc16', // lime
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#64748b', // slate
  '#dc2626', // red
];

const UNCLASSIFIED_COLOR = '#9ca3af'; // gray-400

interface ChartDataItem {
  name: string;
  value: number;
  percentage: number;
  color: string;
  count: number;
  isUnclassified: boolean;
}

const RADIAN = Math.PI / 180;

interface CustomLabelProps {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
}

const renderCustomizedLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: CustomLabelProps) => {
  if (percent < 0.05) return null; // Don't show label for segments < 5%

  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      className="text-xs font-medium"
      style={{ filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5))' }}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload[0]) {
    const data = payload[0].payload as ChartDataItem;
    return (
      <div className="min-w-[180px] rounded-lg border bg-background p-3 shadow-lg">
        <div className="mb-2 flex items-center gap-2">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: data.color }}
          />
          <p className="font-medium">{data.name}</p>
          {data.isUnclassified && (
            <span className="text-xs text-muted-foreground">
              (unclassified)
            </span>
          )}
        </div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Value:</span>
            <span className="font-medium">{formatCurrency(data.value)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Allocation:</span>
            <span className="font-medium">{data.percentage.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Holdings:</span>
            <span className="font-medium">{data.count}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const AllocationDonutChartComponent = ({
  data,
  onCategoryClick,
}: AllocationDonutChartProps) => {
  const chartData = useMemo((): ChartDataItem[] => {
    return data.breakdown.map((item, index) => {
      const isUnclassified = item.category === 'Unclassified';
      return {
        name: item.category,
        value: new Decimal(item.value).toNumber(),
        percentage: item.percentage,
        color: isUnclassified
          ? UNCLASSIFIED_COLOR
          : COLORS[index % COLORS.length],
        count: item.count,
        isUnclassified,
      };
    });
  }, [data.breakdown]);

  const totalValue = useMemo(() => {
    return new Decimal(data.totalValue).toNumber();
  }, [data.totalValue]);

  // Show empty state if no data
  if (chartData.length === 0 || totalValue === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-center text-muted-foreground">
        <div>
          <p className="mb-2 text-lg font-medium">No allocation data</p>
          <p className="text-sm">
            Add holdings to see {data.dimension} allocation breakdown.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_1fr] lg:grid-cols-[3fr_2fr]">
      {/* Donut Chart */}
      <div className="flex flex-col items-center">
        {/* Total value header positioned above donut chart with negative margin to create visual overlap.
            -mb-12 (48px) allows the total value text to sit in the donut center while remaining
            above the chart in DOM order, preventing text cutoff issues. */}
        <div className="-mb-12 text-center">
          <div className="text-3xl font-bold md:text-4xl">
            {formatCurrency(totalValue)}
          </div>
          <div className="text-sm text-muted-foreground">Total Value</div>
        </div>
        <div className="relative h-[350px] w-full md:h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={120}
                innerRadius={50}
                fill="#8884d8"
                dataKey="value"
                strokeWidth={2}
                stroke="white"
                onClick={(data) => {
                  if (onCategoryClick) {
                    onCategoryClick(data.name);
                  }
                }}
                cursor={onCategoryClick ? 'pointer' : 'default'}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Allocation Breakdown */}
      <div className="scrollbar-thin space-y-3 md:max-h-[400px] md:overflow-y-auto md:pr-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Breakdown</span>
          <span className="text-muted-foreground">Value / %</span>
        </div>

        {chartData.map((item) => (
          <div
            key={item.name}
            className="group -m-2 flex cursor-pointer items-center justify-between rounded-lg p-2 transition-colors hover:bg-muted/50"
            onClick={() => onCategoryClick && onCategoryClick(item.name)}
          >
            <div className="flex items-center gap-3">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="font-medium">{item.name}</span>
              {item.isUnclassified && (
                <span className="text-xs text-muted-foreground">
                  (fix needed)
                </span>
              )}
            </div>

            <div className="text-right">
              <div className="font-medium">{formatCurrency(item.value)}</div>
              <div className="text-xs text-muted-foreground">
                {item.percentage.toFixed(1)}% • {item.count} holdings
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const AllocationDonutChart = memo(AllocationDonutChartComponent);
