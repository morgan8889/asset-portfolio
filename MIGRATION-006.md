# Migration Guide: Performance Analytics (Feature 006)

## Database Schema Changes

Feature 006 introduces a new `performanceSnapshots` table to IndexedDB for storing pre-computed daily performance data.

### Schema Version

The database schema has been upgraded to **version 2** with the addition of the `performanceSnapshots` table.

### What Happens on Upgrade

When users upgrade to this version:

1. **Automatic Schema Migration**: The IndexedDB schema will automatically upgrade to version 2, creating the new `performanceSnapshots` table
2. **Empty Performance History**: Initially, the performance snapshots table will be empty
3. **On-Demand Computation**: Snapshots will be computed automatically when:
   - Users navigate to the Performance page for the first time
   - Users add, modify, or delete transactions
   - Users click the "Refresh" button on the Performance page

### Manual Refresh

If performance data appears missing or stale after upgrade, users can manually trigger a full recomputation:

1. Navigate to the Performance page
2. Click the "Refresh" button in the page header
3. Wait for snapshot computation to complete (typically 2-5 seconds for most portfolios)

### Performance Considerations

**Initial Computation Time**: The first time performance data is loaded, the system will compute daily snapshots for the entire transaction history. Computation time varies by:

- **Small portfolios** (< 1 year history, < 10 assets): < 1 second
- **Medium portfolios** (1-3 years history, 10-50 assets): 1-3 seconds
- **Large portfolios** (3+ years history, 50+ assets): 3-10 seconds

**Incremental Updates**: After initial computation, updates are incremental:
- Adding a transaction: Only recomputes from the transaction date forward
- Modifying a transaction: Recomputes from the earlier of old/new dates
- Deleting a transaction: Recomputes from the deleted date forward

### For Developers

**Database Schema Location**: `src/lib/db/schema.ts`

**Migration Logic**: The Dexie.js schema version is defined at line 676:
```typescript
export const db = new PortfolioTrackerDB();
db.version(2).stores({
  // ... existing tables ...
  performanceSnapshots: '++id, portfolioId, date, [portfolioId+date]',
});
```

**Triggering Computation**:
```typescript
import { computeSnapshots, recomputeAll } from '@/lib/services/snapshot-service';

// Incremental computation from a date
await computeSnapshots(portfolioId, fromDate);

// Full recomputation
await recomputeAll(portfolioId);
```

### Data Persistence

All performance snapshot data is stored locally in the browser's IndexedDB. No data is sent to any server. The data persists across browser sessions until:
- User clears browser data
- User deletes the portfolio
- User manually clears the cache

### Rollback

If you need to rollback to a previous version without performance analytics:

1. The old version will continue to work with existing data
2. Performance snapshots table will be ignored by older versions
3. No data migration is needed for rollback

### Known Limitations

1. **Interpolated Prices**: If price data is missing for certain dates, the system will interpolate values, marked with a flag in the snapshot
2. **Clock Time**: All snapshots use start-of-day (00:00:00) timestamps for consistency
3. **Cache Duration**: Benchmark data is cached for 6 hours to reduce API calls

### Support

For issues or questions about the migration:
- Check the browser console for any error messages
- Verify that transactions have valid dates and asset IDs
- Try the manual "Refresh" button to recompute all snapshots
- Report issues at https://github.com/morgan8889/asset-portfolio/issues
