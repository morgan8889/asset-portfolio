import { db } from './schema';

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
const migrations: Migration[] = [
  {
    version: 1,
    description: 'Initial schema',
    up: async () => {
      // Initial schema is already defined in the Dexie constructor
      // This migration is just for tracking
      console.log('Applying initial schema migration...');
    },
    down: async () => {
      // Cannot easily rollback initial schema
      throw new Error('Cannot rollback initial migration');
    },
  },
  // Future migrations can be added here
  // {
  //   version: 2,
  //   description: 'Add new fields to portfolios',
  //   up: async () => {
  //     // Migration logic here
  //   },
  //   down: async () => {
  //     // Rollback logic here
  //   },
  // },
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
      console.warn('Could not get current migration version:', error);
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
      console.log('Database is up to date');
      return;
    }

    console.log(
      `Migrating database from version ${currentVersion} to ${latestVersion}`
    );

    // Apply migrations in order
    for (const migration of migrations) {
      if (migration.version > currentVersion) {
        try {
          console.log(
            `Applying migration ${migration.version}: ${migration.description}`
          );
          await migration.up();
          await this.setCurrentVersion(
            migration.version,
            migration.description
          );
          console.log(`Migration ${migration.version} completed`);
        } catch (error) {
          console.error(`Migration ${migration.version} failed:`, error);
          throw new Error(
            `Migration failed at version ${migration.version}: ${error}`
          );
        }
      }
    }

    console.log('All migrations completed successfully');
  }

  static async rollback(targetVersion: number): Promise<void> {
    const currentVersion = await this.getCurrentVersion();

    if (targetVersion >= currentVersion) {
      console.log('No rollback needed');
      return;
    }

    console.log(
      `Rolling back database from version ${currentVersion} to ${targetVersion}`
    );

    // Apply rollbacks in reverse order
    const rollbackMigrations = migrations
      .filter((m) => m.version > targetVersion && m.version <= currentVersion)
      .sort((a, b) => b.version - a.version);

    for (const migration of rollbackMigrations) {
      try {
        console.log(
          `Rolling back migration ${migration.version}: ${migration.description}`
        );
        await migration.down();
        console.log(`Rollback ${migration.version} completed`);
      } catch (error) {
        console.error(`Rollback ${migration.version} failed:`, error);
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

    console.log('Rollback completed successfully');
  }

  static async reset(): Promise<void> {
    console.log('Resetting database...');

    try {
      await db.delete();
      console.log('Database reset completed');
    } catch (error) {
      console.error('Database reset failed:', error);
      throw error;
    }
  }

  static async getAppliedMigrations(): Promise<MigrationState[]> {
    try {
      const settings = await db.userSettings
        .where('key')
        .startsWith('migration_')
        .toArray();

      return settings
        .map((s) => s.value as MigrationState)
        .sort((a, b) => a.version - b.version);
    } catch (error) {
      console.warn('Could not get applied migrations:', error);
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

      console.log('Database validation passed');
      return true;
    } catch (error) {
      console.error('Database validation failed:', error);
      return false;
    }
  }
}

// Initialize database and run migrations
export async function initializeDatabase(): Promise<void> {
  try {
    console.log('Initializing database...');

    // Open the database
    await db.open();

    // Validate database structure
    const isValid = await MigrationManager.validateDatabase();
    if (!isValid) {
      throw new Error('Database validation failed');
    }

    // Run migrations
    await MigrationManager.migrate();

    console.log('Database initialization completed');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

// Utility function to seed initial data (for development)
export async function seedInitialData(): Promise<void> {
  try {
    // Check if data already exists
    const portfolioCount = await db.portfolios.count();
    if (portfolioCount > 0) {
      console.log('Database already contains data, skipping seed');
      return;
    }

    console.log('Seeding initial data...');

    // Create default portfolio
    const portfolioId = crypto.randomUUID();
    await db.portfolios.add({
      id: portfolioId,
      name: 'My Portfolio',
      type: 'taxable',
      currency: 'USD',
      createdAt: new Date(),
      updatedAt: new Date(),
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

    console.log('Initial data seeded successfully');
  } catch (error) {
    console.error('Failed to seed initial data:', error);
    throw error;
  }
}

export { migrations };
