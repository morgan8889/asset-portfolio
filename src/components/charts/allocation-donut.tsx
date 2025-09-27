'use client';

import { useMemo } from 'react';
import { Cell, PieChart, Pie, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PieChart as PieChartIcon, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface AllocationData {
  name: string;
  value: number;
  percentage: number;
  color: string;
  type: 'stock' | 'etf' | 'crypto' | 'bond' | 'real_estate' | 'commodity';
}

// Mock allocation data - replace with actual store data
const mockAllocationData: AllocationData[] = [
  {
    name: 'Stocks',
    value: 81529.64,
    percentage: 65.0,
    color: '#3b82f6',
    type: 'stock',
  },
  {
    name: 'Cryptocurrency',
    value: 25086.04,
    percentage: 20.0,
    color: '#f59e0b',
    type: 'crypto',
  },
  {
    name: 'ETFs',
    value: 18814.53,
    percentage: 15.0,
    color: '#10b981',
    type: 'etf',
  },
];

const RADIAN = Math.PI / 180;

interface CustomLabelProps {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
  index: number;
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
    const data = payload[0].payload;
    return (
      <div className="bg-background border rounded-lg shadow-lg p-3 min-w-[180px]">
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: data.color }}
          />
          <p className="font-medium">{data.name}</p>
        </div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Value:</span>
            <span className="font-medium">{formatCurrency(data.value)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Allocation:</span>
            <span className="font-medium">{data.percentage.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export function AllocationDonut() {
  const totalValue = useMemo(() => {
    return mockAllocationData.reduce((sum, item) => sum + item.value, 0);
  }, []);

  const topAllocation = useMemo(() => {
    return mockAllocationData.reduce((prev, current) =>
      current.percentage > prev.percentage ? current : prev
    );
  }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5" />
            Asset Allocation
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {mockAllocationData.length} Types
          </Badge>
        </div>
        <div className="text-sm text-muted-foreground">
          Total Portfolio: {formatCurrency(totalValue)}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Donut Chart */}
        <div className="h-[300px] w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={mockAllocationData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={100}
                innerRadius={40}
                fill="#8884d8"
                dataKey="value"
                strokeWidth={2}
                stroke="white"
              >
                {mockAllocationData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          {/* Center Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="text-2xl font-bold">
              {formatCurrency(totalValue)}
            </div>
            <div className="text-xs text-muted-foreground">Total Value</div>
          </div>
        </div>

        {/* Allocation Breakdown */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Breakdown</span>
            <span className="text-muted-foreground">Value / %</span>
          </div>

          {mockAllocationData
            .sort((a, b) => b.percentage - a.percentage)
            .map((item, index) => (
              <div key={item.name} className="flex items-center justify-between group hover:bg-muted/50 rounded-lg p-2 -m-2 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-medium">{item.name}</span>
                  </div>
                  {index === 0 && (
                    <Badge variant="secondary" className="text-xs">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Largest
                    </Badge>
                  )}
                </div>

                <div className="text-right">
                  <div className="font-medium">{formatCurrency(item.value)}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.percentage.toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Top Allocation</div>
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: topAllocation.color }}
              />
              <span className="text-sm font-medium">{topAllocation.name}</span>
              <span className="text-xs text-muted-foreground">
                ({topAllocation.percentage.toFixed(1)}%)
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Diversification</div>
            <div className="text-sm font-medium">
              {mockAllocationData.length} asset {mockAllocationData.length === 1 ? 'type' : 'types'}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}