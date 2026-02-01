'use client';

import { useState } from 'react';
import { Decimal } from 'decimal.js';
import { AddTransactionDialog } from '@/components/forms/add-transaction';
import { CreatePortfolioDialog } from '@/components/forms/create-portfolio';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { db } from '@/lib/db/schema';
import { HoldingsCalculator } from '@/lib/db/holdings-calculator';
import { Loader2, CheckCircle, Trash2, TrendingUp } from 'lucide-react';
import {
  generatePortfolioId,
  generateTransactionId,
  generateHoldingId,
  createAssetId,
  type PortfolioId,
} from '@/types/storage';
import {
  generateHistoricalPortfolio,
  type HistoricalPortfolioOptions,
} from '@/lib/test-utils/historical-data-generator';

async function seedMockData() {
  // Create a demo portfolio
  const portfolioId = generatePortfolioId();
  await db.portfolios.add({
    id: portfolioId as string,
    name: 'Demo Portfolio',
    type: 'taxable',
    currency: 'USD',
    createdAt: new Date(),
    updatedAt: new Date(),
    settings: {
      rebalanceThreshold: 5,
      taxStrategy: 'fifo',
    },
  });

  // Create mock assets
  const assets = [
    {
      id: 'AAPL',
      symbol: 'AAPL',
      name: 'Apple Inc.',
      type: 'stock' as const,
      sector: 'Technology',
    },
    {
      id: 'GOOGL',
      symbol: 'GOOGL',
      name: 'Alphabet Inc.',
      type: 'stock' as const,
      sector: 'Technology',
    },
    {
      id: 'MSFT',
      symbol: 'MSFT',
      name: 'Microsoft Corp.',
      type: 'stock' as const,
      sector: 'Technology',
    },
    {
      id: 'AMZN',
      symbol: 'AMZN',
      name: 'Amazon.com Inc.',
      type: 'stock' as const,
      sector: 'Consumer',
    },
    {
      id: 'VTI',
      symbol: 'VTI',
      name: 'Vanguard Total Stock Market ETF',
      type: 'etf' as const,
      sector: 'Broad Market',
    },
    {
      id: 'BTC',
      symbol: 'BTC',
      name: 'Bitcoin',
      type: 'crypto' as const,
      sector: 'Cryptocurrency',
    },
    {
      id: 'ACME',
      symbol: 'ACME',
      name: 'ACME Corporation (Demo)',
      type: 'stock' as const,
      sector: 'Technology',
    },
  ];

  const prices: Record<string, number> = {
    AAPL: 178.5,
    GOOGL: 141.25,
    MSFT: 378.9,
    AMZN: 178.75,
    VTI: 245.3,
    BTC: 43250.0,
    ACME: 125.0,
  };

  for (const asset of assets) {
    await db.assets.put({
      ...asset,
      currency: 'USD',
      exchange: asset.type === 'crypto' ? 'Crypto' : 'NASDAQ',
      currentPrice: prices[asset.symbol],
      priceUpdatedAt: new Date(),
      metadata: {},
    });
  }

  // Create mock transactions and holdings
  const holdings = [
    { assetId: 'AAPL', quantity: 50, avgCost: 145.0, currentPrice: 178.5 },
    { assetId: 'GOOGL', quantity: 30, avgCost: 125.5, currentPrice: 141.25 },
    { assetId: 'MSFT', quantity: 25, avgCost: 320.0, currentPrice: 378.9 },
    { assetId: 'AMZN', quantity: 20, avgCost: 155.0, currentPrice: 178.75 },
    { assetId: 'VTI', quantity: 100, avgCost: 220.0, currentPrice: 245.3 },
    { assetId: 'BTC', quantity: 0.5, avgCost: 35000.0, currentPrice: 43250.0 },
  ];

  for (const h of holdings) {
    const quantity = new Decimal(h.quantity);
    const avgCost = new Decimal(h.avgCost);
    const currentPrice = new Decimal(h.currentPrice);
    const costBasis = quantity.mul(avgCost);
    const currentValue = quantity.mul(currentPrice);
    const unrealizedGain = currentValue.minus(costBasis);
    const unrealizedGainPercent = costBasis.isZero()
      ? 0
      : unrealizedGain.dividedBy(costBasis).mul(100).toNumber();

    // Add transaction (use string values for Decimal fields in storage)
    await db.transactions.add({
      id: generateTransactionId(),
      portfolioId: portfolioId,
      assetId: createAssetId(h.assetId),
      type: 'buy',
      date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000), // Random date in past year
      quantity: quantity.toString(),
      price: avgCost.toString(),
      totalAmount: costBasis.toString(),
      fees: '0',
      currency: 'USD',
    });

    // Add holding (use string values for Decimal fields in storage)
    await db.holdings.add({
      id: generateHoldingId(),
      portfolioId: portfolioId,
      assetId: createAssetId(h.assetId),
      quantity: quantity.toString(),
      costBasis: costBasis.toString(),
      averageCost: avgCost.toString(),
      currentValue: currentValue.toString(),
      unrealizedGain: unrealizedGain.toString(),
      unrealizedGainPercent,
      lots: [],
      lastUpdated: new Date(),
    });
  }

  // Add ESPP transaction (disqualifying - held < 2 years from grant)
  const esppGrantDate = new Date();
  esppGrantDate.setFullYear(esppGrantDate.getFullYear() - 1); // 1 year ago
  const esppPurchaseDate = new Date();
  esppPurchaseDate.setMonth(esppPurchaseDate.getMonth() - 6); // 6 months ago

  await db.transactions.add({
    id: generateTransactionId(),
    portfolioId: portfolioId,
    assetId: createAssetId('ACME'),
    type: 'espp_purchase' as any,
    date: esppPurchaseDate,
    quantity: '100',
    price: '85', // Discounted price (15% off $100)
    totalAmount: '8500',
    fees: '0',
    currency: 'USD',
    metadata: {
      grantDate: esppGrantDate.toISOString(),
      purchaseDate: esppPurchaseDate.toISOString(),
      marketPriceAtGrant: '100',
      marketPriceAtPurchase: '100',
      discountPercent: '15',
      bargainElement: '1500', // (100 - 85) * 100 = $1,500
    },
  });

  // Add RSU vest transaction
  const rsuVestDate = new Date();
  rsuVestDate.setMonth(rsuVestDate.getMonth() - 3); // 3 months ago

  await db.transactions.add({
    id: generateTransactionId(),
    portfolioId: portfolioId,
    assetId: createAssetId('ACME'),
    type: 'rsu_vest' as any,
    date: rsuVestDate,
    quantity: '38', // Net shares (50 gross - 12 withheld)
    price: '120', // FMV at vesting
    totalAmount: '4560', // 38 * 120
    fees: '0',
    currency: 'USD',
    metadata: {
      vestingDate: rsuVestDate.toISOString(),
      grossSharesVested: '50',
      sharesWithheldForTax: '12',
      vestingPrice: '120',
    },
  });

  // Trigger holdings calculator to create ACME holding from transactions
  // This will automatically build tax lots from the ESPP and RSU transactions
  await HoldingsCalculator.recalculatePortfolioHoldings(portfolioId);

  return portfolioId;
}

async function clearAllData() {
  await db.holdings.clear();
  await db.transactions.clear();
  await db.assets.clear();
  await db.portfolios.clear();
  await db.userSettings.clear();
}

export default function TestPage() {
  const [seeding, setSeeding] = useState(false);
  const [seeded, setSeeded] = useState(false);
  const [clearing, setClearing] = useState(false);

  // Historical data generation state
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [scenario, setScenario] = useState<
    'balanced' | 'aggressive' | 'conservative'
  >('balanced');
  const [years, setYears] = useState('5');
  const [includeInternational, setIncludeInternational] = useState(true);
  const [includeDividends, setIncludeDividends] = useState(true);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      // Clear any persisted store state first
      localStorage.removeItem('portfolio-store');
      localStorage.removeItem('dashboard-store');

      await seedMockData();
      setSeeded(true);
      setTimeout(() => {
        // Force full page reload to reset stores
        window.location.replace('/');
      }, 500);
    } catch (error) {
      console.error('Failed to seed data:', error);
      alert('Failed to seed data: ' + (error as Error).message);
    } finally {
      setSeeding(false);
    }
  };

  const handleClear = async () => {
    if (!confirm('This will delete ALL data. Are you sure?')) return;
    setClearing(true);
    try {
      await clearAllData();
      alert('All data cleared!');
      window.location.reload();
    } catch (error) {
      console.error('Failed to clear data:', error);
      alert('Failed to clear data: ' + (error as Error).message);
    } finally {
      setClearing(false);
    }
  };

  const handleGenerateHistorical = async () => {
    if (
      !confirm(
        `Generate ${years}-year historical portfolio with ${scenario} strategy? This will take 30-60 seconds.`
      )
    )
      return;

    setGenerating(true);
    setProgress(0);
    setProgressMessage('Starting...');

    try {
      // Clear existing data first
      localStorage.removeItem('portfolio-store');
      localStorage.removeItem('dashboard-store');
      await clearAllData();

      const options: HistoricalPortfolioOptions = {
        name: `Historical ${scenario.charAt(0).toUpperCase() + scenario.slice(1)} Portfolio`,
        yearsBack: parseInt(years),
        scenario,
        includeInternational,
        includeDividends,
        totalInitialInvestment: 100000,
        onProgress: (prog, msg) => {
          setProgress(prog);
          setProgressMessage(msg);
        },
      };

      await generateHistoricalPortfolio(options);

      setGenerated(true);
      setTimeout(() => {
        window.location.replace('/');
      }, 1000);
    } catch (error) {
      console.error('Failed to generate historical data:', error);
      alert('Failed to generate historical data: ' + (error as Error).message);
      setGenerating(false);
      setProgress(0);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Component Testing Page</h1>

      <div className="space-y-4">
        {/* Mock Data Section */}
        <div className="rounded-lg border bg-muted/50 p-4">
          <h2 className="mb-2 text-lg font-semibold">Mock Data Generator</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Generate sample portfolio with stocks, ETFs, and crypto to test the
            dashboard.
          </p>
          <div className="flex gap-2">
            <Button onClick={handleSeed} disabled={seeding || seeded}>
              {seeding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : seeded ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Done! Redirecting...
                </>
              ) : (
                'Generate Mock Data'
              )}
            </Button>
            <Button
              variant="destructive"
              onClick={handleClear}
              disabled={clearing}
            >
              {clearing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Clear All Data
            </Button>
          </div>
        </div>

        {/* Historical Data Generator */}
        <div className="rounded-lg border border-primary/50 bg-primary/5 p-4">
          <div className="mb-2 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Historical Data Generator</h2>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            Generate realistic multi-year portfolio data with daily snapshots
            for testing performance calculations. This will produce proper
            annual returns, drawdowns, and Sharpe ratios.
          </p>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="scenario">Investment Strategy</Label>
                <Select
                  value={scenario}
                  onValueChange={(v) =>
                    setScenario(v as 'balanced' | 'aggressive' | 'conservative')
                  }
                  disabled={generating}
                >
                  <SelectTrigger id="scenario">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="balanced">
                      Balanced (40% Stocks / 30% Bonds / 20% Intl / 10% REIT)
                    </SelectItem>
                    <SelectItem value="aggressive">
                      Aggressive (Tech-heavy with 10% Crypto)
                    </SelectItem>
                    <SelectItem value="conservative">
                      Conservative (50% Bonds / 30% Stocks / 20% Other)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="years">Time Range</Label>
                <Select
                  value={years}
                  onValueChange={setYears}
                  disabled={generating}
                >
                  <SelectTrigger id="years">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 Years</SelectItem>
                    <SelectItem value="5">5 Years (Recommended)</SelectItem>
                    <SelectItem value="10">10 Years</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Options</Label>
              <div className="flex flex-col gap-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="international"
                    checked={includeInternational}
                    onCheckedChange={(checked) =>
                      setIncludeInternational(checked as boolean)
                    }
                    disabled={generating}
                  />
                  <label
                    htmlFor="international"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Include International Assets
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="dividends"
                    checked={includeDividends}
                    onCheckedChange={(checked) =>
                      setIncludeDividends(checked as boolean)
                    }
                    disabled={generating}
                  />
                  <label
                    htmlFor="dividends"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Include Dividend Payments
                  </label>
                </div>
              </div>
            </div>

            {generating && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {progressMessage}
                  </span>
                  <span className="font-medium">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            <Button
              onClick={handleGenerateHistorical}
              disabled={generating || generated}
              className="w-full"
              size="lg"
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {progressMessage || 'Generating...'}
                </>
              ) : generated ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Done! Redirecting...
                </>
              ) : (
                <>
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Generate Historical Portfolio
                </>
              )}
            </Button>

            {!generating && (
              <p className="text-xs text-muted-foreground">
                This will generate {years} years of daily data (~
                {parseInt(years) * 365} snapshots) with realistic market
                movements. Generation takes approximately 30-60 seconds.
              </p>
            )}
          </div>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold">
            Create Portfolio Dialog
          </h2>
          <CreatePortfolioDialog />
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold">Add Transaction Dialog</h2>
          <AddTransactionDialog />
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold">Basic Button Test</h2>
          <Button onClick={() => alert('Basic button works!')}>
            Test Basic Button
          </Button>
        </div>
      </div>
    </div>
  );
}
