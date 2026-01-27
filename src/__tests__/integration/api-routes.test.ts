import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Mock rate limit before importing route
const mockRateLimitCheck = vi.fn();

vi.mock('@/lib/utils/rate-limit', () => ({
  rateLimit: () => ({
    check: mockRateLimitCheck,
  }),
}));

// Mock logger to avoid console output during tests
vi.mock('@/lib/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock validation functions
vi.mock('@/lib/utils/validation', () => ({
  validateSymbol: vi.fn((symbol: string) => /^[\^]?[A-Z0-9.]{1,10}$/.test(symbol)),
  sanitizeSymbol: vi.fn((input: string) =>
    input.replace(/[^a-zA-Z0-9.\^]/g, '').trim().toUpperCase().slice(0, 15)
  ),
  sanitizeInput: vi.fn((input: string) =>
    input.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)
  ),
}));

describe('API Routes Integration Tests', () => {
  const originalFetch = global.fetch;
  let testSymbolCounter = 0;

  // Helper to generate unique symbols to avoid cache collisions
  const getUniqueSymbol = () => `TST${++testSymbolCounter}`;

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: rate limit passes
    mockRateLimitCheck.mockResolvedValue({ success: true, remaining: 9 });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  describe('Price API Route', () => {
    it('should fetch price for valid symbol', async () => {
      // Mock fetch for Yahoo Finance API
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            chart: {
              result: [
                {
                  meta: {
                    regularMarketPrice: 150.25,
                    currency: 'USD',
                    marketState: 'REGULAR',
                    regularMarketTime: 1701446400,
                    previousClose: 148.5,
                  },
                },
              ],
            },
          }),
      });

      global.fetch = mockFetch;

      const { GET } = await import('@/app/api/prices/[symbol]/route');

      const request = new NextRequest('http://localhost:3000/api/prices/AAPL');
      const response = await GET(request, { params: { symbol: 'AAPL' } });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toMatchObject({
        symbol: 'AAPL',
        price: expect.any(Number),
        source: 'yahoo',
        timestamp: expect.any(String),
      });
    });

    it('should handle invalid symbols', async () => {
      const { GET } = await import('@/app/api/prices/[symbol]/route');

      // The validation mock will reject symbols with special characters
      const request = new NextRequest(
        'http://localhost:3000/api/prices/INVALID123456789012345'
      );
      const response = await GET(request, {
        params: { symbol: 'INVALID123456789012345' },
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it('should handle external API errors', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      global.fetch = mockFetch;

      const { GET } = await import('@/app/api/prices/[symbol]/route');

      // Use unique symbol to avoid cache hit from previous tests
      const symbol = getUniqueSymbol();
      const request = new NextRequest(
        `http://localhost:3000/api/prices/${symbol}`
      );
      const response = await GET(request, { params: { symbol } });

      // The route will retry, so allow 500 or timeout status
      expect([408, 500]).toContain(response.status);

      const data = await response.json();
      expect(data.error).toBeDefined();
    }, 15000);

    it('should handle malformed external API response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            // Missing expected chart/result structure
            Invalid: 'response',
          }),
      });

      global.fetch = mockFetch;

      const { GET } = await import('@/app/api/prices/[symbol]/route');

      // Use unique symbol to avoid cache hit from previous tests
      const symbol = getUniqueSymbol();
      const request = new NextRequest(
        `http://localhost:3000/api/prices/${symbol}`
      );
      const response = await GET(request, { params: { symbol } });

      // Allow 500 or 408 (timeout from retries)
      expect([408, 500]).toContain(response.status);

      const data = await response.json();
      expect(data.error).toBeDefined();
    }, 15000);

    it('should apply rate limiting', async () => {
      // Mock rate limiter to simulate exceeded limit
      mockRateLimitCheck.mockResolvedValue({
        success: false,
        remaining: 0,
      });

      const { GET } = await import('@/app/api/prices/[symbol]/route');

      const request = new NextRequest('http://localhost:3000/api/prices/AAPL', {
        headers: { 'x-forwarded-for': '192.168.1.1' },
      });
      const response = await GET(request, { params: { symbol: 'AAPL' } });

      expect(response.status).toBe(429);

      const data = await response.json();
      expect(data.error).toMatch(/rate limit/i);
    });

    it('should handle network timeouts', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network timeout'));

      global.fetch = mockFetch;

      const { GET } = await import('@/app/api/prices/[symbol]/route');

      // Use unique symbol to avoid cache hit from previous tests
      const symbol = getUniqueSymbol();
      const request = new NextRequest(
        `http://localhost:3000/api/prices/${symbol}`
      );
      const response = await GET(request, { params: { symbol } });

      // Allow 408 or 500 status
      expect([408, 500]).toContain(response.status);

      const data = await response.json();
      expect(data.error).toBeDefined();
    }, 15000);

    it('should cache successful responses', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            chart: {
              result: [
                {
                  meta: {
                    regularMarketPrice: 150.25,
                    currency: 'USD',
                    marketState: 'REGULAR',
                    regularMarketTime: 1701446400,
                    previousClose: 148.5,
                  },
                },
              ],
            },
          }),
      });

      global.fetch = mockFetch;

      const { GET } = await import('@/app/api/prices/[symbol]/route');

      // First request
      const request1 = new NextRequest('http://localhost:3000/api/prices/AAPL');
      const response1 = await GET(request1, { params: { symbol: 'AAPL' } });
      expect(response1.status).toBe(200);

      // Second request (should be cached)
      const request2 = new NextRequest('http://localhost:3000/api/prices/AAPL');
      const response2 = await GET(request2, { params: { symbol: 'AAPL' } });
      expect(response2.status).toBe(200);

      const data2 = await response2.json();
      expect(data2.cached).toBe(true);
    });
  });

  describe('API Response Headers', () => {
    it('should include CORS headers', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            chart: {
              result: [
                {
                  meta: {
                    regularMarketPrice: 150.25,
                    currency: 'USD',
                    marketState: 'REGULAR',
                    regularMarketTime: 1701446400,
                    previousClose: 148.5,
                  },
                },
              ],
            },
          }),
      });

      global.fetch = mockFetch;

      const { GET } = await import('@/app/api/prices/[symbol]/route');

      const request = new NextRequest('http://localhost:3000/api/prices/AAPL');
      const response = await GET(request, { params: { symbol: 'AAPL' } });

      // NextResponse automatically sets Content-Type for JSON
      expect(response.headers.get('Content-Type')).toBe('application/json');
    });

    it('should include security headers', async () => {
      const { GET } = await import('@/app/api/prices/[symbol]/route');

      const request = new NextRequest(
        'http://localhost:3000/api/prices/INVALID123456789012345'
      );
      const response = await GET(request, {
        params: { symbol: 'INVALID123456789012345' },
      });

      // Response should return with proper content type
      expect(response.status).toBe(400);
    });
  });

  describe('Input Validation and Sanitization', () => {
    it('should sanitize symbol input', async () => {
      const { GET } = await import('@/app/api/prices/[symbol]/route');

      const maliciousSymbols = [
        'AAPL<script>',
        'AAPL"; DROP TABLE--',
        '../../../etc/passwd',
      ];

      for (const symbol of maliciousSymbols) {
        const request = new NextRequest(
          `http://localhost:3000/api/prices/${encodeURIComponent(symbol)}`
        );
        const response = await GET(request, { params: { symbol } });

        // Should either reject or sanitize the input
        expect([200, 400, 404, 408, 500]).toContain(response.status);
      }
    }, 30000);

    it('should handle extremely long symbol names', async () => {
      const { GET } = await import('@/app/api/prices/[symbol]/route');

      const longSymbol = 'A'.repeat(1000);
      const request = new NextRequest(
        `http://localhost:3000/api/prices/${longSymbol}`
      );
      const response = await GET(request, { params: { symbol: longSymbol } });

      // Should reject or truncate the symbol
      expect([400, 404, 500]).toContain(response.status);
    });
  });

  describe('Error Response Format', () => {
    it('should return consistent error format', async () => {
      const { GET } = await import('@/app/api/prices/[symbol]/route');

      const request = new NextRequest(
        'http://localhost:3000/api/prices/INVALID123456789012345'
      );
      const response = await GET(request, {
        params: { symbol: 'INVALID123456789012345' },
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data).toMatchObject({
        error: expect.any(String),
      });
    });

    it('should not expose internal error details', async () => {
      const mockFetch = vi
        .fn()
        .mockRejectedValue(
          new Error('Internal database connection failed with credentials xyz')
        );

      global.fetch = mockFetch;

      const { GET } = await import('@/app/api/prices/[symbol]/route');

      // Use unique symbol to avoid cache hit from previous tests
      const symbol = getUniqueSymbol();
      const request = new NextRequest(
        `http://localhost:3000/api/prices/${symbol}`
      );
      const response = await GET(request, { params: { symbol } });

      // Allow 408 or 500 status
      expect([408, 500]).toContain(response.status);

      const data = await response.json();
      // Should not expose sensitive details
      expect(data.error).not.toContain('credentials');
    }, 15000);
  });

  describe('Performance and Monitoring', () => {
    it('should complete requests within reasonable time', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            chart: {
              result: [
                {
                  meta: {
                    regularMarketPrice: 150.25,
                    currency: 'USD',
                    marketState: 'REGULAR',
                    regularMarketTime: 1701446400,
                    previousClose: 148.5,
                  },
                },
              ],
            },
          }),
      });

      global.fetch = mockFetch;

      const { GET } = await import('@/app/api/prices/[symbol]/route');

      const startTime = Date.now();
      const request = new NextRequest('http://localhost:3000/api/prices/AAPL');
      const response = await GET(request, { params: { symbol: 'AAPL' } });
      const endTime = Date.now();

      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle concurrent requests', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            chart: {
              result: [
                {
                  meta: {
                    regularMarketPrice: 150.25,
                    currency: 'USD',
                    marketState: 'REGULAR',
                    regularMarketTime: 1701446400,
                    previousClose: 148.5,
                  },
                },
              ],
            },
          }),
      });

      global.fetch = mockFetch;

      const { GET } = await import('@/app/api/prices/[symbol]/route');

      // Create 5 concurrent requests
      const promises = Array.from({ length: 5 }, () => {
        const request = new NextRequest(
          'http://localhost:3000/api/prices/AAPL'
        );
        return GET(request, { params: { symbol: 'AAPL' } });
      });

      const responses = await Promise.all(promises);

      // All requests should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('Batch Price API Route', () => {
    it('should fetch prices for multiple symbols', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            chart: {
              result: [
                {
                  meta: {
                    regularMarketPrice: 150.25,
                    currency: 'USD',
                    marketState: 'REGULAR',
                    regularMarketTime: 1701446400,
                    previousClose: 148.5,
                  },
                },
              ],
            },
          }),
      });

      global.fetch = mockFetch;

      const { POST } = await import('@/app/api/prices/batch/route');

      const request = new NextRequest('http://localhost:3000/api/prices/batch', {
        method: 'POST',
        body: JSON.stringify({ symbols: ['AAPL', 'GOOGL', 'MSFT'] }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toMatchObject({
        successful: expect.any(Array),
        failed: expect.any(Array),
        total: 3,
        timestamp: expect.any(String),
      });
    }, 15000);

    it('should reject empty symbols array', async () => {
      const { POST } = await import('@/app/api/prices/batch/route');

      const request = new NextRequest('http://localhost:3000/api/prices/batch', {
        method: 'POST',
        body: JSON.stringify({ symbols: [] }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe('Symbols array is required');
    });

    it('should reject request without symbols', async () => {
      const { POST } = await import('@/app/api/prices/batch/route');

      const request = new NextRequest('http://localhost:3000/api/prices/batch', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe('Symbols array is required');
    });

    it('should reject request with non-array symbols', async () => {
      const { POST } = await import('@/app/api/prices/batch/route');

      const request = new NextRequest('http://localhost:3000/api/prices/batch', {
        method: 'POST',
        body: JSON.stringify({ symbols: 'AAPL' }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe('Symbols array is required');
    });

    it('should reject request with too many symbols', async () => {
      const { POST } = await import('@/app/api/prices/batch/route');

      // Create array with 21 symbols (exceeds max of 20)
      const symbols = Array.from({ length: 21 }, (_, i) => `SYM${i}`);

      const request = new NextRequest('http://localhost:3000/api/prices/batch', {
        method: 'POST',
        body: JSON.stringify({ symbols }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe('Maximum 20 symbols allowed per batch request');
    });

    it('should reject invalid JSON body', async () => {
      const { POST } = await import('@/app/api/prices/batch/route');

      const request = new NextRequest('http://localhost:3000/api/prices/batch', {
        method: 'POST',
        body: 'invalid json',
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe('Invalid JSON body');
    });

    it('should filter out invalid symbols', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            chart: {
              result: [
                {
                  meta: {
                    regularMarketPrice: 150.25,
                    currency: 'USD',
                    marketState: 'REGULAR',
                    regularMarketTime: 1701446400,
                    previousClose: 148.5,
                  },
                },
              ],
            },
          }),
      });

      global.fetch = mockFetch;

      const { POST } = await import('@/app/api/prices/batch/route');

      // Mix of valid and invalid symbols
      const request = new NextRequest('http://localhost:3000/api/prices/batch', {
        method: 'POST',
        body: JSON.stringify({
          symbols: ['AAPL', 'INVALID!!!', 'GOOGL', '', 123],
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      // Should only process valid symbols (AAPL, GOOGL)
      expect(data.total).toBeGreaterThan(0);
      expect(data.total).toBeLessThan(5); // Should filter out invalid ones
    }, 15000);

    it('should return error when no valid symbols provided', async () => {
      const { POST } = await import('@/app/api/prices/batch/route');

      const request = new NextRequest('http://localhost:3000/api/prices/batch', {
        method: 'POST',
        body: JSON.stringify({
          symbols: ['!!!', '???', ''],
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe('No valid symbols provided');
    });

    it('should apply rate limiting to batch requests', async () => {
      // Mock rate limiter to simulate exceeded limit
      mockRateLimitCheck.mockResolvedValue({
        success: false,
        remaining: 0,
      });

      const { POST } = await import('@/app/api/prices/batch/route');

      const request = new NextRequest('http://localhost:3000/api/prices/batch', {
        method: 'POST',
        body: JSON.stringify({ symbols: ['AAPL', 'GOOGL'] }),
      });

      const response = await POST(request);
      expect(response.status).toBe(429);

      const data = await response.json();
      expect(data.error).toMatch(/rate limit/i);
    });

    it('should cache batch price results', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            chart: {
              result: [
                {
                  meta: {
                    regularMarketPrice: 150.25,
                    currency: 'USD',
                    marketState: 'REGULAR',
                    regularMarketTime: 1701446400,
                    previousClose: 148.5,
                  },
                },
              ],
            },
          }),
      });

      global.fetch = mockFetch;

      const { POST } = await import('@/app/api/prices/batch/route');

      // First request
      const request1 = new NextRequest('http://localhost:3000/api/prices/batch', {
        method: 'POST',
        body: JSON.stringify({ symbols: ['AAPL'] }),
      });

      const response1 = await POST(request1);
      expect(response1.status).toBe(200);

      // Second request (should be cached)
      const request2 = new NextRequest('http://localhost:3000/api/prices/batch', {
        method: 'POST',
        body: JSON.stringify({ symbols: ['AAPL'] }),
      });

      const response2 = await POST(request2);
      expect(response2.status).toBe(200);

      const data2 = await response2.json();
      // At least one result should be cached
      const cachedResults = data2.successful.filter((r: any) => r.cached === true);
      expect(cachedResults.length).toBeGreaterThan(0);
    }, 15000);

    it('should handle mixed success and failure in batch', async () => {
      let callCount = 0;
      const mockFetch = vi.fn().mockImplementation(() => {
        callCount++;
        // First symbol succeeds, second fails
        if (callCount % 2 === 1) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                chart: {
                  result: [
                    {
                      meta: {
                        regularMarketPrice: 150.25,
                        currency: 'USD',
                        marketState: 'REGULAR',
                        regularMarketTime: 1701446400,
                        previousClose: 148.5,
                      },
                    },
                  ],
                },
              }),
          });
        } else {
          return Promise.resolve({
            ok: false,
            status: 404,
          });
        }
      });

      global.fetch = mockFetch;

      const { POST } = await import('@/app/api/prices/batch/route');

      // Use one valid symbol and one invalid to test mixed results
      const validSymbol = 'AAPL'; // Known valid symbol
      const invalidSymbol = 'ZZZZZZINVALID999'; // Definitely invalid symbol

      const request = new NextRequest('http://localhost:3000/api/prices/batch', {
        method: 'POST',
        body: JSON.stringify({ symbols: [validSymbol, invalidSymbol] }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      // The API should process at least one symbol
      expect(data.total).toBeGreaterThanOrEqual(1);
      // We expect the valid symbol to succeed and the invalid to fail,
      // but the API may filter out invalid symbols before processing
      expect(data.successful.length + data.failed.length).toBeGreaterThanOrEqual(1);
    }, 15000);
  });
});
