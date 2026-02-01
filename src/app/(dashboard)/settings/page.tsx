'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Settings, RefreshCw, Download, Upload, AlertTriangle } from 'lucide-react';
import { PriceSettings } from '@/components/settings/price-settings';
import { CsvImportDialog } from '@/components/forms/csv-import-dialog';
import { ResetConfirmationDialog } from '@/components/settings/reset-confirmation-dialog';
import { useUIStore } from '@/lib/stores/ui';
import { usePortfolioStore } from '@/lib/stores/portfolio';
import { db } from '@/lib/db';

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const { modals, openModal, closeModal } = useUIStore();
  const { currentPortfolio } = usePortfolioStore();

  const [baseCurrency, setBaseCurrency] = useState<string>('USD');
  const [showResetDialog, setShowResetDialog] = useState(false);

  // Load currency preference on mount
  useEffect(() => {
    const loadCurrency = async () => {
      const currency = await db.userSettings
        .where('key')
        .equals('baseCurrency')
        .first();
      if (currency) {
        setBaseCurrency(currency.value as string);
      }
    };
    loadCurrency();
  }, []);

  // Handler for currency change
  const handleCurrencyChange = async (currency: string) => {
    setBaseCurrency(currency);

    try {
      await db.userSettings.put({
        key: 'baseCurrency',
        value: currency,
        updatedAt: new Date(),
      });

      toast({
        title: 'Currency updated',
        description: `Base currency set to ${currency}`,
      });
    } catch (error) {
      console.error('Failed to save currency:', error);
      toast({
        title: 'Error',
        description: 'Failed to save currency preference.',
        variant: 'destructive',
      });
    }
  };

  // Handler for clearing cache
  const handleClearCache = async () => {
    try {
      await db.priceSnapshots.clear();
      await db.priceHistory.clear();

      toast({
        title: 'Cache cleared',
        description: 'Price cache has been cleared successfully.',
      });
    } catch (error) {
      console.error('Failed to clear cache:', error);
      toast({
        title: 'Error',
        description: 'Failed to clear cache. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Handler for data import
  const handleImportData = () => {
    if (!currentPortfolio?.id) {
      toast({
        title: 'No portfolio selected',
        description: 'Please select a portfolio first',
        variant: 'destructive',
      });
      return;
    }
    openModal('importCSV');
  };

  // Handler for reset all data
  const handleResetAllData = async () => {
    try {
      // Clear all tables except userSettings (in dependency order)
      await db.performanceSnapshots.clear();
      await db.dividendRecords.clear();
      await db.transactions.clear();
      await db.holdings.clear();
      await db.priceSnapshots.clear();
      await db.priceHistory.clear();
      await db.assets.clear();
      await db.portfolios.clear();

      toast({
        title: 'All data reset',
        description: 'All portfolios and data have been deleted.',
      });

      setShowResetDialog(false);
      router.push('/');
    } catch (error) {
      console.error('Failed to reset data:', error);
      toast({
        title: 'Error',
        description: 'Failed to reset data. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your portfolio preferences and application settings.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Price Update Settings */}
        <PriceSettings />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              General Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currency">Base Currency</Label>
              <Select value={baseCurrency} onValueChange={handleCurrencyChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                  <SelectItem value="GBP">GBP - British Pound</SelectItem>
                  <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Dark Mode</Label>
                <p className="text-sm text-muted-foreground">Use dark theme</p>
              </div>
              <Switch
                checked={theme === 'dark'}
                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <Download className="mr-2 h-4 w-4" />
                Export All Data
              </Button>
              <p className="text-xs text-muted-foreground">
                Download all your portfolio data as JSON
              </p>
            </div>

            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleImportData}
              >
                <Upload className="mr-2 h-4 w-4" />
                Import Data
              </Button>
              <p className="text-xs text-muted-foreground">
                Import portfolio data from file
              </p>
            </div>

            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleClearCache}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Clear Cache
              </Button>
              <p className="text-xs text-muted-foreground">
                Clear all cached price data
              </p>
            </div>

            <div className="space-y-2">
              <Button
                variant="destructive"
                className="w-full justify-start"
                onClick={() => setShowResetDialog(true)}
              >
                <AlertTriangle className="mr-2 h-4 w-4" />
                Reset All Data
              </Button>
              <p className="text-xs text-muted-foreground">
                ⚠️ This will delete all portfolios and transactions
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CSV Import Dialog */}
      <CsvImportDialog
        open={modals.importCSV}
        onOpenChange={(open) => !open && closeModal('importCSV')}
        portfolioId={currentPortfolio?.id ?? null}
      />

      {/* Reset Confirmation Dialog */}
      <ResetConfirmationDialog
        open={showResetDialog}
        onOpenChange={setShowResetDialog}
        onConfirm={handleResetAllData}
      />
    </div>
  );
}
