'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RecommendationCard } from './recommendation-card';
import { Recommendation } from '@/types/analysis';
import { CheckCircle } from 'lucide-react';

interface RecommendationListProps {
  recommendations: Recommendation[];
  isCalculating?: boolean;
}

export function RecommendationList({
  recommendations,
  isCalculating,
}: RecommendationListProps) {
  if (isCalculating) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recommendations</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
            <p className="mt-2 text-sm text-muted-foreground">
              Analyzing portfolio...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (recommendations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recommendations</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-600 dark:text-green-400" />
            <p className="mt-4 text-lg font-semibold">
              No recommendations at this time
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Your portfolio looks well-balanced. Keep monitoring for changes.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort by severity (high > medium > low)
  const severityOrder = { high: 0, medium: 1, low: 2 };
  const sortedRecommendations = [...recommendations].sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Recommendations</h2>
        <span className="text-sm text-muted-foreground">
          {recommendations.length} {recommendations.length === 1 ? 'issue' : 'issues'} found
        </span>
      </div>
      <div className="grid gap-4">
        {sortedRecommendations.map((recommendation) => (
          <RecommendationCard
            key={recommendation.id}
            recommendation={recommendation}
          />
        ))}
      </div>
    </div>
  );
}
