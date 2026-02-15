/**
 * Shared form interaction helpers for E2E tests.
 *
 * These helpers encapsulate the actual UI patterns used by the transaction
 * form components (Popover date pickers, shadcn Select, etc.) so that
 * individual test files don't need to know implementation details.
 */

import { Page, expect } from '@playwright/test';

/**
 * Fill the transaction date via the Popover date picker.
 * The button text is dynamic: "Pick a date" when empty, or a formatted date
 * (e.g., "February 14, 2026") when set. The form defaults to today's date,
 * so we locate the button by its parent label section instead of button text.
 */
export async function fillTransactionDate(page: Page, dateStr: string) {
  const dateButton = page.locator('.space-y-2')
    .filter({ hasText: 'Transaction Date' })
    .getByRole('button');
  await dateButton.click();
  // Use .last() because a previously closed Popover may still have its
  // date input in the DOM.  The most recently opened one is always last.
  const dateInput = page.locator('[data-radix-popper-content-wrapper] input[type="date"]').last();
  await dateInput.fill(dateStr);
  await page.keyboard.press('Escape');
}

/**
 * Fill the ESPP grant date via its Popover date picker.
 * The grant date uses a Popover with "Select grant date" button text.
 */
export async function fillGrantDate(page: Page, dateStr: string) {
  const grantDateButton = page.getByRole('button', { name: /select grant date/i });
  await grantDateButton.click();
  // Use .last() because a previously closed Popover may still have its
  // date input in the DOM.  The most recently opened one is always last.
  const dateInput = page.locator('[data-radix-popper-content-wrapper] input[type="date"]').last();
  await dateInput.fill(dateStr);
  await page.keyboard.press('Escape');
}

/**
 * Fill the RSU vesting date via its Popover date picker.
 * The vesting date uses a Popover with "Select vesting date" button text.
 */
export async function fillVestingDate(page: Page, dateStr: string) {
  const vestingDateButton = page.getByRole('button', { name: /select vesting date/i });
  await vestingDateButton.click();
  // Use .last() because a previously closed Popover may still have its
  // date input in the DOM.  The most recently opened one is always last.
  const dateInput = page.locator('[data-radix-popper-content-wrapper] input[type="date"]').last();
  await dateInput.fill(dateStr);
  await page.keyboard.press('Escape');
}

/**
 * Select a transaction type from the shadcn Select component.
 * The Select trigger has id="type" and options have role="option".
 */
export async function selectTransactionType(page: Page, typeLabel: string) {
  await page.locator('#type').click();
  await page.getByRole('option', { name: new RegExp(`^${typeLabel}$`, 'i') }).click();
}

/**
 * Get a locator for the transaction dialog (avoids matching Radix Popover remnants).
 * Radix Popover content also has role="dialog", so we scope by the dialog title.
 */
export function getTransactionDialog(page: Page) {
  return page.getByRole('dialog', { name: /transaction/i });
}

/**
 * Navigate to the transactions page and open the Add Transaction dialog.
 */
export async function openAddTransactionDialog(page: Page) {
  await page.goto('/transactions');
  await page.waitForLoadState('load');
  await page.getByRole('button', { name: /add transaction/i }).click();
  await expect(getTransactionDialog(page)).toBeVisible();
}

/**
 * Fill the core transaction fields (symbol, quantity, price).
 * Uses element IDs which are stable and match the actual form implementation.
 */
export async function fillTransactionFields(page: Page, opts: {
  symbol: string;
  quantity: string;
  price: string;
  date?: string;
  fees?: string;
}) {
  await page.locator('#assetSymbol').fill(opts.symbol);
  if (opts.date) {
    await fillTransactionDate(page, opts.date);
  }
  await page.locator('#quantity').fill(opts.quantity);
  await page.locator('#price').fill(opts.price);
  if (opts.fees) {
    await page.locator('#fees').fill(opts.fees);
  }
}

/**
 * Submit the transaction form within the dialog.
 * Scopes to the transaction dialog to avoid matching the trigger button
 * and Radix Popover remnants.
 */
export async function submitTransaction(page: Page) {
  const dialog = getTransactionDialog(page);
  await dialog.getByRole('button', { name: /add transaction/i }).click();
}

/**
 * Complete flow: open dialog, select type, fill fields, submit.
 */
export async function createTransaction(page: Page, opts: {
  type?: string;
  symbol: string;
  quantity: string;
  price: string;
  date?: string;
  fees?: string;
}) {
  if (opts.type) {
    await selectTransactionType(page, opts.type);
  }
  await fillTransactionFields(page, opts);
  await submitTransaction(page);
  await expect(getTransactionDialog(page)).not.toBeVisible({ timeout: 5000 });
}
