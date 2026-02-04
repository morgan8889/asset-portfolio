import { db } from './schema';
import { logger } from '@/lib/utils/logger';
import type { Portfolio } from '@/types/portfolio';

// Migration interface
interface Migration {
  version: number;
  description: string;
  up: () => Promise<void>;
  down: () => Promise<void>;
}

// Track migration state
export interface MigrationState {
  version: number;
  appliedAt: Date;
  description: string;
}

// Migration registry
// Migration version mapping:
// - Data migration versions (1, 2, ...) are independent of Dexie schema versions
// - Dexie schema versions (v1-v5) are defined in schema.ts using version() method
// - Data migrations transform existing data without changing the schema structure
// - Migration 1: Initial setup (maps to Dexie schema v1-v4)
// - Migration 2: Add lastAccessedAt field data to existing portfolios (Dexie schema v5)
const migrations: Migration[] = [
  {
    version: 1,
    description: 'Initial schema',
    up: async () => {
      // Initial schema (v1-v4) is defined in Dexie version() calls in schema.ts
      // This migration exists for version tracking only
      // Actual schema includes:
      // - portfolios, assets, holdings, transactions
      // - priceHistory, priceSnapshots, dividendRecords, performanceSnapshots
      // - userSettings, liabilities, liabilityPayments (v4: net worth tracking)
      logger.info('Applying initial schema migration...');
    },
    down: async () => {
      // Cannot rollback initial schema (would destroy all data)
      throw new Error('Cannot rollback initial migration');
    },
  },
  {
    version: 2,
    description: 'Add lastAccessedAt to portfolios for recency sorting',
    up: async () => {
      logger.info('Adding lastAccessedAt field to existing portfolios...');

      // Get all portfolios
      const portfolios = await db.portfolios.toArray();

      // Update each portfolio with lastAccessedAt = updatedAt (default)
      for (const portfolio of portfolios) {
        if (!portfolio.lastAccessedAt) {
          await db.portfolios.update(portfolio.id, {
            lastAccessedAt: portfolio.updatedAt || portfolio.createdAt,
          });
        }
      }

      logger.info(`Updated ${portfolios.length} portfolios with lastAccessedAt`);
    },
    down: async () => {
      logger.info('Removing lastAccessedAt field from portfolios...');

      // Get all portfolios
      const portfolios = await db.portfolios.toArray();

      // Remove lastAccessedAt field
      for (const portfolio of portfolios) {
        // Use object destructuring with type assertion for migration rollback
        const { lastAccessedAt, ...rest } = portfolio as Portfolio & { lastAccessedAt?: Date };
        await db.portfolios.put(rest);
      }

      logger.info('lastAccessedAt field removed from portfolios');
    },
  },
];

// Migration manager
export class MigrationManager {
  private static readonly MIGRATION_KEY = 'db_migration_state';

  static async getCurrentVersion(): Promise<number> {
    try {
      const state = await db.userSettings
        .where('key')
        .equals(this.MIGRATION_KEY)
        .first();
      const migrationState = state?.value as MigrationState | undefined;
      return migrationState?.version || 0;
    } catch (error) {
      logger.warn('Could not get current migration version:', error);
      return 0;
    }
  }

  static async setCurrentVersion(
    version: number,
    description: string
  ): Promise<void> {
    const state: MigrationState = {
      version,
      appliedAt: new Date(),
      description,
    };

    const existing = await db.userSettings
      .where('key')
      .equals(this.MIGRATION_KEY)
      .first();

    if (existing) {
      await db.userSettings.update(existing.id!, {
        value: state,
        updatedAt: new Date(),
      });
    } else {
      await db.userSettings.add({
        key: this.MIGRATION_KEY,
        value: state,
        updatedAt: new Date(),
      });
    }
  }

  static async migrate(): Promise<void> {
    const currentVersion = await this.getCurrentVersion();
    const latestVersion = Math.max(...migrations.map((m) => m.version));

    if (currentVersion >= latestVersion) {
      logger.info('Database is up to date');
      return;
    }

    logger.info(
      `Migrating database from version ${currentVersion} to ${latestVersion}`
    );

    // Apply migrations in order
    for (const migration of migrations) {
      if (migration.version > currentVersion) {
        try {
          logger.info(
            `Applying migration ${migration.version}: ${migration.description}`
          );
          await migration.up();
          await this.setCurrentVersion(
            migration.version,
            migration.description
          );
          logger.info(`Migration ${migration.version} completed`);
        } catch (error) {
          logger.error(`Migration ${migration.version} failed:`, error);
          throw new Error(
            `Migration failed at version ${migration.version}: ${error}`
          );
        }
      }
    }

    logger.info('All migrations completed successfully');
  }

  static async rollback(targetVersion: number): Promise<void> {
    const currentVersion = await this.getCurrentVersion();

    if (targetVersion >= currentVersion) {
      logger.info('No rollback needed');
      return;
    }

    logger.info(
      `Rolling back database from version ${currentVersion} to ${targetVersion}`
    );

    // Apply rollbacks in reverse order
    const rollbackMigrations = migrations
      .filter((m) => m.version > targetVersion && m.version <= currentVersion)
      .sort((a, b) => b.version - a.version);

    for (const migration of rollbackMigrations) {
      try {
        logger.info(
          `Rolling back migration ${migration.version}: ${migration.description}`
        );
        await migration.down();
        logger.info(`Rollback ${migration.version} completed`);
      } catch (error) {
        logger.error(`Rollback ${migration.version} failed:`, error);
        throw new Error(
          `Rollback failed at version ${migration.version}: ${error}`
        );
      }
    }

    // Update the version after successful rollback
    const targetMigration = migrations.find((m) => m.version === targetVersion);
    await this.setCurrentVersion(
      targetVersion,
      targetMigration?.description || 'Rolled back'
    );

    logger.info('Rollback completed successfully');
  }

  static async reset(): Promise<void> {
    logger.info('Resetting database...');

    try {
      await db.delete();
      logger.info('Database reset completed');
    } catch (error) {
      logger.error('Database reset failed:', error);
      throw error;
    }
  }

  static async getAppliedMigrations(): Promise<MigrationState[]> {
    try {
      // Get the current migration state from db_migration_state key
      const state = await db.userSettings
        .where('key')
        .equals(this.MIGRATION_KEY)
        .first();

      if (state?.value) {
        // Return as an array with the current migration state
        return [state.value as MigrationState];
      }

      return [];
    } catch (error) {
      logger.warn('Could not get applied migrations:', error);
      return [];
    }
  }

  static async validateDatabase(): Promise<boolean> {
    try {
      // Check if all required tables exist and are accessible
      await db.portfolios.limit(1).toArray();
      await db.assets.limit(1).toArray();
      await db.holdings.limit(1).toArray();
      await db.transactions.limit(1).toArray();
      await db.priceHistory.limit(1).toArray();
      await db.priceSnapshots.limit(1).toArray();
      await db.dividendRecords.limit(1).toArray();
      await db.userSettings.limit(1).toArray();

      logger.info('Database validation passed');
      return true;
    } catch (error) {
      logger.error('Database validation failed:', error);
      return false;
    }
  }
}

// Initialize database and run migrations
export async function initializeDatabase(): Promise<void> {
  try {
    logger.info('Initializing database...');

    // Open the database
    await db.open();

    // Validate database structure
    const isValid = await MigrationManager.validateDatabase();
    if (!isValid) {
      throw new Error('Database validation failed');
    }

    // Run migrations
    await MigrationManager.migrate();

    logger.info('Database initialization completed');
  } catch (error) {
    logger.error('Database initialization failed:', error);
    throw error;
  }
}

// Utility function to seed initial data (for development)
export async function seedInitialData(): Promise<void> {
  try {
    // Check if data already exists
    const portfolioCount = await db.portfolios.count();
    if (portfolioCount > 0) {
      logger.info('Database already contains data, skipping seed');
      return;
    }

    logger.info('Seeding initial data...');

    // Create default portfolio
    const portfolioId = crypto.randomUUID();
    const now = new Date();
    await db.portfolios.add({
      id: portfolioId,
      name: 'My Portfolio',
      type: 'taxable',
      currency: 'USD',
      createdAt: now,
      updatedAt: now,
      lastAccessedAt: now,
      settings: {
        rebalanceThreshold: 5,
        taxStrategy: 'fifo',
        autoRebalance: false,
        dividendReinvestment: true,
      },
    });

    // Create some sample assets
    const appleId = crypto.randomUUID();
    await db.assets.add({
      id: appleId,
      symbol: 'AAPL',
      name: 'Apple Inc.',
      type: 'stock',
      exchange: 'NASDAQ',
      currency: 'USD',
      sector: 'Technology',
      metadata: {
        description:
          'Apple Inc. designs, manufactures, and markets consumer electronics, computer software, and online services.',
        website: 'https://www.apple.com',
        industry: 'Consumer Electronics',
        country: 'US',
      },
    });

    const spyId = crypto.randomUUID();
    await db.assets.add({
      id: spyId,
      symbol: 'SPY',
      name: 'SPDR S&P 500 ETF Trust',
      type: 'etf',
      exchange: 'NYSE',
      currency: 'USD',
      sector: 'Financial Services',
      metadata: {
        description:
          'The SPDR S&P 500 ETF Trust seeks to provide investment results that correspond to the price and yield performance of the S&P 500 Index.',
        website: 'https://www.ssga.com',
        industry: 'Asset Management',
        country: 'US',
      },
    });

    // Set default settings
    await db.userSettings.add({
      key: 'theme',
      value: 'system',
      updatedAt: new Date(),
    });

    await db.userSettings.add({
      key: 'currency',
      value: 'USD',
      updatedAt: new Date(),
    });

    await db.userSettings.add({
      key: 'priceUpdateInterval',
      value: 300000, // 5 minutes
      updatedAt: new Date(),
    });

    logger.info('Initial data seeded successfully');
  } catch (error) {
    logger.error('Failed to seed initial data:', error);
    throw error;
  }
}

export { migrations };
