'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Calendar, TrendingUp } from 'lucide-react';
import { usePortfolioStore } from '@/lib/stores/portfolio';
import { useExportStore } from '@/lib/stores/export';
import { exportService } from '@/lib/services/export-service';
import { ExportButton } from '@/components/reports/export-button';
import { DateRangeSelect } from '@/components/reports/date-range-select';
import { useToast } from '@/components/ui/use-toast';
import type { DateRangePreset } from '@/types/export';

export default function ReportsPage() {
  const { currentPortfolio } = usePortfolioStore();
  const { updateProgress, resetProgress } = useExportStore();
  const { toast } = useToast();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isGeneratingTransactionsCsv, setIsGeneratingTransactionsCsv] = useState(false);
  const [isGeneratingHoldingsCsv, setIsGeneratingHoldingsCsv] = useState(false);
  const [transactionDateRange, setTransactionDateRange] = useState<DateRangePreset>('YTD');

  const handleGeneratePerformancePdf = async () => {
    if (!currentPortfolio) {
      toast({
        title: 'No Portfolio Selected',
        description: 'Please select a portfolio first.',
        variant: 'destructive',
      });
      return;
    }

    setIsGeneratingPdf(true);
    resetProgress();

    try {
      await exportService.generatePerformancePdf(
        currentPortfolio.id,
        'YTD',
        (progress) => {
          updateProgress(progress);
        }
      );

      toast({
        title: 'Success',
        description: 'Performance report generated successfully!',
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Failed to generate PDF',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingPdf(false);
      setTimeout(() => resetProgress(), 2000);
    }
  };

  const handleGenerateTransactionsCsv = async () => {
    if (!currentPortfolio) {
      toast({
        title: 'No Portfolio Selected',
        description: 'Please select a portfolio first.',
        variant: 'destructive',
      });
      return;
    }

    setIsGeneratingTransactionsCsv(true);
    resetProgress();

    try {
      await exportService.exportTransactionsCsv(
        currentPortfolio.id,
        transactionDateRange,
        (progress) => {
          updateProgress(progress);
        }
      );

      toast({
        title: 'Success',
        description: 'Transaction history exported successfully!',
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Failed to export transactions',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingTransactionsCsv(false);
      setTimeout(() => resetProgress(), 2000);
    }
  };

  const handleGenerateHoldingsCsv = async () => {
    if (!currentPortfolio) {
      toast({
        title: 'No Portfolio Selected',
        description: 'Please select a portfolio first.',
        variant: 'destructive',
      });
      return;
    }

    setIsGeneratingHoldingsCsv(true);
    resetProgress();

    try {
      await exportService.exportHoldingsCsv(
        currentPortfolio.id,
        (progress) => {
          updateProgress(progress);
        }
      );

      toast({
        title: 'Success',
        description: 'Holdings exported successfully!',
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Failed to export holdings',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingHoldingsCsv(false);
      setTimeout(() => resetProgress(), 2000);
    }
  };

  const hasPortfolio = !!currentPortfolio;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">
            Generate and download detailed reports for your portfolio
            performance and tax reporting.
          </p>
        </div>
      </div>

      {!hasPortfolio && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <p className="text-sm text-yellow-800">
              Please select or create a portfolio to generate reports.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Performance Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              Comprehensive portfolio performance analysis with charts and
              metrics.
            </p>
            <ExportButton
              onClick={handleGeneratePerformancePdf}
              disabled={!hasPortfolio || isGeneratingPdf}
            >
              Download PDF
            </ExportButton>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Transaction History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              Complete transaction history for tax filing and analysis.
            </p>
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium">
                Date Range
              </label>
              <DateRangeSelect
                value={transactionDateRange}
                onValueChange={setTransactionDateRange}
                disabled={!hasPortfolio || isGeneratingTransactionsCsv}
              />
            </div>
            <ExportButton
              onClick={handleGenerateTransactionsCsv}
              disabled={!hasPortfolio || isGeneratingTransactionsCsv}
            >
              Download CSV
            </ExportButton>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Holdings Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              Current holdings with cost basis and market values.
            </p>
            <ExportButton
              onClick={handleGenerateHoldingsCsv}
              disabled={!hasPortfolio || isGeneratingHoldingsCsv}
            >
              Download CSV
            </ExportButton>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center text-muted-foreground">
            <FileText className="mx-auto mb-4 h-12 w-12 opacity-50" />
            <p className="mb-2 text-lg font-medium">No reports generated yet</p>
            <p className="text-sm">
              Generate your first report to see the history here
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
