import { describe, it, expect, beforeEach } from 'vitest';
import { ensureValidPortfolio } from '../portfolio-validation';
import { db } from '@/lib/db';

describe('ensureValidPortfolio', () => {
  beforeEach(async () => {
    // Clear and reset database before each test
    await db.delete();
    await db.open();
  });

  it('should create default portfolio when none exist', async () => {
    const result = await ensureValidPortfolio(null);

    expect(result.wasCreated).toBe(true);
    expect(result.portfolio.name).toBe('My Portfolio');
    expect(result.portfolio.type).toBe('taxable');
    expect(result.portfolio.currency).toBe('USD');
    expect(result.portfolioId).toBe(result.portfolio.id);

    // Verify portfolio was actually created in database
    const portfolios = await db.portfolios.toArray();
    expect(portfolios).toHaveLength(1);
    expect(portfolios[0].id).toBe(result.portfolioId);
  });

  it('should return existing portfolio when valid ID provided', async () => {
    // Create portfolio first
    const firstResult = await ensureValidPortfolio(null);
    expect(firstResult.wasCreated).toBe(true);

    // Call again with same ID
    const secondResult = await ensureValidPortfolio(firstResult.portfolioId);
    expect(secondResult.wasCreated).toBe(false);
    expect(secondResult.portfolioId).toBe(firstResult.portfolioId);
    expect(secondResult.portfolio.id).toBe(firstResult.portfolio.id);

    // Verify only one portfolio exists
    const portfolios = await db.portfolios.toArray();
    expect(portfolios).toHaveLength(1);
  });

  it('should return first portfolio when invalid ID and portfolios exist', async () => {
    // Create portfolio
    const first = await ensureValidPortfolio(null);
    expect(first.wasCreated).toBe(true);

    // Call with invalid ID
    const result = await ensureValidPortfolio('invalid-id-123');
    expect(result.wasCreated).toBe(false);
    expect(result.portfolioId).toBe(first.portfolioId);

    // Verify still only one portfolio
    const portfolios = await db.portfolios.toArray();
    expect(portfolios).toHaveLength(1);
  });

  it('should reject "default" string as portfolio ID and create new', async () => {
    const result = await ensureValidPortfolio('default');

    expect(result.wasCreated).toBe(true);
    expect(result.portfolioId).not.toBe('default');
    expect(result.portfolio.name).toBe('My Portfolio');

    // Verify portfolio was created
    const portfolios = await db.portfolios.toArray();
    expect(portfolios).toHaveLength(1);
  });

  it('should create portfolio when null provided and none exist', async () => {
    const result = await ensureValidPortfolio(null);

    expect(result.wasCreated).toBe(true);
    expect(result.portfolioId).toBeTruthy();
    expect(result.portfolio).toBeTruthy();
    expect(result.portfolio.settings).toBeTruthy();
    expect(result.portfolio.settings.rebalanceThreshold).toBe(5);
  });

  it('should return first available when null provided and portfolios exist', async () => {
    // Create first portfolio
    const first = await ensureValidPortfolio(null);

    // Call with null again
    const result = await ensureValidPortfolio(null);

    expect(result.wasCreated).toBe(false);
    expect(result.portfolioId).toBe(first.portfolioId);

    // Verify still only one portfolio
    const portfolios = await db.portfolios.toArray();
    expect(portfolios).toHaveLength(1);
  });

  it('should handle multiple portfolios and return first', async () => {
    // Create first portfolio using ensureValidPortfolio
    const first = await ensureValidPortfolio(null);

    // Create second portfolio directly via db
    const now = new Date();
    const secondId = await db.portfolios.add({
      name: 'Second Portfolio',
      type: 'ira',
      currency: 'EUR',
      createdAt: now,
      updatedAt: now,
      settings: {
        rebalanceThreshold: 10,
        taxStrategy: 'fifo',
        autoRebalance: false,
        dividendReinvestment: false,
      },
    } as any);

    // Call with invalid ID
    const result = await ensureValidPortfolio('invalid');

    expect(result.wasCreated).toBe(false);
    expect(result.portfolioId).toBe(first.portfolioId); // Should return first

    // Verify two portfolios exist
    const portfolios = await db.portfolios.toArray();
    expect(portfolios).toHaveLength(2);
  });

  it('should throw error if portfolio creation fails', async () => {
    // This test is tricky - we'd need to mock the db to simulate failure
    // For now, we can verify the error handling path exists by checking
    // that the function properly propagates errors

    // Close the database to simulate failure
    await db.close();

    await expect(ensureValidPortfolio(null)).rejects.toThrow();

    // Reopen for cleanup
    await db.open();
  });

  it('should have correct default portfolio settings', async () => {
    const result = await ensureValidPortfolio(null);

    expect(result.portfolio.settings).toEqual({
      rebalanceThreshold: 5,
      taxStrategy: 'fifo',
      autoRebalance: false,
      dividendReinvestment: true,
    });
  });

  it('should preserve portfolio data when returning existing', async () => {
    // Create with custom data
    const now = new Date();
    const portfolioId = await db.portfolios.add({
      name: 'Custom Portfolio',
      type: 'roth',
      currency: 'GBP',
      createdAt: now,
      updatedAt: now,
      settings: {
        rebalanceThreshold: 8,
        taxStrategy: 'lifo',
        autoRebalance: true,
        dividendReinvestment: false,
      },
    } as any);

    const result = await ensureValidPortfolio(String(portfolioId));

    expect(result.wasCreated).toBe(false);
    expect(result.portfolio.name).toBe('Custom Portfolio');
    expect(result.portfolio.type).toBe('roth');
    expect(result.portfolio.currency).toBe('GBP');
    expect(result.portfolio.settings.taxStrategy).toBe('lifo');
  });

  it('should handle empty string as invalid portfolio ID', async () => {
    const result = await ensureValidPortfolio('');

    expect(result.wasCreated).toBe(true); // Should create new portfolio
    expect(result.portfolioId).not.toBe('');
    expect(result.portfolio.name).toBe('My Portfolio');

    // Verify portfolio was created
    const portfolios = await db.portfolios.toArray();
    expect(portfolios).toHaveLength(1);
  });
});
