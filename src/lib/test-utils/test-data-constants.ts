/**
 * Shared test data constants used across test utilities
 */

/**
 * Historical stock splits to simulate
 */
export const HISTORICAL_SPLITS: Record<
  string,
  { date: Date; ratio: number; description: string }[]
> = {
  AAPL: [
    {
      date: new Date('2020-08-31'),
      ratio: 4,
      description: '4-for-1 stock split',
    },
  ],
  GOOGL: [
    {
      date: new Date('2022-07-18'),
      ratio: 20,
      description: '20-for-1 stock split',
    },
  ],
  NVDA: [
    {
      date: new Date('2024-07-20'),
      ratio: 10,
      description: '10-for-1 stock split',
    },
  ],
};
