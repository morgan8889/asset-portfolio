/**
 * Zod validation schemas for export functionality
 * @feature 011-export-functionality
 */

import { z } from 'zod';

export const ReportTypeSchema = z.enum([
  'performance',
  'transactions',
  'holdings',
]);

export const DateRangePresetSchema = z.enum(['YTD', '1Y', 'ALL']);

export const ExportFormatSchema = z.enum(['pdf', 'csv']);

export const ReportConfigSchema = z
  .object({
    type: ReportTypeSchema,
    portfolioId: z.string().min(1, 'Portfolio ID is required'),
    dateRange: DateRangePresetSchema,
    format: ExportFormatSchema,
    filename: z.string().optional(),
  })
  .refine(
    (data) => {
      // Performance reports must be PDF
      if (data.type === 'performance') return data.format === 'pdf';
      // Transaction and holdings reports must be CSV
      return data.format === 'csv';
    },
    {
      message:
        'Performance reports must be PDF format; Transaction and Holdings reports must be CSV format',
    }
  );

export const ExportProgressSchema = z.object({
  status: z.enum(['idle', 'preparing', 'generating', 'complete', 'error']),
  progress: z.number().min(0).max(100),
  message: z.string().optional(),
  error: z.string().optional(),
});
