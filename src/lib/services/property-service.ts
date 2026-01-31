import { Decimal } from 'decimal.js';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/db/schema';
import { Asset, Holding, Transaction, RentalInfo } from '@/types';
import type {
  AssetId,
  HoldingId,
  TransactionId,
  PriceHistoryId,
  HoldingStorage,
  TransactionStorage,
} from '@/types/storage';
import { holdingToStorage, transactionToStorage } from '@/lib/db/converters';

/**
 * Property Service
 *
 * Handles real estate asset management including:
 * - Property addition and valuation
 * - Rental income tracking
 * - Net value calculations with ownership percentage
 * - Manual price updates
 */

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate net value of a property holding based on ownership percentage
 *
 * @param currentValue - Current market value of the property
 * @param ownershipPercentage - Percentage owned (0-100)
 * @returns Net value as Decimal
 */
export function calculateNetValue(
  currentValue: Decimal,
  ownershipPercentage: number = 100
): Decimal {
  if (ownershipPercentage < 0 || ownershipPercentage > 100) {
    throw new Error('Ownership percentage must be between 0 and 100');
  }

  return currentValue.mul(ownershipPercentage).div(100);
}

/**
 * Calculate annual yield percentage for a rental property
 *
 * Formula: (Monthly Rent * 12) / Current Value * 100
 *
 * @param monthlyRent - Monthly rental income as Decimal
 * @param currentValue - Current property value as Decimal
 * @returns Annual yield as percentage number, or undefined if cannot calculate
 */
export function calculateYield(
  monthlyRent: Decimal,
  currentValue: Decimal
): number | undefined {
  if (currentValue.isZero()) {
    return undefined; // Cannot calculate yield for zero-value property
  }

  const annualRent = monthlyRent.mul(12);
  const yieldDecimal = annualRent.div(currentValue).mul(100);

  return yieldDecimal.toNumber();
}

/**
 * Calculate annual yield from an asset with rental info
 *
 * @param asset - Asset with rentalInfo
 * @returns Annual yield as percentage, or undefined if not calculable
 */
export function getAssetAnnualYield(asset: Asset): number | undefined {
  if (!asset.rentalInfo?.isRental || !asset.rentalInfo.monthlyRent) {
    return undefined;
  }

  const currentPrice = asset.currentPrice ?? 0;
  if (currentPrice === 0) {
    return undefined;
  }

  const monthlyRent =
    typeof asset.rentalInfo.monthlyRent === 'string'
      ? new Decimal(asset.rentalInfo.monthlyRent)
      : asset.rentalInfo.monthlyRent;

  return calculateYield(monthlyRent, new Decimal(currentPrice));
}

// ============================================================================
// Property Management Functions
// ============================================================================

export interface PropertyFormData {
  name: string;
  type: 'real_estate';
  purchasePrice: string; // Input string parsed to Decimal
  currentValue: string; // Input string parsed to Decimal
  purchaseDate: Date;
  address?: string;
  ownershipPercentage: number; // 0-100
  isRental: boolean;
  monthlyRent?: string; // Input string
  notes?: string;
}

/**
 * Add a new property asset to the portfolio
 *
 * Creates:
 * - Asset record with manual valuation
 * - Holding record with ownership percentage
 * - Initial buy transaction for cost basis
 *
 * @param portfolioId - Portfolio ID
 * @param data - Property form data
 * @returns Created asset ID
 */
export async function addPropertyAsset(
  portfolioId: string,
  data: PropertyFormData
): Promise<string> {
  // Validate ownership percentage (must be between 0 and 100)
  if (data.ownershipPercentage < 0 || data.ownershipPercentage > 100) {
    throw new Error('Ownership percentage must be between 0 and 100');
  }

  // Parse monetary values
  const purchasePrice = new Decimal(data.purchasePrice);
  const currentValue = new Decimal(data.currentValue);
  const monthlyRent = data.monthlyRent
    ? new Decimal(data.monthlyRent)
    : new Decimal(0);

  // Validate values
  if (purchasePrice.isNegative()) {
    throw new Error('Purchase price cannot be negative');
  }
  if (currentValue.isNegative()) {
    throw new Error('Current value cannot be negative');
  }
  if (monthlyRent.isNegative()) {
    throw new Error('Monthly rent cannot be negative');
  }

  const assetId = uuidv4() as AssetId;
  const holdingId = uuidv4() as HoldingId;
  const transactionId = uuidv4() as TransactionId;

  // Get portfolio for currency
  const portfolio = await db.portfolios.get(portfolioId);
  if (!portfolio) {
    throw new Error('Portfolio not found');
  }

  // Prepare rental info if applicable
  let rentalInfo: RentalInfo | undefined;
  if (data.isRental) {
    rentalInfo = {
      isRental: true,
      monthlyRent,
      address: data.address,
      notes: data.notes,
    };
  }

  // Generate safe symbol from name (alphanumeric + underscore only, max 50 chars)
  const sanitizedSymbol = data.name
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .substring(0, 50); // Limit length

  // Create Asset
  const asset: Asset = {
    id: assetId,
    symbol: sanitizedSymbol || 'PROPERTY', // Fallback if name has no valid chars
    name: data.name,
    type: 'real_estate',
    currency: portfolio.currency,
    currentPrice: currentValue.toNumber(), // Store as number for compatibility
    priceUpdatedAt: new Date(),
    metadata: {},
    valuationMethod: 'MANUAL',
    rentalInfo,
  };

  await db.assets.add(asset);

  // Calculate net values based on ownership percentage
  const netCurrentValue = calculateNetValue(
    currentValue,
    data.ownershipPercentage
  );
  const netPurchasePrice = calculateNetValue(
    purchasePrice,
    data.ownershipPercentage
  );
  const unrealizedGain = netCurrentValue.sub(netPurchasePrice);
  const unrealizedGainPercent = netPurchasePrice.isZero()
    ? 0
    : unrealizedGain.div(netPurchasePrice).mul(100).toNumber();

  // Create Holding
  const holding: Holding = {
    id: holdingId,
    portfolioId,
    assetId,
    quantity: new Decimal(1), // Property count
    costBasis: netPurchasePrice,
    averageCost: netPurchasePrice, // For property, average cost = net purchase price
    currentValue: netCurrentValue,
    unrealizedGain,
    unrealizedGainPercent,
    lots: [],
    lastUpdated: new Date(),
    ownershipPercentage: data.ownershipPercentage,
  };

  // Convert domain type to storage format before adding to database
  await db.holdings.add(holdingToStorage(holding));

  // Create initial buy transaction for cost basis tracking
  const transaction: Transaction = {
    id: transactionId,
    portfolioId,
    assetId,
    type: 'buy',
    date: data.purchaseDate,
    quantity: new Decimal(1),
    price: purchasePrice, // Full price before ownership adjustment
    totalAmount: netPurchasePrice, // Net amount paid
    fees: new Decimal(0),
    currency: portfolio.currency,
    notes: `Initial property acquisition: ${data.ownershipPercentage}% ownership`,
  };

  // Convert domain type to storage format before adding to database
  await db.transactions.add(transactionToStorage(transaction));

  return assetId;
}

/**
 * Update manual price for an asset with valuationMethod='MANUAL'
 *
 * Updates:
 * - Asset.currentPrice
 * - Associated holdings
 * - Creates price history entry (optional, for tracking)
 *
 * @param assetId - Asset ID
 * @param newPrice - New estimated value as Decimal
 * @param date - Date of valuation
 */
export async function updateManualPrice(
  assetId: AssetId | string,
  newPrice: Decimal,
  date: Date = new Date()
): Promise<void> {
  // Validate price
  if (newPrice.isNegative()) {
    throw new Error('Price cannot be negative');
  }

  // Get asset and verify it's manual valuation
  const asset = await db.assets.get(assetId);
  if (!asset) {
    throw new Error('Asset not found');
  }

  if (asset.valuationMethod !== 'MANUAL') {
    throw new Error('Can only update price for manually valued assets');
  }

  // Update asset price
  await db.assets.update(assetId, {
    currentPrice: newPrice.toNumber(),
    priceUpdatedAt: date,
  });

  // Update all holdings for this asset
  const holdings = await db.holdings.where('assetId').equals(assetId).toArray();

  for (const holdingStorage of holdings) {
    const holding = db.convertHoldingDecimals(holdingStorage);
    const ownershipPct = holding.ownershipPercentage ?? 100;

    // Calculate new net value
    const netValue = calculateNetValue(newPrice, ownershipPct);
    const unrealizedGain = netValue.sub(holding.costBasis);
    const unrealizedGainPercent = holding.costBasis.isZero()
      ? 0
      : unrealizedGain.div(holding.costBasis).mul(100).toNumber();

    await db.holdings.update(holding.id, {
      currentValue: netValue,
      unrealizedGain,
      unrealizedGainPercent,
      lastUpdated: date,
    });
  }

  // Optional: Create price history entry for tracking
  // This can be used for historical charts/analysis
  const priceHistoryId = uuidv4() as PriceHistoryId;
  const priceString = newPrice.toString();
  await db.priceHistory.add({
    id: priceHistoryId,
    assetId: assetId as AssetId,
    date,
    open: priceString,
    high: priceString,
    low: priceString,
    close: priceString,
    adjustedClose: priceString,
    volume: 0,
    source: 'manual',
  });
}

/**
 * Update rental information for a property asset
 *
 * @param assetId - Asset ID
 * @param rentalInfo - Partial rental info to update
 */
export async function updateRentalInfo(
  assetId: AssetId | string,
  rentalInfo: Partial<RentalInfo>
): Promise<void> {
  const asset = await db.assets.get(assetId);
  if (!asset) {
    throw new Error('Asset not found');
  }

  if (asset.type !== 'real_estate') {
    throw new Error('Can only update rental info for real estate assets');
  }

  // Merge with existing rental info
  const updatedRentalInfo: RentalInfo = {
    ...(asset.rentalInfo || { isRental: false, monthlyRent: new Decimal(0) }),
    ...rentalInfo,
  };

  await db.assets.update(assetId, {
    rentalInfo: updatedRentalInfo,
  });
}
