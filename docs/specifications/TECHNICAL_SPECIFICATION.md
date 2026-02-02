---
Last Updated: 2026-02-02
Status: Active
Accuracy: 90%
Audience: Developers, Architects
Related Features: All (comprehensive technical overview)
---

# Portfolio Tracker - Technical Specification Document

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Implementation Status](#implementation-status)
3. [System Architecture](#system-architecture)
4. [Data Models](#data-models)
5. [API Specifications](#api-specifications)
6. [User Interface Design](#user-interface-design)
7. [Security & Privacy](#security--privacy)
8. [Performance Requirements](#performance-requirements)
9. [Testing Strategy](#testing-strategy)
10. [Deployment Plan](#deployment-plan)
11. [Current Implementation Status](#current-implementation-status)

---

## Executive Summary

### Project Overview

A modern, privacy-first financial portfolio tracking application that enables users to monitor, analyze, and plan their investment portfolios across multiple asset classes with real-time data visualization and comprehensive tax tracking capabilities.

### Key Objectives

- **Multi-Asset Support**: Track stocks, ETFs, cryptocurrencies, bonds, real estate, and commodities
- **Privacy-First**: All financial data stored locally with no server-side storage
- **Real-Time Updates**: Live or near-live price feeds with automatic updates
- **Tax Intelligence**: Comprehensive cost basis tracking and tax optimization
- **Modern UI/UX**: Clean, intuitive interface with interactive visualizations
- **Cross-Platform**: Web-based responsive design with future mobile support

### Technology Stack

```yaml
Frontend:
  Framework: Next.js 14.2+ (App Router)
  Language: TypeScript 5.3+
  UI Components: shadcn/ui (Radix UI primitives)
  Styling: Tailwind CSS 3.4+
  State Management: Zustand 4.5+
  Charts: Recharts 2.15+ & Tremor 3.13+
  Forms: React Hook Form 7.48+ with Zod 3.22+
  Drag & Drop: @dnd-kit/core 6.3+, @dnd-kit/sortable 10.0+
  Dashboard Layouts: react-grid-layout

Data Layer:
  Local Storage: IndexedDB via Dexie.js 3.2+
  Price APIs: Yahoo Finance, Alpha Vantage, CoinGecko
  CSV Processing: PapaParse 5.4+
  Calculations: decimal.js 10.4+ (financial precision)
  Date Handling: date-fns 3.0+
  Export: jsPDF 4.0+, html2canvas 1.4+

Development:
  Build Tool: Next.js bundler
  Testing: Vitest 1.2+ & Playwright for E2E
  Linting: ESLint 8.56+ with Prettier 3.2+
  Git Hooks: Husky 9.0+ with lint-staged
  CI/CD: GitHub Actions (planned)
  Deployment: Vercel/Netlify/Self-hosted
```

**Status Legend**: ✅ Complete | 🔄 In Progress | 📋 Planned

---

## Implementation Status

**Last Updated**: 2026-02-02
**Overall Progress**: 70-80% Complete (Core features implemented, advanced features in progress)

**Quick Status**:

- ✅ **Database Layer**: Complete (Dexie.js with 8 tables, decimal.js serialization)
- ✅ **Service Layer**: Complete (comprehensive business logic services)
- ✅ **State Management**: Complete (Zustand stores with persist middleware)
- ✅ **Type System**: Complete (TypeScript strict mode with comprehensive types)
- ✅ **API Routes**: Complete (Yahoo Finance, CoinGecko, Alpha Vantage proxies)
- ✅ **UI Components**: Complete (shadcn/ui with custom financial components)
- ✅ **Charts**: Complete (Recharts with real portfolio data)
- ✅ **CSV Import**: Complete (PapaParse with tax field support)
- ✅ **Tax Reporting**: Complete (ESPP/RSU tracking, capital gains analysis)
- ✅ **Dashboard**: Complete (Responsive grid with drag-drop widgets)
- ✅ **Export Functionality**: Complete (PDF/CSV with jsPDF)
- 🔄 **Advanced Analytics**: Partial (Risk metrics, performance analytics implemented)

**For detailed implementation status**, see [PROJECT_STATUS.md](../PROJECT_STATUS.md)

**Known Gaps**:

1. Dashboard widgets use mock/placeholder data instead of real calculations
2. CSV import UI exists but backend parsing logic missing
3. Tax reporting service exists but no report generation or visualization
4. Charts display mock data instead of portfolio history
5. UI-service integration unverified (unclear if components call services)
6. Most dashboard routes are UI shells without functional data flow

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Client (Browser)                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  React UI    │  │  State Mgmt  │  │  Charts      │ │
│  │  Components  │◄─┤  (Zustand)   │◄─┤  (Recharts)  │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│           ▲               ▲                   ▲         │
│           └───────────────┴───────────────────┘         │
│                           │                              │
│  ┌──────────────────────────────────────────────────┐  │
│  │            Service Layer (TypeScript)             │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ • Portfolio Calculator  • Tax Engine              │  │
│  │ • Price Fetcher        • CSV Parser              │  │
│  │ • Data Validator       • Export Service          │  │
│  └──────────────────────────────────────────────────┘  │
│                           │                              │
│  ┌──────────────────────────────────────────────────┐  │
│  │         Data Persistence Layer                    │  │
│  ├──────────────────────────────────────────────────┤  │
│  │  IndexedDB (via Dexie.js)                        │  │
│  │  • Holdings  • Transactions  • Price Cache       │  │
│  │  • Portfolios  • Settings  • User Preferences    │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
└─────────────────────────┬───────────────────────────────┘
                         │
                         ▼
        ┌──────────────────────────────────┐
        │    External APIs (Optional)       │
        ├──────────────────────────────────┤
        │ • Yahoo Finance (Prices)          │
        │ • Alpha Vantage (Market Data)    │
        │ • CoinGecko (Crypto)             │
        │ • Exchange Rates API (Forex)     │
        └──────────────────────────────────┘
```

### Component Architecture

```
src/
├── app/                    # Next.js App Router
│   ├── (dashboard)/       # Dashboard routes
│   │   ├── page.tsx       # Main dashboard
│   │   ├── holdings/      # Holdings management
│   │   ├── transactions/  # Transaction history
│   │   └── analysis/      # Analytics views
│   ├── api/               # API routes (price fetching)
│   └── layout.tsx         # Root layout
│
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── charts/            # Chart components
│   │   ├── PortfolioChart.tsx
│   │   ├── AllocationDonut.tsx
│   │   └── PerformanceBar.tsx
│   ├── forms/             # Form components
│   │   ├── AddHolding.tsx
│   │   ├── ImportCSV.tsx
│   │   └── TransactionForm.tsx
│   └── layout/            # Layout components
│       ├── Header.tsx
│       ├── Sidebar.tsx
│       └── Footer.tsx
│
├── lib/
│   ├── services/          # Business logic
│   │   ├── portfolio.ts   # Portfolio calculations
│   │   ├── tax.ts         # Tax calculations
│   │   ├── prices.ts      # Price fetching
│   │   └── import.ts      # CSV import logic
│   ├── db/                # Database layer
│   │   ├── schema.ts      # DB schema
│   │   ├── queries.ts     # DB queries
│   │   └── migrations.ts  # Schema migrations
│   └── utils/             # Utility functions
│       ├── calculations.ts
│       ├── formatters.ts
│       └── validators.ts
│
├── types/                 # TypeScript definitions
│   ├── portfolio.ts
│   ├── transaction.ts
│   └── api.ts
│
└── styles/               # Global styles
    └── globals.css
```

---

## Data Models

### Core Entities

#### Portfolio

```typescript
interface Portfolio {
  id: string; // UUID
  name: string; // "Retirement", "Trading", etc.
  type: PortfolioType; // "taxable" | "ira" | "401k" | "roth"
  currency: string; // Base currency (USD default)
  createdAt: Date;
  updatedAt: Date;
  settings: PortfolioSettings;
  metadata?: Record<string, any>;
}

interface PortfolioSettings {
  rebalanceThreshold: number; // Percentage drift trigger
  taxStrategy: TaxStrategy; // "fifo" | "lifo" | "hifo" | "specific"
  benchmarkIndex?: string; // "SPY", "QQQ", etc.
  targetAllocations?: AllocationTarget[];
}
```

#### Asset

```typescript
interface Asset {
  id: string; // UUID
  symbol: string; // Ticker or identifier
  name: string; // Full name
  type: AssetType; // "stock" | "etf" | "crypto" | "bond" | "real_estate" | "commodity"
  exchange?: string; // "NYSE", "NASDAQ", etc.
  currency: string; // Trading currency
  sector?: string; // GICS sector
  currentPrice?: number; // Latest known price
  priceUpdatedAt?: Date; // Last price update
  metadata: AssetMetadata;
}

interface AssetMetadata {
  isin?: string; // International Securities ID
  cusip?: string; // CUSIP for US securities
  description?: string;
  website?: string;
  logo?: string;
  marketCap?: number;
  peRatio?: number;
  dividendYield?: number;
  beta?: number;
}
```

#### Holding

```typescript
interface Holding {
  id: string; // UUID
  portfolioId: string; // Reference to Portfolio
  assetId: string; // Reference to Asset
  quantity: Decimal; // Current shares/units owned
  costBasis: Decimal; // Total cost basis
  averageCost: Decimal; // Average cost per share
  currentValue: Decimal; // Current market value
  unrealizedGain: Decimal; // Current value - cost basis
  unrealizedGainPercent: number;
  lots: TaxLot[]; // Individual purchase lots
  lastUpdated: Date;
}

interface TaxLot {
  id: string;
  quantity: Decimal;
  purchasePrice: Decimal;
  purchaseDate: Date;
  soldQuantity: Decimal; // Partial sales tracking
  notes?: string;
}
```

#### Transaction

```typescript
interface Transaction {
  id: string; // UUID
  portfolioId: string;
  assetId: string;
  type: TransactionType; // "buy" | "sell" | "dividend" | "split" | "transfer"
  date: Date;
  quantity: Decimal;
  price: Decimal; // Price per unit
  totalAmount: Decimal; // Total transaction value
  fees: Decimal; // Commission and fees
  currency: string;
  taxLotId?: string; // For sells - specific lot
  notes?: string;
  importSource?: string; // CSV import tracking
  metadata?: Record<string, any>;
}

type TransactionType =
  | 'buy'
  | 'sell'
  | 'dividend'
  | 'interest'
  | 'split'
  | 'transfer_in'
  | 'transfer_out'
  | 'fee'
  | 'tax';
```

#### Price History

```typescript
interface PriceHistory {
  id: string;
  assetId: string;
  date: Date;
  open: Decimal;
  high: Decimal;
  low: Decimal;
  close: Decimal;
  adjustedClose: Decimal;
  volume: number;
  source: string; // API source
}

interface PriceSnapshot {
  assetId: string;
  price: Decimal;
  change: Decimal;
  changePercent: number;
  timestamp: Date;
  source: string;
}
```

### Database Schema (IndexedDB)

```typescript
// Dexie.js Schema Definition
class PortfolioDatabase extends Dexie {
  portfolios!: Table<Portfolio>;
  assets!: Table<Asset>;
  holdings!: Table<Holding>;
  transactions!: Table<Transaction>;
  priceHistory!: Table<PriceHistory>;
  priceSnapshots!: Table<PriceSnapshot>;
  userSettings!: Table<UserSettings>;

  constructor() {
    super('PortfolioTracker');

    this.version(1).stores({
      portfolios: '++id, name, type, createdAt',
      assets: '++id, symbol, name, type, exchange',
      holdings: '++id, portfolioId, assetId, [portfolioId+assetId]',
      transactions: '++id, portfolioId, assetId, date, type',
      priceHistory: '++id, assetId, date, [assetId+date]',
      priceSnapshots: '++id, assetId, timestamp',
      userSettings: '++id, key',
    });
  }
}
```

---

## API Specifications

### Price Data APIs

#### Yahoo Finance Integration

```typescript
interface YahooFinanceAPI {
  // Get current quote
  getQuote(symbol: string): Promise<{
    symbol: string;
    regularMarketPrice: number;
    regularMarketChange: number;
    regularMarketChangePercent: number;
    regularMarketTime: Date;
    currency: string;
    marketState: 'PRE' | 'REGULAR' | 'POST' | 'CLOSED';
  }>;

  // Get historical data
  getHistory(
    symbol: string,
    period: '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '2y' | '5y' | 'max'
  ): Promise<HistoricalData[]>;

  // Batch quotes
  getBatchQuotes(symbols: string[]): Promise<Map<string, Quote>>;
}

// Implementation using proxy to avoid CORS
const YAHOO_PROXY = '/api/yahoo-finance';

async function fetchYahooQuote(symbol: string) {
  const response = await fetch(`${YAHOO_PROXY}/quote/${symbol}`);
  return response.json();
}
```

#### CoinGecko Integration (Crypto)

```typescript
interface CoinGeckoAPI {
  // Get crypto prices
  getPrice(
    coinId: string,
    currency: string = 'usd'
  ): Promise<{
    [key: string]: {
      usd: number;
      usd_24h_change: number;
      last_updated_at: number;
    };
  }>;

  // Get historical data
  getMarketChart(
    coinId: string,
    currency: string,
    days: number
  ): Promise<{
    prices: [number, number][];
    market_caps: [number, number][];
    total_volumes: [number, number][];
  }>;
}
```

### Internal Service APIs

#### Portfolio Service

```typescript
class PortfolioService {
  // Calculate portfolio metrics
  async calculateMetrics(portfolioId: string): Promise<{
    totalValue: Decimal;
    totalCost: Decimal;
    totalGain: Decimal;
    totalGainPercent: number;
    dayChange: Decimal;
    dayChangePercent: number;
    allocation: AllocationBreakdown[];
    performance: PerformanceMetrics;
  }>;

  // Get portfolio history
  async getHistory(
    portfolioId: string,
    period: TimePeriod
  ): Promise<{
    dates: Date[];
    values: Decimal[];
    costs: Decimal[];
    gains: Decimal[];
  }>;

  // Rebalancing suggestions
  async getRebalancingSuggestions(portfolioId: string): Promise<RebalancingPlan>;
}
```

#### Tax Service

```typescript
class TaxService {
  // Calculate realized gains/losses
  async calculateRealizedGains(
    portfolioId: string,
    year: number
  ): Promise<{
    shortTermGains: Decimal;
    longTermGains: Decimal;
    shortTermLosses: Decimal;
    longTermLosses: Decimal;
    netGain: Decimal;
    taxableAmount: Decimal;
  }>;

  // Get tax lot details
  async getTaxLots(holdingId: string): Promise<TaxLotDetail[]>;

  // Tax loss harvesting opportunities
  async findHarvestingOpportunities(portfolioId: string): Promise<HarvestingOpportunity[]>;
}
```

---

## User Interface Design

### Design System

#### Color Palette

```css
:root {
  /* Light Mode */
  --background: 0 0% 100%; /* white */
  --foreground: 222.2 84% 4.9%; /* near black */

  --primary: 217 91% 60%; /* blue */
  --primary-foreground: 0 0% 98%;

  --secondary: 217 19% 95%; /* light gray */
  --secondary-foreground: 222.2 47% 11%;

  --success: 142 76% 36%; /* green */
  --danger: 0 84% 60%; /* red */
  --warning: 38 92% 50%; /* amber */
  --info: 199 89% 48%; /* cyan */

  --muted: 217 19% 95%;
  --muted-foreground: 215 16% 47%;

  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;

  --border: 214 32% 91%;
  --input: 214 32% 91%;
  --ring: 217 91% 60%;

  --radius: 0.5rem;
}

/* Dark Mode */
.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 0 0% 98%;

  --primary: 217 91% 60%;
  --primary-foreground: 222.2 84% 4.9%;

  --card: 222.2 84% 4.9%;
  --card-foreground: 0 0% 98%;

  --border: 217 32% 17%;
  --input: 217 32% 17%;
}
```

#### Typography Scale

```css
--font-sans: 'Inter', system-ui, -apple-system, sans-serif;
--font-mono: 'JetBrains Mono', monospace;

/* Font Sizes */
--text-xs: 0.75rem; /* 12px */
--text-sm: 0.875rem; /* 14px */
--text-base: 1rem; /* 16px */
--text-lg: 1.125rem; /* 18px */
--text-xl: 1.25rem; /* 20px */
--text-2xl: 1.5rem; /* 24px */
--text-3xl: 1.875rem; /* 30px */
--text-4xl: 2.25rem; /* 36px */

/* Font Weights */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

### Key Screens

#### Dashboard

```
┌────────────────────────────────────────────────────────────┐
│ ┌──────────────────────────────────────────────────────┐  │
│ │ Portfolio Tracker  [≡] [🔍] [🔔] [👤]              │  │
│ └──────────────────────────────────────────────────────┘  │
│                                                            │
│ ┌──────────────────────────────────────────────────────┐  │
│ │ Total Portfolio Value           Day Change            │  │
│ │ $125,430.22                    ▲ $1,247.33 (1.01%)  │  │
│ │                                                       │  │
│ │ ┌─────────────────────────────────────────────────┐ │  │
│ │ │                  [1D][1W][1M][3M][1Y][ALL]      │ │  │
│ │ │     📈 Interactive Line Chart                    │ │  │
│ │ │                                                  │ │  │
│ │ └─────────────────────────────────────────────────┘ │  │
│ └──────────────────────────────────────────────────────┘  │
│                                                            │
│ ┌───────────────────┐ ┌───────────────────┐              │
│ │ Asset Allocation  │ │ Top Performers    │              │
│ │                   │ │                   │              │
│ │ 🍩 Donut Chart   │ │ AAPL  ▲ 5.2%     │              │
│ │                   │ │ TSLA  ▲ 3.8%     │              │
│ │ Stocks    65%     │ │ BTC   ▲ 2.1%     │              │
│ │ Crypto    20%     │ │ NVDA  ▼ 1.2%     │              │
│ │ ETFs      15%     │ │ SPY   ▲ 0.8%     │              │
│ └───────────────────┘ └───────────────────┘              │
│                                                            │
│ ┌──────────────────────────────────────────────────────┐  │
│ │ Quick Actions                                         │  │
│ │ [+ Add Holding] [📥 Import CSV] [📊 Analysis]       │  │
│ └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

#### Holdings Table

```
┌────────────────────────────────────────────────────────────┐
│ Holdings                           [🔍 Search] [⚙️ Filter] │
├────────────────────────────────────────────────────────────┤
│ Symbol │ Name        │ Shares │ Value     │ Gain/Loss     │
├────────┼─────────────┼────────┼───────────┼───────────────┤
│ AAPL   │ Apple Inc.  │ 100    │ $19,500   │ ▲ $2,500 (15%)│
│ MSFT   │ Microsoft   │ 50     │ $18,750   │ ▲ $1,200 (7%) │
│ BTC    │ Bitcoin     │ 0.5    │ $21,500   │ ▼ $500 (-2%)  │
│ SPY    │ SPDR S&P    │ 25     │ $11,250   │ ▲ $750 (7%)   │
└────────────────────────────────────────────────────────────┘
```

### Component Library

#### Button Variants

```tsx
// Primary Action
<Button variant="default" size="default">
  Add Holding
</Button>

// Secondary Action
<Button variant="secondary" size="default">
  Export Data
</Button>

// Danger Action
<Button variant="destructive" size="default">
  Delete Portfolio
</Button>

// Icon Button
<Button variant="ghost" size="icon">
  <Settings className="h-4 w-4" />
</Button>
```

#### Form Components

```tsx
// Input with Label
<div className="space-y-2">
  <Label htmlFor="symbol">Stock Symbol</Label>
  <Input
    id="symbol"
    placeholder="AAPL"
    value={symbol}
    onChange={(e) => setSymbol(e.target.value)}
  />
</div>

// Select Dropdown
<Select value={type} onValueChange={setType}>
  <SelectTrigger>
    <SelectValue placeholder="Select asset type" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="stock">Stock</SelectItem>
    <SelectItem value="etf">ETF</SelectItem>
    <SelectItem value="crypto">Cryptocurrency</SelectItem>
  </SelectContent>
</Select>
```

#### Data Display Cards

```tsx
// Metric Card
<Card>
  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
    <CardTitle className="text-sm font-medium">Total Value</CardTitle>
    <DollarSign className="h-4 w-4 text-muted-foreground" />
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">$125,430.22</div>
    <p className="text-xs text-muted-foreground">+12.3% from last month</p>
  </CardContent>
</Card>
```

---

## Security & Privacy

### Data Protection

- **Local-First Architecture**: All sensitive data stored in browser IndexedDB
- **No Cloud Storage**: Financial data never leaves the user's device
- **Optional Encryption**: AES-256 encryption for stored data (user choice)
- **Secure Export**: Encrypted JSON exports with password protection

### Authentication (Future)

```typescript
interface SecurityConfig {
  localAuth: {
    enabled: boolean;
    method: 'pin' | 'password' | 'biometric';
  };
  encryption: {
    enabled: boolean;
    algorithm: 'AES-256-GCM';
    keyDerivation: 'PBKDF2';
  };
  sessionTimeout: number; // minutes
  autoLock: boolean;
}
```

### API Security

- **CORS Proxy**: Server-side proxy for external API calls
- **Rate Limiting**: Prevent API abuse
- **API Key Management**: Secure storage of user API keys
- **Request Validation**: Input sanitization and validation

---

## Performance Requirements

### Load Time Targets

- **Initial Load**: < 3 seconds (First Contentful Paint)
- **Time to Interactive**: < 5 seconds
- **Subsequent Loads**: < 1 second (with caching)

### Runtime Performance

- **Chart Rendering**: < 100ms for 1000 data points
- **Portfolio Calculation**: < 50ms for 100 holdings
- **Search/Filter**: < 20ms response time
- **Price Updates**: Batch process 100 symbols in < 10 seconds

### Optimization Strategies

```typescript
// Virtualization for large lists
import { FixedSizeList } from 'react-window';

// Memoization for expensive calculations
const portfolioMetrics = useMemo(() => calculateMetrics(holdings, prices), [holdings, prices]);

// Lazy loading for charts
const PortfolioChart = lazy(() => import('./charts/PortfolioChart'));

// Web Workers for heavy calculations
const worker = new Worker('/workers/calculator.js');
worker.postMessage({ holdings, transactions });
```

---

## Testing Strategy

### Test Coverage Requirements

- **Unit Tests**: 80% coverage minimum
- **Integration Tests**: Critical user flows
- **E2E Tests**: Key user journeys
- **Performance Tests**: Load time and runtime metrics

### Test Implementation

```typescript
// Unit Test Example
describe('Portfolio Calculator', () => {
  it('should calculate correct total value', () => {
    const holdings = [
      { quantity: 100, currentPrice: 150 },
      { quantity: 50, currentPrice: 200 },
    ];

    const result = calculateTotalValue(holdings);
    expect(result).toBe(25000);
  });

  it('should handle decimal precision correctly', () => {
    const result = calculateGainPercent(new Decimal('100.50'), new Decimal('95.25'));
    expect(result.toFixed(2)).toBe('5.51');
  });
});

// E2E Test Example
test('user can add a new holding', async ({ page }) => {
  await page.goto('/holdings');
  await page.click('button:has-text("Add Holding")');
  await page.fill('input[name="symbol"]', 'AAPL');
  await page.fill('input[name="quantity"]', '100');
  await page.fill('input[name="price"]', '150');
  await page.click('button:has-text("Save")');

  await expect(page.locator('text=AAPL')).toBeVisible();
  await expect(page.locator('text=$15,000')).toBeVisible();
});
```

---

## Deployment Plan

### Phase 1: Development Environment

```bash
# Local development setup
npm install
npm run dev

# Environment variables (.env.local)
NEXT_PUBLIC_YAHOO_API_KEY=xxx
NEXT_PUBLIC_ALPHA_VANTAGE_KEY=xxx
NEXT_PUBLIC_COINGECKO_KEY=xxx
```

### Phase 2: Staging Deployment

```yaml
# Vercel deployment config
{
  'buildCommand': 'npm run build',
  'outputDirectory': '.next',
  'devCommand': 'npm run dev',
  'installCommand': 'npm install',
  'framework': 'nextjs',
}
```

### Phase 3: Production Deployment

- **Option A**: Vercel (Recommended)
  - Automatic deployments from GitHub
  - Edge functions for API routes
  - Built-in analytics and monitoring

- **Option B**: Self-Hosted
  - Docker container deployment
  - Nginx reverse proxy
  - SSL via Let's Encrypt

---

## Current Implementation Status

**Last Updated**: 2026-01-24

### ✅ Phase 1: Foundation - **COMPLETE**

**Status**: Fully implemented and functional

- [x] Project setup and configuration
- [x] Design system implementation (shadcn/ui)
- [x] Basic routing and navigation (Next.js App Router)
- [x] Database schema and migrations (Dexie.js)
- [x] Core data models (TypeScript with strict mode)

**Evidence**: Complete database schema in `src/lib/db/schema.ts` with 8 tables, comprehensive type definitions in `src/types/`, working development environment.

### 🔄 Phase 2: Core Features - **IN PROGRESS**

**Status**: Services complete, UI integration incomplete

- [x] Holdings calculations (service layer complete)
- [x] Transaction management (form exists, database integration uncertain)
- [ ] CSV import functionality (UI exists, backend **missing**)
- [x] Basic portfolio calculations (8 services implemented)
- [x] Price fetching service (Yahoo Finance API route complete)

**Gaps**:

- CSV import backend not implemented despite UI button present
- Unclear if transaction forms actually save to database
- Service calculations not wired to UI components

**Evidence**: 8 services in `src/lib/services/`, transaction form in `src/components/forms/add-transaction.tsx`, API route at `src/app/api/prices/[symbol]/route.ts`.

### 🔄 Phase 3: Visualizations & Polish - **IN PROGRESS**

**Status**: Components exist, data integration missing

- [x] Chart components created (portfolio-chart.tsx, allocation-donut.tsx)
- [x] Dashboard UI implemented (page.tsx with layout)
- [ ] Real-time price updates (API exists, UI integration unclear)
- [x] Cost basis calculations (service logic complete)
- [ ] Tax reporting basics (service exists, visualization **missing**)

**Gaps**:

- Charts use `generateMockData()` instead of real portfolio history
- Dashboard widgets may display hardcoded values
- Tax reporting has no UI despite service logic existing

**Evidence**: Chart components in `src/components/charts/`, dashboard widgets in `src/components/dashboard/widgets/` (4 of 6 complete).

### 📋 Phase 4: Testing & Deployment - **PLANNED**

**Status**: Infrastructure exists, coverage unverified

- [x] Test infrastructure (Vitest + Playwright configured)
- [ ] Comprehensive testing (coverage target 70%, not verified)
- [x] Documentation (specs exist, accuracy mixed)
- [ ] Deployment setup (local dev only, production not configured)
- [ ] User acceptance testing (not started)

**Gaps**:

- Test coverage percentage unknown
- No production deployment configuration
- QA testing not performed

### 📋 Future Enhancements

**Current Focus** (Q1 2026):

- Documentation cleanup and standardization
- Code quality improvements (reducing duplication, improving type safety)
- E2E test coverage expansion (31 tests implemented)
- Production deployment preparation

**Planned Features** (Q2-Q3 2026):

**Advanced Analytics:**
- Monte Carlo simulations for retirement projections
- Correlation matrix for portfolio diversification
- Risk-adjusted return metrics (Sharpe, Sortino ratios)
- Factor analysis and attribution

**Multi-Currency Support:**
- Real-time forex conversion
- Multi-currency reporting
- Currency-specific tax rules
- Currency risk analysis

**Security Enhancements:**
- Local authentication (PIN/password/biometric)
- AES-256-GCM encryption for sensitive data
- Secure export with password protection
- Auto-lock and session management

**Production Features:**
- Security headers and CSP
- Performance optimization
- PWA support for offline use
- Automated backups with encryption

**Long-Term Vision** (2027+):

- Mobile app (React Native or PWA)
- Optional cloud sync (end-to-end encrypted)
- AI-powered portfolio insights
- Automated rebalancing recommendations
- Integration with brokerage APIs (read-only)

**For current implementation status**, see [PROJECT_STATUS.md](../PROJECT_STATUS.md)

---

## Appendices

### A. API Response Examples

```json
// Yahoo Finance Quote Response
{
  "symbol": "AAPL",
  "regularMarketPrice": 195.89,
  "regularMarketChange": 2.15,
  "regularMarketChangePercent": 1.11,
  "regularMarketTime": "2024-01-15T16:00:00.000Z",
  "currency": "USD"
}

// Portfolio Metrics Response
{
  "totalValue": "125430.22",
  "totalCost": "98500.00",
  "totalGain": "26930.22",
  "totalGainPercent": 27.34,
  "dayChange": "1247.33",
  "dayChangePercent": 1.01,
  "allocation": [
    { "type": "stock", "value": "81529.64", "percent": 65 },
    { "type": "crypto", "value": "25086.04", "percent": 20 },
    { "type": "etf", "value": "18814.53", "percent": 15 }
  ]
}
```

### B. CSV Import Format

```csv
Date,Symbol,Type,Quantity,Price,Fees,Notes
2024-01-01,AAPL,Buy,100,150.00,1.00,Initial purchase
2024-01-15,AAPL,Dividend,0,150.00,0,Q1 dividend
2024-02-01,BTC,Buy,0.5,42000.00,10.00,Crypto allocation
```

### C. Error Codes

```typescript
enum ErrorCode {
  // Data errors (1xxx)
  INVALID_SYMBOL = 1001,
  DUPLICATE_HOLDING = 1002,
  INSUFFICIENT_SHARES = 1003,

  // API errors (2xxx)
  API_RATE_LIMIT = 2001,
  API_UNAVAILABLE = 2002,
  API_AUTH_FAILED = 2003,

  // Calculation errors (3xxx)
  CALC_OVERFLOW = 3001,
  CALC_INVALID_INPUT = 3002,

  // Storage errors (4xxx)
  STORAGE_QUOTA_EXCEEDED = 4001,
  STORAGE_UNAVAILABLE = 4002,
}
```
