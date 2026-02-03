import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from '../route';

describe('Health Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/health', () => {
    it('should return 200 OK status', async () => {
      const response = await GET();
      expect(response.status).toBe(200);
    });

    it('should return JSON response with status "ok"', async () => {
      const response = await GET();
      const data = await response.json();
      expect(data.status).toBe('ok');
    });

    it('should return timestamp in ISO format', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.timestamp).toBeDefined();
      expect(typeof data.timestamp).toBe('string');

      // Verify it's a valid ISO timestamp
      const timestamp = new Date(data.timestamp);
      expect(timestamp.toISOString()).toBe(data.timestamp);
    });

    it('should return uptime as a number', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.uptime).toBeDefined();
      expect(typeof data.uptime).toBe('number');
      expect(data.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should return current timestamp (not stale)', async () => {
      const beforeCall = new Date();
      const response = await GET();
      const afterCall = new Date();
      const data = await response.json();

      const timestamp = new Date(data.timestamp);
      expect(timestamp.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime());
      expect(timestamp.getTime()).toBeLessThanOrEqual(afterCall.getTime());
    });

    it('should return all required fields', async () => {
      const response = await GET();
      const data = await response.json();

      expect(Object.keys(data)).toEqual(
        expect.arrayContaining(['status', 'timestamp', 'uptime'])
      );
    });

    it('should not return sensitive information', async () => {
      const response = await GET();
      const data = await response.json();

      // Ensure we don't leak sensitive data
      expect(data).not.toHaveProperty('env');
      expect(data).not.toHaveProperty('config');
      expect(data).not.toHaveProperty('secrets');
      expect(data).not.toHaveProperty('apiKeys');
    });

    it('should have correct Content-Type header', async () => {
      const response = await GET();
      const contentType = response.headers.get('content-type');

      expect(contentType).toContain('application/json');
    });
  });
});
