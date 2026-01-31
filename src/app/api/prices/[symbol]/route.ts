import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/utils/rate-limit';
import { validateSymbol, sanitizeInput } from '@/lib/utils/validation';
import { logger } from '@/lib/utils/logger';
import {
  sharedPriceCache,
  fetchPriceWithRetry,
  CACHE_DURATION,
} from '@/lib/services/price-sources';

// Rate limiting configuration
const rateLimiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500, // Allow 500 unique requests per interval
});

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
    const cached = sharedPriceCache.get(symbol);
    if (cached) {
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
    if (
      typeof priceData.price !== 'number' ||
      isNaN(priceData.price) ||
      priceData.price <= 0
    ) {
      throw new Error('Invalid price data received');
    }

    // Update cache
    sharedPriceCache.set(symbol, {
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
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';
    logger.error(`Error fetching price for ${params.symbol}:`, error);

    // Return appropriate error response
    if (
      errorMessage.includes('not supported') ||
      errorMessage.includes('Invalid symbol')
    ) {
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
        details:
          process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}
