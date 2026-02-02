'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AddTransactionDialog } from '@/components/forms/add-transaction';
import { CsvImportDialog } from '@/components/forms/csv-import-dialog';
import { Download, FileSpreadsheet, Settings } from 'lucide-react';
import { useDashboardContext } from './DashboardProvider';
import { DashboardSettings } from './dashboard-settings';
import { TimePeriodSelector } from './time-period-selector';
import { useDashboardStore } from '@/lib/stores';

export function DashboardHeader() {
  const router = useRouter();
  const { currentPortfolio } = useDashboardContext();
  const { config } = useDashboardStore();
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const handleExportClick = () => {
    router.push('/reports');
  };

  if (!currentPortfolio) return null;

  return (
    <div className="flex items-center justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        </div>
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
        <Button variant="outline" size="sm" onClick={handleExportClick}>
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setImportDialogOpen(true)}
        >
          <FileSpreadsheet className="mr-2 h-4 w-4" />
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

      <CsvImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        portfolioId={currentPortfolio.id}
      />
    </div>
  );
}
