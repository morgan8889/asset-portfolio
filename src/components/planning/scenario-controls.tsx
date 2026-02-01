'use client';

import { useState } from 'react';
import { Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { Scenario, ScenarioType } from '@/types/planning';
import { usePlanningStore } from '@/lib/stores/planning';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Badge } from '@/components/ui/badge';

const scenarioSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum([
    'market_correction',
    'expense_increase',
    'income_change',
    'one_time_expense',
  ]),
  value: z.coerce.number(),
  durationMonths: z.coerce.number().optional(),
});

type ScenarioFormData = z.infer<typeof scenarioSchema>;

const scenarioTypeLabels: Record<ScenarioType, string> = {
  market_correction: 'Market Correction',
  expense_increase: 'Expense Increase',
  income_change: 'Income Change',
  one_time_expense: 'One-Time Expense',
};

const scenarioTypeDescriptions: Record<ScenarioType, string> = {
  market_correction:
    'Reduce expected returns by a percentage (e.g., -20% for a crash)',
  expense_increase:
    'Increase annual expenses by a percentage (e.g., +10% lifestyle inflation)',
  income_change:
    'Change monthly savings by a percentage (e.g., +15% raise or -30% job loss)',
  one_time_expense:
    'Apply a one-time expense in the future (e.g., $50k house down payment)',
};

export function ScenarioControls() {
  const { scenarios, addScenario, deleteScenario, toggleScenario } =
    usePlanningStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<ScenarioFormData>({
    resolver: zodResolver(scenarioSchema),
    defaultValues: {
      type: 'market_correction',
    },
  });

  const selectedType = watch('type');

  const onSubmit = (data: ScenarioFormData) => {
    addScenario({
      ...data,
      isActive: false, // Start inactive
    });
    setIsDialogOpen(false);
    reset();
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this scenario?')) {
      deleteScenario(id);
    }
  };

  const getValueLabel = (scenario: Scenario) => {
    switch (scenario.type) {
      case 'market_correction':
        return `${scenario.value}% drop`;
      case 'expense_increase':
        return `${scenario.value > 0 ? '+' : ''}${scenario.value}%`;
      case 'income_change':
        return `${scenario.value > 0 ? '+' : ''}${scenario.value}%`;
      case 'one_time_expense':
        return `$${scenario.value.toLocaleString()}`;
      default:
        return scenario.value.toString();
    }
  };

  const activeScenarios = scenarios.filter((s) => s.isActive);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>What-If Scenarios</CardTitle>
            <p className="text-sm text-muted-foreground">
              Test how life events might affect your FIRE timeline
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Scenario
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Scenario</DialogTitle>
                <DialogDescription>
                  Define a financial scenario to test
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Scenario Name</Label>
                    <Input
                      id="name"
                      placeholder="Market Crash 2026"
                      {...register('name')}
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive">
                        {errors.name.message}
                      </p>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="type">Scenario Type</Label>
                    <Controller
                      name="type"
                      control={control}
                      render={({ field }) => (
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(scenarioTypeLabels).map(
                              ([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {selectedType && (
                      <p className="text-xs text-muted-foreground">
                        {scenarioTypeDescriptions[selectedType]}
                      </p>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="value">
                      {selectedType === 'one_time_expense'
                        ? 'Amount ($)'
                        : 'Percentage (%)'}
                    </Label>
                    <Input
                      id="value"
                      type="number"
                      step={selectedType === 'one_time_expense' ? '1000' : '1'}
                      placeholder={
                        selectedType === 'one_time_expense' ? '50000' : '20'
                      }
                      {...register('value')}
                    />
                    {errors.value && (
                      <p className="text-sm text-destructive">
                        {errors.value.message}
                      </p>
                    )}
                  </div>

                  {selectedType === 'one_time_expense' && (
                    <div className="grid gap-2">
                      <Label htmlFor="durationMonths">
                        Occurs in (months from now)
                      </Label>
                      <Input
                        id="durationMonths"
                        type="number"
                        placeholder="12"
                        {...register('durationMonths')}
                      />
                      <p className="text-xs text-muted-foreground">
                        Leave blank for immediate expense
                      </p>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Create</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {scenarios.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No scenarios created yet. Add a scenario to test different
              financial situations.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {activeScenarios.length > 0 && (
              <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  {activeScenarios.length} scenario
                  {activeScenarios.length > 1 ? 's' : ''} active
                </p>
              </div>
            )}

            {scenarios.map((scenario) => (
              <div
                key={scenario.id}
                className={`flex items-center justify-between rounded-lg border p-3 ${
                  scenario.isActive
                    ? 'border-primary bg-primary/5'
                    : 'border-border'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleScenario(scenario.id)}
                  >
                    {scenario.isActive ? (
                      <ToggleRight className="h-5 w-5 text-primary" />
                    ) : (
                      <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                    )}
                  </Button>
                  <div>
                    <p className="font-medium">{scenario.name}</p>
                    <div className="flex gap-2">
                      <Badge variant="outline">
                        {scenarioTypeLabels[scenario.type]}
                      </Badge>
                      <Badge variant="secondary">
                        {getValueLabel(scenario)}
                      </Badge>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(scenario.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
