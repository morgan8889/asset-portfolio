'use client';

import { useState } from 'react';
import { Decimal } from 'decimal.js';
import { AddTransactionDialog } from '@/components/forms/add-transaction';
import { CreatePortfolioDialog } from '@/components/forms/create-portfolio';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/db/schema';
import { Loader2, CheckCircle, Trash2 } from 'lucide-react';

async function seedMockData() {
  // Create a demo portfolio
  const portfolioId = crypto.randomUUID();
  await db.portfolios.add({
    id: portfolioId,
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
    { id: 'AAPL', symbol: 'AAPL', name: 'Apple Inc.', type: 'stock' as const, sector: 'Technology' },
    { id: 'GOOGL', symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'stock' as const, sector: 'Technology' },
    { id: 'MSFT', symbol: 'MSFT', name: 'Microsoft Corp.', type: 'stock' as const, sector: 'Technology' },
    { id: 'AMZN', symbol: 'AMZN', name: 'Amazon.com Inc.', type: 'stock' as const, sector: 'Consumer' },
    { id: 'VTI', symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', type: 'etf' as const, sector: 'Broad Market' },
    { id: 'BTC', symbol: 'BTC', name: 'Bitcoin', type: 'crypto' as const, sector: 'Cryptocurrency' },
  ];

  const prices: Record<string, number> = {
    AAPL: 178.50,
    GOOGL: 141.25,
    MSFT: 378.90,
    AMZN: 178.75,
    VTI: 245.30,
    BTC: 43250.00,
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
    { assetId: 'AAPL', quantity: 50, avgCost: 145.00, currentPrice: 178.50 },
    { assetId: 'GOOGL', quantity: 30, avgCost: 125.50, currentPrice: 141.25 },
    { assetId: 'MSFT', quantity: 25, avgCost: 320.00, currentPrice: 378.90 },
    { assetId: 'AMZN', quantity: 20, avgCost: 155.00, currentPrice: 178.75 },
    { assetId: 'VTI', quantity: 100, avgCost: 220.00, currentPrice: 245.30 },
    { assetId: 'BTC', quantity: 0.5, avgCost: 35000.00, currentPrice: 43250.00 },
  ];

  for (const h of holdings) {
    const quantity = new Decimal(h.quantity);
    const avgCost = new Decimal(h.avgCost);
    const currentPrice = new Decimal(h.currentPrice);
    const costBasis = quantity.mul(avgCost);
    const currentValue = quantity.mul(currentPrice);
    const unrealizedGain = currentValue.minus(costBasis);
    const unrealizedGainPercent = costBasis.isZero() ? 0 : unrealizedGain.dividedBy(costBasis).mul(100).toNumber();

    // Add transaction
    await db.transactions.add({
      id: crypto.randomUUID(),
      portfolioId,
      assetId: h.assetId,
      type: 'buy',
      date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000), // Random date in past year
      quantity,
      price: avgCost,
      totalAmount: costBasis,
      fees: new Decimal(0),
      currency: 'USD',
    });

    // Add holding
    await db.holdings.add({
      id: crypto.randomUUID(),
      portfolioId,
      assetId: h.assetId,
      quantity,
      costBasis,
      averageCost: avgCost,
      currentValue,
      unrealizedGain,
      unrealizedGainPercent,
      lots: [],
      lastUpdated: new Date(),
    });
  }

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

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Component Testing Page</h1>

      <div className="space-y-4">
        {/* Mock Data Section */}
        <div className="p-4 border rounded-lg bg-muted/50">
          <h2 className="text-lg font-semibold mb-2">Mock Data Generator</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Generate sample portfolio with stocks, ETFs, and crypto to test the dashboard.
          </p>
          <div className="flex gap-2">
            <Button onClick={handleSeed} disabled={seeding || seeded}>
              {seeding ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : seeded ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Done! Redirecting...
                </>
              ) : (
                'Generate Mock Data'
              )}
            </Button>
            <Button variant="destructive" onClick={handleClear} disabled={clearing}>
              {clearing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Clear All Data
            </Button>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Create Portfolio Dialog</h2>
          <CreatePortfolioDialog />
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Add Transaction Dialog</h2>
          <AddTransactionDialog />
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Basic Button Test</h2>
          <Button onClick={() => alert('Basic button works!')}>
            Test Basic Button
          </Button>
        </div>
      </div>
    </div>
  );
}
