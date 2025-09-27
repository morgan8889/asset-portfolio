'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function HoldingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Holdings</h1>
          <p className="text-muted-foreground">
            Manage your investment positions
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Holding
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Holdings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            No holdings found. Add your first investment to get started.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}