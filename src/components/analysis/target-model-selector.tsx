'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TargetModel } from '@/types/analysis';

interface TargetModelSelectorProps {
  targetModels: TargetModel[];
  activeTargetModelId: string | null;
  onModelChange: (modelId: string) => void;
}

export function TargetModelSelector({
  targetModels,
  activeTargetModelId,
  onModelChange,
}: TargetModelSelectorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Target Allocation Model</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted-foreground">
          Choose a target allocation model to compare your current portfolio
          against.
        </p>
        <Select value={activeTargetModelId || ''} onValueChange={onModelChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select a target model" />
          </SelectTrigger>
          <SelectContent>
            {targetModels.map((model) => (
              <SelectItem key={model.id} value={model.id}>
                <div className="flex items-center">
                  <span className="font-medium">{model.name}</span>
                  {model.description && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      - {model.description}
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {activeTargetModelId && (
          <div className="mt-4">
            {(() => {
              const activeModel = targetModels.find(
                (m) => m.id === activeTargetModelId
              );
              if (!activeModel) return null;

              const allocations = Object.entries(activeModel.allocations)
                .filter(([_, percent]) => percent > 0)
                .sort(([_, a], [__, b]) => b - a);

              return (
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Target Allocation:</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {allocations.map(([type, percent]) => (
                      <div
                        key={type}
                        className="flex justify-between rounded border p-2"
                      >
                        <span className="capitalize">
                          {type.replace('_', ' ')}:
                        </span>
                        <span className="font-medium">{percent}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
