'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Save, RefreshCw, Download, Upload } from 'lucide-react';
import { PriceSettings } from '@/components/settings/price-settings';

export default function SettingsPage() {
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
              <Select defaultValue="USD">
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
                <p className="text-sm text-muted-foreground">
                  Use dark theme
                </p>
              </div>
              <Switch />
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
                <Download className="h-4 w-4 mr-2" />
                Export All Data
              </Button>
              <p className="text-xs text-muted-foreground">
                Download all your portfolio data as JSON
              </p>
            </div>

            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <Upload className="h-4 w-4 mr-2" />
                Import Data
              </Button>
              <p className="text-xs text-muted-foreground">
                Import portfolio data from file
              </p>
            </div>

            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <RefreshCw className="h-4 w-4 mr-2" />
                Clear Cache
              </Button>
              <p className="text-xs text-muted-foreground">
                Clear all cached price data
              </p>
            </div>

            <div className="space-y-2">
              <Button variant="destructive" className="w-full justify-start">
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset All Data
              </Button>
              <p className="text-xs text-muted-foreground">
                ⚠️ This will delete all portfolios and transactions
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>API Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="alpha-vantage-key">Alpha Vantage API Key</Label>
            <Input
              id="alpha-vantage-key"
              type="password"
              placeholder="Enter your API key"
            />
            <p className="text-xs text-muted-foreground">
              Optional: Provides more reliable stock price data
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="coinbase-key">CoinGecko API Key</Label>
            <Input
              id="coinbase-key"
              type="password"
              placeholder="Enter your API key"
            />
            <p className="text-xs text-muted-foreground">
              Optional: For premium cryptocurrency data features
            </p>
          </div>

          <Button className="w-full">
            <Save className="h-4 w-4 mr-2" />
            Save Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}