'use client';

import { useMemo } from 'react';
import { Cell, PieChart, Pie, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PieChart as PieChartIcon, TrendingUp, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { usePortfolioStore } from '@/lib/stores';
import { AssetType } from '@/types';

interface AllocationData {
  name: string;
  value: number;
  percentage: number;
  color: string;
  type: 'stock' | 'etf' | 'crypto' | 'bond' | 'real_estate' | 'commodity' | 'cash' | 'other';
}

// Color mapping for asset types
const assetTypeColors: Record<AssetType, string> = {
  stock: '#3b82f6',
  etf: '#10b981',
  crypto: '#f59e0b',
  bond: '#8b5cf6',
  real_estate: '#f97316',
  commodity: '#84cc16',
  cash: '#6b7280',
  other: '#ec4899',
};

// Asset type display names
const assetTypeNames: Record<AssetType, string> = {
  stock: 'Stocks',
  etf: 'ETFs',
  crypto: 'Cryptocurrency',
  bond: 'Bonds',
  real_estate: 'Real Estate',
  commodity: 'Commodities',
  cash: 'Cash',
  other: 'Other',
};

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
  const { metrics } = usePortfolioStore();

  const allocationData = useMemo((): AllocationData[] => {
    if (!metrics?.allocation || metrics.allocation.length === 0) {
      return [];
    }

    return metrics.allocation.map((allocation) => ({
      name: assetTypeNames[allocation.type] || allocation.type,
      value: parseFloat(allocation.value.toString()),
      percentage: allocation.percent,
      color: assetTypeColors[allocation.type] || assetTypeColors.other,
      type: allocation.type,
    }));
  }, [metrics?.allocation]);

  const totalValue = useMemo(() => {
    return allocationData.reduce((sum, item) => sum + item.value, 0);
  }, [allocationData]);

  const topAllocation = useMemo(() => {
    if (allocationData.length === 0) return null;
    return allocationData.reduce((prev, current) =>
      current.percentage > prev.percentage ? current : prev
    );
  }, [allocationData]);

  // Show empty state if no data
  if (allocationData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5" />
            Asset Allocation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No allocation data</p>
            <p className="text-sm">Add holdings to see asset allocation breakdown.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5" />
            Asset Allocation
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {allocationData.length} Types
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
                data={allocationData}
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
                {allocationData.map((entry, index) => (
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

          {allocationData
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
            {topAllocation ? (
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
            ) : (
              <div className="text-sm text-muted-foreground">No data</div>
            )}
          </div>

          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Diversification</div>
            <div className="text-sm font-medium">
              {allocationData.length} asset {allocationData.length === 1 ? 'type' : 'types'}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}