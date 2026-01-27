'use client';

/**
 * Dashboard Settings Modal
 *
 * Allows users to toggle widget visibility and reorder widgets.
 */

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Settings, ChevronUp, ChevronDown, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useDashboardStore } from '@/lib/stores';
import {
  WidgetId,
  WIDGET_DEFINITIONS,
  GridColumns,
  WidgetSpan,
  WidgetRowSpan,
} from '@/types/dashboard';
import { cn } from '@/lib/utils';
import { LayoutModeSelector } from './layout-mode-selector';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DashboardSettingsProps {
  trigger?: React.ReactNode;
}

export function DashboardSettings({ trigger }: DashboardSettingsProps) {
  const [open, setOpen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const {
    config,
    setWidgetVisibility,
    setWidgetOrder,
    setLayoutMode,
    setGridColumns,
    setWidgetSpan,
    setDensePacking,
    setWidgetRowSpan,
toggleUseReactGridLayout,
    setCategoryBreakdownPieChart,
    resetToDefault,
  } = useDashboardStore();

  const handleVisibilityChange = useCallback(
    async (widgetId: WidgetId, visible: boolean) => {
      await setWidgetVisibility(widgetId, visible);
    },
    [setWidgetVisibility]
  );

  const handleMoveUp = useCallback(
    async (widgetId: WidgetId) => {
      if (!config) return;
      const currentIndex = config.widgetOrder.indexOf(widgetId);
      if (currentIndex <= 0) return;

      const newOrder = [...config.widgetOrder];
      [newOrder[currentIndex - 1], newOrder[currentIndex]] = [
        newOrder[currentIndex],
        newOrder[currentIndex - 1],
      ];
      await setWidgetOrder(newOrder);
    },
    [config, setWidgetOrder]
  );

  const handleMoveDown = useCallback(
    async (widgetId: WidgetId) => {
      if (!config) return;
      const currentIndex = config.widgetOrder.indexOf(widgetId);
      if (currentIndex >= config.widgetOrder.length - 1) return;

      const newOrder = [...config.widgetOrder];
      [newOrder[currentIndex], newOrder[currentIndex + 1]] = [
        newOrder[currentIndex + 1],
        newOrder[currentIndex],
      ];
      await setWidgetOrder(newOrder);
    },
    [config, setWidgetOrder]
  );

  const handleResetClick = useCallback(() => {
    setShowResetConfirm(true);
  }, []);

  const handleResetConfirm = useCallback(async () => {
    await resetToDefault();
    setShowResetConfirm(false);
  }, [resetToDefault]);

  const handleResetCancel = useCallback(() => {
    setShowResetConfirm(false);
  }, []);

  const handleLayoutModeChange = useCallback(
    async (mode: 'grid' | 'stacking') => {
      await setLayoutMode(mode);
    },
    [setLayoutMode]
  );

  const handleGridColumnsChange = useCallback(
    async (columns: string) => {
      await setGridColumns(Number(columns) as GridColumns);
    },
    [setGridColumns]
  );

  const handleWidgetSpanChange = useCallback(
    async (widgetId: WidgetId, span: string) => {
      await setWidgetSpan(widgetId, Number(span) as WidgetSpan);
    },
    [setWidgetSpan]
  );

  const handleDensePackingChange = useCallback(
    async (enabled: boolean) => {
      await setDensePacking(enabled);
    },
    [setDensePacking]
  );

  const handleWidgetRowSpanChange = useCallback(
    async (widgetId: WidgetId, rowSpan: string) => {
      await setWidgetRowSpan(widgetId, Number(rowSpan) as WidgetRowSpan);
    },
    [setWidgetRowSpan]
  );

const handleUseReactGridLayoutChange = useCallback(
    async (enabled: boolean) => {
      await toggleUseReactGridLayout(enabled);
    },
    [toggleUseReactGridLayout]
  );

  const handleCategoryPieChartChange = useCallback(
    async (enabled: boolean) => {
      await setCategoryBreakdownPieChart(enabled);
    },
    [setCategoryBreakdownPieChart]
  );

  if (!config) {
    return null;
  }

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <Settings className="mr-2 h-4 w-4" />
      Settings
    </Button>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) setShowResetConfirm(false);
      }}
    >
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Dashboard Settings</DialogTitle>
          <DialogDescription>
            Customize which widgets are visible and their order on your
            dashboard.
          </DialogDescription>
        </DialogHeader>

        {/* Layout Settings Section */}
        <div className="space-y-4 border-b py-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Layout Mode</Label>
            <LayoutModeSelector
              value={config.layoutMode}
              onValueChange={handleLayoutModeChange}
            />
          </div>

          {config.layoutMode === 'grid' && (
            <div className="space-y-2">
              <Label htmlFor="grid-columns" className="text-sm font-medium">
                Grid Columns
              </Label>
              <Select
                value={String(config.gridColumns)}
                onValueChange={handleGridColumnsChange}
              >
                <SelectTrigger id="grid-columns" className="w-32">
                  <SelectValue placeholder="Columns" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 Columns</SelectItem>
                  <SelectItem value="3">3 Columns</SelectItem>
                  <SelectItem value="4">4 Columns</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {config.layoutMode === 'grid' && (
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="dense-packing" className="text-sm font-medium flex items-center gap-2">
                  Dense Packing
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-green-100 text-green-700 border-green-200">
                    New
                  </Badge>
                </Label>
                <p className="text-xs text-muted-foreground">
                  Fill gaps with smaller widgets
                </p>
              </div>
              <Switch
                id="dense-packing"
                checked={config.densePacking}
                onCheckedChange={handleDensePackingChange}
                aria-label="Toggle dense packing"
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="use-rgl" className="text-sm font-medium flex items-center gap-2">
                New Layout System
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-700 border-blue-200">
                  Beta
                </Badge>
              </Label>
              <p className="text-xs text-muted-foreground">
                Enable drag-and-drop resizing
              </p>
            </div>
            <Switch
              id="use-rgl"
              checked={config.useReactGridLayout ?? false}
              onCheckedChange={handleUseReactGridLayoutChange}
              aria-label="Toggle new layout system"
            />
          </div>
        </div>

        {/* Widget-Specific Settings Section */}
        <div className="space-y-4 border-b py-4">
          <Label className="text-sm font-medium">Widget Settings</Label>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="category-pie-chart" className="text-sm font-medium">
                Category Breakdown Pie Chart
              </Label>
              <p className="text-xs text-muted-foreground">
                Show pie chart visualization (requires 2h+ height)
              </p>
            </div>
            <Switch
              id="category-pie-chart"
              checked={config.widgetSettings?.['category-breakdown']?.showPieChart ?? false}
              onCheckedChange={handleCategoryPieChartChange}
              aria-label="Toggle category breakdown pie chart"
            />
          </div>
        </div>

        {/* Widget Settings Section */}
        <div className="max-h-[300px] space-y-4 overflow-y-auto py-4">
          {config.widgetOrder.map((widgetId, index) => {
            const definition = WIDGET_DEFINITIONS[widgetId];
            const isVisible = config.widgetVisibility[widgetId];
            const isFirst = index === 0;
            const isLast = index === config.widgetOrder.length - 1;

            return (
              <div
                key={widgetId}
                className={cn(
                  'flex items-center justify-between rounded-lg border p-3',
                  !isVisible && 'opacity-60'
                )}
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Switch
                    id={`widget-${widgetId}`}
                    checked={isVisible}
                    onCheckedChange={(checked) =>
                      handleVisibilityChange(widgetId, checked)
                    }
                    disabled={!definition.canHide}
                    aria-label={`Toggle ${definition.displayName} visibility`}
                  />
                  <div className="min-w-0">
                    <Label
                      htmlFor={`widget-${widgetId}`}
                      className="cursor-pointer font-medium"
                    >
                      {definition.displayName}
                    </Label>
                    <p className="truncate text-xs text-muted-foreground">
                      {definition.description}
                    </p>
                  </div>
                </div>

                <div className="ml-2 flex flex-shrink-0 items-center gap-1">
                  {/* Widget column span selector - only shown in grid mode */}
                  {config.layoutMode === 'grid' && (
                    <Select
                      value={String(config.widgetSpans?.[widgetId] ?? 1)}
                      onValueChange={(value) =>
                        handleWidgetSpanChange(widgetId, value)
                      }
                      disabled={!isVisible}
                    >
                      <SelectTrigger
                        className="h-8 w-16"
                        aria-label={`Column span for ${definition.displayName}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1x</SelectItem>
                        <SelectItem value="2">2x</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  {/* Widget row span selector - only shown when dense packing is enabled */}
                  {config.layoutMode === 'grid' && config.densePacking && (
                    <Select
                      value={String(config.widgetRowSpans?.[widgetId] ?? 1)}
                      onValueChange={(value) =>
                        handleWidgetRowSpanChange(widgetId, value)
                      }
                      disabled={!isVisible}
                    >
                      <SelectTrigger
                        className="h-8 w-16"
                        aria-label={`Row span for ${definition.displayName}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1h</SelectItem>
                        <SelectItem value="2">2h</SelectItem>
                        <SelectItem value="3">3h</SelectItem>
                        {widgetId === 'growth-chart' && (
                          <SelectItem value="4">4h</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleMoveUp(widgetId)}
                    disabled={isFirst}
                    aria-label={`Move ${definition.displayName} up`}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleMoveDown(widgetId)}
                    disabled={isLast}
                    aria-label={`Move ${definition.displayName} down`}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          {showResetConfirm ? (
            <>
              <p className="w-full text-sm text-muted-foreground sm:w-auto">
                Reset all settings to default?
              </p>
              <Button
                variant="destructive"
                onClick={handleResetConfirm}
                className="w-full sm:w-auto"
              >
                Yes, Reset
              </Button>
              <Button
                variant="outline"
                onClick={handleResetCancel}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleResetClick}
                className="w-full sm:w-auto"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset to Default
              </Button>
              <Button
                onClick={() => setOpen(false)}
                className="w-full sm:w-auto"
              >
                Done
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
