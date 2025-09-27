# Portfolio Tracker - Implementation Guide

## Quick Start

### Prerequisites
- Node.js 18+ and npm 9+
- Git
- Code editor (VS Code recommended)
- Basic knowledge of React and TypeScript

### Initial Setup

```bash
# Clone and setup
git clone https://github.com/yourusername/portfolio-tracker.git
cd portfolio-tracker

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local

# Run development server
npm run dev

# Open http://localhost:3000
```

---

## Step-by-Step Implementation

### Phase 1: Project Foundation (Week 1-2)

#### 1.1 Initialize Next.js Project

```bash
# Create Next.js app with TypeScript and Tailwind
npx create-next-app@latest portfolio-tracker \
  --typescript \
  --tailwind \
  --app \
  --src-dir \
  --import-alias "@/*"

cd portfolio-tracker

# Install core dependencies
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu \
  @radix-ui/react-label @radix-ui/react-select @radix-ui/react-slot \
  @radix-ui/react-tabs @radix-ui/react-toast

# Install utility libraries
npm install clsx tailwind-merge class-variance-authority \
  lucide-react date-fns decimal.js zustand \
  react-hook-form @hookform/resolvers zod

# Install chart libraries
npm install recharts tremor

# Install data handling
npm install dexie papaparse

# Development dependencies
npm install -D @types/node @types/papaparse \
  prettier eslint-config-prettier husky lint-staged
```

#### 1.2 Setup shadcn/ui

```bash
# Initialize shadcn/ui
npx shadcn-ui@latest init

# Install components
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add form
npx shadcn-ui@latest add input
npx shadcn-ui@latest add label
npx shadcn-ui@latest add select
npx shadcn-ui@latest add table
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add toast
```

#### 1.3 Configure Project Structure

```typescript
// src/lib/utils.ts
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatPercentage(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}
```

#### 1.4 Setup Database Layer

```typescript
// src/lib/db/schema.ts
import Dexie, { Table } from 'dexie'
import { Decimal } from 'decimal.js'

export interface Portfolio {
  id?: string
  name: string
  type: 'taxable' | 'ira' | '401k' | 'roth'
  currency: string
  createdAt: Date
  updatedAt: Date
}

export interface Asset {
  id?: string
  symbol: string
  name: string
  type: 'stock' | 'etf' | 'crypto' | 'bond' | 'real_estate' | 'commodity'
  exchange?: string
  currency: string
  currentPrice?: number
  priceUpdatedAt?: Date
}

export interface Holding {
  id?: string
  portfolioId: string
  assetId: string
  quantity: string // Store as string for Decimal precision
  costBasis: string
  createdAt: Date
  updatedAt: Date
}

export interface Transaction {
  id?: string
  portfolioId: string
  assetId: string
  type: 'buy' | 'sell' | 'dividend' | 'split' | 'transfer'
  date: Date
  quantity: string
  price: string
  fees: string
  notes?: string
}

// Database class
export class PortfolioDatabase extends Dexie {
  portfolios!: Table<Portfolio>
  assets!: Table<Asset>
  holdings!: Table<Holding>
  transactions!: Table<Transaction>

  constructor() {
    super('PortfolioTracker')

    this.version(1).stores({
      portfolios: '++id, name, type, createdAt',
      assets: '++id, symbol, name, type',
      holdings: '++id, portfolioId, assetId, [portfolioId+assetId]',
      transactions: '++id, portfolioId, assetId, date, type'
    })
  }
}

export const db = new PortfolioDatabase()
```

#### 1.5 Create State Management

```typescript
// src/lib/stores/portfolio-store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Portfolio, Asset, Holding, Transaction } from '@/lib/db/schema'

interface PortfolioState {
  // Current selections
  currentPortfolioId: string | null
  selectedAssetId: string | null

  // Data
  portfolios: Portfolio[]
  assets: Asset[]
  holdings: Holding[]
  transactions: Transaction[]

  // Price data
  prices: Map<string, number>
  lastPriceUpdate: Date | null

  // Actions
  setCurrentPortfolio: (id: string | null) => void
  loadPortfolioData: () => Promise<void>
  addTransaction: (transaction: Transaction) => Promise<void>
  updatePrices: () => Promise<void>

  // Calculations
  getTotalValue: () => number
  getTotalGain: () => number
  getDayChange: () => number
}

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentPortfolioId: null,
      selectedAssetId: null,
      portfolios: [],
      assets: [],
      holdings: [],
      transactions: [],
      prices: new Map(),
      lastPriceUpdate: null,

      // Actions
      setCurrentPortfolio: (id) => set({ currentPortfolioId: id }),

      loadPortfolioData: async () => {
        // Load data from IndexedDB
        const { db } = await import('@/lib/db/schema')
        const portfolios = await db.portfolios.toArray()
        const assets = await db.assets.toArray()
        const holdings = await db.holdings.toArray()
        const transactions = await db.transactions.toArray()

        set({ portfolios, assets, holdings, transactions })
      },

      addTransaction: async (transaction) => {
        const { db } = await import('@/lib/db/schema')
        await db.transactions.add(transaction)
        await get().loadPortfolioData()
      },

      updatePrices: async () => {
        // Implement price fetching logic
        const assets = get().assets
        const prices = new Map<string, number>()

        // Fetch prices from API
        for (const asset of assets) {
          try {
            const price = await fetchAssetPrice(asset.symbol)
            prices.set(asset.id!, price)
          } catch (error) {
            console.error(`Failed to fetch price for ${asset.symbol}`, error)
          }
        }

        set({ prices, lastPriceUpdate: new Date() })
      },

      // Calculations
      getTotalValue: () => {
        const { holdings, prices } = get()
        return holdings.reduce((total, holding) => {
          const price = prices.get(holding.assetId) || 0
          const quantity = parseFloat(holding.quantity)
          return total + (price * quantity)
        }, 0)
      },

      getTotalGain: () => {
        const { holdings, prices } = get()
        return holdings.reduce((total, holding) => {
          const price = prices.get(holding.assetId) || 0
          const quantity = parseFloat(holding.quantity)
          const costBasis = parseFloat(holding.costBasis)
          const currentValue = price * quantity
          return total + (currentValue - costBasis)
        }, 0)
      },

      getDayChange: () => {
        // Implement day change calculation
        return 0 // Placeholder
      }
    }),
    {
      name: 'portfolio-storage',
      partialize: (state) => ({
        currentPortfolioId: state.currentPortfolioId,
        lastPriceUpdate: state.lastPriceUpdate,
      })
    }
  )
)

// Helper function for price fetching
async function fetchAssetPrice(symbol: string): Promise<number> {
  // Implement actual API call
  const response = await fetch(`/api/prices/${symbol}`)
  const data = await response.json()
  return data.price
}
```

### Phase 2: Core Components (Week 3-4)

#### 2.1 Dashboard Component

```tsx
// src/app/(dashboard)/page.tsx
'use client'

import { useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { usePortfolioStore } from '@/lib/stores/portfolio-store'
import { formatCurrency, formatPercentage } from '@/lib/utils'
import { PortfolioChart } from '@/components/charts/portfolio-chart'
import { AllocationDonut } from '@/components/charts/allocation-donut'
import { HoldingsTable } from '@/components/tables/holdings-table'
import { Plus, Download, TrendingUp } from 'lucide-react'

export default function DashboardPage() {
  const {
    getTotalValue,
    getTotalGain,
    getDayChange,
    loadPortfolioData,
    updatePrices
  } = usePortfolioStore()

  useEffect(() => {
    loadPortfolioData()
    updatePrices()
  }, [])

  const totalValue = getTotalValue()
  const totalGain = getTotalGain()
  const totalGainPercent = totalValue > 0 ? (totalGain / (totalValue - totalGain)) * 100 : 0
  const dayChange = getDayChange()
  const dayChangePercent = totalValue > 0 ? (dayChange / totalValue) * 100 : 0

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalValue)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Gain/Loss
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <span className={totalGain >= 0 ? 'text-green-600' : 'text-red-600'}>
                {formatCurrency(totalGain)}
              </span>
              <span className="text-sm text-muted-foreground ml-2">
                ({formatPercentage(totalGainPercent)})
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Day Change
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <span className={dayChange >= 0 ? 'text-green-600' : 'text-red-600'}>
                {formatCurrency(dayChange)}
              </span>
              <span className="text-sm text-muted-foreground ml-2">
                ({formatPercentage(dayChangePercent)})
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
            <Button size="sm" variant="outline">
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
            <Button size="sm" variant="outline">
              <TrendingUp className="h-4 w-4 mr-1" />
              Analyze
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Portfolio Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <PortfolioChart />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Asset Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            <AllocationDonut />
          </CardContent>
        </Card>
      </div>

      {/* Holdings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Holdings</CardTitle>
        </CardHeader>
        <CardContent>
          <HoldingsTable />
        </CardContent>
      </Card>
    </div>
  )
}
```

#### 2.2 Add Transaction Form

```tsx
// src/components/forms/add-transaction.tsx
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { usePortfolioStore } from '@/lib/stores/portfolio-store'

const transactionSchema = z.object({
  type: z.enum(['buy', 'sell', 'dividend', 'split', 'transfer']),
  assetSymbol: z.string().min(1, 'Asset symbol is required'),
  date: z.date({
    required_error: 'Transaction date is required',
  }),
  quantity: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: 'Quantity must be a positive number',
  }),
  price: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
    message: 'Price must be a non-negative number',
  }),
  fees: z.string().optional(),
  notes: z.string().optional(),
})

type TransactionFormValues = z.infer<typeof transactionSchema>

export function AddTransactionDialog() {
  const [open, setOpen] = useState(false)
  const { addTransaction, currentPortfolioId } = usePortfolioStore()

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: 'buy',
      assetSymbol: '',
      date: new Date(),
      quantity: '',
      price: '',
      fees: '0',
      notes: '',
    },
  })

  async function onSubmit(data: TransactionFormValues) {
    if (!currentPortfolioId) {
      alert('Please select a portfolio first')
      return
    }

    try {
      // Find or create asset
      // This is simplified - in real app, you'd search for existing asset first
      const assetId = crypto.randomUUID()

      await addTransaction({
        portfolioId: currentPortfolioId,
        assetId,
        type: data.type,
        date: data.date,
        quantity: data.quantity,
        price: data.price,
        fees: data.fees || '0',
        notes: data.notes,
      })

      setOpen(false)
      form.reset()
    } catch (error) {
      console.error('Failed to add transaction', error)
      alert('Failed to add transaction')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add Transaction</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
          <DialogDescription>
            Add a new buy, sell, or dividend transaction to your portfolio
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transaction Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select transaction type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="buy">Buy</SelectItem>
                      <SelectItem value="sell">Sell</SelectItem>
                      <SelectItem value="dividend">Dividend</SelectItem>
                      <SelectItem value="split">Split</SelectItem>
                      <SelectItem value="transfer">Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="assetSymbol"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asset Symbol</FormLabel>
                  <FormControl>
                    <Input placeholder="AAPL" {...field} />
                  </FormControl>
                  <FormDescription>
                    Stock ticker, crypto symbol, or asset identifier
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'PPP')
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date('1900-01-01')
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input placeholder="100" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price per Share</FormLabel>
                    <FormControl>
                      <Input placeholder="150.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="fees"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fees (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional notes..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Add Transaction</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
```

#### 2.3 Portfolio Chart Component

```tsx
// src/components/charts/portfolio-chart.tsx
'use client'

import { useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatCurrency } from '@/lib/utils'

// Mock data - replace with real data from store
const generateMockData = (days: number) => {
  const data = []
  const baseValue = 100000
  const today = new Date()

  for (let i = days; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)

    // Generate random walk
    const change = (Math.random() - 0.48) * 0.02 // Slight upward bias
    const value = baseValue * (1 + change) ** (days - i)

    data.push({
      date: date.toISOString().split('T')[0],
      value: Math.round(value),
    })
  }

  return data
}

type TimePeriod = '1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL'

const periodDays: Record<TimePeriod, number> = {
  '1D': 1,
  '1W': 7,
  '1M': 30,
  '3M': 90,
  '1Y': 365,
  'ALL': 365 * 5,
}

export function PortfolioChart() {
  const [period, setPeriod] = useState<TimePeriod>('1M')
  const data = generateMockData(periodDays[period])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload[0]) {
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-sm font-bold">
            {formatCurrency(payload[0].value)}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Performance</h3>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as TimePeriod)}>
          <TabsList>
            <TabsTrigger value="1D">1D</TabsTrigger>
            <TabsTrigger value="1W">1W</TabsTrigger>
            <TabsTrigger value="1M">1M</TabsTrigger>
            <TabsTrigger value="3M">3M</TabsTrigger>
            <TabsTrigger value="1Y">1Y</TabsTrigger>
            <TabsTrigger value="ALL">ALL</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="date"
            className="text-xs"
            tickFormatter={(value) => {
              const date = new Date(value)
              if (period === '1D') {
                return date.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit'
                })
              }
              return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
              })
            }}
          />
          <YAxis
            className="text-xs"
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#colorValue)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
```

### Phase 3: Price Integration (Week 5-6)

#### 3.1 Price API Routes

```typescript
// src/app/api/prices/[symbol]/route.ts
import { NextRequest, NextResponse } from 'next/server'

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const priceCache = new Map<string, { price: number; timestamp: number }>()

export async function GET(
  request: NextRequest,
  { params }: { params: { symbol: string } }
) {
  const { symbol } = params

  // Check cache first
  const cached = priceCache.get(symbol)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return NextResponse.json({
      symbol,
      price: cached.price,
      cached: true
    })
  }

  try {
    // Yahoo Finance API via proxy
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`
    const response = await fetch(yahooUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch price for ${symbol}`)
    }

    const data = await response.json()
    const price = data.chart.result[0].meta.regularMarketPrice

    // Update cache
    priceCache.set(symbol, { price, timestamp: Date.now() })

    return NextResponse.json({
      symbol,
      price,
      cached: false
    })
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error)

    // Try alternative sources
    try {
      const alternativePrice = await fetchAlternativePrice(symbol)
      return NextResponse.json({
        symbol,
        price: alternativePrice,
        source: 'alternative'
      })
    } catch (altError) {
      return NextResponse.json(
        { error: 'Failed to fetch price', symbol },
        { status: 500 }
      )
    }
  }
}

async function fetchAlternativePrice(symbol: string): Promise<number> {
  // Implement alternative price sources
  // Alpha Vantage, IEX Cloud, etc.

  // For crypto, use CoinGecko
  if (isCrypto(symbol)) {
    const coinId = getCoinGeckoId(symbol)
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`
    )
    const data = await response.json()
    return data[coinId].usd
  }

  throw new Error('No alternative price source available')
}

function isCrypto(symbol: string): boolean {
  const cryptoSymbols = ['BTC', 'ETH', 'USDT', 'BNB', 'SOL', 'XRP']
  return cryptoSymbols.includes(symbol.toUpperCase())
}

function getCoinGeckoId(symbol: string): string {
  const mapping: Record<string, string> = {
    'BTC': 'bitcoin',
    'ETH': 'ethereum',
    'USDT': 'tether',
    'BNB': 'binancecoin',
    'SOL': 'solana',
    'XRP': 'ripple',
  }
  return mapping[symbol.toUpperCase()] || symbol.toLowerCase()
}
```

#### 3.2 CSV Import Service

```typescript
// src/lib/services/csv-import.ts
import Papa from 'papaparse'
import { z } from 'zod'
import { Transaction } from '@/lib/db/schema'

// CSV row schema
const csvRowSchema = z.object({
  Date: z.string(),
  Symbol: z.string(),
  Type: z.enum(['Buy', 'Sell', 'Dividend', 'Split', 'Transfer']),
  Quantity: z.string(),
  Price: z.string(),
  Fees: z.string().optional(),
  Notes: z.string().optional(),
})

export interface ImportResult {
  success: number
  failed: number
  errors: Array<{ row: number; message: string }>
}

export async function importTransactionsFromCSV(
  file: File,
  portfolioId: string
): Promise<ImportResult> {
  return new Promise((resolve) => {
    const result: ImportResult = {
      success: 0,
      failed: 0,
      errors: [],
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        for (let i = 0; i < results.data.length; i++) {
          try {
            const row = results.data[i]
            const validated = csvRowSchema.parse(row)

            // Convert CSV data to transaction format
            const transaction: Transaction = {
              portfolioId,
              assetId: await getOrCreateAssetId(validated.Symbol),
              type: validated.Type.toLowerCase() as Transaction['type'],
              date: new Date(validated.Date),
              quantity: validated.Quantity,
              price: validated.Price,
              fees: validated.Fees || '0',
              notes: validated.Notes,
            }

            // Save to database
            await saveTransaction(transaction)
            result.success++
          } catch (error) {
            result.failed++
            result.errors.push({
              row: i + 1,
              message: error instanceof Error ? error.message : 'Unknown error',
            })
          }
        }

        resolve(result)
      },
      error: (error) => {
        resolve({
          success: 0,
          failed: 0,
          errors: [{ row: 0, message: error.message }],
        })
      },
    })
  })
}

async function getOrCreateAssetId(symbol: string): Promise<string> {
  // Check if asset exists in database
  // If not, create it
  // Return asset ID
  return crypto.randomUUID() // Placeholder
}

async function saveTransaction(transaction: Transaction): Promise<void> {
  // Save to IndexedDB
  const { db } = await import('@/lib/db/schema')
  await db.transactions.add(transaction)
}
```

---

## Testing Implementation

### Unit Tests

```typescript
// src/lib/calculations.test.ts
import { describe, it, expect } from 'vitest'
import { Decimal } from 'decimal.js'
import {
  calculateTotalValue,
  calculateGainLoss,
  calculateAllocation,
  calculateTaxLiability,
} from '@/lib/calculations'

describe('Portfolio Calculations', () => {
  describe('calculateTotalValue', () => {
    it('should calculate correct total value', () => {
      const holdings = [
        { quantity: new Decimal(100), currentPrice: new Decimal(150) },
        { quantity: new Decimal(50), currentPrice: new Decimal(200) },
      ]

      const result = calculateTotalValue(holdings)
      expect(result.toString()).toBe('25000')
    })

    it('should handle empty holdings', () => {
      const result = calculateTotalValue([])
      expect(result.toString()).toBe('0')
    })
  })

  describe('calculateGainLoss', () => {
    it('should calculate gain correctly', () => {
      const costBasis = new Decimal(10000)
      const currentValue = new Decimal(12500)

      const result = calculateGainLoss(costBasis, currentValue)
      expect(result.amount.toString()).toBe('2500')
      expect(result.percentage.toFixed(2)).toBe('25.00')
    })

    it('should calculate loss correctly', () => {
      const costBasis = new Decimal(10000)
      const currentValue = new Decimal(8500)

      const result = calculateGainLoss(costBasis, currentValue)
      expect(result.amount.toString()).toBe('-1500')
      expect(result.percentage.toFixed(2)).toBe('-15.00')
    })
  })
})
```

### E2E Tests

```typescript
// tests/e2e/portfolio.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Portfolio Management', () => {
  test('should add a new transaction', async ({ page }) => {
    await page.goto('/')

    // Open add transaction dialog
    await page.click('button:has-text("Add Transaction")')

    // Fill in transaction details
    await page.fill('input[name="assetSymbol"]', 'AAPL')
    await page.fill('input[name="quantity"]', '100')
    await page.fill('input[name="price"]', '150.00')

    // Submit form
    await page.click('button:has-text("Add Transaction")')

    // Verify transaction appears in table
    await expect(page.locator('text=AAPL')).toBeVisible()
    await expect(page.locator('text=100 shares')).toBeVisible()
  })

  test('should import CSV file', async ({ page }) => {
    await page.goto('/')

    // Open import dialog
    await page.click('button:has-text("Import CSV")')

    // Upload file
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('tests/fixtures/transactions.csv')

    // Confirm import
    await page.click('button:has-text("Import")')

    // Wait for success message
    await expect(page.locator('text=Import successful')).toBeVisible()
  })

  test('should update prices in real-time', async ({ page }) => {
    await page.goto('/')

    // Initial value
    const initialValue = await page.locator('[data-testid="total-value"]').textContent()

    // Wait for price update (5 seconds)
    await page.waitForTimeout(5000)

    // Check if value changed
    const updatedValue = await page.locator('[data-testid="total-value"]').textContent()
    expect(updatedValue).not.toBe(initialValue)
  })
})
```

---

## Deployment Configuration

### Docker Setup

```dockerfile
# Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

### Vercel Configuration

```json
// vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "env": {
    "NEXT_PUBLIC_APP_URL": "@app_url",
    "YAHOO_API_KEY": "@yahoo_api_key",
    "ALPHA_VANTAGE_KEY": "@alpha_vantage_key"
  }
}
```

### GitHub Actions CI/CD

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'npm'

      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm run test
      - run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v3
      - uses: vercel/action@v23
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

---

## Common Issues & Solutions

### Issue: CORS errors when fetching prices
```typescript
// Solution: Use Next.js API routes as proxy
// src/app/api/proxy/route.ts
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const targetUrl = url.searchParams.get('url')

  if (!targetUrl) {
    return new Response('Missing URL parameter', { status: 400 })
  }

  const response = await fetch(targetUrl)
  const data = await response.text()

  return new Response(data, {
    headers: {
      'Content-Type': response.headers.get('Content-Type') || 'text/plain',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
```

### Issue: IndexedDB storage quota exceeded
```typescript
// Solution: Implement data cleanup and archiving
async function cleanupOldData() {
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  // Delete old price history
  await db.priceHistory
    .where('date')
    .below(sixMonthsAgo)
    .delete()

  // Archive old transactions
  const oldTransactions = await db.transactions
    .where('date')
    .below(sixMonthsAgo)
    .toArray()

  // Export to JSON and save to file
  const blob = new Blob([JSON.stringify(oldTransactions)], {
    type: 'application/json',
  })

  // Trigger download
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `archive-${sixMonthsAgo.toISOString()}.json`
  a.click()

  // Delete from database
  await db.transactions
    .where('date')
    .below(sixMonthsAgo)
    .delete()
}
```

---

## Next Steps & Enhancements

### Immediate Next Steps (Post-MVP)
1. **Enhanced Analytics**: Monte Carlo simulations, correlation analysis
2. **Tax Optimization**: Tax loss harvesting suggestions
3. **Mobile App**: React Native or PWA enhancement
4. **Cloud Sync**: Optional encrypted cloud backup
5. **AI Insights**: GPT-powered portfolio analysis

### Performance Optimizations
1. **Virtual Scrolling**: For large transaction lists
2. **Web Workers**: For heavy calculations
3. **Service Worker**: For offline functionality
4. **Image Optimization**: Asset logos and charts
5. **Code Splitting**: Dynamic imports for routes

### Security Enhancements
1. **Local Encryption**: AES-256 for stored data
2. **Biometric Auth**: For mobile devices
3. **2FA**: For cloud sync features
4. **API Rate Limiting**: Prevent abuse
5. **Input Sanitization**: XSS prevention