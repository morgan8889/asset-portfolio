'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface UnclassifiedAlertProps {
  count: number;
  dimension: 'assetClass' | 'sector' | 'region';
}

export function UnclassifiedAlert({
  count,
  dimension,
}: UnclassifiedAlertProps) {
  const router = useRouter();

  if (count === 0) {
    return null;
  }

  const dimensionLabel = {
    assetClass: 'asset class',
    sector: 'sector',
    region: 'region',
  }[dimension];

  return (
    <Alert
      variant="destructive"
      className="border-amber-500 bg-amber-50 dark:bg-amber-950"
    >
      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <AlertTitle className="text-amber-900 dark:text-amber-100">
        Unclassified Assets Detected
      </AlertTitle>
      <AlertDescription className="text-amber-800 dark:text-amber-200">
        <p className="mb-3">
          {count} {count === 1 ? 'holding has' : 'holdings have'} no{' '}
          {dimensionLabel} assigned. This affects your allocation analysis
          accuracy.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/holdings')}
          className="border-amber-600 text-amber-900 hover:bg-amber-100 dark:border-amber-400 dark:text-amber-100 dark:hover:bg-amber-900"
        >
          Review Holdings
        </Button>
      </AlertDescription>
    </Alert>
  );
}
