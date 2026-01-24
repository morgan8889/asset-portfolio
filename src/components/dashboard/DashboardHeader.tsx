'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AddTransactionDialog } from '@/components/forms/add-transaction';
import { Download, FileSpreadsheet } from 'lucide-react';
import { useDashboardContext } from './DashboardProvider';

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
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
        <Button variant="outline" size="sm">
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Import CSV
        </Button>
        <AddTransactionDialog />
      </div>
    </div>
  );
}
