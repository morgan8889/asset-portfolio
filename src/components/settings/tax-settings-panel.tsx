'use client';

import { useState, useEffect } from 'react';
import { Decimal } from 'decimal.js';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';
import { useTaxSettingsStore } from '@/lib/stores/tax-settings';
import { showSuccessNotification } from '@/lib/stores/ui';

/**
 * Tax Settings Panel Component
 *
 * Allows users to configure their tax rates for capital gains calculations.
 * Rates are stored as percentages (0-100) but converted to decimals (0-1) for calculations.
 *
 * Features:
 * - Slider controls for visual adjustment
 * - Number inputs for precise values
 * - Real-time preview of tax impact
 * - Reset to defaults button
 * - Automatic persistence to IndexedDB
 */
export function TaxSettingsPanel() {
  const { taxSettings, setShortTermRate, setLongTermRate, resetToDefaults } =
    useTaxSettingsStore();

  // Local state for UI (as percentages 0-100)
  const [shortTermPercent, setShortTermPercent] = useState(
    taxSettings.shortTermRate.mul(100).toNumber()
  );
  const [longTermPercent, setLongTermPercent] = useState(
    taxSettings.longTermRate.mul(100).toNumber()
  );

  // Sync local state when store changes
  useEffect(() => {
    setShortTermPercent(taxSettings.shortTermRate.mul(100).toNumber());
    setLongTermPercent(taxSettings.longTermRate.mul(100).toNumber());
  }, [taxSettings]);

  const handleShortTermChange = (value: number) => {
    setShortTermPercent(value);
  };

  const handleLongTermChange = (value: number) => {
    setLongTermPercent(value);
  };

  const handleSave = () => {
    setShortTermRate(new Decimal(shortTermPercent).div(100));
    setLongTermRate(new Decimal(longTermPercent).div(100));
    showSuccessNotification(
      'Tax Settings Saved',
      'Your tax rates have been updated successfully'
    );
  };

  const handleReset = () => {
    resetToDefaults();
    showSuccessNotification(
      'Settings Reset',
      'Tax rates have been reset to default values'
    );
  };

  const hasChanges =
    shortTermPercent !== taxSettings.shortTermRate.mul(100).toNumber() ||
    longTermPercent !== taxSettings.longTermRate.mul(100).toNumber();

  return (
    <div className="space-y-6">
      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertDescription>
          Configure your tax rates for capital gains calculations. These rates
          are used to estimate tax liability on unrealized gains. Consult a tax
          professional for accurate rates based on your situation.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Capital Gains Tax Rates</CardTitle>
          <CardDescription>
            Set your marginal tax rates for short-term and long-term capital
            gains. These rates will be used to estimate your tax liability on
            investment gains.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Short-Term Rate */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label
                  htmlFor="short-term-rate"
                  className="text-base font-semibold"
                >
                  Short-Term Capital Gains Rate
                </Label>
                <p className="text-sm text-muted-foreground">
                  Applied to assets held for 1 year or less
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  id="short-term-rate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={shortTermPercent}
                  onChange={(e) =>
                    handleShortTermChange(parseFloat(e.target.value))
                  }
                  className="w-24 text-right"
                />
                <span className="text-sm font-medium">%</span>
              </div>
            </div>
            <Slider
              value={[shortTermPercent]}
              onValueChange={(values) => handleShortTermChange(values[0])}
              min={0}
              max={100}
              step={0.5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Long-Term Rate */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label
                  htmlFor="long-term-rate"
                  className="text-base font-semibold"
                >
                  Long-Term Capital Gains Rate
                </Label>
                <p className="text-sm text-muted-foreground">
                  Applied to assets held for more than 1 year
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  id="long-term-rate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={longTermPercent}
                  onChange={(e) =>
                    handleLongTermChange(parseFloat(e.target.value))
                  }
                  className="w-24 text-right"
                />
                <span className="text-sm font-medium">%</span>
              </div>
            </div>
            <Slider
              value={[longTermPercent]}
              onValueChange={(values) => handleLongTermChange(values[0])}
              min={0}
              max={100}
              step={0.5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-lg bg-muted p-4">
            <h4 className="mb-2 text-sm font-semibold">Tax Rate Preview</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Short-Term:</p>
                <p className="text-lg font-semibold">
                  {shortTermPercent.toFixed(2)}%
                </p>
                <p className="text-xs text-muted-foreground">
                  $10,000 gain = $
                  {((10000 * shortTermPercent) / 100).toFixed(2)} tax
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Long-Term:</p>
                <p className="text-lg font-semibold">
                  {longTermPercent.toFixed(2)}%
                </p>
                <p className="text-xs text-muted-foreground">
                  $10,000 gain = ${((10000 * longTermPercent) / 100).toFixed(2)}{' '}
                  tax
                </p>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={handleReset}>
            Reset to Defaults
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges}>
            {hasChanges ? 'Save Changes' : 'No Changes'}
          </Button>
        </CardFooter>
      </Card>

      <div className="text-xs text-muted-foreground">
        <p>
          <strong>Default Rates:</strong> Short-Term: 24% | Long-Term: 15%
        </p>
        <p className="mt-1">
          <strong>Note:</strong> These are typical federal rates for
          middle-income earners. Actual rates depend on your income bracket and
          may include state taxes.
        </p>
      </div>
    </div>
  );
}
