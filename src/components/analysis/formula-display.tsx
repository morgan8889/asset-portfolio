'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PortfolioHealth } from '@/types/analysis';
import { ChevronDown, ChevronUp, Calculator, Info } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface FormulaDisplayProps {
  health: PortfolioHealth | null;
}

export function FormulaDisplay({ health }: FormulaDisplayProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!health) {
    return null;
  }

  const { metrics, profile, overallScore } = health;

  return (
    <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <CardTitle className="text-lg">
                Score Calculation Formula
              </CardTitle>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                {isOpen ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    <span className="ml-2">Hide Details</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    <span className="ml-2">Show Details</span>
                  </>
                )}
              </Button>
            </CollapsibleTrigger>
          </div>
          <CardDescription>
            Transparent calculation methodology and weights used for scoring
          </CardDescription>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-6">
            {/* Active Profile Info */}
            <div className="rounded-lg border bg-card p-4">
              <div className="mb-2 flex items-center gap-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">Active Profile</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{profile.name}</span>
                  <Badge variant="outline">{profile.id}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {profile.description}
                </p>
              </div>
            </div>

            {/* Formula Breakdown */}
            <div className="space-y-3">
              <h4 className="font-semibold">Overall Score Formula:</h4>

              <div className="rounded-lg bg-muted/50 p-4 font-mono text-sm">
                <div className="mb-2 text-xs text-muted-foreground">
                  Overall Score = (Diversification × Weight) + (Performance ×
                  Weight) + (Volatility × Weight)
                </div>
                <div className="space-y-1">
                  {metrics.map((metric) => (
                    <div key={metric.id} className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        {metric.name}:
                      </span>
                      <span className="font-semibold">
                        {metric.score.toFixed(1)}
                      </span>
                      <span className="text-muted-foreground">×</span>
                      <span className="font-semibold">
                        {(metric.weight * 100).toFixed(0)}%
                      </span>
                      <span className="text-muted-foreground">=</span>
                      <span className="font-semibold text-primary">
                        {(metric.score * metric.weight).toFixed(1)}
                      </span>
                    </div>
                  ))}
                  <div className="mt-2 border-t pt-2">
                    <div className="flex items-center gap-2 font-bold">
                      <span className="text-muted-foreground">
                        Overall Score:
                      </span>
                      <span className="text-lg text-primary">
                        {overallScore}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Component Scores Table */}
            <div className="space-y-3">
              <h4 className="font-semibold">Component Score Details:</h4>
              <div className="overflow-hidden rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="p-3 text-left font-semibold">Metric</th>
                      <th className="p-3 text-center font-semibold">
                        Raw Score
                      </th>
                      <th className="p-3 text-center font-semibold">
                        Weight (%)
                      </th>
                      <th className="p-3 text-center font-semibold">
                        Weighted
                      </th>
                      <th className="p-3 text-center font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.map((metric, index) => (
                      <tr
                        key={metric.id}
                        className={index % 2 === 0 ? 'bg-card' : 'bg-muted/20'}
                      >
                        <td className="p-3 font-medium">{metric.name}</td>
                        <td className="p-3 text-center font-mono">
                          {metric.score.toFixed(1)} / {metric.maxScore}
                        </td>
                        <td className="p-3 text-center font-mono">
                          {(metric.weight * 100).toFixed(0)}%
                        </td>
                        <td className="p-3 text-center font-mono font-semibold">
                          {(metric.score * metric.weight).toFixed(1)}
                        </td>
                        <td className="p-3 text-center">
                          <Badge
                            variant={
                              metric.status === 'good'
                                ? 'default'
                                : metric.status === 'warning'
                                  ? 'secondary'
                                  : 'destructive'
                            }
                          >
                            {metric.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Methodology Notes */}
            <div className="rounded-lg border-l-4 border-blue-500 bg-blue-50/50 p-4 dark:bg-blue-950/20">
              <h4 className="mb-2 font-semibold">Methodology Notes:</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>
                  <strong>Diversification:</strong> Calculated using
                  Herfindahl-Hirschman Index (HHI) across asset types, regions,
                  and sectors. Lower concentration = higher score.
                </li>
                <li>
                  <strong>Performance:</strong> Portfolio returns mapped from
                  -20% to +30% range. Returns within this range score 0-100.
                </li>
                <li>
                  <strong>Volatility:</strong> Risk measure based on standard
                  deviation. Lower volatility = higher score (0-40% volatility
                  range).
                </li>
                <li>
                  <strong>Weights:</strong> Different profiles emphasize
                  different factors. You can switch profiles above to see how
                  they affect your score.
                </li>
              </ul>
            </div>

            {/* Calculation Timestamp */}
            <div className="text-center text-xs text-muted-foreground">
              Last calculated: {new Date(health.calculatedAt).toLocaleString()}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
