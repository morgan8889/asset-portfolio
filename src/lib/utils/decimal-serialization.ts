import { Decimal } from 'decimal.js';

/**
 * Generic Decimal Serialization Utility
 *
 * Provides type-safe serialization and deserialization of Decimal fields
 * for IndexedDB storage. Eliminates repetitive transform functions.
 */

/**
 * Serializes Decimal fields to strings for storage
 * @param obj The object containing Decimal fields
 * @param fields Array of field names to serialize
 * @returns New object with specified Decimal fields converted to strings
 */
export function serializeDecimalFields<
  T extends object,
  K extends keyof T,
>(obj: T, fields: K[]): Omit<T, K> & Record<K, string> {
  const result = { ...obj } as any;

  for (const field of fields) {
    const value = obj[field];
    if (value instanceof Decimal) {
      result[field] = value.toString();
    } else if (typeof value === 'number') {
      result[field] = value.toString();
    } else if (value !== undefined && value !== null) {
      // Already a string or other serializable type
      result[field] = String(value);
    }
  }

  return result;
}

/**
 * Deserializes string fields back to Decimal instances
 * @param obj The object containing string fields
 * @param fields Array of field names to deserialize
 * @param defaultValue Default Decimal value for undefined/null fields (defaults to 0)
 * @returns New object with specified string fields converted to Decimals
 */
export function deserializeDecimalFields<
  T extends object,
  K extends keyof T,
>(obj: T, fields: K[], defaultValue: Decimal = new Decimal(0)): Omit<T, K> & Record<K, Decimal> {
  const result = { ...obj } as any;

  for (const field of fields) {
    const value = obj[field];
    if (value instanceof Decimal) {
      // Already a Decimal, keep it
      result[field] = value;
    } else if (value !== undefined && value !== null && value !== '') {
      result[field] = new Decimal(value as string | number);
    } else {
      result[field] = defaultValue;
    }
  }

  return result;
}

/**
 * Serializes an array of objects with Decimal fields
 */
export function serializeDecimalArray<
  T extends object,
  K extends keyof T,
>(arr: T[], fields: K[]): Array<Omit<T, K> & Record<K, string>> {
  return arr.map((item) => serializeDecimalFields(item, fields));
}

/**
 * Deserializes an array of objects with string fields to Decimals
 */
export function deserializeDecimalArray<
  T extends object,
  K extends keyof T,
>(arr: T[], fields: K[], defaultValue?: Decimal): Array<Omit<T, K> & Record<K, Decimal>> {
  return arr.map((item) => deserializeDecimalFields(item, fields, defaultValue));
}

/**
 * Checks if a value is a Decimal instance
 */
export function isDecimal(value: unknown): value is Decimal {
  return value instanceof Decimal;
}

/**
 * Safely converts a value to Decimal
 */
export function toDecimal(value: string | number | Decimal | undefined | null): Decimal {
  if (value instanceof Decimal) {
    return value;
  }
  if (value === undefined || value === null || value === '') {
    return new Decimal(0);
  }
  return new Decimal(value);
}

// Field definitions for common entity types
export const HOLDING_DECIMAL_FIELDS = [
  'quantity',
  'costBasis',
  'averageCost',
  'currentValue',
  'unrealizedGain',
] as const;

export const TAX_LOT_DECIMAL_FIELDS = [
  'quantity',
  'purchasePrice',
  'soldQuantity',
  'remainingQuantity',
] as const;

export const TRANSACTION_DECIMAL_FIELDS = [
  'quantity',
  'price',
  'totalAmount',
  'fees',
] as const;

export const PRICE_HISTORY_DECIMAL_FIELDS = [
  'open',
  'high',
  'low',
  'close',
  'adjustedClose',
] as const;

export const PRICE_SNAPSHOT_DECIMAL_FIELDS = [
  'price',
  'change',
] as const;

export const DIVIDEND_RECORD_DECIMAL_FIELDS = [
  'amount',
  'perShare',
  'shares',
  'price',
] as const;
