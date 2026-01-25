'use client';

/**
 * PriceSettings Component
 *
 * Feature: 005-live-market-data
 *
 * Settings panel for price update preferences:
 * - Update frequency selector (realtime/frequent/standard/manual)
 * - Staleness indicator toggle
 * - Pause when hidden toggle
 */

import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePriceStore } from '@/lib/stores';
import { RefreshInterval, REFRESH_INTERVALS } from '@/types/market';

const INTERVAL_OPTIONS: { value: RefreshInterval; label: string; description: string }[] = [
  {
    value: 'realtime',
    label: 'Real-time',
    description: 'Every 30 seconds - for active trading',
  },
  {
    value: 'frequent',
    label: 'Frequent',
    description: 'Every minute - for active monitoring',
  },
  {
    value: 'standard',
    label: 'Standard',
    description: 'Every 5 minutes - recommended for most users',
  },
  {
    value: 'manual',
    label: 'Manual',
    description: 'Only refresh when requested',
  },
];

export function PriceSettings() {
  const { preferences, setPreferences, loadPreferences } = usePriceStore();

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const handleIntervalChange = (value: RefreshInterval) => {
    setPreferences({ refreshInterval: value });
  };

  const handleShowStalenessChange = (checked: boolean) => {
    setPreferences({ showStalenessIndicator: checked });
  };

  const handlePauseWhenHiddenChange = (checked: boolean) => {
    setPreferences({ pauseWhenHidden: checked });
  };

  const selectedOption = INTERVAL_OPTIONS.find(
    (opt) => opt.value === preferences.refreshInterval
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Price Updates</CardTitle>
        <CardDescription>
          Configure how often prices are automatically updated
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Update Frequency */}
        <div className="space-y-2">
          <Label htmlFor="refresh-interval">Update Frequency</Label>
          <Select
            value={preferences.refreshInterval}
            onValueChange={handleIntervalChange}
          >
            <SelectTrigger id="refresh-interval">
              <SelectValue placeholder="Select frequency" />
            </SelectTrigger>
            <SelectContent>
              {INTERVAL_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex flex-col">
                    <span>{option.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {option.description}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedOption && (
            <p className="text-sm text-muted-foreground">
              {selectedOption.description}
            </p>
          )}
        </div>

        {/* Show Staleness Indicator */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="show-staleness">Show Staleness Indicator</Label>
            <p className="text-sm text-muted-foreground">
              Display a colored dot showing how fresh the price data is
            </p>
          </div>
          <Switch
            id="show-staleness"
            checked={preferences.showStalenessIndicator}
            onCheckedChange={handleShowStalenessChange}
          />
        </div>

        {/* Pause When Hidden */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="pause-when-hidden">Pause When Tab Hidden</Label>
            <p className="text-sm text-muted-foreground">
              Stop automatic updates when the browser tab is not visible
            </p>
          </div>
          <Switch
            id="pause-when-hidden"
            checked={preferences.pauseWhenHidden}
            onCheckedChange={handlePauseWhenHiddenChange}
          />
        </div>

        {/* Status Info */}
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">Current Settings</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-muted-foreground">Interval:</span>
            <span>
              {preferences.refreshInterval === 'manual'
                ? 'Manual only'
                : `${REFRESH_INTERVALS[preferences.refreshInterval] / 1000}s`}
            </span>
            <span className="text-muted-foreground">Staleness threshold:</span>
            <span>
              {preferences.refreshInterval === 'manual'
                ? 'N/A'
                : `${(REFRESH_INTERVALS[preferences.refreshInterval] * 2) / 1000}s`}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default PriceSettings;
