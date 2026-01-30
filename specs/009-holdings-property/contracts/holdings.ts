/**
 * Contracts for Holdings & Property Features
 */

import { Decimal } from 'decimal.js';
import { AssetType } from '@/types/asset';

// =============================================================================
// Form Types
// =============================================================================

export interface PropertyFormData {
  name: string;
  type: 'real_estate';
  purchasePrice: string; // Input string parsed to Decimal
  currentValue: string; // Input string parsed to Decimal
  purchaseDate: Date;
  address?: string;
  ownershipPercentage: number; // 0-100
  isRental: boolean;
  monthlyRent?: string; // Input string
}

// =============================================================================
// Component Props
// =============================================================================

export interface HoldingsTableProps {
  portfolioId: string;
  filterType?: AssetType | 'all';
}

export interface AddPropertyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portfolioId: string;
  onSuccess?: () => void;
}

export interface ManualPriceUpdateProps {
  assetId: string;
  currentPrice: Decimal;
  onUpdate: (newPrice: Decimal) => Promise<void>;
}

// =============================================================================
// Service Interfaces
// =============================================================================

export interface HoldingsService {
  addPropertyAsset: (portfolioId: string, data: PropertyFormData) => Promise<void>;
  updateRentalInfo: (assetId: string, info: Partial<RentalInfo>) => Promise<void>;
  calculateYield: (monthlyRent: Decimal, currentPrice: Decimal) => number; // Returns percentage
}

export interface RentalInfo {
  isRental: boolean;
  monthlyRent: Decimal;
  address?: string;
}
