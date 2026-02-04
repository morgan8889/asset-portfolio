'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CsvImportDialog } from '@/components/forms/csv-import-dialog';
import { Download, FileSpreadsheet, Settings, Briefcase } from 'lucide-react';
import { useDashboardContext } from './DashboardProvider';
import { DashboardSettings } from './dashboard-settings';
import { TimePeriodSelector } from './time-period-selector';
import { useDashboardStore } from '@/lib/stores';

export function DashboardHeader() {
  const router = useRouter();
  const { currentPortfolio, portfolios, setCurrentPortfolio } =
    useDashboardContext();
  const { config } = useDashboardStore();
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const handleExportClick = () => {
    router.push('/reports');
  };

  const handlePortfolioChange = (portfolioId: string) => {
    const portfolio = portfolios.find((p) => p.id === portfolioId);
    if (portfolio) {
      setCurrentPortfolio(portfolio);
    }
  };

  if (!currentPortfolio) return null;

  return (
    <div className="flex items-center justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-muted-foreground text-sm">Portfolio:</p>
          <Select
            value={currentPortfolio.id}
            onValueChange={handlePortfolioChange}
          >
            <SelectTrigger className="h-8 w-auto min-w-[180px] max-w-[280px]">
              <SelectValue>
                <span className="flex items-center gap-2">
                  <span className="truncate">{currentPortfolio.name}</span>
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {currentPortfolio.type.charAt(0).toUpperCase() +
                      currentPortfolio.type.slice(1)}
                  </Badge>
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {portfolios.map((portfolio) => (
                <SelectItem key={portfolio.id} value={portfolio.id}>
                  <span className="flex items-center gap-2">
                    <span>{portfolio.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {portfolio.type.charAt(0).toUpperCase() +
                        portfolio.type.slice(1)}
                    </Badge>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        <Button
          size="sm"
          onClick={() => router.push('/portfolios')}
        >
          <Briefcase className="mr-2 h-4 w-4" />
          Manage Portfolio
        </Button>
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
