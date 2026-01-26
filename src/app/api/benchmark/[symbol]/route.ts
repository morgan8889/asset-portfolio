import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/utils/rate-limit';
import { validateSymbol, sanitizeInput } from '@/lib/utils/validation';
import { logger } from '@/lib/utils/logger';

// In-memory cache for benchmark data (in production, use Redis)
const benchmarkCache = new Map<
  string,
  {
    data: any;
    timestamp: number;
  }
>();

// 6 hours cache duration for benchmark data (less volatile than individual stocks)
const BENCHMARK_CACHE_DURATION_MS = 6 * 60 * 60 * 1000;
const TIMEOUT_MS = 10000; // 10 seconds
const MAX_RETRIES = 3;

// Rate limiting configuration
const rateLimiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
});

/**
 * Fetch historical benchmark data from Yahoo Finance.
 */
async function fetchHistoricalData(
  symbol: string,
  period1: number,
  period2: number
): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${period1}&period2=${period2}&interval=1d`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Portfolio-Tracker/1.0)',
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Yahoo Finance API error: ${response.status}`);
    }

    const data = await response.json();
    const result = data.chart?.result?.[0];

    if (!result?.timestamp || !result?.indicators?.quote?.[0]?.close) {
      throw new Error('Invalid response format from Yahoo Finance');
    }

    return {
      timestamps: result.timestamp,
      closes: result.indicators.quote[0].close,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch with exponential backoff retry.
 */
async function fetchWithRetry(
  symbol: string,
  period1: number,
  period2: number
): Promise<any> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      logger.info(`Fetching benchmark data for ${symbol}, attempt ${attempt}`);
      const result = await fetchHistoricalData(symbol, period1, period2);
      logger.info(`Successfully fetched benchmark data for ${symbol}`);
      return result;
    } catch (error) {
      lastError = error as Error;
      logger.warn(
        `Failed to fetch benchmark data for ${symbol}, attempt ${attempt}:`,
        error
      );

      if (attempt < MAX_RETRIES) {
        // Exponential backoff: 2^attempt * 1000ms
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(
    `All attempts failed for ${symbol}. Last error: ${lastError?.message}`
  );
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

    // Input validation
    const rawSymbol = params.symbol;
    if (!rawSymbol) {
      return NextResponse.json(
        { error: 'Symbol parameter is required' },
        { status: 400 }
      );
    }

    const symbol = sanitizeInput(rawSymbol).toUpperCase();

    // Validate that it's a supported benchmark index symbol
    const supportedBenchmarks = ['^GSPC', '^DJI', '^IXIC'];
    if (!supportedBenchmarks.includes(symbol)) {
      return NextResponse.json(
        {
          error: 'Unsupported benchmark symbol. Supported: ^GSPC, ^DJI, ^IXIC',
        },
        { status: 400 }
      );
    }

    // Get period1 and period2 from query params
    const { searchParams } = new URL(request.url);
    const period1Str = searchParams.get('period1');
    const period2Str = searchParams.get('period2');

    if (!period1Str || !period2Str) {
      return NextResponse.json(
        {
          error:
            'period1 and period2 query parameters are required (Unix timestamps in seconds)',
        },
        { status: 400 }
      );
    }

    const period1 = parseInt(period1Str, 10);
    const period2 = parseInt(period2Str, 10);

    if (isNaN(period1) || isNaN(period2)) {
      return NextResponse.json(
        { error: 'Invalid period1 or period2 format' },
        { status: 400 }
      );
    }

    logger.info(
      `Benchmark request for ${symbol} from ${new Date(period1 * 1000).toISOString()} to ${new Date(period2 * 1000).toISOString()}`
    );

    // Check cache first
    const cacheKey = `${symbol}-${period1}-${period2}`;
    const cached = benchmarkCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < BENCHMARK_CACHE_DURATION_MS) {
      logger.info(`Returning cached benchmark data for ${symbol}`);
      return NextResponse.json({
        symbol,
        ...cached.data,
        cached: true,
        timestamp: new Date(cached.timestamp).toISOString(),
      });
    }

    // Fetch fresh data with retry
    const data = await fetchWithRetry(symbol, period1, period2);

    // Validate data
    if (!Array.isArray(data.timestamps) || !Array.isArray(data.closes)) {
      throw new Error('Invalid data format received');
    }

    // Update cache
    benchmarkCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });

    // Return response
    return NextResponse.json({
      symbol,
      ...data,
      cached: false,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';
    logger.error(`Error fetching benchmark data for ${params.symbol}:`, error);

    // Return appropriate error response
    if (errorMessage.includes('timeout') || errorMessage.includes('abort')) {
      return NextResponse.json(
        { error: 'Request timeout. Please try again.', symbol: params.symbol },
        { status: 408 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to fetch benchmark data. Please try again later.',
        symbol: params.symbol,
        details:
          process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}
