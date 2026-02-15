import { PortfolioType } from '@/types/portfolio';

/**
 * Portfolio type display labels
 */
export const PORTFOLIO_TYPE_LABELS: Record<PortfolioType, string> = {
  taxable: 'Taxable',
  ira: 'IRA',
  '401k': '401(k)',
  roth: 'Roth IRA',
};
