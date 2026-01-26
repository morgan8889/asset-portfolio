'use client';

/**
 * Export Button Component
 *
 * Button to export performance data to CSV with options.
 *
 * @module components/performance/export-button
 */

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePerformanceStore } from '@/lib/stores/performance';
import { showSuccessNotification, showErrorNotification } from '@/lib/stores/ui';

interface ExportButtonProps {
  portfolioId: string;
  disabled?: boolean;
  className?: string;
}

export function ExportButton({
  portfolioId,
  disabled = false,
  className,
}: ExportButtonProps) {
  const { isExporting, exportData, chartData } = usePerformanceStore();
  const [isOpen, setIsOpen] = useState(false);

  const handleExport = async (includeHoldings: boolean = false) => {
    setIsOpen(false);

    try {
      const csv = await exportData(portfolioId);

      // Create blob and download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      const date = new Date().toISOString().split('T')[0];
      const filename = `portfolio-performance-${date}.csv`;

      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showSuccessNotification('Export Complete', `Performance data saved to ${filename}`);
    } catch (error) {
      showErrorNotification(
        'Export Failed',
        error instanceof Error ? error.message : 'Failed to export data'
      );
    }
  };

  const hasData = chartData.length > 0;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || !hasData || isExporting}
          className={className}
          aria-label="Export performance data to CSV"
        >
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Export
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport(false)}>
          Export Performance Data
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport(true)}>
          Export with Holdings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled className="text-xs text-muted-foreground">
          Data exported as CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ExportButton;
