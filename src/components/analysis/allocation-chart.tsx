'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RebalancingPlan } from '@/types/analysis';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface AllocationChartProps {
  rebalancingPlan: RebalancingPlan | null;
  isCalculating?: boolean;
}

export function AllocationChart({
  rebalancingPlan,
  isCalculating,
}: AllocationChartProps) {
  if (isCalculating) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Current vs Target Allocation</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
            <p className="mt-2 text-sm text-muted-foreground">
              Calculating allocation...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!rebalancingPlan) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Current vs Target Allocation</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-sm text-muted-foreground">
            Select a target model to view allocation comparison
          </p>
        </CardContent>
      </Card>
    );
  }

  // Prepare data for chart
  const chartData = rebalancingPlan.actions
    .filter((action) => action.currentPercent > 0 || action.targetPercent > 0)
    .map((action) => ({
      assetType: action.assetTypeName,
      current: action.currentPercent,
      target: action.targetPercent,
    }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Current vs Target Allocation</CardTitle>
        <p className="text-sm text-muted-foreground">
          Comparing to {rebalancingPlan.targetModel.name}
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="assetType"
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              label={{ value: 'Allocation %', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip
              formatter={(value: number) => `${value.toFixed(1)}%`}
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
              }}
            />
            <Legend />
            <Bar
              dataKey="current"
              fill="hsl(var(--primary))"
              name="Current"
            />
            <Bar
              dataKey="target"
              fill="hsl(var(--accent))"
              name="Target"
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
