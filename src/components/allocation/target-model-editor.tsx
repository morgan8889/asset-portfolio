'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Plus, Trash2, Save } from 'lucide-react';
import { formatPercentage } from '@/lib/utils';

interface TargetCategory {
  category: string;
  percentage: number;
}

interface TargetModelEditorProps {
  initialName?: string;
  initialTargets?: Record<string, number>;
  availableCategories: string[];
  onSave: (name: string, targets: Record<string, number>) => Promise<void>;
  onCancel: () => void;
}

export function TargetModelEditor({
  initialName = '',
  initialTargets = {},
  availableCategories,
  onSave,
  onCancel,
}: TargetModelEditorProps) {
  const [name, setName] = useState(initialName);
  const [targets, setTargets] = useState<TargetCategory[]>(() => {
    // Initialize with existing targets or empty
    if (Object.keys(initialTargets).length > 0) {
      return Object.entries(initialTargets).map(([category, percentage]) => ({
        category,
        percentage,
      }));
    }
    // Start with one category if available
    return availableCategories.length > 0
      ? [{ category: availableCategories[0], percentage: 0 }]
      : [];
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate total percentage
  const totalPercentage = targets.reduce(
    (sum, target) => sum + target.percentage,
    0
  );

  // Validate form
  const isValid = name.trim().length > 0 && Math.abs(totalPercentage - 100) < 0.01;
  const isDifferent = totalPercentage !== 100;

  // Update a target category
  const updateTarget = (index: number, field: 'category' | 'percentage', value: string | number) => {
    setTargets((prev) => {
      const updated = [...prev];
      if (field === 'category') {
        updated[index] = { ...updated[index], category: value as string };
      } else {
        const numValue = typeof value === 'number' ? value : parseFloat(value as string) || 0;
        updated[index] = { ...updated[index], percentage: numValue };
      }
      return updated;
    });
  };

  // Add new category
  const addCategory = () => {
    const usedCategories = new Set(targets.map((t) => t.category));
    const availableCategory = availableCategories.find(
      (cat) => !usedCategories.has(cat)
    );

    if (availableCategory) {
      setTargets((prev) => [
        ...prev,
        { category: availableCategory, percentage: 0 },
      ]);
    }
  };

  // Remove category
  const removeCategory = (index: number) => {
    setTargets((prev) => prev.filter((_, i) => i !== index));
  };

  // Auto-distribute remaining percentage
  const distributeRemaining = () => {
    if (targets.length === 0) return;

    const remaining = 100 - totalPercentage;
    const perCategory = remaining / targets.length;

    setTargets((prev) =>
      prev.map((target) => ({
        ...target,
        percentage: Math.round((target.percentage + perCategory) * 100) / 100,
      }))
    );
  };

  // Handle save
  const handleSave = async () => {
    setError(null);
    setSaving(true);

    try {
      // Convert to Record format
      const targetsRecord = targets.reduce(
        (acc, target) => {
          acc[target.category] = target.percentage;
          return acc;
        },
        {} as Record<string, number>
      );

      await onSave(name, targetsRecord);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save target model');
      setSaving(false);
    }
  };

  // Get available categories for a dropdown (exclude already used)
  const getAvailableCategoriesForIndex = (currentIndex: number): string[] => {
    const usedCategories = new Set(
      targets.map((t, i) => (i !== currentIndex ? t.category : null))
    );
    return availableCategories.filter((cat) => !usedCategories.has(cat));
  };

  return (
    <div className="space-y-6">
      {/* Model Name */}
      <div className="space-y-2">
        <Label htmlFor="model-name">Model Name</Label>
        <Input
          id="model-name"
          placeholder="e.g., Conservative 60/40"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      {/* Target Categories */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Target Allocations</Label>
          <div className="flex items-center gap-2">
            <span
              className={`text-sm font-medium ${
                isDifferent
                  ? totalPercentage > 100
                    ? 'text-destructive'
                    : 'text-amber-600'
                  : 'text-green-600'
              }`}
            >
              Total: {formatPercentage(totalPercentage)}
            </span>
            {targets.length < availableCategories.length && (
              <Button
                variant="outline"
                size="sm"
                onClick={addCategory}
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {targets.map((target, index) => {
          const availableForThis = getAvailableCategoriesForIndex(index);
          return (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Label htmlFor={`category-${index}`} className="text-xs">
                        Category
                      </Label>
                      <select
                        id={`category-${index}`}
                        value={target.category}
                        onChange={(e) =>
                          updateTarget(index, 'category', e.target.value)
                        }
                        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {availableForThis.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                    {targets.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeCategory(index)}
                        className="mt-6"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`percentage-${index}`} className="text-xs">
                        Target Percentage
                      </Label>
                      <span className="text-sm font-medium">
                        {target.percentage.toFixed(1)}%
                      </span>
                    </div>
                    <Slider
                      id={`percentage-${index}`}
                      value={[target.percentage]}
                      onValueChange={([value]) =>
                        updateTarget(index, 'percentage', value)
                      }
                      max={100}
                      step={0.5}
                      className="w-full"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Validation Messages */}
      {isDifferent && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              {totalPercentage > 100
                ? `Over by ${(totalPercentage - 100).toFixed(1)}%`
                : `Under by ${(100 - totalPercentage).toFixed(1)}%`}
            </span>
            {totalPercentage < 100 && (
              <Button variant="outline" size="sm" onClick={distributeRemaining}>
                Auto-distribute
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!isValid || saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : 'Save Model'}
        </Button>
      </div>
    </div>
  );
}
