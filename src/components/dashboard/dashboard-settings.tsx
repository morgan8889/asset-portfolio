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
import { useDashboardStore } from '@/lib/stores';
import { WidgetId, WIDGET_DEFINITIONS } from '@/types/dashboard';
import { cn } from '@/lib/utils';

interface DashboardSettingsProps {
  trigger?: React.ReactNode;
}

export function DashboardSettings({ trigger }: DashboardSettingsProps) {
  const [open, setOpen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const { config, setWidgetVisibility, setWidgetOrder, resetToDefault } = useDashboardStore();

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

  if (!config) {
    return null;
  }

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <Settings className="h-4 w-4 mr-2" />
      Settings
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) setShowResetConfirm(false);
    }}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Dashboard Settings</DialogTitle>
          <DialogDescription>
            Customize which widgets are visible and their order on your dashboard.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 max-h-[400px] overflow-y-auto">
          {config.widgetOrder.map((widgetId, index) => {
            const definition = WIDGET_DEFINITIONS[widgetId];
            const isVisible = config.widgetVisibility[widgetId];
            const isFirst = index === 0;
            const isLast = index === config.widgetOrder.length - 1;

            return (
              <div
                key={widgetId}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg border',
                  !isVisible && 'opacity-60'
                )}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Switch
                    id={`widget-${widgetId}`}
                    checked={isVisible}
                    onCheckedChange={(checked) => handleVisibilityChange(widgetId, checked)}
                    disabled={!definition.canHide}
                    aria-label={`Toggle ${definition.displayName} visibility`}
                  />
                  <div className="min-w-0">
                    <Label
                      htmlFor={`widget-${widgetId}`}
                      className="font-medium cursor-pointer"
                    >
                      {definition.displayName}
                    </Label>
                    <p className="text-xs text-muted-foreground truncate">
                      {definition.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 ml-2 flex-shrink-0">
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

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {showResetConfirm ? (
            <>
              <p className="text-sm text-muted-foreground w-full sm:w-auto">
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
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset to Default
              </Button>
              <Button onClick={() => setOpen(false)} className="w-full sm:w-auto">
                Done
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
