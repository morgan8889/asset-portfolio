# Quickstart: Configurable Portfolio Dashboard

**Feature**: 002-portfolio-dashboard | **Date**: 2026-01-22

## Prerequisites

Before implementing this feature:

1. **Branch**: Ensure you're on the `002-portfolio-dashboard` branch
2. **Dependencies**: Run `npm install` to ensure all existing packages are installed
3. **Database**: The application should have existing portfolios with transactions for testing

## New Dependencies

Install the drag-and-drop library:

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

## Key Files to Create

### 1. Types (`src/types/dashboard.ts`)

Copy types from `specs/002-portfolio-dashboard/contracts/dashboard-config.ts`:
- `WidgetId`, `WidgetDefinition`
- `TimePeriod`, `TimePeriodConfig`
- `DashboardConfiguration`
- `HoldingPerformance`, `HistoricalValuePoint`, `CategoryAllocation`
- Zod validation schemas

### 2. Dashboard Store (`src/lib/stores/dashboard.ts`)

```typescript
import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import { DashboardConfiguration, WidgetId, TimePeriod } from '@/types/dashboard';
import { dashboardConfigService } from '@/lib/services/dashboard-config';

interface DashboardState {
  config: DashboardConfiguration | null;
  loading: boolean;
  error: string | null;

  // Actions
  loadConfig: () => Promise<void>;
  setWidgetVisibility: (widgetId: WidgetId, visible: boolean) => Promise<void>;
  setWidgetOrder: (order: WidgetId[]) => Promise<void>;
  setTimePeriod: (period: TimePeriod) => Promise<void>;
  resetToDefault: () => Promise<void>;
}

export const useDashboardStore = create<DashboardState>()(
  devtools(
    (set, get) => ({
      config: null,
      loading: false,
      error: null,

      loadConfig: async () => {
        set({ loading: true, error: null });
        try {
          const config = await dashboardConfigService.getConfig();
          set({ config, loading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to load config',
            loading: false,
          });
        }
      },

      // ... implement other actions
    }),
    { name: 'dashboard-store' }
  )
);
```

### 3. Dashboard Config Service (`src/lib/services/dashboard-config.ts`)

```typescript
import { db } from '@/lib/db';
import {
  DashboardConfiguration,
  DashboardConfigurationSchema,
  WidgetId,
  TimePeriod,
} from '@/types/dashboard';

const STORAGE_KEY = 'dashboard-config';

const DEFAULT_CONFIG: DashboardConfiguration = {
  version: 1,
  widgetOrder: [
    'total-value',
    'gain-loss',
    'day-change',
    'category-breakdown',
    'growth-chart',
    'top-performers',
    'biggest-losers',
    'recent-activity',
  ],
  widgetVisibility: {
    'total-value': true,
    'gain-loss': true,
    'day-change': true,
    'category-breakdown': true,
    'growth-chart': true,
    'top-performers': true,
    'biggest-losers': true,
    'recent-activity': true,
  },
  timePeriod: 'ALL',
  performerCount: 5,
  lastUpdated: new Date().toISOString(),
};

export const dashboardConfigService = {
  async getConfig(): Promise<DashboardConfiguration> {
    const setting = await db.userSettings.get({ key: STORAGE_KEY });
    if (!setting) return DEFAULT_CONFIG;

    const result = DashboardConfigurationSchema.safeParse(setting.value);
    if (!result.success) {
      console.warn('Invalid dashboard config, using default:', result.error);
      return DEFAULT_CONFIG;
    }
    return result.data;
  },

  async saveConfig(config: DashboardConfiguration): Promise<void> {
    const validated = DashboardConfigurationSchema.parse(config);
    validated.lastUpdated = new Date().toISOString();

    await db.userSettings.put({
      key: STORAGE_KEY,
      value: validated,
      updatedAt: new Date(),
    });
  },

  async resetToDefault(): Promise<DashboardConfiguration> {
    await db.userSettings.delete(STORAGE_KEY);
    return DEFAULT_CONFIG;
  },
};
```

### 4. Widget Components (`src/components/dashboard/widgets/`)

Each widget should follow this pattern:

```typescript
// src/components/dashboard/widgets/top-performers-widget.tsx
'use client';

import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { HoldingPerformance } from '@/types/dashboard';
import { formatCurrency, formatPercentage } from '@/lib/utils';

interface TopPerformersWidgetProps {
  performers: HoldingPerformance[];
  isLoading?: boolean;
}

export const TopPerformersWidget = memo(function TopPerformersWidget({
  performers,
  isLoading,
}: TopPerformersWidgetProps) {
  if (isLoading) {
    return <WidgetSkeleton title="Top Performers" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-green-600" />
          Top Performers
        </CardTitle>
      </CardHeader>
      <CardContent>
        {performers.length === 0 ? (
          <p className="text-muted-foreground">No holdings with gains</p>
        ) : (
          <ul className="space-y-3">
            {performers.map((p) => (
              <li key={p.holdingId} className="flex justify-between items-center">
                <div>
                  <div className="font-medium">{p.symbol}</div>
                  <div className="text-sm text-muted-foreground">{p.name}</div>
                </div>
                <div className="text-right text-green-600">
                  <div className="font-medium">+{formatPercentage(p.percentGain)}</div>
                  <div className="text-sm">+{formatCurrency(p.absoluteGain.toNumber())}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
});
```

### 5. Dashboard Container (`src/components/dashboard/dashboard-container.tsx`)

```typescript
'use client';

import { useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { useDashboardStore } from '@/lib/stores/dashboard';
import { WidgetWrapper } from './widget-wrapper';
import { WIDGET_DEFINITIONS } from '@/types/dashboard';

export function DashboardContainer() {
  const { config, loadConfig, setWidgetOrder } = useDashboardStore();

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = config!.widgetOrder.indexOf(active.id as WidgetId);
      const newIndex = config!.widgetOrder.indexOf(over.id as WidgetId);
      const newOrder = arrayMove(config!.widgetOrder, oldIndex, newIndex);
      setWidgetOrder(newOrder);
    }
  };

  if (!config) return <DashboardSkeleton />;

  const visibleWidgets = config.widgetOrder.filter(
    (id) => config.widgetVisibility[id]
  );

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={visibleWidgets} strategy={rectSortingStrategy}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {visibleWidgets.map((widgetId) => (
            <WidgetWrapper
              key={widgetId}
              id={widgetId}
              definition={WIDGET_DEFINITIONS[widgetId]}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
```

## Testing Strategy

### Unit Tests

```typescript
// tests/unit/performance-calculator.test.ts
import { describe, it, expect } from 'vitest';
import { Decimal } from 'decimal.js';
import { calculatePerformance } from '@/lib/services/performance-calculator';

describe('calculatePerformance', () => {
  it('calculates positive gain correctly', () => {
    const result = calculatePerformance(
      new Decimal('1000'), // start value
      new Decimal('1100')  // current value
    );
    expect(result.percentGain).toBe(10);
    expect(result.absoluteGain.toString()).toBe('100');
  });

  it('calculates negative loss correctly', () => {
    const result = calculatePerformance(
      new Decimal('1000'),
      new Decimal('900')
    );
    expect(result.percentGain).toBe(-10);
    expect(result.absoluteGain.toString()).toBe('-100');
  });

  it('handles zero start value', () => {
    const result = calculatePerformance(
      new Decimal('0'),
      new Decimal('100')
    );
    expect(result.percentGain).toBe(0); // Avoid division by zero
  });
});
```

### E2E Tests

```typescript
// tests/e2e/dashboard-configuration.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Dashboard Configuration', () => {
  test('can toggle widget visibility', async ({ page }) => {
    await page.goto('/');

    // Open settings
    await page.click('[data-testid="dashboard-settings-btn"]');

    // Toggle "Biggest Losers" off
    await page.click('[data-testid="toggle-biggest-losers"]');

    // Close settings
    await page.click('[data-testid="settings-close"]');

    // Verify widget is hidden
    await expect(page.locator('[data-widget="biggest-losers"]')).not.toBeVisible();
  });

  test('persists configuration after reload', async ({ page }) => {
    await page.goto('/');

    // Change time period to "This Month"
    await page.click('[data-testid="period-MONTH"]');

    // Reload page
    await page.reload();

    // Verify selection persisted
    await expect(page.locator('[data-testid="period-MONTH"]')).toHaveAttribute('aria-pressed', 'true');
  });
});
```

## Implementation Order

1. **Types & Contracts** (30 min)
   - Create `src/types/dashboard.ts` with all types and schemas

2. **Services** (2 hours)
   - `dashboard-config.ts` - config CRUD
   - `performance-calculator.ts` - gain/loss calculations
   - `historical-value.ts` - chart data reconstruction

3. **Store** (1 hour)
   - `dashboard.ts` - Zustand store with actions

4. **Widgets** (3 hours)
   - Create each widget component with React.memo
   - Implement loading states and empty states

5. **Dashboard Container** (2 hours)
   - Integrate dnd-kit for drag-drop
   - Wire up widget rendering

6. **Settings Modal** (1.5 hours)
   - Toggle visibility
   - Mobile up/down reordering
   - Reset to default

7. **Integration** (1 hour)
   - Update main dashboard page
   - Connect stores and services

8. **Testing** (2 hours)
   - Unit tests for services
   - E2E tests for key workflows

## Verification Checklist

- [ ] All widgets render with correct data
- [ ] Widget visibility toggles persist after refresh
- [ ] Drag-drop reordering works on desktop
- [ ] Mobile settings modal with up/down works
- [ ] Time period selection updates all metrics
- [ ] Top performers sorted by gain % descending
- [ ] Biggest losers sorted by gain % ascending
- [ ] Empty states display when no data
- [ ] Stale data indicators show when prices are old
- [ ] Reset to default restores original layout
- [ ] All calculations use decimal.js (no floating point)
- [ ] Unit test coverage ≥70% for services
- [ ] E2E tests pass for configuration workflow
