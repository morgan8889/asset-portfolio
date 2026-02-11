import { test, expect } from './fixtures/test';

/**
 * E2E tests for the health check endpoint
 * Used by Docker HEALTHCHECK and container orchestration systems
 */
test.describe('Health Endpoint', () => {
  test('should return 200 OK on /api/health', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBe(200);
  });

  test('should return valid JSON with status "ok"', async ({ request }) => {
    const response = await request.get('/api/health');
    const data = await response.json();

    expect(data).toHaveProperty('status', 'ok');
  });

  test('should return timestamp and uptime fields', async ({ request }) => {
    const response = await request.get('/api/health');
    const data = await response.json();

    expect(data).toHaveProperty('timestamp');
    expect(data).toHaveProperty('uptime');
    expect(typeof data.timestamp).toBe('string');
    expect(typeof data.uptime).toBe('number');
  });

  test('should return timestamp in valid ISO 8601 format', async ({
    request,
  }) => {
    const response = await request.get('/api/health');
    const data = await response.json();

    // Verify ISO 8601 format
    const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
    expect(data.timestamp).toMatch(isoRegex);

    // Verify it's a valid date
    const timestamp = new Date(data.timestamp);
    expect(timestamp.toISOString()).toBe(data.timestamp);
  });

  test('should return recent timestamp (within last 5 seconds)', async ({
    request,
  }) => {
    const beforeCall = Date.now();
    const response = await request.get('/api/health');
    const afterCall = Date.now();
    const data = await response.json();

    const timestamp = new Date(data.timestamp).getTime();
    expect(timestamp).toBeGreaterThanOrEqual(beforeCall);
    expect(timestamp).toBeLessThanOrEqual(afterCall);
  });

  test('should return positive uptime', async ({ request }) => {
    const response = await request.get('/api/health');
    const data = await response.json();

    expect(data.uptime).toBeGreaterThanOrEqual(0);
  });

  test('should have correct Content-Type header', async ({ request }) => {
    const response = await request.get('/api/health');
    const contentType = response.headers()['content-type'];

    expect(contentType).toContain('application/json');
  });

  test('should handle multiple concurrent requests', async ({ request }) => {
    // Simulate load balancer health checks
    const requests = Array.from({ length: 10 }, () =>
      request.get('/api/health')
    );

    const responses = await Promise.all(requests);

    // All should return 200
    responses.forEach((response) => {
      expect(response.status()).toBe(200);
    });

    // All should have valid data
    const dataPromises = responses.map((response) => response.json());
    const dataResults = await Promise.all(dataPromises);

    dataResults.forEach((data) => {
      expect(data.status).toBe('ok');
      expect(data.timestamp).toBeDefined();
      expect(data.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  test('should respond quickly (under 1 second)', async ({ request }) => {
    const startTime = Date.now();
    const response = await request.get('/api/health');
    const endTime = Date.now();

    expect(response.status()).toBe(200);
    expect(endTime - startTime).toBeLessThan(1000); // Should respond in under 1 second
  });

  test('should be accessible without authentication', async ({ request }) => {
    // Health checks should not require authentication for container orchestration
    const response = await request.get('/api/health');
    expect(response.status()).toBe(200);
    expect(response.status()).not.toBe(401); // Not unauthorized
    expect(response.status()).not.toBe(403); // Not forbidden
  });
});
