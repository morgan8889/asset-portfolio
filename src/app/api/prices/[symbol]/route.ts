import { NextRequest, NextResponse } from 'next/server';
import Decimal from 'decimal.js';
import { rateLimit } from '@/lib/utils/rate-limit';
import { validateSymbol, sanitizeInput } from '@/lib/utils/validation';
import { logger } from '@/lib/utils/logger';
import { isUKSymbol, convertPenceToPounds } from '@/lib/utils/market-utils';

// In-memory cache for price data (in production, use Redis)
const priceCache = new Map<string, {
  price: number;
  timestamp: number;
  source: string;
  metadata?: any;
}>();

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const MAX_RETRIES = 3;
const TIMEOUT_MS = 10000; // 10 seconds

interface PriceSource {
  name: string;
  fetch: (symbol: string) => Promise<{ price: number; metadata?: any }>;
  supports: (symbol: string) => boolean;
}

// Rate limiting configuration
const rateLimiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500, // Allow 500 unique requests per interval
});

// Yahoo Finance API wrapper with error handling
async function fetchYahooPrice(symbol: string): Promise<{ price: number; metadata?: any }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Portfolio-Tracker/1.0)',
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Yahoo Finance API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.chart?.result?.[0]?.meta?.regularMarketPrice) {
      throw new Error('Invalid response format from Yahoo Finance');
    }

    const result = data.chart.result[0];
    const rawPrice = result.meta.regularMarketPrice;
    const currency = result.meta.currency;
    const previousClose = result.meta.previousClose;

    // Convert pence to pounds for UK stocks quoted in GBp
    const priceDecimal = new Decimal(rawPrice);
    const { displayPrice, displayCurrency } = convertPenceToPounds(priceDecimal, currency);

    // Calculate change (also needs conversion for GBp)
    const changeRaw = rawPrice - previousClose;
    const changePercent = previousClose > 0 ? ((changeRaw / previousClose) * 100) : 0;

    const changeDecimal = new Decimal(changeRaw);
    const { displayPrice: displayChange } = convertPenceToPounds(changeDecimal, currency);

    return {
      price: displayPrice.toNumber(),
      metadata: {
        currency: displayCurrency,
        rawCurrency: currency, // Original currency (GBp or GBP)
        marketState: result.meta.marketState,
        regularMarketTime: result.meta.regularMarketTime,
        previousClose: currency === 'GBp' ? previousClose / 100 : previousClose,
        change: displayChange.toNumber(),
        changePercent: changePercent,
        exchangeName: result.meta.exchangeName,
        fullExchangeName: result.meta.fullExchangeName,
      },
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

// CoinGecko API for cryptocurrency prices
async function fetchCoinGeckoPrice(symbol: string): Promise<{ price: number; metadata?: any }> {
  const cryptoMapping: Record<string, string> = {
    'BTC': 'bitcoin',
    'ETH': 'ethereum',
    'USDT': 'tether',
    'BNB': 'binancecoin',
    'SOL': 'solana',
    'XRP': 'ripple',
    'ADA': 'cardano',
    'AVAX': 'avalanche-2',
    'DOT': 'polkadot',
    'MATIC': 'matic-network',
  };

  const coinId = cryptoMapping[symbol.toUpperCase()];
  if (!coinId) {
    throw new Error(`Cryptocurrency ${symbol} not supported`);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data[coinId]?.usd) {
      throw new Error('Invalid response format from CoinGecko');
    }

    const coinData = data[coinId];
    return {
      price: Number(coinData.usd),
      metadata: {
        currency: 'USD',
        change24h: coinData.usd_24h_change,
        lastUpdated: coinData.last_updated_at,
      },
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

// Price source configuration
const priceSources: PriceSource[] = [
  {
    name: 'yahoo',
    fetch: fetchYahooPrice,
    supports: (symbol) => !/^(BTC|ETH|USDT|BNB|SOL|XRP|ADA|AVAX|DOT|MATIC)$/.test(symbol.toUpperCase()),
  },
  {
    name: 'coingecko',
    fetch: fetchCoinGeckoPrice,
    supports: (symbol) => /^(BTC|ETH|USDT|BNB|SOL|XRP|ADA|AVAX|DOT|MATIC)$/.test(symbol.toUpperCase()),
  },
];

async function fetchPriceWithRetry(symbol: string): Promise<{ price: number; source: string; metadata?: any }> {
  const applicableSources = priceSources.filter(source => source.supports(symbol));

  if (applicableSources.length === 0) {
    throw new Error(`No price source available for symbol: ${symbol}`);
  }

  let lastError: Error | null = null;

  for (const source of applicableSources) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        logger.info(`Fetching price for ${symbol} from ${source.name}, attempt ${attempt}`);

        const result = await source.fetch(symbol);

        logger.info(`Successfully fetched price for ${symbol} from ${source.name}: $${result.price}`);

        return {
          ...result,
          source: source.name,
        };
      } catch (error) {
        lastError = error as Error;
        logger.warn(`Failed to fetch price for ${symbol} from ${source.name}, attempt ${attempt}:`, error);

        if (attempt < MAX_RETRIES) {
          // Exponential backoff
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
  }

  throw new Error(`All price sources failed for ${symbol}. Last error: ${lastError?.message}`);
}

export async function GET(
  request: NextRequest,
  { params }: { params: { symbol: string } }
) {
  try {
    // Rate limiting
    const ip = request.ip ?? '127.0.0.1';
    const { success } = await rateLimiter.check(10, ip); // 10 requests per minute per IP

    if (!success) {
      logger.warn(`Rate limit exceeded for IP: ${ip}`);
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    // Input validation and sanitization
    const rawSymbol = params.symbol;
    if (!rawSymbol) {
      return NextResponse.json(
        { error: 'Symbol parameter is required' },
        { status: 400 }
      );
    }

    const symbol = sanitizeInput(rawSymbol).toUpperCase();

    if (!validateSymbol(symbol)) {
      return NextResponse.json(
        { error: 'Invalid symbol format' },
        { status: 400 }
      );
    }

    logger.info(`Price request for symbol: ${symbol} from IP: ${ip}`);

    // Check cache first
    const cached = priceCache.get(symbol);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      logger.info(`Returning cached price for ${symbol}`);
      return NextResponse.json({
        symbol,
        price: cached.price,
        source: cached.source,
        metadata: cached.metadata,
        cached: true,
        timestamp: new Date(cached.timestamp).toISOString(),
      });
    }

    // Fetch fresh price data
    const priceData = await fetchPriceWithRetry(symbol);

    // Validate price data
    if (typeof priceData.price !== 'number' || isNaN(priceData.price) || priceData.price <= 0) {
      throw new Error('Invalid price data received');
    }

    // Update cache
    priceCache.set(symbol, {
      price: priceData.price,
      timestamp: Date.now(),
      source: priceData.source,
      metadata: priceData.metadata,
    });

    // Return response
    return NextResponse.json({
      symbol,
      price: priceData.price,
      source: priceData.source,
      metadata: priceData.metadata,
      cached: false,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    logger.error(`Error fetching price for ${params.symbol}:`, error);

    // Return appropriate error response
    if (errorMessage.includes('not supported') || errorMessage.includes('Invalid symbol')) {
      return NextResponse.json(
        { error: 'Symbol not supported or invalid', symbol: params.symbol },
        { status: 404 }
      );
    }

    if (errorMessage.includes('timeout') || errorMessage.includes('abort')) {
      return NextResponse.json(
        { error: 'Request timeout. Please try again.', symbol: params.symbol },
        { status: 408 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to fetch price data. Please try again later.',
        symbol: params.symbol,
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}

// Batch price endpoint
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.ip ?? '127.0.0.1';
    const { success } = await rateLimiter.check(5, ip); // 5 batch requests per minute per IP

    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded for batch requests' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { symbols } = body;

    if (!Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json(
        { error: 'Symbols array is required' },
        { status: 400 }
      );
    }

    if (symbols.length > 20) {
      return NextResponse.json(
        { error: 'Maximum 20 symbols allowed per batch request' },
        { status: 400 }
      );
    }

    // Validate all symbols
    const validSymbols = symbols
      .map(s => sanitizeInput(s).toUpperCase())
      .filter(s => validateSymbol(s));

    if (validSymbols.length === 0) {
      return NextResponse.json(
        { error: 'No valid symbols provided' },
        { status: 400 }
      );
    }

    logger.info(`Batch price request for ${validSymbols.length} symbols from IP: ${ip}`);

    // Fetch prices concurrently with limited concurrency
    const results = await Promise.allSettled(
      validSymbols.map(async (symbol) => {
        // Check cache first
        const cached = priceCache.get(symbol);
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
          return {
            symbol,
            price: cached.price,
            source: cached.source,
            metadata: cached.metadata,
            cached: true,
            timestamp: new Date(cached.timestamp).toISOString(),
          };
        }

        // Fetch fresh data
        const priceData = await fetchPriceWithRetry(symbol);

        // Update cache
        priceCache.set(symbol, {
          price: priceData.price,
          timestamp: Date.now(),
          source: priceData.source,
          metadata: priceData.metadata,
        });

        return {
          symbol,
          price: priceData.price,
          source: priceData.source,
          metadata: priceData.metadata,
          cached: false,
          timestamp: new Date().toISOString(),
        };
      })
    );

    // Process results
    const successful: any[] = [];
    const failed: any[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successful.push(result.value);
      } else {
        failed.push({
          symbol: validSymbols[index],
          error: result.reason?.message || 'Unknown error',
        });
      }
    });

    return NextResponse.json({
      successful,
      failed,
      total: validSymbols.length,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logger.error('Error in batch price request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}