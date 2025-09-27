import { Decimal } from 'decimal.js';

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Yahoo Finance API Types
export interface YahooQuoteResponse {
  symbol: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketTime: string;
  currency: string;
  marketState: 'PRE' | 'REGULAR' | 'POST' | 'CLOSED';
  regularMarketVolume?: number;
  bid?: number;
  ask?: number;
  fiftyTwoWeekLow?: number;
  fiftyTwoWeekHigh?: number;
  marketCap?: number;
  shortName?: string;
  longName?: string;
  financialCurrency?: string;
  exchangeTimezoneName?: string;
  exchangeTimezoneShortName?: string;
}

export interface YahooHistoricalResponse {
  symbol: string;
  historical: HistoricalDataPoint[];
}

export interface HistoricalDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  adjClose: number;
  volume: number;
}

// CoinGecko API Types
export interface CoinGeckoPriceResponse {
  [coinId: string]: {
    usd: number;
    usd_24h_change: number;
    usd_24h_vol?: number;
    usd_market_cap?: number;
    last_updated_at: number;
  };
}

export interface CoinGeckoMarketChart {
  prices: [number, number][];
  market_caps: [number, number][];
  total_volumes: [number, number][];
}

export interface CoinGeckoCoinInfo {
  id: string;
  symbol: string;
  name: string;
  image: {
    thumb: string;
    small: string;
    large: string;
  };
  market_cap_rank?: number;
  current_price?: number;
  market_cap?: number;
  total_volume?: number;
  price_change_24h?: number;
  price_change_percentage_24h?: number;
  description?: {
    en: string;
  };
  homepage?: string[];
}

// Alpha Vantage API Types
export interface AlphaVantageQuoteResponse {
  'Global Quote': {
    '01. symbol': string;
    '02. open': string;
    '03. high': string;
    '04. low': string;
    '05. price': string;
    '06. volume': string;
    '07. latest trading day': string;
    '08. previous close': string;
    '09. change': string;
    '10. change percent': string;
  };
}

export interface AlphaVantageTimeSeriesResponse {
  'Meta Data': {
    '1. Information': string;
    '2. Symbol': string;
    '3. Last Refreshed': string;
    '4. Output Size': string;
    '5. Time Zone': string;
  };
  'Time Series (Daily)': {
    [date: string]: {
      '1. open': string;
      '2. high': string;
      '3. low': string;
      '4. close': string;
      '5. adjusted close': string;
      '6. volume': string;
      '7. dividend amount': string;
      '8. split coefficient': string;
    };
  };
}

// Generic Price Service Types
export interface PriceServiceConfig {
  yahoo: {
    enabled: boolean;
    baseUrl: string;
    timeout: number;
  };
  alphaVantage: {
    enabled: boolean;
    apiKey?: string;
    baseUrl: string;
    timeout: number;
    callsPerMinute: number;
  };
  coinGecko: {
    enabled: boolean;
    apiKey?: string;
    baseUrl: string;
    timeout: number;
    callsPerMinute: number;
  };
}

export interface PriceFetchRequest {
  symbols: string[];
  source?: 'yahoo' | 'alphaVantage' | 'coinGecko' | 'auto';
  currency?: string;
  includeHistory?: boolean;
  historyPeriod?: '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '2y' | '5y' | 'max';
}

export interface PriceFetchResult {
  symbol: string;
  price: Decimal;
  change: Decimal;
  changePercent: number;
  currency: string;
  timestamp: Date;
  source: string;
  success: boolean;
  error?: string;
  marketState?: string;
  volume?: number;
  history?: HistoricalDataPoint[];
}

export interface BatchPriceFetchResult {
  results: PriceFetchResult[];
  errors: string[];
  timestamp: Date;
  source: string;
  requestDuration: number;
}

// Search and Discovery Types
export interface AssetSearchRequest {
  query: string;
  type?: string[];
  exchange?: string[];
  currency?: string;
  limit?: number;
}

export interface AssetSearchResult {
  symbol: string;
  name: string;
  type: string;
  exchange?: string;
  currency: string;
  logo?: string;
  description?: string;
  marketCap?: number;
  relevanceScore: number;
}

// Rate Limiting and Caching
export interface RateLimitStatus {
  service: string;
  remaining: number;
  resetTime: Date;
  limit: number;
}

export interface CacheStatus {
  key: string;
  expiresAt: Date;
  size: number;
  hitCount: number;
  missCount: number;
}