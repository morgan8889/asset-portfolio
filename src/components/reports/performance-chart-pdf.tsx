'use client';

/**
 * Performance chart component optimized for PDF capture
 * Fixed dimensions, no animations
 * @feature 011-export-functionality
 */

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface PerformanceChartForPdfProps {
  data: Array<{ date: string; value: number }>;
}

export function PerformanceChartForPdf({ data }: PerformanceChartForPdfProps) {
  return (
    <div style={{ width: '100%', height: '300px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => {
              const date = new Date(value);
              return `${date.getMonth() + 1}/${date.getDate()}`;
            }}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip
            formatter={(value: number) => [`$${value.toFixed(2)}`, 'Value']}
            labelFormatter={(label) => new Date(label).toLocaleDateString()}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#8884d8"
            fillOpacity={1}
            fill="url(#colorValue)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
