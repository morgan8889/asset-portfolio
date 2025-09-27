// Simple in-memory rate limiter
// In production, use Redis or similar for distributed rate limiting

interface RateLimitConfig {
  interval: number; // Time window in milliseconds
  uniqueTokenPerInterval: number; // Max unique tokens (IPs) per interval
}

interface TokenData {
  count: number;
  resetTime: number;
}

const tokenStorage = new Map<string, TokenData>();

export function rateLimit(config: RateLimitConfig) {
  return {
    check: async (limit: number, token: string): Promise<{ success: boolean; remaining?: number; resetTime?: number }> => {
      const now = Date.now();
      const key = token;

      // Clean up expired entries periodically
      if (Math.random() < 0.01) { // 1% chance to clean up
        cleanupExpiredTokens(now);
      }

      // Get current token data
      let tokenData = tokenStorage.get(key);

      if (!tokenData || now > tokenData.resetTime) {
        // Create new token data or reset if expired
        tokenData = {
          count: 0,
          resetTime: now + config.interval,
        };
        tokenStorage.set(key, tokenData);
      }

      // Check if limit exceeded
      if (tokenData.count >= limit) {
        return {
          success: false,
          remaining: 0,
          resetTime: tokenData.resetTime,
        };
      }

      // Increment count and allow request
      tokenData.count++;
      tokenStorage.set(key, tokenData);

      return {
        success: true,
        remaining: limit - tokenData.count,
        resetTime: tokenData.resetTime,
      };
    },
  };
}

function cleanupExpiredTokens(now: number): void {
  for (const [key, data] of tokenStorage.entries()) {
    if (now > data.resetTime) {
      tokenStorage.delete(key);
    }
  }
}

// IP-based rate limiter
export const ipRateLimit = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 1000, // Support up to 1000 unique IPs per minute
});

// User-based rate limiter (for authenticated endpoints)
export const userRateLimit = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500, // Support up to 500 unique users per minute
});

// Endpoint-specific rate limiters
export const priceFetchRateLimit = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 1000,
});

export const batchRequestRateLimit = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 100,
});

export const uploadRateLimit = rateLimit({
  interval: 5 * 60 * 1000, // 5 minutes
  uniqueTokenPerInterval: 50,
});

// Rate limit middleware factory
export function createRateLimitMiddleware(
  rateLimiter: ReturnType<typeof rateLimit>,
  limit: number,
  keyExtractor: (request: Request) => string
) {
  return async (request: Request): Promise<{ allowed: boolean; headers: Record<string, string> }> => {
    const key = keyExtractor(request);
    const result = await rateLimiter.check(limit, key);

    const headers: Record<string, string> = {
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': (result.remaining || 0).toString(),
    };

    if (result.resetTime) {
      headers['X-RateLimit-Reset'] = Math.ceil(result.resetTime / 1000).toString();
    }

    return {
      allowed: result.success,
      headers,
    };
  };
}

// Common key extractors
export const extractIPKey = (request: Request): string => {
  // Try to get real IP from headers (for proxied requests)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  if (realIP) {
    return realIP;
  }

  // Fallback to a default value
  return '127.0.0.1';
};

export const extractUserKey = (request: Request): string => {
  // For future authentication implementation
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    // Extract user ID from JWT or session
    // This is a placeholder - implement actual auth logic
    return authHeader.slice(0, 20); // Use first 20 chars as key
  }

  // Fallback to IP-based
  return extractIPKey(request);
};

// Rate limit status response helper
export function createRateLimitResponse(allowed: boolean, headers: Record<string, string>) {
  if (allowed) {
    return null; // No response needed, continue with request
  }

  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please try again later.',
      retryAfter: headers['X-RateLimit-Reset'] ?
        parseInt(headers['X-RateLimit-Reset']) - Math.floor(Date.now() / 1000) :
        60,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    }
  );
}