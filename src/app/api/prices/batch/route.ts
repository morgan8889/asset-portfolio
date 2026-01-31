import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/utils/rate-limit';
import { validateSymbol, sanitizeSymbol } from '@/lib/utils/validation';
import { logger } from '@/lib/utils/logger';
import {
  sharedPriceCache,
  fetchPriceWithRetry,
  CACHE_DURATION,
  type PriceMetadata,
} from '@/lib/services/price-sources';

// Batch result interfaces
interface BatchPriceSuccess {
  symbol: string;
  price: number;
  source: string;
  metadata?: PriceMetadata;
  cached: boolean;
  timestamp: string;
}

interface BatchPriceError {
  symbol: string;
  error: string;
}

// Rate limiting configuration
const rateLimiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
});

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

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

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
      .filter((s): s is string => typeof s === 'string')
      .map((s) => sanitizeSymbol(s))
      .filter((s) => validateSymbol(s));

    if (validSymbols.length === 0) {
      return NextResponse.json(
        { error: 'No valid symbols provided' },
        { status: 400 }
      );
    }

    logger.info(
      `Batch price request for ${validSymbols.length} symbols from IP: ${ip}`
    );

    // Fetch prices concurrently
    const results = await Promise.allSettled(
      validSymbols.map(async (symbol): Promise<BatchPriceSuccess> => {
        // Check cache first
        const cached = sharedPriceCache.get(symbol);
        if (cached) {
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
        sharedPriceCache.set(symbol, {
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
    const successful: BatchPriceSuccess[] = [];
    const failed: BatchPriceError[] = [];

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
    if (error instanceof Error) {
      console.error(error.stack);
    }
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
