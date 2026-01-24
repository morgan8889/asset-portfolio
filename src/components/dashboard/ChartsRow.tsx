'use client';

import { PortfolioChart } from '@/components/charts/portfolio-chart';
import { AllocationDonut } from '@/components/charts/allocation-donut';

export function ChartsRow() {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {/* Portfolio Performance Chart */}
      <div className="md:col-span-2">
        <PortfolioChart />
      </div>

      {/* Asset Allocation Chart */}
      <div className="md:col-span-1">
        <AllocationDonut />
      </div>
    </div>
  );
}
