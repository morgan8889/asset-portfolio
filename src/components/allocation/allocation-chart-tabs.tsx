'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AllocationDimension } from '@/types/allocation';

interface AllocationChartTabsProps {
  selectedDimension: AllocationDimension;
  onDimensionChange: (dimension: AllocationDimension) => void;
  assetClassChart: React.ReactNode;
  sectorChart: React.ReactNode;
  regionChart: React.ReactNode;
}

export function AllocationChartTabs({
  selectedDimension,
  onDimensionChange,
  assetClassChart,
  sectorChart,
  regionChart,
}: AllocationChartTabsProps) {
  return (
    <Tabs
      value={selectedDimension}
      onValueChange={(value) => onDimensionChange(value as AllocationDimension)}
      className="w-full"
    >
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="assetClass">Asset Class</TabsTrigger>
        <TabsTrigger value="sector">Sector</TabsTrigger>
        <TabsTrigger value="region">Region</TabsTrigger>
      </TabsList>

      <TabsContent value="assetClass" className="mt-4">
        {assetClassChart}
      </TabsContent>

      <TabsContent value="sector" className="mt-4">
        {sectorChart}
      </TabsContent>

      <TabsContent value="region" className="mt-4">
        {regionChart}
      </TabsContent>
    </Tabs>
  );
}
