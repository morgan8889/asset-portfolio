/**
 * Export service for portfolio reports
 * All operations run client-side with no network requests
 * @feature 011-export-functionality
 */

import type {
  DateRangePreset,
  ExportProgress,
  HoldingExportRow,
  PerformanceReportData,
  ReportType,
  TransactionExportRow,
  ExportFormat,
} from '@/types/export';

/**
 * Export service interface
 */
export interface IExportService {
  generatePerformancePdf(
    portfolioId: string,
    dateRange: DateRangePreset,
    onProgress?: (progress: ExportProgress) => void
  ): Promise<void>;

  exportTransactionsCsv(
    portfolioId: string,
    dateRange: DateRangePreset,
    onProgress?: (progress: ExportProgress) => void
  ): Promise<void>;

  exportHoldingsCsv(
    portfolioId: string,
    onProgress?: (progress: ExportProgress) => void
  ): Promise<void>;

  prepareTransactionData(
    portfolioId: string,
    dateRange: DateRangePreset
  ): Promise<TransactionExportRow[]>;

  prepareHoldingsData(portfolioId: string): Promise<HoldingExportRow[]>;

  preparePerformanceData(
    portfolioId: string,
    dateRange: DateRangePreset
  ): Promise<PerformanceReportData>;
}

/**
 * Concrete implementation of export service
 */
class ExportService implements IExportService {
  async generatePerformancePdf(
    portfolioId: string,
    dateRange: DateRangePreset,
    onProgress?: (progress: ExportProgress) => void
  ): Promise<void> {
    try {
      onProgress?.({
        status: 'preparing',
        progress: 10,
        message: 'Preparing report data...',
      });

      // Prepare data
      const data = await this.preparePerformanceData(portfolioId, dateRange);

      onProgress?.({
        status: 'generating',
        progress: 30,
        message: 'Loading PDF libraries...',
      });

      // Lazy load PDF libraries
      const [{ default: jsPDF }, { default: html2canvas }, { default: autoTable }] =
        await Promise.all([
          import('jspdf'),
          import('html2canvas'),
          import('jspdf-autotable'),
        ]);

      onProgress?.({
        status: 'generating',
        progress: 50,
        message: 'Generating PDF...',
      });

      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');

      // Add header
      pdf.setFontSize(20);
      pdf.text(data.portfolioName, 20, 20);

      pdf.setFontSize(12);
      pdf.text(`Performance Report | ${data.generatedAt.toLocaleDateString()}`, 20, 30);

      pdf.setFontSize(10);
      const periodText = `Period: ${data.dateRange.start.toLocaleDateString()} - ${data.dateRange.end.toLocaleDateString()}`;
      pdf.text(periodText, 20, 37);

      // Add summary metrics
      let yPos = 50;

      pdf.setFontSize(14);
      pdf.text('Summary', 20, yPos);
      yPos += 10;

      pdf.setFontSize(10);
      pdf.text(`Total Value: $${data.summary.totalValue}`, 20, yPos);
      pdf.text(`Total Cost: $${data.summary.totalCost}`, 110, yPos);
      yPos += 7;
      pdf.text(`Total Gain/Loss: $${data.summary.totalGain} (${data.summary.totalGainPercent})`, 20, yPos);
      yPos += 7;
      pdf.text(`Period Return: ${data.summary.periodReturn}`, 20, yPos);
      pdf.text(`Annualized Return: ${data.summary.annualizedReturn}`, 110, yPos);
      yPos += 15;

      // Add top holdings table
      pdf.setFontSize(14);
      pdf.text('Top 10 Holdings', 20, yPos);
      yPos += 5;

      const tableData = data.topHoldings.map((h) => [
        h.symbol,
        h.name,
        `$${h.value}`,
        h.weight,
        `$${h.gain}`,
        h.gainPercent,
      ]);

      autoTable(pdf, {
        startY: yPos,
        head: [['Symbol', 'Name', 'Value', 'Weight', 'Gain/Loss', '%']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [66, 139, 202] },
        margin: { left: 20, right: 20 },
      });

      onProgress?.({
        status: 'generating',
        progress: 90,
        message: 'Finalizing PDF...',
      });

      // Generate filename and save
      const { db } = await import('@/lib/db');
      const portfolio = await db.portfolios.get(portfolioId);
      const filename = generateExportFilename(
        'performance',
        portfolio?.name || 'Portfolio',
        'pdf'
      );

      pdf.save(filename);

      onProgress?.({
        status: 'complete',
        progress: 100,
        message: 'PDF generated successfully!',
      });
    } catch (error) {
      onProgress?.({
        status: 'error',
        progress: 0,
        error: error instanceof Error ? error.message : 'Failed to generate PDF',
      });
      throw error;
    }
  }

  async exportTransactionsCsv(
    portfolioId: string,
    dateRange: DateRangePreset,
    onProgress?: (progress: ExportProgress) => void
  ): Promise<void> {
    try {
      onProgress?.({
        status: 'preparing',
        progress: 10,
        message: 'Preparing transaction data...',
      });

      // Prepare data
      const transactions = await this.prepareTransactionData(
        portfolioId,
        dateRange
      );

      if (transactions.length === 0) {
        throw new Error('No transactions found for the selected date range');
      }

      onProgress?.({
        status: 'generating',
        progress: 50,
        message: 'Generating CSV...',
      });

      // Generate CSV using PapaParse
      const Papa = (await import('papaparse')).default;
      const csv = Papa.unparse(transactions, {
        header: true,
        escapeFormulae: true,
      });

      onProgress?.({
        status: 'generating',
        progress: 80,
        message: 'Downloading file...',
      });

      // Download CSV
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      // Generate filename
      const { db } = await import('@/lib/db');
      const portfolio = await db.portfolios.get(portfolioId);
      const filename = generateExportFilename(
        'transactions',
        portfolio?.name || 'Portfolio',
        'csv'
      );

      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);

      onProgress?.({
        status: 'complete',
        progress: 100,
        message: 'CSV generated successfully!',
      });
    } catch (error) {
      onProgress?.({
        status: 'error',
        progress: 0,
        error:
          error instanceof Error ? error.message : 'Failed to generate CSV',
      });
      throw error;
    }
  }

  async exportHoldingsCsv(
    portfolioId: string,
    onProgress?: (progress: ExportProgress) => void
  ): Promise<void> {
    try {
      onProgress?.({
        status: 'preparing',
        progress: 10,
        message: 'Preparing holdings data...',
      });

      // Prepare data
      const holdings = await this.prepareHoldingsData(portfolioId);

      if (holdings.length === 0) {
        throw new Error('No holdings found for this portfolio');
      }

      onProgress?.({
        status: 'generating',
        progress: 50,
        message: 'Generating CSV...',
      });

      // Generate CSV using PapaParse
      const Papa = (await import('papaparse')).default;
      const csv = Papa.unparse(holdings, {
        header: true,
        escapeFormulae: true,
      });

      onProgress?.({
        status: 'generating',
        progress: 80,
        message: 'Downloading file...',
      });

      // Download CSV
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      // Generate filename
      const { db } = await import('@/lib/db');
      const portfolio = await db.portfolios.get(portfolioId);
      const filename = generateExportFilename(
        'holdings',
        portfolio?.name || 'Portfolio',
        'csv'
      );

      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);

      onProgress?.({
        status: 'complete',
        progress: 100,
        message: 'CSV generated successfully!',
      });
    } catch (error) {
      onProgress?.({
        status: 'error',
        progress: 0,
        error:
          error instanceof Error ? error.message : 'Failed to generate CSV',
      });
      throw error;
    }
  }

  async prepareTransactionData(
    portfolioId: string,
    dateRange: DateRangePreset
  ): Promise<TransactionExportRow[]> {
    const { db } = await import('@/lib/db');
    const { format } = await import('date-fns');
    const Decimal = (await import('decimal.js')).default;

    // Get date range bounds
    const { start, end } = getDateRangeBounds(dateRange);

    // Get all transactions for portfolio within date range
    const allTransactions = await db.transactions
      .where({ portfolioId })
      .toArray();

    // Filter by date range
    const filteredTransactions = allTransactions.filter((tx) => {
      const txDate = new Date(tx.date);
      return txDate >= start && txDate <= end;
    });

    // Get asset details
    const assetIds = [...new Set(filteredTransactions.map((t) => t.assetId))];
    const assets = await db.assets.where('id').anyOf(assetIds).toArray();
    const assetMap = new Map(assets.map((a) => [a.id, a]));

    // Format for CSV export
    const exportRows: TransactionExportRow[] = filteredTransactions.map(
      (tx) => {
        const asset = assetMap.get(tx.assetId);
        const quantity = new Decimal(tx.quantity);
        const price = new Decimal(tx.price);
        const fees = new Decimal(tx.fees || 0);
        const total = new Decimal(tx.totalAmount);

        // Tax fields (T038-T042)
        const grantDate = tx.grantDate ? format(new Date(tx.grantDate), 'yyyy-MM-dd') : '';
        const vestDate = tx.vestingDate ? format(new Date(tx.vestingDate), 'yyyy-MM-dd') : '';
        const discountPercent = tx.discountPercent
          ? `${new Decimal(tx.discountPercent).mul(100).toFixed(2)}%`
          : '';
        const sharesWithheld = tx.sharesWithheld
          ? new Decimal(tx.sharesWithheld).toFixed(4)
          : '';
        const ordinaryIncome = tx.ordinaryIncomeAmount
          ? `$${new Decimal(tx.ordinaryIncomeAmount).toFixed(2)}`
          : '';

        return {
          date: format(new Date(tx.date), 'yyyy-MM-dd'),
          type: tx.type.charAt(0).toUpperCase() + tx.type.slice(1),
          symbol: asset?.symbol || 'N/A',
          name: asset?.name || asset?.symbol || 'Unknown',
          quantity: quantity.toFixed(4),
          price: price.toFixed(2),
          fees: fees.toFixed(2),
          total: total.toFixed(2),
          grantDate,
          vestDate,
          discountPercent,
          sharesWithheld,
          ordinaryIncome,
        };
      }
    );

    // Sort by date (newest first)
    exportRows.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    });

    return exportRows;
  }

  async prepareHoldingsData(portfolioId: string): Promise<HoldingExportRow[]> {
    const { db } = await import('@/lib/db');
    const Decimal = (await import('decimal.js')).default;
    const { determineMixedHoldingPeriod } = await import('@/types/tax');
    const { formatHoldingPeriodAbbr } = await import('@/lib/utils/tax-formatters');
    const { useTaxSettingsStore } = await import('@/lib/stores/tax-settings');

    // Get tax settings
    const taxSettings = useTaxSettingsStore.getState().settings;
    const combinedTaxRate = {
      st: taxSettings.shortTermTaxRate + taxSettings.stateRate,
      lt: taxSettings.longTermTaxRate + taxSettings.stateRate,
    };

    // Get all holdings for portfolio
    const holdings = await db.holdings.where({ portfolioId }).toArray();

    // Get asset details
    const assetIds = [...new Set(holdings.map((h) => h.assetId))];
    const assets = await db.assets.where('id').anyOf(assetIds).toArray();
    const assetMap = new Map(assets.map((a) => [a.id, a]));

    const currentDate = new Date();

    // Format for CSV export
    const exportRows: HoldingExportRow[] = holdings.map((holding) => {
      const asset = assetMap.get(holding.assetId);
      const quantity = new Decimal(holding.quantity);
      const costBasis = new Decimal(holding.costBasis);
      const marketValue = new Decimal(holding.currentValue);
      const unrealizedGain = new Decimal(holding.unrealizedGain);
      const unrealizedGainPercent = holding.unrealizedGainPercent;

      // Calculate average cost
      const averageCost = quantity.isZero()
        ? new Decimal(0)
        : costBasis.div(quantity);

      // Calculate current price from market value / quantity
      const currentPrice = quantity.isZero()
        ? new Decimal(0)
        : marketValue.div(quantity);

      // Tax calculations (T043-T047)
      const holdingPeriod = determineMixedHoldingPeriod(holding.lots, currentDate);
      let shortTermGain = new Decimal(0);
      let longTermGain = new Decimal(0);

      // Calculate ST/LT gains from lots
      for (const lot of holding.lots) {
        if (lot.remainingQuantity.isZero()) continue;

        const lotValue = lot.remainingQuantity.mul(currentPrice);
        const lotCost = lot.remainingQuantity.mul(lot.purchasePrice);
        const lotGain = lotValue.sub(lotCost);

        const daysHeld = Math.floor(
          (currentDate.getTime() - lot.purchaseDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysHeld >= 365) {
          longTermGain = longTermGain.add(lotGain);
        } else {
          shortTermGain = shortTermGain.add(lotGain);
        }
      }

      // Calculate estimated tax (only on gains, not losses)
      const stTax = shortTermGain.greaterThan(0)
        ? shortTermGain.mul(combinedTaxRate.st)
        : new Decimal(0);
      const ltTax = longTermGain.greaterThan(0)
        ? longTermGain.mul(combinedTaxRate.lt)
        : new Decimal(0);
      const estimatedTax = stTax.add(ltTax);

      // Basis adjustment (placeholder for ESPP disqualifying dispositions)
      const basisAdjustment = new Decimal(0);

      return {
        symbol: asset?.symbol || 'N/A',
        name: asset?.name || asset?.symbol || 'Unknown',
        assetType: asset?.type || 'Unknown',
        quantity: quantity.toFixed(4),
        costBasis: costBasis.toFixed(2),
        averageCost: averageCost.toFixed(2),
        currentPrice: currentPrice.toFixed(2),
        marketValue: marketValue.toFixed(2),
        unrealizedGain: unrealizedGain.toFixed(2),
        unrealizedGainPercent: unrealizedGainPercent.toFixed(2) + '%',
        holdingPeriod: formatHoldingPeriodAbbr(holdingPeriod),
        shortTermGain: `$${shortTermGain.toFixed(2)}`,
        longTermGain: `$${longTermGain.toFixed(2)}`,
        estimatedTax: `$${estimatedTax.toFixed(2)}`,
        basisAdjustment: `$${basisAdjustment.toFixed(2)}`,
      };
    });

    // Sort by market value (highest first)
    exportRows.sort((a, b) => {
      const valueA = new Decimal(a.marketValue);
      const valueB = new Decimal(b.marketValue);
      return valueB.minus(valueA).toNumber();
    });

    return exportRows;
  }

  async preparePerformanceData(
    portfolioId: string,
    dateRange: DateRangePreset
  ): Promise<PerformanceReportData> {
    const { db } = await import('@/lib/db');
    const { getSnapshots } = await import('@/lib/services/snapshot-service');
    const Decimal = (await import('decimal.js')).default;

    // Get portfolio
    const portfolio = await db.portfolios.get(portfolioId);
    if (!portfolio) {
      throw new Error(`Portfolio ${portfolioId} not found`);
    }

    // Get date range
    const { start, end } = getDateRangeBounds(dateRange);

    // Get snapshots for chart data
    const snapshots = await getSnapshots(portfolioId, start, end);

    // Get current holdings
    const holdings = await db.holdings.where({ portfolioId }).toArray();

    // Get asset details for holdings
    const assetIds = [...new Set(holdings.map((h) => h.assetId))];
    const assets = await db.assets.where('id').anyOf(assetIds).toArray();
    const assetMap = new Map(assets.map((a) => [a.id, a]));

    // Calculate total values
    const totalValue = holdings.reduce(
      (sum, h) => sum.plus(new Decimal(h.currentValue)),
      new Decimal(0)
    );
    const totalCost = holdings.reduce(
      (sum, h) => sum.plus(new Decimal(h.costBasis)),
      new Decimal(0)
    );
    const totalGain = totalValue.minus(totalCost);
    const totalGainPercent = totalCost.isZero()
      ? new Decimal(0)
      : totalGain.div(totalCost).mul(100);

    // Calculate period return
    const startValue =
      snapshots.length > 0
        ? new Decimal(snapshots[0].totalValue)
        : new Decimal(0);
    const endValue =
      snapshots.length > 0
        ? new Decimal(snapshots[snapshots.length - 1].totalValue)
        : totalValue;
    const periodReturn = startValue.isZero()
      ? new Decimal(0)
      : endValue.minus(startValue).div(startValue).mul(100);

    // Calculate annualized return (simplified)
    const daysDiff = Math.max(
      1,
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );
    const annualizedReturn = periodReturn.mul(365).div(daysDiff);

    // Prepare chart data
    const valueHistory = snapshots.map((snapshot) => ({
      date: new Date(snapshot.date).toISOString().split('T')[0],
      value: new Decimal(snapshot.totalValue).toNumber(),
    }));

    // Simple allocation by asset type
    const allocationMap = new Map<string, number>();
    holdings.forEach((h) => {
      const asset = assetMap.get(h.assetId);
      const assetType = asset?.type || 'Other';
      const value = new Decimal(h.currentValue).toNumber();
      allocationMap.set(assetType, (allocationMap.get(assetType) || 0) + value);
    });

    const allocationData = Array.from(allocationMap.entries()).map(
      ([category, value]) => ({
        category,
        value,
        percentage: totalValue.isZero()
          ? 0
          : (value / totalValue.toNumber()) * 100,
      })
    );

    // Get top 10 holdings
    const sortedHoldings = [...holdings].sort(
      (a, b) =>
        new Decimal(b.currentValue).toNumber() -
        new Decimal(a.currentValue).toNumber()
    );
    const topHoldings = sortedHoldings.slice(0, 10).map((h) => {
      const asset = assetMap.get(h.assetId);
      const value = new Decimal(h.currentValue);
      const gain = new Decimal(h.unrealizedGain);
      const gainPercent = h.unrealizedGainPercent;
      const weight = totalValue.isZero()
        ? '0.00'
        : value.div(totalValue).mul(100).toFixed(2);

      return {
        symbol: asset?.symbol || 'N/A',
        name: asset?.name || asset?.symbol || 'Unknown',
        value: value.toFixed(2),
        weight: weight + '%',
        gain: gain.toFixed(2),
        gainPercent: gainPercent.toFixed(2) + '%',
      };
    });

    return {
      portfolioName: portfolio.name,
      generatedAt: new Date(),
      dateRange: { start, end },
      summary: {
        totalValue: totalValue.toFixed(2),
        totalCost: totalCost.toFixed(2),
        totalGain: totalGain.toFixed(2),
        totalGainPercent: totalGainPercent.toFixed(2) + '%',
        periodReturn: periodReturn.toFixed(2) + '%',
        annualizedReturn: annualizedReturn.toFixed(2) + '%',
      },
      valueHistory,
      allocation: allocationData,
      topHoldings,
    };
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a standardized filename for exports
 */
export function generateExportFilename(
  reportType: ReportType,
  portfolioName: string,
  format: ExportFormat
): string {
  const typeMap: Record<ReportType, string> = {
    performance: 'portfolio_performance',
    transactions: 'transaction_history',
    holdings: 'holdings_snapshot',
  };

  const sanitizedName = portfolioName
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');

  const date = new Date().toISOString().split('T')[0];

  return `${typeMap[reportType]}_${sanitizedName}_${date}.${format}`;
}

/**
 * Calculate date range bounds from preset
 */
export function getDateRangeBounds(
  preset: DateRangePreset
): { start: Date; end: Date } {
  const end = new Date();
  let start: Date;

  switch (preset) {
    case 'YTD':
      start = new Date(end.getFullYear(), 0, 1);
      break;
    case '1Y':
      start = new Date(end);
      start.setFullYear(start.getFullYear() - 1);
      break;
    case 'ALL':
      start = new Date(0); // Beginning of time
      break;
  }

  return { start, end };
}

// Export singleton instance
export const exportService = new ExportService();
