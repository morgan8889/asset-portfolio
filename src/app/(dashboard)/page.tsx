'use client';

import {
  DashboardProvider,
  useDashboardContext,
  DashboardHeader,
  MetricsCards,
  ChartsRow,
  RecentActivity,
  DashboardLoadingState,
  DashboardErrorState,
  DashboardEmptyState,
} from '@/components/dashboard';
import { HoldingsTable } from '@/components/tables/holdings-table';

export default function DashboardPage() {
  return (
    <DashboardProvider>
      <DashboardContent />
    </DashboardProvider>
  );
}

function DashboardContent() {
  const { currentPortfolio, loading, error, loadPortfolios } = useDashboardContext();

  if (loading) {
    return <DashboardLoadingState />;
  }

  if (error) {
    return <DashboardErrorState error={error} onRetry={loadPortfolios} />;
  }

  if (!currentPortfolio) {
    return <DashboardEmptyState />;
  }

  return (
    <div className="space-y-6">
      <DashboardHeader />
      <MetricsCards />
      <ChartsRow />
      <HoldingsTable />
      <RecentActivity />
    </div>
  );
}
