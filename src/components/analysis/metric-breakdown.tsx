'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { PortfolioHealth } from '@/types/analysis';
import { TrendingUp, Shield, Activity } from 'lucide-react';

interface MetricBreakdownProps {
  health: PortfolioHealth | null;
}

export function MetricBreakdown({ health }: MetricBreakdownProps) {
  if (!health) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Health Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Health metrics will appear here once calculated.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'good':
        return 'default';
      case 'warning':
        return 'secondary';
      case 'critical':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getIcon = (id: string) => {
    switch (id) {
      case 'diversification':
        return <Shield className="h-5 w-5" />;
      case 'performance':
        return <TrendingUp className="h-5 w-5" />;
      case 'volatility':
        return <Activity className="h-5 w-5" />;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Health Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {health.metrics.map((metric) => (
            <div key={metric.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getIcon(metric.id)}
                  <span className="font-medium">{metric.name}</span>
                  <Badge variant={getStatusVariant(metric.status)}>
                    {metric.status}
                  </Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-semibold">
                    {metric.score}/{metric.maxScore}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({(metric.weight * 100).toFixed(0)}% weight)
                  </span>
                </div>
              </div>
              <Progress value={metric.score} max={metric.maxScore} />
              <p className="text-sm text-muted-foreground">{metric.details}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
