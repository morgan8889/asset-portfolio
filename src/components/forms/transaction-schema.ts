import * as z from 'zod';

export const baseTransactionSchema = z.object({
  type: z.enum([
    'buy',
    'sell',
    'dividend',
    'interest',
    'split',
    'transfer_in',
    'transfer_out',
    'fee',
    'tax',
    'spinoff',
    'merger',
    'reinvestment',
    'espp_purchase',
    'rsu_vest',
    'deposit',
    'withdrawal',
    'liability_payment',
  ]),
  assetSymbol: z
    .string()
    .min(1, 'Asset symbol is required')
    .max(10, 'Symbol too long'),
  assetName: z.string().optional(),
  date: z.date({
    required_error: 'Transaction date is required',
  }),
  quantity: z.string().refine(
    (val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    },
    {
      message: 'Quantity must be a positive number',
    }
  ),
  price: z.string().refine(
    (val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0;
    },
    {
      message: 'Price must be a non-negative number',
    }
  ),
  fees: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || val === '') return true;
        const num = parseFloat(val);
        return !isNaN(num) && num >= 0;
      },
      {
        message: 'Fees must be a non-negative number',
      }
    ),
  notes: z.string().max(500, 'Notes too long').optional(),
  // ESPP-specific fields (conditional)
  grantDate: z.date().optional(),
  marketPriceAtGrant: z.string().optional(),
  marketPriceAtPurchase: z.string().optional(),
  discountPercent: z.string().optional(),
  // RSU-specific fields (conditional)
  vestingDate: z.date().optional(),
  grossSharesVested: z.string().optional(),
  sharesWithheld: z.string().optional(),
  vestingPrice: z.string().optional(),
  taxWithheldAmount: z.string().optional(),
});

// Refined schema with conditional validation
export const transactionSchema = baseTransactionSchema
  .refine(
    (data) => {
      if (data.type !== 'espp_purchase') return true;
      return data.grantDate !== undefined;
    },
    {
      message: 'Grant date is required for ESPP transactions',
      path: ['grantDate'],
    }
  )
  .refine(
    (data) => {
      if (data.type !== 'espp_purchase') return true;
      if (!data.marketPriceAtGrant) return false;
      const num = parseFloat(data.marketPriceAtGrant);
      return !isNaN(num) && num > 0;
    },
    {
      message: 'Market price at grant is required for ESPP transactions',
      path: ['marketPriceAtGrant'],
    }
  )
  .refine(
    (data) => {
      if (data.type !== 'espp_purchase') return true;
      if (!data.marketPriceAtPurchase) return false;
      const num = parseFloat(data.marketPriceAtPurchase);
      return !isNaN(num) && num > 0;
    },
    {
      message: 'Market price at purchase is required for ESPP transactions',
      path: ['marketPriceAtPurchase'],
    }
  )
  .refine(
    (data) => {
      if (data.type !== 'espp_purchase') return true;
      if (!data.discountPercent) return false;
      const num = parseFloat(data.discountPercent);
      return !isNaN(num) && num >= 0 && num <= 100;
    },
    {
      message: 'Discount percentage must be between 0 and 100',
      path: ['discountPercent'],
    }
  )
  .refine(
    (data) => {
      if (data.type !== 'espp_purchase') return true;
      if (!data.grantDate || !data.date) return true;
      return data.grantDate < data.date;
    },
    {
      message: 'Grant date must be before purchase date',
      path: ['grantDate'],
    }
  )
  .refine(
    (data) => {
      if (data.type !== 'rsu_vest') return true;
      return data.vestingDate !== undefined;
    },
    {
      message: 'Vesting date is required for RSU transactions',
      path: ['vestingDate'],
    }
  )
  .refine(
    (data) => {
      if (data.type !== 'rsu_vest') return true;
      if (!data.grossSharesVested) return false;
      const num = parseFloat(data.grossSharesVested);
      return !isNaN(num) && num > 0;
    },
    {
      message: 'Gross shares vested is required for RSU transactions',
      path: ['grossSharesVested'],
    }
  )
  .refine(
    (data) => {
      if (data.type !== 'rsu_vest') return true;
      if (!data.sharesWithheld) return false;
      const num = parseFloat(data.sharesWithheld);
      return !isNaN(num) && num >= 0;
    },
    {
      message: 'Shares withheld must be 0 or greater',
      path: ['sharesWithheld'],
    }
  )
  .refine(
    (data) => {
      if (data.type !== 'rsu_vest') return true;
      if (!data.vestingPrice) return false;
      const num = parseFloat(data.vestingPrice);
      return !isNaN(num) && num > 0;
    },
    {
      message: 'Vesting price is required for RSU transactions',
      path: ['vestingPrice'],
    }
  )
  .refine(
    (data) => {
      if (data.type !== 'rsu_vest') return true;
      if (!data.grossSharesVested || !data.sharesWithheld) return true;
      const gross = parseFloat(data.grossSharesVested);
      const withheld = parseFloat(data.sharesWithheld);
      return withheld <= gross;
    },
    {
      message: 'Shares withheld cannot exceed gross shares vested',
      path: ['sharesWithheld'],
    }
  );

export type TransactionFormValues = z.infer<typeof transactionSchema>;

export const transactionTypes = [
  {
    value: 'buy',
    label: 'Buy',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  },
  {
    value: 'sell',
    label: 'Sell',
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  },
  {
    value: 'dividend',
    label: 'Dividend',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  },
  {
    value: 'split',
    label: 'Stock Split',
    color:
      'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  },
  {
    value: 'espp_purchase',
    label: 'ESPP Purchase',
    color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
  },
  {
    value: 'rsu_vest',
    label: 'RSU Vest',
    color:
      'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
  },
  {
    value: 'transfer_in',
    label: 'Transfer In',
    color:
      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  },
  {
    value: 'transfer_out',
    label: 'Transfer Out',
    color:
      'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  },
] as const;
