'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, Home, Coins, Package } from 'lucide-react';
import { HoldingsTable } from '@/components/tables/holdings-table';
import { AddPropertyDialog } from '@/components/holdings/add-property-dialog';
import { AddManualAssetDialog } from '@/components/holdings/add-manual-asset-dialog';
import { usePortfolioStore } from '@/lib/stores';

export default function HoldingsPage() {
  const [showPropertyDialog, setShowPropertyDialog] = useState(false);
  const [showManualAssetDialog, setShowManualAssetDialog] = useState(false);
  const { currentPortfolio } = usePortfolioStore();

  const handleSuccess = () => {
    // Dialogs will handle reloading holdings
    // This callback can be used for additional UI feedback if needed
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Holdings</h1>
          <p className="text-muted-foreground">
            Manage your investment positions across all asset types
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Holding
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Asset Type</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setShowPropertyDialog(true)}
              className="cursor-pointer"
            >
              <Home className="mr-2 h-4 w-4" />
              <div>
                <div className="font-medium">Real Estate</div>
                <div className="text-xs text-muted-foreground">
                  Property with manual valuation
                </div>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setShowManualAssetDialog(true)}
              className="cursor-pointer"
            >
              <Package className="mr-2 h-4 w-4" />
              <div>
                <div className="font-medium">Manual Asset</div>
                <div className="text-xs text-muted-foreground">
                  Art, collectibles, bonds, etc.
                </div>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled className="cursor-not-allowed">
              <Coins className="mr-2 h-4 w-4" />
              <div>
                <div className="font-medium">Stock / ETF / Crypto</div>
                <div className="text-xs text-muted-foreground">
                  Use Transactions page
                </div>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {currentPortfolio ? (
        <>
          <HoldingsTable />

          {/* Property Dialog */}
          <AddPropertyDialog
            open={showPropertyDialog}
            onOpenChange={setShowPropertyDialog}
            portfolioId={currentPortfolio.id}
            onSuccess={handleSuccess}
          />

          {/* Manual Asset Dialog */}
          <AddManualAssetDialog
            open={showManualAssetDialog}
            onOpenChange={setShowManualAssetDialog}
            portfolioId={currentPortfolio.id}
            onSuccess={handleSuccess}
          />
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No Portfolio Selected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="py-8 text-center text-muted-foreground">
              Please select or create a portfolio to view your holdings.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
