# Net Worth Accuracy - Manual Testing Guide

This guide provides step-by-step instructions for manually testing the net worth history graph accuracy improvements.

## Test Environment Setup

1. **Start Development Server**
   ```bash
   npm run dev
   ```

2. **Navigate to App**
   Open http://localhost:3000 in your browser

3. **Generate Mock Data** (if starting fresh)
   Click "Generate Mock Data" button on empty state

## Test Scenario 1: Empty Portfolio Baseline

**Goal**: Verify cash accounts initialize at $0 for new portfolios

**Steps**:
1. Navigate to `/planning/net-worth`
2. Observe the net worth chart
3. Click on cash metric in header

**Expected Results**:
- ✅ Chart renders without errors
- ✅ Cash balance shows $0.00
- ✅ No console errors in browser DevTools
- ✅ All 5 metrics display: Net Worth, Invested, Cash, Total Assets, Liabilities

## Test Scenario 2: Deposit → Buy → Dividend Flow

**Goal**: Verify cash balance tracks correctly through transaction sequence

**Steps**:
1. Navigate to `/transactions`
2. Add **Deposit Transaction**:
   - Type: Deposit
   - Date: 2024-01-01
   - Amount: $10,000
3. Add **Buy Transaction**:
   - Type: Buy
   - Symbol: AAPL
   - Date: 2024-01-15
   - Quantity: 100
   - Price: $50.00
   - Fees: $10.00
4. Add **Dividend Transaction**:
   - Type: Dividend
   - Symbol: AAPL
   - Date: 2024-02-01
   - Amount: $100.00
5. Navigate to `/planning/net-worth`

**Expected Cash Balance Calculation**:
```
Starting: $0
+ Deposit: $10,000
- Buy: $5,010 (100 × $50 + $10 fee)
+ Dividend: $100
= Final Cash: $5,090
```

**Expected Results**:
- ✅ Cash metric shows ~$5,090 (±$10 tolerance)
- ✅ Invested metric shows value of 100 AAPL shares
- ✅ Total Assets = Cash + Invested
- ✅ Chart shows stacked green (cash) and blue (invested) areas

## Test Scenario 3: Fee and Tax Deductions

**Goal**: Verify fees and taxes reduce cash balance

**Steps**:
1. Start with scenario 2 (cash balance ~$5,090)
2. Add **Fee Transaction**:
   - Type: Fee
   - Date: 2024-02-15
   - Amount: $50.00
3. Add **Tax Transaction**:
   - Type: Tax
   - Date: 2024-03-01
   - Amount: $100.00
4. Navigate to `/planning/net-worth`

**Expected Cash Balance Calculation**:
```
Starting: $5,090
- Fee: $50
- Tax: $100
= Final Cash: $4,940
```

**Expected Results**:
- ✅ Cash metric shows ~$4,940
- ✅ Net worth decreased by $150 (fees + taxes)
- ✅ Invested value unchanged

## Test Scenario 4: Complete Buy/Sell Cycle

**Goal**: Verify cash tracking through profit-taking

**Steps**:
1. Start fresh portfolio
2. Add **Deposit**: $10,000 on 2024-01-01
3. Add **Buy**: 100 AAPL @ $50, $10 fee on 2024-01-15
4. Add **Sell**: 50 AAPL @ $55, $10 fee on 2024-02-15
5. Navigate to `/planning/net-worth`

**Expected Cash Balance Calculation**:
```
Starting: $0
+ Deposit: $10,000
- Buy: $5,010 (100 × $50 + $10)
+ Sell: $2,740 (50 × $55 - $10)
= Final Cash: $7,730
```

**Expected Results**:
- ✅ Cash metric shows ~$7,730
- ✅ Invested shows value of remaining 50 AAPL shares
- ✅ Net worth reflects profit from sell

## Test Scenario 5: Liability Paydown

**Goal**: Verify historical liability balances (if liability payments implemented)

**Steps**:
1. Navigate to `/planning`
2. Add **Liability**:
   - Name: Mortgage
   - Balance: $300,000
   - Interest Rate: 4.5%
   - Monthly Payment: $1,520
   - Start Date: 2020-01-01
3. Record **Monthly Payments** (if UI available):
   - Record 12 months of payments with decreasing balance
4. Navigate to `/planning/net-worth`
5. View historical chart

**Expected Results**:
- ✅ Liabilities metric shows current balance
- ✅ Historical chart shows declining liability over time (if payments recorded)
- ✅ Net worth increases as debt is paid down

## Test Scenario 6: Complex Multi-Transaction Scenario

**Goal**: Validate accuracy with realistic transaction history

**Steps**:
1. Create these transactions in chronological order:

| Date | Type | Symbol | Qty | Price | Fees | Amount | Notes |
|------|------|--------|-----|-------|------|--------|-------|
| 2024-01-01 | Deposit | - | - | - | - | $50,000 | Initial capital |
| 2024-01-15 | Buy | AAPL | 200 | $150 | $15 | - | Buy Apple |
| 2024-02-01 | Dividend | AAPL | - | - | - | $400 | Quarterly dividend |
| 2024-02-15 | Buy | MSFT | 100 | $300 | $20 | - | Buy Microsoft |
| 2024-03-01 | Fee | - | - | - | - | $75 | Account fee |
| 2024-03-15 | Dividend | MSFT | - | - | - | $300 | Dividend |
| 2024-04-01 | Sell | AAPL | 100 | $160 | $15 | - | Take profit |
| 2024-04-15 | Tax | - | - | - | - | $500 | Capital gains |
| 2024-05-01 | Withdrawal | - | - | - | - | $5,000 | Cash out |

2. Navigate to `/planning/net-worth`

**Expected Cash Balance Calculation**:
```
+ Deposit: $50,000
- Buy AAPL: $30,015 (200 × $150 + $15)
+ Dividend AAPL: $400
- Buy MSFT: $30,020 (100 × $300 + $20)
- Fee: $75
+ Dividend MSFT: $300
+ Sell AAPL: $15,985 (100 × $160 - $15)
- Tax: $500
- Withdrawal: $5,000
= Final Cash: $1,075
```

**Expected Results**:
- ✅ Cash balance matches calculated value within 0.1% ($1,075 ± $1)
- ✅ Invested shows value of remaining holdings (100 AAPL + 100 MSFT)
- ✅ Chart accurately reflects historical changes
- ✅ No rounding errors or precision issues

## Test Scenario 7: Historical Accuracy Validation

**Goal**: Verify historical cash balance is accurate at any point in time

**Steps**:
1. Complete Scenario 6 (complex transaction history)
2. Navigate to `/planning/net-worth`
3. Hover over various points on the chart
4. Verify cash balance at specific dates:

| Date | Expected Cash | Transactions Included |
|------|--------------|----------------------|
| 2024-01-15 | $19,985 | Deposit - Buy AAPL |
| 2024-02-15 | -$9,635 | + Dividend - Buy MSFT |
| 2024-03-15 | -$9,410 | - Fee + Dividend |
| 2024-04-15 | $6,075 | + Sell - Tax |
| 2024-05-01 | $1,075 | - Withdrawal |

**Expected Results**:
- ✅ Tooltip shows correct cash balance at each date
- ✅ Historical values match manual calculations
- ✅ No jumps or discontinuities in chart

## Test Scenario 8: Migration for Existing Portfolios

**Goal**: Verify cash accounts created for existing portfolios

**Steps**:
1. Use existing portfolio with transaction history
2. Clear browser cache and reload
3. Check browser DevTools console for migration logs
4. Navigate to `/planning/net-worth`

**Expected Results**:
- ✅ Console shows "Migration 4 completed" log
- ✅ Cash account initialized for portfolio
- ✅ Cash balance calculated from existing transactions
- ✅ No errors during migration

## Accuracy Validation Checklist

Use this checklist to validate the implementation meets spec SC-002 (±0.1% accuracy):

- [ ] **Cash Tracking**:
  - [ ] Deposits increase cash balance
  - [ ] Withdrawals decrease cash balance
  - [ ] Buys decrease cash by (price × quantity + fees)
  - [ ] Sells increase cash by (price × quantity - fees)
  - [ ] Dividends increase cash balance
  - [ ] Interest increases cash balance
  - [ ] Fees decrease cash balance
  - [ ] Taxes decrease cash balance
  - [ ] Transfers/splits don't affect cash

- [ ] **Historical Accuracy**:
  - [ ] Cash balance correct at any historical date
  - [ ] Only includes transactions up to target date
  - [ ] Chronological ordering maintained

- [ ] **UI Display**:
  - [ ] All 5 metrics visible: Net Worth, Invested, Cash, Total Assets, Liabilities
  - [ ] Chart shows stacked areas for cash and invested
  - [ ] Colors: Cash (green), Invested (blue), Liabilities (orange)
  - [ ] Tooltip shows accurate breakdown

- [ ] **Edge Cases**:
  - [ ] Handles negative cash balance (margin)
  - [ ] Handles zero balance
  - [ ] Handles very large balances (>$1M)
  - [ ] Maintains precision with Decimal arithmetic
  - [ ] No floating-point rounding errors

## Performance Validation

- [ ] Chart renders in <2 seconds for 100+ transactions
- [ ] No UI freezing during calculations
- [ ] Smooth chart interactions (pan, zoom, hover)
- [ ] No memory leaks on repeated navigation

## Browser Compatibility

Test in multiple browsers:
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari
- [ ] Mobile browsers (responsive)

## Debugging Tips

### Cash Balance Mismatch
1. Open Browser DevTools
2. Check IndexedDB: `Application → IndexedDB → PortfolioTrackerDB → cashAccounts`
3. Verify balance matches expected value
4. Check `transactions` table for all entries
5. Manually calculate from transaction history

### Chart Not Rendering
1. Check console for errors
2. Verify data structure in React DevTools
3. Check if NetWorthPoint type matches component expectations
4. Validate Recharts version compatibility

### Migration Issues
1. Check console logs for "Migration 4" messages
2. Verify `userSettings` table has migration state
3. Check `cashAccounts` table was created
4. Manually trigger migration: `db.migrate()`

## Success Criteria

All scenarios pass when:
- ✅ Cash balances match manual calculations within 0.1%
- ✅ Historical values are accurate at any point in time
- ✅ UI displays all metrics correctly
- ✅ Chart renders without errors
- ✅ No console errors or warnings
- ✅ Performance is acceptable (<2s render)
- ✅ Works across all major browsers

## Reporting Issues

If tests fail, capture:
1. Browser console output
2. IndexedDB state (export as JSON)
3. Transaction list
4. Expected vs actual cash balance
5. Steps to reproduce

File issues with tag: `net-worth-accuracy`
