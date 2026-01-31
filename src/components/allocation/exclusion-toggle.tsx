'use client';

import { Portfolio } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Shield } from 'lucide-react';

interface ExclusionToggleProps {
  portfolios: Portfolio[];
  excludedPortfolioIds: string[];
  onToggle: (portfolioId: string) => void;
}

export function ExclusionToggle({
  portfolios,
  excludedPortfolioIds,
  onToggle,
}: ExclusionToggleProps) {
  if (portfolios.length === 0) {
    return null;
  }

  // Don't show if only one portfolio
  if (portfolios.length === 1) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="h-4 w-4" />
          Exclude from Rebalancing
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Toggle portfolios to exclude from rebalancing calculations (e.g.,
          locked 401k accounts).
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {portfolios.map((portfolio) => {
          const isExcluded = excludedPortfolioIds.includes(portfolio.id);
          return (
            <div
              key={portfolio.id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="flex-1">
                <Label
                  htmlFor={`exclude-${portfolio.id}`}
                  className="font-medium"
                >
                  {portfolio.name}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {portfolio.type}
                </p>
              </div>
              <Switch
                id={`exclude-${portfolio.id}`}
                checked={isExcluded}
                onCheckedChange={() => onToggle(portfolio.id)}
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
