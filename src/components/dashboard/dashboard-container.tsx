'use client';

/**
 * Dashboard Container
 *
 * Main dashboard container using react-grid-layout for responsive,
 * draggable widget layout.
 */

import { memo } from 'react';
import { DashboardContainerRGL } from './dashboard-container-rgl';

interface DashboardContainerProps {
  disableDragDrop?: boolean;
}

const DashboardContainerComponent = ({
  disableDragDrop = false,
}: DashboardContainerProps) => {
  return <DashboardContainerRGL disableDragDrop={disableDragDrop} />;
};

export const DashboardContainer = memo(DashboardContainerComponent);
DashboardContainer.displayName = 'DashboardContainer';
