import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

// Mock environment variables
process.env.RATE_LIMIT_REQUESTS = '100'
process.env.RATE_LIMIT_WINDOW = '3600000' // 1 hour

describe('API Routes Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear any cached modules
    vi.resetModules()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Price API Route', () => {
    it('should fetch price for valid symbol', async () => {
      // Mock fetch for external API
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          'Global Quote': {
            '01. symbol': 'AAPL',
            '05. price': '150.25',
            '07. latest trading day': '2023-12-01',
            '09. change': '2.50',
            '10. change percent': '1.69%'
          }
        })
      })

      global.fetch = mockFetch

      // Import the route handler
      const { GET } = await import('@/app/api/prices/[symbol]/route')

      const request = new NextRequest('http://localhost:3000/api/prices/AAPL')
      const response = await GET(request, { params: { symbol: 'AAPL' } })

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toMatchObject({
        symbol: 'AAPL',
        price: expect.any(Number),
        change: expect.any(Number),
        changePercent: expect.any(Number),
        lastUpdated: expect.any(String)
      })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('AAPL'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': expect.any(String)
          })
        })
      )
    })

    it('should handle invalid symbols', async () => {
      const { GET } = await import('@/app/api/prices/[symbol]/route')

      const request = new NextRequest('http://localhost:3000/api/prices/INVALID<>')
      const response = await GET(request, { params: { symbol: 'INVALID<>' } })

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data).toMatchObject({
        error: expect.stringContaining('Invalid symbol')
      })
    })

    it('should handle external API errors', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      })

      global.fetch = mockFetch

      const { GET } = await import('@/app/api/prices/[symbol]/route')

      const request = new NextRequest('http://localhost:3000/api/prices/AAPL')
      const response = await GET(request, { params: { symbol: 'AAPL' } })

      expect(response.status).toBe(500)

      const data = await response.json()
      expect(data).toMatchObject({
        error: expect.any(String)
      })
    })

    it('should handle malformed external API response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          // Missing expected fields
          'Invalid': 'response'
        })
      })

      global.fetch = mockFetch

      const { GET } = await import('@/app/api/prices/[symbol]/route')

      const request = new NextRequest('http://localhost:3000/api/prices/AAPL')
      const response = await GET(request, { params: { symbol: 'AAPL' } })

      expect(response.status).toBe(500)

      const data = await response.json()
      expect(data).toMatchObject({
        error: expect.stringContaining('Invalid response')
      })
    })

    it('should apply rate limiting', async () => {
      // Mock rate limiter to simulate exceeded limit
      vi.doMock('@/lib/utils/rate-limit', () => ({
        rateLimiter: {
          check: vi.fn().mockResolvedValue({
            success: false,
            remaining: 0,
            reset: Date.now() + 3600000
          })
        }
      }))

      const { GET } = await import('@/app/api/prices/[symbol]/route')

      const request = new NextRequest('http://localhost:3000/api/prices/AAPL', {
        headers: { 'x-forwarded-for': '192.168.1.1' }
      })
      const response = await GET(request, { params: { symbol: 'AAPL' } })

      expect(response.status).toBe(429)

      const data = await response.json()
      expect(data).toMatchObject({
        error: expect.stringContaining('rate limit')
      })
    })

    it('should handle network timeouts', async () => {
      const mockFetch = vi.fn().mockImplementation(() =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Network timeout')), 100)
        )
      )

      global.fetch = mockFetch

      const { GET } = await import('@/app/api/prices/[symbol]/route')

      const request = new NextRequest('http://localhost:3000/api/prices/AAPL')
      const response = await GET(request, { params: { symbol: 'AAPL' } })

      expect(response.status).toBe(500)

      const data = await response.json()
      expect(data).toMatchObject({
        error: expect.any(String)
      })
    })

    it('should cache successful responses', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          'Global Quote': {
            '01. symbol': 'AAPL',
            '05. price': '150.25',
            '07. latest trading day': '2023-12-01',
            '09. change': '2.50',
            '10. change percent': '1.69%'
          }
        })
      })

      global.fetch = mockFetch

      const { GET } = await import('@/app/api/prices/[symbol]/route')

      // First request
      const request1 = new NextRequest('http://localhost:3000/api/prices/AAPL')
      const response1 = await GET(request1, { params: { symbol: 'AAPL' } })
      expect(response1.status).toBe(200)

      // Second request (should be cached)
      const request2 = new NextRequest('http://localhost:3000/api/prices/AAPL')
      const response2 = await GET(request2, { params: { symbol: 'AAPL' } })
      expect(response2.status).toBe(200)

      // Should only call external API once due to caching
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('API Response Headers', () => {
    it('should include CORS headers', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          'Global Quote': {
            '01. symbol': 'AAPL',
            '05. price': '150.25',
            '07. latest trading day': '2023-12-01',
            '09. change': '2.50',
            '10. change percent': '1.69%'
          }
        })
      })

      global.fetch = mockFetch

      const { GET } = await import('@/app/api/prices/[symbol]/route')

      const request = new NextRequest('http://localhost:3000/api/prices/AAPL')
      const response = await GET(request, { params: { symbol: 'AAPL' } })

      expect(response.headers.get('Access-Control-Allow-Origin')).toBeTruthy()
      expect(response.headers.get('Content-Type')).toBe('application/json')
    })

    it('should include security headers', async () => {
      const { GET } = await import('@/app/api/prices/[symbol]/route')

      const request = new NextRequest('http://localhost:3000/api/prices/INVALID')
      const response = await GET(request, { params: { symbol: 'INVALID' } })

      // Check for basic security headers
      expect(response.headers.get('X-Content-Type-Options')).toBeTruthy()
      expect(response.headers.get('X-Frame-Options')).toBeTruthy()
    })
  })

  describe('Input Validation and Sanitization', () => {
    it('should sanitize symbol input', async () => {
      const { GET } = await import('@/app/api/prices/[symbol]/route')

      const maliciousSymbols = [
        'AAPL<script>',
        'AAPL"; DROP TABLE--',
        'AAPL\x00\x01',
        '../../../etc/passwd'
      ]

      for (const symbol of maliciousSymbols) {
        const request = new NextRequest(`http://localhost:3000/api/prices/${encodeURIComponent(symbol)}`)
        const response = await GET(request, { params: { symbol } })

        expect(response.status).toBe(400)

        const data = await response.json()
        expect(data.error).toMatch(/invalid symbol/i)
      }
    })

    it('should handle extremely long symbol names', async () => {
      const { GET } = await import('@/app/api/prices/[symbol]/route')

      const longSymbol = 'A'.repeat(1000)
      const request = new NextRequest(`http://localhost:3000/api/prices/${longSymbol}`)
      const response = await GET(request, { params: { symbol: longSymbol } })

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toMatch(/invalid symbol/i)
    })
  })

  describe('Error Response Format', () => {
    it('should return consistent error format', async () => {
      const { GET } = await import('@/app/api/prices/[symbol]/route')

      const request = new NextRequest('http://localhost:3000/api/prices/INVALID')
      const response = await GET(request, { params: { symbol: 'INVALID' } })

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data).toMatchObject({
        error: expect.any(String),
        timestamp: expect.any(String),
        path: expect.any(String)
      })
    })

    it('should not expose internal error details', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Internal database connection failed with credentials xyz'))

      global.fetch = mockFetch

      const { GET } = await import('@/app/api/prices/[symbol]/route')

      const request = new NextRequest('http://localhost:3000/api/prices/AAPL')
      const response = await GET(request, { params: { symbol: 'AAPL' } })

      expect(response.status).toBe(500)

      const data = await response.json()
      expect(data.error).not.toContain('credentials')
      expect(data.error).not.toContain('database')
      expect(data.error).toMatch(/failed to fetch/i)
    })
  })

  describe('Performance and Monitoring', () => {
    it('should complete requests within reasonable time', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          'Global Quote': {
            '01. symbol': 'AAPL',
            '05. price': '150.25',
            '07. latest trading day': '2023-12-01',
            '09. change': '2.50',
            '10. change percent': '1.69%'
          }
        })
      })

      global.fetch = mockFetch

      const { GET } = await import('@/app/api/prices/[symbol]/route')

      const startTime = Date.now()
      const request = new NextRequest('http://localhost:3000/api/prices/AAPL')
      const response = await GET(request, { params: { symbol: 'AAPL' } })
      const endTime = Date.now()

      expect(response.status).toBe(200)
      expect(endTime - startTime).toBeLessThan(5000) // Should complete within 5 seconds
    })

    it('should handle concurrent requests', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          'Global Quote': {
            '01. symbol': 'AAPL',
            '05. price': '150.25',
            '07. latest trading day': '2023-12-01',
            '09. change': '2.50',
            '10. change percent': '1.69%'
          }
        })
      })

      global.fetch = mockFetch

      const { GET } = await import('@/app/api/prices/[symbol]/route')

      // Create 10 concurrent requests
      const promises = Array.from({ length: 10 }, () => {
        const request = new NextRequest('http://localhost:3000/api/prices/AAPL')
        return GET(request, { params: { symbol: 'AAPL' } })
      })

      const responses = await Promise.all(promises)

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200)
      })

      // Should efficiently handle concurrent requests
      expect(mockFetch).toHaveBeenCalled()
    })
  })
})