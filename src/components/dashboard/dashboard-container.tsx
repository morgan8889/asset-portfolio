'use client';

/**
 * Dashboard Container Router
 *
 * Routes between legacy (CSS Grid + dnd-kit) and new (react-grid-layout)
 * implementations based on the useReactGridLayout feature flag.
 */

import { memo } from 'react';
import { useDashboardStore } from '@/lib/stores';
import { DashboardContainerLegacy } from './dashboard-container-legacy';
import { DashboardContainerRGL } from './dashboard-container-rgl';

interface DashboardContainerProps {
  disableDragDrop?: boolean;
}

const DashboardContainerComponent = ({
  disableDragDrop = false,
}: DashboardContainerProps) => {
  const { config } = useDashboardStore();

  // Feature flag determines implementation
  // Default to legacy if config hasn't loaded yet or flag is disabled
  if (config?.useReactGridLayout === true) {
    return <DashboardContainerRGL disableDragDrop={disableDragDrop} />;
  }

  // Default to legacy (includes null/undefined config cases)
  return <DashboardContainerLegacy disableDragDrop={disableDragDrop} />;
};

export const DashboardContainer = memo(DashboardContainerComponent);
DashboardContainer.displayName = 'DashboardContainer';
