import { AssetType } from '@/types';

/** Asset allocation configuration */
export interface AssetAllocation {
  symbol: string;
  name: string;
  type: AssetType;
  exchange?: string;
  sector?: string;
  targetWeight: number;
  initialPrice: number;
  dividendYield?: number;
  monthlyRent?: number; // For real estate properties
  region?: string; // For real estate properties
  address?: string; // For real estate properties
}

/** Helper to define an asset allocation */
const asset = (
  symbol: string,
  name: string,
  type: AssetType,
  targetWeight: number,
  initialPrice: number,
  dividendYield = 0,
  exchange?: string,
  sector?: string,
  monthlyRent?: number,
  region?: string,
  address?: string
): AssetAllocation => ({
  symbol,
  name,
  type,
  exchange,
  sector,
  targetWeight,
  initialPrice,
  dividendYield,
  monthlyRent,
  region,
  address,
});

/** Pre-defined asset allocations for different strategies */
export const ASSET_ALLOCATIONS: Record<
  'balanced' | 'aggressive' | 'conservative',
  AssetAllocation[]
> = {
  balanced: [
    asset(
      'VTI',
      'Vanguard Total Stock Market ETF',
      'etf',
      0.18,
      180,
      0.015,
      'NYSE',
      'Diversified'
    ),
    asset(
      'VXUS',
      'Vanguard Total International Stock ETF',
      'etf',
      0.1,
      55,
      0.025,
      'NASDAQ',
      'International'
    ),
    asset(
      'VOD.L',
      'Vodafone Group PLC',
      'stock',
      0.03,
      1.2,
      0.06,
      'LSE',
      'Telecommunications'
    ),
    asset(
      'HSBA.L',
      'HSBC Holdings PLC',
      'stock',
      0.03,
      6.5,
      0.045,
      'LSE',
      'Financials'
    ),
    asset(
      'BND',
      'Vanguard Total Bond Market ETF',
      'etf',
      0.21,
      75,
      0.03,
      'NASDAQ',
      'Fixed Income'
    ),
    asset(
      'VNQ',
      'Vanguard Real Estate ETF',
      'etf',
      0.07,
      85,
      0.035,
      'NYSE',
      'Real Estate'
    ),
    asset(
      'VHT',
      'Vanguard Health Care ETF',
      'etf',
      0.08,
      220,
      0.012,
      'NYSE',
      'Healthcare'
    ),
    asset(
      'VFH',
      'Vanguard Financials ETF',
      'etf',
      0.07,
      85,
      0.022,
      'NYSE',
      'Financials'
    ),
    asset(
      'VDE',
      'Vanguard Energy ETF',
      'etf',
      0.04,
      110,
      0.028,
      'NYSE',
      'Energy'
    ),
    asset(
      'VDC',
      'Vanguard Consumer Staples ETF',
      'etf',
      0.04,
      165,
      0.024,
      'NYSE',
      'Consumer Staples'
    ),
    asset(
      'JNJ',
      'Johnson & Johnson',
      'stock',
      0.06,
      160,
      0.026,
      'NYSE',
      'Healthcare'
    ),
    asset(
      'JPM',
      'JPMorgan Chase & Co.',
      'stock',
      0.05,
      140,
      0.028,
      'NYSE',
      'Financials'
    ),
    asset(
      'SAP',
      'SAP SE',
      'stock',
      0.03,
      140,
      0.015,
      'XETRA',
      'Technology'
    ),
    asset(
      'ASML',
      'ASML Holding N.V.',
      'stock',
      0.03,
      620,
      0.008,
      'NASDAQ',
      'Technology'
    ),
    asset(
      'PROPERTY_001',
      'Rental Property - 123 Maple St, Austin TX',
      'real_estate',
      0.05,
      300000,
      0,
      undefined,
      'Real Estate',
      2400, // $2,400/month rent
      'Southwest',
      '123 Maple St, Austin, TX 78701'
    ),
  ],
  aggressive: [
    asset(
      'AAPL',
      'Apple Inc.',
      'stock',
      0.12,
      150,
      0.005,
      'NASDAQ',
      'Technology'
    ),
    asset(
      'MSFT',
      'Microsoft Corporation',
      'stock',
      0.12,
      300,
      0.008,
      'NASDAQ',
      'Technology'
    ),
    asset(
      'GOOGL',
      'Alphabet Inc.',
      'stock',
      0.1,
      120,
      0,
      'NASDAQ',
      'Technology'
    ),
    asset(
      'AMZN',
      'Amazon.com Inc.',
      'stock',
      0.1,
      140,
      0,
      'NASDAQ',
      'Consumer Cyclical'
    ),
    asset(
      'NVDA',
      'NVIDIA Corporation',
      'stock',
      0.12,
      400,
      0.002,
      'NASDAQ',
      'Technology'
    ),
    asset('BTC', 'Bitcoin', 'crypto', 0.08, 40000, 0),
    asset(
      'VGT',
      'Vanguard Information Technology ETF',
      'etf',
      0.08,
      420,
      0.007,
      'NYSE',
      'Technology'
    ),
    asset(
      'VHT',
      'Vanguard Health Care ETF',
      'etf',
      0.06,
      220,
      0.012,
      'NYSE',
      'Healthcare'
    ),
    asset(
      'VDE',
      'Vanguard Energy ETF',
      'etf',
      0.04,
      110,
      0.028,
      'NYSE',
      'Energy'
    ),
    asset(
      'JNJ',
      'Johnson & Johnson',
      'stock',
      0.07,
      160,
      0.026,
      'NYSE',
      'Healthcare'
    ),
    asset(
      'JPM',
      'JPMorgan Chase & Co.',
      'stock',
      0.06,
      140,
      0.028,
      'NYSE',
      'Financials'
    ),
    asset(
      'UNH',
      'UnitedHealth Group Inc.',
      'stock',
      0.04,
      480,
      0.014,
      'NYSE',
      'Healthcare'
    ),
    asset(
      'ASML',
      'ASML Holding N.V.',
      'stock',
      0.04,
      620,
      0.008,
      'NASDAQ',
      'Technology'
    ),
    asset(
      'SAP',
      'SAP SE',
      'stock',
      0.03,
      140,
      0.015,
      'XETRA',
      'Technology'
    ),
  ],
  conservative: [
    asset(
      'BND',
      'Vanguard Total Bond Market ETF',
      'etf',
      0.42,
      75,
      0.03,
      'NASDAQ',
      'Fixed Income'
    ),
    asset(
      'VTI',
      'Vanguard Total Stock Market ETF',
      'etf',
      0.23,
      180,
      0.015,
      'NYSE',
      'Diversified'
    ),
    asset(
      'VNQ',
      'Vanguard Real Estate ETF',
      'etf',
      0.07,
      85,
      0.035,
      'NYSE',
      'Real Estate'
    ),
    asset(
      'GLD',
      'SPDR Gold Trust',
      'commodity',
      0.08,
      180,
      0,
      'NYSE',
      'Commodities'
    ),
    asset(
      'VDC',
      'Vanguard Consumer Staples ETF',
      'etf',
      0.06,
      165,
      0.024,
      'NYSE',
      'Consumer Staples'
    ),
    asset(
      'VHT',
      'Vanguard Health Care ETF',
      'etf',
      0.06,
      220,
      0.012,
      'NYSE',
      'Healthcare'
    ),
    asset(
      'PROPERTY_002',
      'Rental Property - 456 Oak Ave, Boston MA',
      'real_estate',
      0.08,
      450000,
      0,
      undefined,
      'Real Estate',
      3200, // $3,200/month rent
      'Northeast',
      '456 Oak Ave, Boston, MA 02108'
    ),
  ],
};
