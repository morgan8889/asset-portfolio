'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ANALYSIS_PROFILES, AnalysisProfile } from '@/types/analysis';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProfileSelectorProps {
  activeProfile: AnalysisProfile;
  onProfileChange: (profileId: string) => void;
}

export function ProfileSelector({
  activeProfile,
  onProfileChange,
}: ProfileSelectorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Analysis Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted-foreground">
          Choose how to weight different factors in your portfolio health score.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {ANALYSIS_PROFILES.map((profile) => (
            <Button
              key={profile.id}
              variant={activeProfile.id === profile.id ? 'default' : 'outline'}
              onClick={() => onProfileChange(profile.id)}
              className={cn(
                'h-auto flex-col items-start p-4 text-left',
                activeProfile.id === profile.id && 'ring-2 ring-primary'
              )}
            >
              <div className="flex w-full items-center justify-between">
                <span className="font-semibold">{profile.name}</span>
                {activeProfile.id === profile.id && (
                  <Check className="h-4 w-4" />
                )}
              </div>
              <span className="mt-1 text-xs text-muted-foreground">
                {profile.description}
              </span>
              <div className="mt-2 w-full space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Diversification:</span>
                  <span className="font-medium">
                    {(profile.weights.diversification * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Performance:</span>
                  <span className="font-medium">
                    {(profile.weights.performance * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Volatility:</span>
                  <span className="font-medium">
                    {(profile.weights.volatility * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
