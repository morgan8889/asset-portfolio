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
    check: async (
      limit: number,
      token: string
    ): Promise<{
      success: boolean;
      remaining?: number;
      resetTime?: number;
    }> => {
      const now = Date.now();
      const key = token;

      // Clean up expired entries periodically
      if (Math.random() < 0.01) {
        // 1% chance to clean up
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
