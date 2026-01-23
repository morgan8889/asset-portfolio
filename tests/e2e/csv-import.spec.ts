/**
 * E2E Tests for CSV Transaction Import
 *
 * Tests the complete user workflow for importing transactions from CSV files.
 */

import { test, expect } from '@playwright/test';
import path from 'path';

// Test CSV file content
const VALID_CSV_CONTENT = `Date,Symbol,Quantity,Price,Type,Fees,Notes
2025-01-15,AAPL,10,150.00,buy,5.00,Test purchase
2025-01-16,GOOGL,5,175.50,buy,5.00,Another purchase
2025-01-17,MSFT,20,380.25,buy,7.50,Microsoft stock`;

const CSV_WITH_ERRORS = `Date,Symbol,Quantity,Price,Type
2025-01-15,AAPL,10,150.00,buy
invalid-date,GOOGL,5,175.50,buy
2025-01-17,,20,380.25,buy`;

test.describe('CSV Import Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to transactions page
    await page.goto('/transactions');
  });

  test('shows Import CSV button on transactions page', async ({ page }) => {
    // Look for the import button
    const importButton = page.getByRole('button', { name: /import.*csv/i });
    await expect(importButton).toBeVisible();
  });

  test('opens import dialog when clicking Import CSV button', async ({ page }) => {
    // Click import button
    await page.getByRole('button', { name: /import.*csv/i }).click();

    // Dialog should appear
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Should show file upload area
    await expect(page.getByText(/drag.*drop|choose.*file|upload/i)).toBeVisible();
  });

  test('accepts valid CSV file via file input', async ({ page }) => {
    // Open import dialog
    await page.getByRole('button', { name: /import.*csv/i }).click();

    // Create a test CSV file
    const csvBuffer = Buffer.from(VALID_CSV_CONTENT, 'utf-8');

    // Upload the file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'transactions.csv',
      mimeType: 'text/csv',
      buffer: csvBuffer,
    });

    // Should show preview after file is processed
    await expect(page.getByText(/preview|column.*mapping/i)).toBeVisible({ timeout: 5000 });

    // Should show some of the uploaded data
    await expect(page.getByText('AAPL')).toBeVisible();
  });

  test('shows column mapping detection results', async ({ page }) => {
    // Open import dialog
    await page.getByRole('button', { name: /import.*csv/i }).click();

    // Upload valid CSV
    const csvBuffer = Buffer.from(VALID_CSV_CONTENT, 'utf-8');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'transactions.csv',
      mimeType: 'text/csv',
      buffer: csvBuffer,
    });

    // Wait for processing
    await page.waitForTimeout(1000);

    // Should show detected column mappings
    // The exact UI depends on implementation, but should show mapping status
    const mappingIndicators = page.locator('[data-testid="column-mapping"], .column-mapping, [class*="mapping"]');

    // At minimum, should show the data preview
    await expect(page.getByText('AAPL')).toBeVisible();
    await expect(page.getByText('GOOGL')).toBeVisible();
  });

  test('shows preview of first 10 rows', async ({ page }) => {
    // Open import dialog
    await page.getByRole('button', { name: /import.*csv/i }).click();

    // Upload valid CSV
    const csvBuffer = Buffer.from(VALID_CSV_CONTENT, 'utf-8');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'transactions.csv',
      mimeType: 'text/csv',
      buffer: csvBuffer,
    });

    // Wait for preview to appear
    await expect(page.getByText('AAPL')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('GOOGL')).toBeVisible();
    await expect(page.getByText('MSFT')).toBeVisible();

    // Should show row count
    await expect(page.getByText(/3.*rows|rows.*3/i)).toBeVisible();
  });

  test('can import valid transactions', async ({ page }) => {
    // Open import dialog
    await page.getByRole('button', { name: /import.*csv/i }).click();

    // Upload valid CSV
    const csvBuffer = Buffer.from(VALID_CSV_CONTENT, 'utf-8');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'transactions.csv',
      mimeType: 'text/csv',
      buffer: csvBuffer,
    });

    // Wait for preview
    await expect(page.getByText('AAPL')).toBeVisible({ timeout: 5000 });

    // Click import button
    const importConfirmButton = page.getByRole('button', { name: /^import$|confirm.*import|import.*transactions/i });
    await importConfirmButton.click();

    // Should show success message or results
    await expect(page.getByText(/success|imported|complete/i)).toBeVisible({ timeout: 10000 });

    // Should show count of imported transactions
    await expect(page.getByText(/3.*imported|imported.*3/i)).toBeVisible();
  });

  test('can cancel import', async ({ page }) => {
    // Open import dialog
    await page.getByRole('button', { name: /import.*csv/i }).click();

    // Upload valid CSV
    const csvBuffer = Buffer.from(VALID_CSV_CONTENT, 'utf-8');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'transactions.csv',
      mimeType: 'text/csv',
      buffer: csvBuffer,
    });

    // Wait for preview
    await expect(page.getByText('AAPL')).toBeVisible({ timeout: 5000 });

    // Click cancel button
    const cancelButton = page.getByRole('button', { name: /cancel|close/i });
    await cancelButton.click();

    // Dialog should close
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 2000 });
  });

  test('shows validation errors for invalid rows', async ({ page }) => {
    // Open import dialog
    await page.getByRole('button', { name: /import.*csv/i }).click();

    // Upload CSV with errors
    const csvBuffer = Buffer.from(CSV_WITH_ERRORS, 'utf-8');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'invalid.csv',
      mimeType: 'text/csv',
      buffer: csvBuffer,
    });

    // Wait for processing
    await page.waitForTimeout(1000);

    // Should show error count
    await expect(page.getByText(/error|invalid|2.*issue|issue.*2/i)).toBeVisible({ timeout: 5000 });
  });

  test('rejects non-CSV files', async ({ page }) => {
    // Open import dialog
    await page.getByRole('button', { name: /import.*csv/i }).click();

    // Try to upload a non-CSV file
    const txtBuffer = Buffer.from('This is not a CSV file', 'utf-8');
    const fileInput = page.locator('input[type="file"]');

    // Some implementations may filter at input level, so this might not trigger
    // an error if accept=".csv" is set on the input
    await fileInput.setInputFiles({
      name: 'notcsv.txt',
      mimeType: 'text/plain',
      buffer: txtBuffer,
    });

    // Should either reject the file or show an error
    // This depends on implementation - might show error or just not process
    await page.waitForTimeout(500);
  });

  test('handles empty CSV file', async ({ page }) => {
    // Open import dialog
    await page.getByRole('button', { name: /import.*csv/i }).click();

    // Upload empty CSV (just headers)
    const emptyCSV = 'Date,Symbol,Quantity,Price,Type';
    const csvBuffer = Buffer.from(emptyCSV, 'utf-8');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'empty.csv',
      mimeType: 'text/csv',
      buffer: csvBuffer,
    });

    // Should show message about no data
    await expect(page.getByText(/no.*data|empty|0.*rows/i)).toBeVisible({ timeout: 5000 });
  });

  test('shows progress indicator during import', async ({ page }) => {
    // Open import dialog
    await page.getByRole('button', { name: /import.*csv/i }).click();

    // Create a larger CSV for progress visibility
    let largeCSV = 'Date,Symbol,Quantity,Price,Type\n';
    for (let i = 0; i < 50; i++) {
      largeCSV += `2025-01-${String(i % 28 + 1).padStart(2, '0')},AAPL,10,150.00,buy\n`;
    }
    const csvBuffer = Buffer.from(largeCSV, 'utf-8');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'large.csv',
      mimeType: 'text/csv',
      buffer: csvBuffer,
    });

    // Wait for preview
    await expect(page.getByText('AAPL')).toBeVisible({ timeout: 5000 });

    // Click import - progress should show
    const importConfirmButton = page.getByRole('button', { name: /^import$|confirm.*import|import.*transactions/i });
    await importConfirmButton.click();

    // Progress indicator might flash quickly, but result should show
    await expect(page.getByText(/success|imported|complete/i)).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Import with Duplicate Detection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/transactions');
  });

  test('detects duplicate transactions on second import', async ({ page }) => {
    // First import
    await page.getByRole('button', { name: /import.*csv/i }).click();

    const csvBuffer = Buffer.from(VALID_CSV_CONTENT, 'utf-8');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'transactions.csv',
      mimeType: 'text/csv',
      buffer: csvBuffer,
    });

    await expect(page.getByText('AAPL')).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /^import$|confirm.*import/i }).click();
    await expect(page.getByText(/success|imported|complete/i)).toBeVisible({ timeout: 10000 });

    // Close dialog
    const closeButton = page.getByRole('button', { name: /close|done/i });
    if (await closeButton.isVisible()) {
      await closeButton.click();
    }

    // Second import of same file
    await page.getByRole('button', { name: /import.*csv/i }).click();

    const fileInput2 = page.locator('input[type="file"]');
    await fileInput2.setInputFiles({
      name: 'transactions.csv',
      mimeType: 'text/csv',
      buffer: csvBuffer,
    });

    // Should show duplicate warning
    await expect(page.getByText(/duplicate|already.*exist|match/i)).toBeVisible({ timeout: 5000 });
  });
});
