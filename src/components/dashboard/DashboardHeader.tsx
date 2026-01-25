'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AddTransactionDialog } from '@/components/forms/add-transaction';
import { Download, FileSpreadsheet, Settings } from 'lucide-react';
import { useDashboardContext } from './DashboardProvider';
import { DashboardSettings } from './dashboard-settings';
import { TimePeriodSelector } from './time-period-selector';

export function DashboardHeader() {
  const { currentPortfolio } = useDashboardContext();

  if (!currentPortfolio) return null;

  return (
    <div className="flex items-center justify-between">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="flex items-center gap-2">
          <p className="text-muted-foreground">Portfolio:</p>
          <Badge variant="outline" className="font-medium">
            {currentPortfolio.name}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {currentPortfolio.type.toUpperCase()}
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <TimePeriodSelector
          periods={['WEEK', 'MONTH', 'QUARTER', 'YEAR', 'ALL']}
          className="hidden sm:flex"
        />
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
        <Button variant="outline" size="sm">
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Import CSV
        </Button>
        <AddTransactionDialog />
        <DashboardSettings
          trigger={
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              data-testid="dashboard-settings-btn"
            >
              <Settings className="h-4 w-4" />
              <span className="sr-only">Dashboard settings</span>
            </Button>
          }
        />
      </div>
    </div>
  );
}
