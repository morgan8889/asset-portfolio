'use client';

import { AddTransactionDialog } from '@/components/forms/add-transaction';
import { CreatePortfolioDialog } from '@/components/forms/create-portfolio';
import { Button } from '@/components/ui/button';

export default function TestPage() {
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Component Testing Page</h1>

      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold mb-2">Create Portfolio Dialog</h2>
          <CreatePortfolioDialog />
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Add Transaction Dialog</h2>
          <AddTransactionDialog />
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Basic Button Test</h2>
          <Button onClick={() => alert('Basic button works!')}>
            Test Basic Button
          </Button>
        </div>
      </div>
    </div>
  );
}