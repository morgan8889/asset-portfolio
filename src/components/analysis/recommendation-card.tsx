'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Recommendation } from '@/types/analysis';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  ArrowRight,
} from 'lucide-react';

interface RecommendationCardProps {
  recommendation: Recommendation;
}

export function RecommendationCard({ recommendation }: RecommendationCardProps) {
  const getIcon = () => {
    switch (recommendation.severity) {
      case 'high':
        return <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />;
      case 'medium':
        return <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />;
      case 'low':
        return <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
    }
  };

  const getSeverityVariant = () => {
    switch (recommendation.severity) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getSeverityLabel = () => {
    return recommendation.severity.charAt(0).toUpperCase() + recommendation.severity.slice(1);
  };

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            {getIcon()}
            <div className="space-y-1">
              <CardTitle className="text-lg">{recommendation.title}</CardTitle>
              <Badge variant={getSeverityVariant()}>
                {getSeverityLabel()} Priority
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted-foreground">
          {recommendation.description}
        </p>
        {recommendation.actionUrl && (
          <Link href={recommendation.actionUrl as any}>
            <Button variant="outline" size="sm" className="w-full sm:w-auto">
              {recommendation.actionLabel}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        )}
        {!recommendation.actionUrl && (
          <Button variant="outline" size="sm" disabled className="w-full sm:w-auto">
            {recommendation.actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
