'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PortfolioHealth } from '@/types/analysis';

interface HealthScoreCardProps {
  health: PortfolioHealth | null;
  isCalculating?: boolean;
}

export function HealthScoreCard({
  health,
  isCalculating,
}: HealthScoreCardProps) {
  if (isCalculating) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Health Score</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
            <p className="mt-2 text-sm text-muted-foreground">Calculating...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!health) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Health Score</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-sm text-muted-foreground">
            No health score available. Add holdings to your portfolio.
          </p>
        </CardContent>
      </Card>
    );
  }

  const score = health.overallScore;
  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600 dark:text-green-400';
    if (score >= 40) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 70) return 'Excellent';
    if (score >= 40) return 'Good';
    return 'Needs Improvement';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Portfolio Health Score</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center space-y-4">
          {/* Radial Progress */}
          <div className="relative h-40 w-40">
            <svg className="h-full w-full -rotate-90 transform">
              {/* Background circle */}
              <circle
                cx="80"
                cy="80"
                r="70"
                stroke="currentColor"
                strokeWidth="12"
                fill="none"
                className="text-gray-200 dark:text-gray-700"
              />
              {/* Progress circle */}
              <circle
                cx="80"
                cy="80"
                r="70"
                stroke="currentColor"
                strokeWidth="12"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 70}`}
                strokeDashoffset={`${2 * Math.PI * 70 * (1 - score / 100)}`}
                strokeLinecap="round"
                className={`transition-all duration-500 ${getScoreColor(score)}`}
              />
            </svg>
            {/* Score text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-4xl font-bold ${getScoreColor(score)}`}>
                {score}
              </span>
              <span className="text-xs text-muted-foreground">out of 100</span>
            </div>
          </div>

          {/* Score label */}
          <div className="text-center">
            <p className={`text-lg font-semibold ${getScoreColor(score)}`}>
              {getScoreLabel(score)}
            </p>
            <p className="text-sm text-muted-foreground">
              Using {health.profile.name} profile
            </p>
          </div>

          {/* Last updated */}
          <p className="text-xs text-muted-foreground">
            Updated {new Date(health.calculatedAt).toLocaleString()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
