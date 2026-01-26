/**
 * Price API Response Schemas
 *
 * Feature: 005-live-market-data
 *
 * Zod schemas for validating price API responses.
 */

import { z } from 'zod';

// Market state enum
export const marketStateSchema = z.enum(['PRE', 'REGULAR', 'POST', 'CLOSED']);

// Price metadata schema
export const priceMetadataSchema = z.object({
  currency: z.string().optional(),
  rawCurrency: z.string().optional(),
  marketState: marketStateSchema.optional(),
  regularMarketTime: z.number().optional(),
  previousClose: z.number().optional(),
  change: z.number().optional(),
  changePercent: z.number().optional(),
  exchangeName: z.string().optional(),
  fullExchangeName: z.string().optional(),
  change24h: z.number().optional(),
  lastUpdated: z.number().optional(),
});

// Single price response schema
export const priceResponseSchema = z.object({
  symbol: z.string(),
  price: z.number(),
  source: z.string(),
  metadata: priceMetadataSchema.optional(),
  timestamp: z.string().datetime(),
});

// Batch price item schema
export const batchPriceItemSchema = z.object({
  symbol: z.string(),
  price: z.number(),
  source: z.string(),
  metadata: priceMetadataSchema.optional(),
  timestamp: z.string().datetime(),
  cached: z.boolean(),
});

// Batch price error schema
export const batchPriceErrorSchema = z.object({
  symbol: z.string(),
  error: z.string(),
});

// Batch price response schema
export const batchPriceResponseSchema = z.object({
  successful: z.array(batchPriceItemSchema),
  failed: z.array(batchPriceErrorSchema),
  total: z.number(),
  timestamp: z.string().datetime(),
});

// Export types
export type PriceMetadata = z.infer<typeof priceMetadataSchema>;
export type PriceResponse = z.infer<typeof priceResponseSchema>;
export type BatchPriceItem = z.infer<typeof batchPriceItemSchema>;
export type BatchPriceError = z.infer<typeof batchPriceErrorSchema>;
export type BatchPriceResponse = z.infer<typeof batchPriceResponseSchema>;
