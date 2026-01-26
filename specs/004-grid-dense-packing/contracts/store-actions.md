# Store Action Contracts: Grid Dense Packing

**Feature**: 004-grid-dense-packing
**Date**: 2026-01-25

## Overview

All new store actions follow the existing optimistic update pattern in `useDashboardStore`.

## New Actions

### setDensePacking

**Purpose**: Toggle dense packing mode on/off

**Signature**:
```typescript
setDensePacking: (enabled: boolean) => Promise<void>
```

**Behavior**:
1. Optimistically update `config.densePacking` in store
2. Persist to IndexedDB via `dashboardConfigService.setDensePacking()`
3. On error: rollback store state, set error message

**Example**:
```typescript
// Enable dense packing
await setDensePacking(true);

// Disable dense packing
await setDensePacking(false);
```

**Error Handling**:
```typescript
// On persistence failure:
set({ config, error: 'Failed to update dense packing setting' });
```

---

### setWidgetRowSpan

**Purpose**: Set the row span for a specific widget

**Signature**:
```typescript
setWidgetRowSpan: (widgetId: WidgetId, rowSpan: WidgetRowSpan) => Promise<void>
```

**Parameters**:
- `widgetId`: Valid widget identifier from `WidgetId` type
- `rowSpan`: 1, 2, or 3

**Behavior**:
1. Validate `rowSpan` is 1, 2, or 3
2. Optimistically update `config.widgetRowSpans[widgetId]` in store
3. Persist to IndexedDB via `dashboardConfigService.setWidgetRowSpan()`
4. On error: rollback store state, set error message

**Example**:
```typescript
// Set growth chart to span 2 rows
await setWidgetRowSpan('growth-chart', 2);

// Set metrics widget to single row
await setWidgetRowSpan('total-value', 1);
```

**Validation**:
```typescript
if (![1, 2, 3].includes(rowSpan)) {
  throw new Error('Row span must be 1, 2, or 3');
}
```

---

## Service Methods

### dashboardConfigService.setDensePacking

**Signature**:
```typescript
setDensePacking: (enabled: boolean) => Promise<void>
```

**Implementation**:
```typescript
async setDensePacking(enabled: boolean): Promise<void> {
  const config = await this.getConfig();
  const updated = {
    ...config,
    densePacking: enabled,
    lastUpdated: new Date().toISOString(),
  };
  await db.userSettings.put(updated, 'dashboard-config');
}
```

---

### dashboardConfigService.setWidgetRowSpan

**Signature**:
```typescript
setWidgetRowSpan: (widgetId: WidgetId, rowSpan: WidgetRowSpan) => Promise<void>
```

**Implementation**:
```typescript
async setWidgetRowSpan(widgetId: WidgetId, rowSpan: WidgetRowSpan): Promise<void> {
  const config = await this.getConfig();
  const updated = {
    ...config,
    widgetRowSpans: {
      ...config.widgetRowSpans,
      [widgetId]: rowSpan,
    },
    lastUpdated: new Date().toISOString(),
  };
  await db.userSettings.put(updated, 'dashboard-config');
}
```

---

## Store State Interface Update

```typescript
interface DashboardState {
  config: DashboardConfiguration | null;
  loading: boolean;
  error: string | null;

  // Existing actions
  loadConfig: () => Promise<void>;
  setWidgetVisibility: (widgetId: WidgetId, visible: boolean) => Promise<void>;
  setWidgetOrder: (order: WidgetId[]) => Promise<void>;
  setTimePeriod: (period: TimePeriod) => Promise<void>;
  setPerformerCount: (count: number) => Promise<void>;
  setLayoutMode: (mode: LayoutMode) => Promise<void>;
  setGridColumns: (columns: GridColumns) => Promise<void>;
  setWidgetSpan: (widgetId: WidgetId, span: WidgetSpan) => Promise<void>;
  resetToDefault: () => Promise<void>;
  clearError: () => void;

  // NEW in v3
  setDensePacking: (enabled: boolean) => Promise<void>;
  setWidgetRowSpan: (widgetId: WidgetId, rowSpan: WidgetRowSpan) => Promise<void>;
}
```

---

## Test Contracts

### Unit Tests

```typescript
describe('setDensePacking', () => {
  it('should enable dense packing', async () => {
    const { setDensePacking, config } = useDashboardStore.getState();
    await setDensePacking(true);
    expect(useDashboardStore.getState().config?.densePacking).toBe(true);
  });

  it('should disable dense packing', async () => {
    const { setDensePacking } = useDashboardStore.getState();
    await setDensePacking(false);
    expect(useDashboardStore.getState().config?.densePacking).toBe(false);
  });

  it('should rollback on persistence error', async () => {
    // Mock persistence failure
    const initialConfig = useDashboardStore.getState().config;
    vi.spyOn(dashboardConfigService, 'setDensePacking')
      .mockRejectedValue(new Error('DB error'));

    await useDashboardStore.getState().setDensePacking(true);

    expect(useDashboardStore.getState().config).toEqual(initialConfig);
    expect(useDashboardStore.getState().error).toContain('Failed to update');
  });
});

describe('setWidgetRowSpan', () => {
  it('should set widget row span to 2', async () => {
    const { setWidgetRowSpan } = useDashboardStore.getState();
    await setWidgetRowSpan('growth-chart', 2);
    expect(useDashboardStore.getState().config?.widgetRowSpans?.['growth-chart']).toBe(2);
  });

  it('should set widget row span to 3', async () => {
    const { setWidgetRowSpan } = useDashboardStore.getState();
    await setWidgetRowSpan('growth-chart', 3);
    expect(useDashboardStore.getState().config?.widgetRowSpans?.['growth-chart']).toBe(3);
  });
});
```
