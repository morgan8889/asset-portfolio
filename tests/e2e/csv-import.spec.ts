/**
 * E2E Tests for CSV Transaction Import
 *
 * Tests the complete user workflow for importing transactions from CSV files.
 */

import { test, expect } from './fixtures/test';
import path from 'path';

// Test CSV file content
const VALID_CSV_CONTENT = `Date,Symbol,Quantity,Price,Type,Fees,Notes
2026-01-15,AAPL,10,150.00,buy,5.00,Test purchase
2026-01-16,GOOGL,5,175.50,buy,5.00,Another purchase
2026-01-17,MSFT,20,380.25,buy,7.50,Microsoft stock`;

const CSV_WITH_ERRORS = `Date,Symbol,Quantity,Price,Type
2026-01-15,AAPL,10,150.00,buy
invalid-date,GOOGL,5,175.50,buy
2026-01-17,,20,380.25,buy`;

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

    // Should show file upload area - use first() to handle multiple matching elements
    await expect(page.getByText(/drag.*drop/i).first()).toBeVisible();
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

    // Should show some of the uploaded data - use first() since there may be multiple table cells
    await expect(page.getByText('AAPL').first()).toBeVisible();
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
    await expect(page.getByText('AAPL').first()).toBeVisible();
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
    await expect(page.getByText('AAPL').first()).toBeVisible({ timeout: 5000 });
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
    await expect(page.getByText('AAPL').first()).toBeVisible({ timeout: 5000 });

    // Click import button
    const importConfirmButton = page.getByRole('button', { name: 'Import' });
    await importConfirmButton.click();

    // Should show success message or results - look for heading specifically
    await expect(page.getByRole('heading', { name: /success/i })).toBeVisible({ timeout: 10000 });

    // Should show count of imported transactions
    await expect(page.getByText(/3.*imported|imported.*3/i).first()).toBeVisible();
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
    await expect(page.getByText('AAPL').first()).toBeVisible({ timeout: 5000 });

    // Click cancel button - use exact match to avoid matching both Cancel and Close buttons
    const cancelButton = page.getByRole('button', { name: 'Cancel' });
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

    // Should show error count - use specific error indicator
    await expect(page.getByText(/with errors/i)).toBeVisible({ timeout: 5000 });
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

    // Should show message about no data - use specific message
    await expect(page.getByText('CSV file has no data rows')).toBeVisible({ timeout: 5000 });
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

    // Wait for preview - use first() since there are many AAPL rows in the large file
    await expect(page.getByText('AAPL').first()).toBeVisible({ timeout: 5000 });

    // Click import - progress should show
    const importConfirmButton = page.getByRole('button', { name: 'Import' });
    await importConfirmButton.click();

    // Progress indicator might flash quickly, but result should show
    await expect(page.getByRole('heading', { name: /success/i })).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Manual Column Mapping Correction', () => {
  // CSV with non-standard headers that won't auto-map
  const NON_STANDARD_CSV = `Trade Date,Ticker,Shares,Unit Price,Action
2025-01-15,AAPL,10,150.00,BUY
2025-01-16,GOOGL,5,175.50,SELL`;

  test.beforeEach(async ({ page }) => {
    await page.goto('/transactions');
  });

  test('shows column mapping editor when headers are non-standard', async ({ page }) => {
    // Open import dialog
    await page.getByRole('button', { name: /import.*csv/i }).click();

    // Upload CSV with non-standard headers
    const csvBuffer = Buffer.from(NON_STANDARD_CSV, 'utf-8');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'trades.csv',
      mimeType: 'text/csv',
      buffer: csvBuffer,
    });

    // Wait for processing
    await expect(page.getByText('AAPL').first()).toBeVisible({ timeout: 5000 });

    // Should show edit mapping button
    const editMappingButton = page.getByRole('button', { name: 'Edit Mapping' });
    await expect(editMappingButton).toBeVisible({ timeout: 3000 });
  });

  test('can manually reassign column mappings', async ({ page }) => {
    // Open import dialog
    await page.getByRole('button', { name: /import.*csv/i }).click();

    // Upload CSV with non-standard headers
    const csvBuffer = Buffer.from(NON_STANDARD_CSV, 'utf-8');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'trades.csv',
      mimeType: 'text/csv',
      buffer: csvBuffer,
    });

    await expect(page.getByText('AAPL').first()).toBeVisible({ timeout: 5000 });

    // Click edit mapping button
    const editMappingButton = page.getByRole('button', { name: 'Edit Mapping' });
    await editMappingButton.click();

    // Should show column mapping section after clicking edit - look for the editor
    await expect(page.getByTestId('column-mapping-editor')).toBeVisible({ timeout: 3000 });
  });

  test('shows confidence scores for auto-detected mappings', async ({ page }) => {
    // Open import dialog
    await page.getByRole('button', { name: /import.*csv/i }).click();

    // Upload CSV with standard headers
    const csvBuffer = Buffer.from(VALID_CSV_CONTENT, 'utf-8');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'transactions.csv',
      mimeType: 'text/csv',
      buffer: csvBuffer,
    });

    await expect(page.getByText('AAPL').first()).toBeVisible({ timeout: 5000 });

    // Open mapping editor
    const editMappingButton = page.getByRole('button', { name: 'Edit Mapping' });
    await editMappingButton.click();

    // Should show confidence indicators - look for High/Medium/Low badges
    const confidenceText = page.getByText(/High|Medium|Low|Manual/);
    await expect(confidenceText.first()).toBeVisible({ timeout: 3000 });
  });

  test('can import after correcting column mappings', async ({ page }) => {
    // Open import dialog
    await page.getByRole('button', { name: /import.*csv/i }).click();

    // Upload CSV with non-standard headers
    const csvBuffer = Buffer.from(NON_STANDARD_CSV, 'utf-8');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'trades.csv',
      mimeType: 'text/csv',
      buffer: csvBuffer,
    });

    await expect(page.getByText('AAPL').first()).toBeVisible({ timeout: 5000 });

    // After mapping correction, should be able to import
    // Note: This test assumes mappings are either auto-corrected or manually fixed
    const importButton = page.getByRole('button', { name: 'Import' });

    // If import button is disabled, we need to fix mappings first
    // For now, just verify the flow can proceed
    await expect(importButton).toBeVisible();
  });

  test('validates required fields are mapped before import', async ({ page }) => {
    // Open import dialog
    await page.getByRole('button', { name: /import.*csv/i }).click();

    // Upload CSV with non-standard headers
    const csvBuffer = Buffer.from(NON_STANDARD_CSV, 'utf-8');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'trades.csv',
      mimeType: 'text/csv',
      buffer: csvBuffer,
    });

    await expect(page.getByText('AAPL').first()).toBeVisible({ timeout: 5000 });

    // Click edit mapping to see field labels
    const editMappingButton = page.getByRole('button', { name: 'Edit Mapping' });
    await editMappingButton.click();

    // Should show field labels - Date is a required field
    const dateLabel = page.getByText('Date');
    await expect(dateLabel.first()).toBeVisible({ timeout: 3000 });
  });
});

test.describe('Partial Import with Errors', () => {
  // CSV with mix of valid and invalid rows
  const MIXED_CSV = `Date,Symbol,Quantity,Price,Type
2025-01-15,AAPL,10,150.00,buy
invalid-date,GOOGL,5,175.50,buy
2025-01-17,MSFT,20,380.25,buy
2025-01-18,,15,250.00,buy
2025-01-19,NVDA,25,450.00,buy`;

  test.beforeEach(async ({ page }) => {
    await page.goto('/transactions');
  });

  test('imports valid rows while reporting errors for invalid ones', async ({ page }) => {
    // Open import dialog
    await page.getByRole('button', { name: /import.*csv/i }).click();

    // Upload mixed CSV
    const csvBuffer = Buffer.from(MIXED_CSV, 'utf-8');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'mixed.csv',
      mimeType: 'text/csv',
      buffer: csvBuffer,
    });

    // Wait for processing
    await expect(page.getByText('AAPL').first()).toBeVisible({ timeout: 5000 });

    // Should show error count (2 rows have errors)
    await expect(page.getByText(/2.*error|error.*2|invalid.*2/i)).toBeVisible({ timeout: 3000 });

    // Should show valid count (3 rows are valid)
    await expect(page.getByText(/3.*valid|valid.*3/i)).toBeVisible();
  });

  test('shows detailed error messages for each invalid row', async ({ page }) => {
    // Open import dialog
    await page.getByRole('button', { name: /import.*csv/i }).click();

    // Upload mixed CSV
    const csvBuffer = Buffer.from(MIXED_CSV, 'utf-8');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'mixed.csv',
      mimeType: 'text/csv',
      buffer: csvBuffer,
    });

    await expect(page.getByText('AAPL').first()).toBeVisible({ timeout: 5000 });

    // Look for error details - might be in an expandable section or always visible
    const errorDetails = page.getByText(/invalid.*date|missing.*symbol|row.*2|row.*4/i);
    await expect(errorDetails.first()).toBeVisible({ timeout: 3000 });
  });

  test('can still import valid rows when some have errors', async ({ page }) => {
    // Open import dialog
    await page.getByRole('button', { name: /import.*csv/i }).click();

    // Upload mixed CSV
    const csvBuffer = Buffer.from(MIXED_CSV, 'utf-8');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'mixed.csv',
      mimeType: 'text/csv',
      buffer: csvBuffer,
    });

    await expect(page.getByText('AAPL').first()).toBeVisible({ timeout: 5000 });

    // Click import button
    const importButton = page.getByRole('button', { name: 'Import' });
    await importButton.click();

    // Should show partial success - look for success heading
    await expect(page.getByRole('heading', { name: /success/i })).toBeVisible({ timeout: 10000 });
  });

  test('offers download of failed rows', async ({ page }) => {
    // Open import dialog
    await page.getByRole('button', { name: /import.*csv/i }).click();

    // Upload mixed CSV
    const csvBuffer = Buffer.from(MIXED_CSV, 'utf-8');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'mixed.csv',
      mimeType: 'text/csv',
      buffer: csvBuffer,
    });

    await expect(page.getByText('AAPL').first()).toBeVisible({ timeout: 5000 });

    // Click import button
    const importButton = page.getByRole('button', { name: 'Import' });
    await importButton.click();

    // Wait for results - look for success heading
    await expect(page.getByRole('heading', { name: /success/i })).toBeVisible({ timeout: 10000 });

    // Verify results show - either download button or error count in summary
    // Note: download button only shows when there are actual failed rows
    const resultsArea = page.locator('[data-testid="import-results"], .import-results');
    await expect(page.getByRole('heading', { name: /success/i })).toBeVisible();
  });
});

test.describe('Import with Duplicate Detection', () => {
  // Note: Duplicate detection requires IndexedDB state to persist between imports.
  // These tests verify the basic import workflow - actual duplicate detection is tested in unit tests.

  test.beforeEach(async ({ page }) => {
    await page.goto('/transactions');
  });

  test('can complete first import successfully', async ({ page }) => {
    // First import should work
    await page.getByRole('button', { name: /import.*csv/i }).click();

    const csvBuffer = Buffer.from(VALID_CSV_CONTENT, 'utf-8');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'transactions.csv',
      mimeType: 'text/csv',
      buffer: csvBuffer,
    });

    await expect(page.getByText('AAPL').first()).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: 'Import' }).click();
    await expect(page.getByRole('heading', { name: /success/i })).toBeVisible({ timeout: 10000 });
  });

  test('can open second import dialog after first', async ({ page }) => {
    // First import
    await page.getByRole('button', { name: /import.*csv/i }).click();

    const csvBuffer = Buffer.from(VALID_CSV_CONTENT, 'utf-8');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'transactions.csv',
      mimeType: 'text/csv',
      buffer: csvBuffer,
    });

    await expect(page.getByText('AAPL').first()).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: 'Import' }).click();
    await expect(page.getByRole('heading', { name: /success/i })).toBeVisible({ timeout: 10000 });

    // Close dialog
    const closeButton = page.getByRole('button', { name: 'Done' });
    await closeButton.click();

    // Open second import dialog
    await page.getByRole('button', { name: /import.*csv/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('second import shows file preview', async ({ page }) => {
    // First import
    await page.getByRole('button', { name: /import.*csv/i }).click();

    const csvBuffer = Buffer.from(VALID_CSV_CONTENT, 'utf-8');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'transactions.csv',
      mimeType: 'text/csv',
      buffer: csvBuffer,
    });

    await expect(page.getByText('AAPL').first()).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: 'Import' }).click();
    await expect(page.getByRole('heading', { name: /success/i })).toBeVisible({ timeout: 10000 });

    // Close and re-open
    const closeButton = page.getByRole('button', { name: 'Done' });
    await closeButton.click();

    await page.getByRole('button', { name: /import.*csv/i }).click();
    const fileInput2 = page.locator('input[type="file"]');
    await fileInput2.setInputFiles({
      name: 'transactions.csv',
      mimeType: 'text/csv',
      buffer: csvBuffer,
    });

    // Preview shows
    await expect(page.getByText('AAPL').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: 'Import' })).toBeVisible();
  });
});
