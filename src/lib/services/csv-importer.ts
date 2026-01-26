/**
 * CSV Importer Service
 *
 * Orchestrates the complete CSV import workflow:
 * 1. Parse CSV file
 * 2. Detect column mappings
 * 3. Validate rows
 * 4. Detect duplicates
 * 5. Import valid transactions to database
 */

import { v4 as uuidv4 } from 'uuid';
import Decimal from 'decimal.js';
import { format } from 'date-fns';
import { db } from '@/lib/db/schema';
import type {
  ImportSession,
  ImportResult,
  ParsedRow,
  DuplicateMatch,
  DuplicateHandling,
} from '@/types/csv-import';
import type { Transaction } from '@/types/transaction';
import type { TransactionStorage } from '@/types/storage';
import { parseCsvFile, getPreviewData } from './csv-parser';
import { detectColumnMappings } from './column-detector';
import { validateRows } from './csv-validator';
import { generateCsv } from './csv-parser';
import { toAssetStorage, transactionToStorage } from '@/lib/db/converters';

const CHUNK_SIZE = 100;

/**
 * Start a new import session from a file.
 *
 * @param file - CSV file to import
 * @param portfolioId - Target portfolio ID
 * @returns Initial import session with parsed data
 */
export async function startImportSession(
  file: File,
  portfolioId: string
): Promise<ImportSession> {
  const sessionId = uuidv4();

  // Parse the CSV file
  const parseResult = await parseCsvFile(file);

  // Detect column mappings with sample data
  const detectionResult = detectColumnMappings(
    parseResult.headers,
    parseResult.rows.slice(0, 10)
  );

  // Get preview rows
  const previewData = getPreviewData(parseResult, 10);

  // Create initial session
  const session: ImportSession = {
    id: sessionId,
    portfolioId,
    status: 'detecting',
    fileName: file.name,
    fileSize: file.size,
    totalRows: parseResult.rowCount,
    createdAt: new Date(),

    detectedDelimiter: parseResult.delimiter,
    detectedHeaders: parseResult.headers,
    columnMappings: detectionResult.mappings,

    // Include detected brokerage if present
    detectedBrokerage: detectionResult.detectedBrokerage,

    previewRows: [],
    validRowCount: 0,
    errorRowCount: 0,
    errors: [],

    duplicateCount: 0,
    duplicates: [],
    duplicateHandling: 'skip',
  };

  // Validate preview rows
  if (detectionResult.missingRequiredFields.length === 0) {
    const validationResult = validateRows(
      previewData.rows,
      detectionResult.mappings
    );
    session.previewRows = validationResult.valid;
    session.status = 'preview';
  } else {
    session.status = 'mapping_review';
  }

  return session;
}

/**
 * Detect duplicate transactions in the import data.
 *
 * @param validRows - Valid parsed rows
 * @param portfolioId - Portfolio to check against
 * @returns Array of duplicate matches
 */
export async function detectDuplicates(
  validRows: ParsedRow[],
  portfolioId: string
): Promise<DuplicateMatch[]> {
  // Get existing transactions from the past 2 years for comparison
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

  const existingTransactions = await db.transactions
    .where('portfolioId')
    .equals(portfolioId)
    .filter((t) => new Date(t.date) >= twoYearsAgo)
    .toArray();

  // Create hash set of existing transactions
  const existingHashes = new Map<string, TransactionStorage>();
  for (const t of existingTransactions) {
    const hash = createTransactionHash(
      new Date(t.date),
      typeof t.assetId === 'string' ? t.assetId : String(t.assetId),
      new Decimal(t.quantity),
      new Decimal(t.price)
    );
    existingHashes.set(hash, t);
  }

  // Check each valid row for duplicates
  const duplicates: DuplicateMatch[] = [];
  for (const row of validRows) {
    if (
      !row.parsed.date ||
      !row.parsed.symbol ||
      !row.parsed.quantity ||
      !row.parsed.price
    ) {
      continue;
    }

    const hash = createTransactionHash(
      row.parsed.date,
      row.parsed.symbol,
      row.parsed.quantity,
      row.parsed.price
    );

    const existingTx = existingHashes.get(hash);
    if (existingTx) {
      duplicates.push({
        importRowNumber: row.rowNumber,
        importData: row,
        existingTransaction: {
          id: existingTx.id,
          date: new Date(existingTx.date),
          symbol: existingTx.assetId,
          type: existingTx.type,
          quantity: new Decimal(existingTx.quantity),
          price: new Decimal(existingTx.price),
        },
        matchConfidence: 'exact',
      });
    }
  }

  return duplicates;
}

/**
 * Create a hash for duplicate detection.
 */
function createTransactionHash(
  date: Date,
  symbol: string,
  quantity: Decimal,
  price: Decimal
): string {
  const dateStr = format(date, 'yyyy-MM-dd');
  const qty = quantity.toFixed(8);
  const prc = price.toFixed(8);
  return `${dateStr}|${symbol.toUpperCase()}|${qty}|${prc}`;
}

/**
 * Execute the final import of transactions.
 *
 * @param session - Current import session
 * @param validRows - Validated rows to import
 * @param duplicates - Detected duplicates
 * @param duplicateHandling - How to handle duplicates
 * @param onProgress - Progress callback (0-100)
 * @returns Import result with transaction IDs
 */
export async function executeImport(
  session: ImportSession,
  validRows: ParsedRow[],
  duplicates: DuplicateMatch[],
  duplicateHandling: DuplicateHandling,
  onProgress?: (progress: number) => void
): Promise<ImportResult> {
  const duplicateRowNumbers = new Set(duplicates.map((d) => d.importRowNumber));

  // Filter rows based on duplicate handling ('import' imports all, others skip duplicates)
  const shouldSkipDuplicates = duplicateHandling !== 'import';
  const rowsToImport = shouldSkipDuplicates
    ? validRows.filter((row) => !duplicateRowNumbers.has(row.rowNumber))
    : validRows;
  const skippedDuplicates = shouldSkipDuplicates ? duplicates.length : 0;

  const transactionIds: string[] = [];
  const failedRows: ParsedRow[] = [];
  let importedCount = 0;

  // Process in chunks for UI responsiveness
  for (let i = 0; i < rowsToImport.length; i += CHUNK_SIZE) {
    const chunk = rowsToImport.slice(i, i + CHUNK_SIZE);

    for (const row of chunk) {
      try {
        const transaction = await createTransactionFromRow(
          row,
          session.portfolioId,
          session.id
        );
        transactionIds.push(transaction.id);
        importedCount++;
      } catch (error) {
        failedRows.push(row);
      }
    }

    // Yield to UI thread
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Report progress
    if (onProgress) {
      const progress = Math.min(
        100,
        Math.round(((i + chunk.length) / rowsToImport.length) * 100)
      );
      onProgress(progress);
    }
  }

  // Generate failed rows CSV if any failures
  let failedRowsCsv: string | undefined;
  if (failedRows.length > 0) {
    failedRowsCsv = generateCsv(failedRows.map((r) => r.raw));
  }

  return {
    sessionId: session.id,
    success: importedCount > 0,
    totalRows: session.totalRows,
    importedCount,
    skippedDuplicates,
    errorCount: failedRows.length,
    errors: session.errors,
    transactionIds,
    failedRowsCsv,
  };
}

/**
 * Create a transaction record from a parsed row.
 */
async function createTransactionFromRow(
  row: ParsedRow,
  portfolioId: string,
  importSessionId: string
): Promise<Transaction> {
  const { parsed } = row;

  if (!parsed.date || !parsed.symbol || !parsed.quantity || !parsed.price) {
    throw new Error('Missing required fields');
  }

  // First, ensure the asset exists or create it
  let asset = await db.assets.where('symbol').equals(parsed.symbol).first();

  if (!asset) {
    // Create a basic asset record
    const assetId = uuidv4();
    // Note: Currently defaults all new assets to 'stock'. Consider inferring type
    // from symbol patterns (e.g., BTC-USD → crypto) or add post-import review step.
    const assetStorage = toAssetStorage({
      id: assetId,
      symbol: parsed.symbol,
      name: parsed.symbol, // Use symbol as name initially
      type: 'stock', // Default to stock
      currency: 'USD', // Default to USD
    });
    await db.assets.add(assetStorage);
    asset = await db.assets.get(assetId);
  }

  // Create the transaction
  const transactionId = uuidv4();
  const quantity = parsed.quantity.abs(); // Always store positive quantity
  const price = parsed.price;
  const totalAmount = quantity.mul(price);
  const fees = parsed.fees || new Decimal(0);

  const transaction: Transaction = {
    id: transactionId,
    portfolioId,
    assetId: asset!.id,
    type: parsed.type || 'buy',
    date: parsed.date,
    quantity,
    price,
    totalAmount,
    fees,
    currency: 'USD',
    notes: parsed.notes || undefined,
    importSource: importSessionId,
  };

  // Convert domain type to storage format with serialized Decimal fields
  const transactionStorage = transactionToStorage(transaction);
  await db.transactions.add(transactionStorage);

  return transaction;
}

/**
 * Cancel an import session (no-op for now, just returns).
 */
export function cancelImport(_session: ImportSession): void {
  // Session data is in memory, so cancellation just means
  // not calling executeImport
}
