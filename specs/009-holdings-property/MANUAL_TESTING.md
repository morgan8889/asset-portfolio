# Manual Testing Guide: Holdings Page with Property Support

**Feature**: 009-holdings-property
**Created**: 2026-01-30
**Purpose**: Comprehensive manual testing checklist for property asset management

---

## Prerequisites

1. **Environment Setup**
   ```bash
   npm install
   npm run dev
   ```
2. Navigate to `http://localhost:3000`
3. Create or select a test portfolio
4. Clear IndexedDB if testing from scratch (Browser DevTools → Application → IndexedDB → Clear)

---

## Test Suite 1: Type Definitions & Database Schema

### T001-T004: Foundation Verification

**Objective**: Verify type system and database handle new fields correctly

**Test Steps:**
1. Open Browser DevTools → Console
2. Execute:
   ```javascript
   // Check database schema
   const db = await indexedDB.databases();
   console.log('Databases:', db);

   // Verify Dexie is loaded
   console.log('Dexie version:', Dexie.version);
   ```

**Expected Results:**
- ✅ `PortfolioTrackerDB` exists
- ✅ No console errors about missing types
- ✅ Database opens without migration errors

**Pass Criteria**: Database initializes without errors

---

## Test Suite 2: Property Service Functions

### T005: Calculate Net Value & Yield

**Objective**: Verify calculation helper functions

**Test Steps:**
1. Open Browser Console
2. Test `calculateNetValue`:
   ```javascript
   import { calculateNetValue } from '@/lib/services/property-service';

   // Test full ownership
   calculateNetValue(new Decimal(500000), 100); // Should return 500000

   // Test 50% ownership
   calculateNetValue(new Decimal(500000), 50);  // Should return 250000

   // Test fractional ownership
   calculateNetValue(new Decimal(500000), 33.33); // Should return 166650
   ```

3. Test `calculateYield`:
   ```javascript
   import { calculateYield } from '@/lib/services/property-service';

   // Monthly rent: $2500, Property value: $500000
   calculateYield(new Decimal(2500), new Decimal(500000));
   // Expected: 6% annual yield ((2500 * 12) / 500000 * 100)
   ```

**Expected Results:**
- ✅ Net value calculations match ownership percentage
- ✅ Yield calculation returns percentage (6.0 for example above)
- ✅ No errors with decimal precision

**Pass Criteria**: All calculations return correct values

---

## Test Suite 3: Holdings Table UI (User Story 1)

### T009-T011: View and Filter Holdings

**Objective**: Verify unified holdings list with filtering

**Setup:**
1. Navigate to Holdings page
2. Ensure you have mixed asset types (stocks, crypto, properties)

**Test Case 3.1: Net Value Display**

**Steps:**
1. Add a property with 50% ownership
   - Purchase Price: $500,000
   - Current Value: $600,000
   - Ownership: 50%
2. View property in holdings table

**Expected Results:**
- ✅ "Net Value" column header (not "Market Value")
- ✅ Displayed value is $300,000 (50% of $600,000)
- ✅ Gain/Loss shows $50,000 (50% of $100,000 gain)
- ✅ Ownership badge shows "50% owned"

**Test Case 3.2: Manual Asset Symbol Handling**

**Steps:**
1. Add a real estate property named "Downtown Condo"
2. Verify holdings table display

**Expected Results:**
- ✅ Property name displayed in Symbol column (not generated ticker)
- ✅ "REAL ESTATE" type badge visible
- ✅ "Manual" badge displayed
- ✅ No stock exchange badge shown

**Test Case 3.3: Type Filtering**

**Steps:**
1. Add 3 stocks (AAPL, GOOGL, MSFT)
2. Add 2 properties (Condo A, Office B)
3. Add 1 crypto (BTC)
4. Use filter dropdown in table header

**Expected Results:**
- ✅ "All Types" shows all 6 assets
- ✅ "Stocks" shows only 3 stocks
- ✅ "Real Estate" shows only 2 properties
- ✅ "Crypto" shows only 1 crypto
- ✅ Filter persists during search
- ✅ Total Value updates based on filtered assets

**Pass Criteria**: All filtering works correctly, net values display ownership-adjusted amounts

---

## Test Suite 4: Add Property Dialog (User Story 2 & 3)

### T012-T013: Property Addition Workflow

**Objective**: Verify property can be added with rental information

**Test Case 4.1: Basic Property Addition**

**Steps:**
1. Click "Add Holding" → Select "Real Estate"
2. Fill form:
   - Name: "Test Property"
   - Purchase Price: 500000
   - Current Value: 550000
   - Purchase Date: 2023-01-15
   - Ownership %: 100
3. Submit

**Expected Results:**
- ✅ Property appears in holdings table immediately
- ✅ Net Value shows $550,000
- ✅ Cost basis shows $500,000
- ✅ Gain/Loss shows +$50,000 (+10%)
- ✅ "Manual" badge visible
- ✅ Transaction created with type "buy"

**Test Case 4.2: Fractional Ownership Property**

**Steps:**
1. Add property with 33.33% ownership
2. Purchase Price: $600,000
3. Current Value: $650,000

**Expected Results:**
- ✅ Net Value: $216,645 (33.33% of $650,000)
- ✅ Cost Basis: $199,980 (33.33% of $600,000)
- ✅ Badge shows "33.33% owned"

**Test Case 4.3: Rental Property with Income**

**Steps:**
1. Add property
2. Toggle "This is a rental property"
3. Enter Monthly Rent: 2500
4. Current Value: 500000
5. Submit

**Expected Results:**
- ✅ Rental toggle reveals rent field
- ✅ Property saves with rental info
- ✅ Badge shows "Rental: 6.00%"
- ✅ Annual yield calculated: (2500 * 12 / 500000 * 100) = 6%

**Test Case 4.4: Form Validation**

**Steps:**
1. Try to submit with empty name
2. Try negative purchase price
3. Try ownership > 100%
4. Try rental without monthly rent

**Expected Results:**
- ✅ Name required error
- ✅ Price validation error
- ✅ Ownership percentage validation error
- ✅ Rental rent required when toggle is on

**Pass Criteria**: SC-001 - Property addition completes in < 30 seconds

---

## Test Suite 5: Manual Price Update (Phase 5)

### T016: Update Property Valuation

**Objective**: Verify manual price updates work correctly

**Test Case 5.1: Update Property Value**

**Steps:**
1. Add property with current value $500,000
2. Click "Update Value" button (once integrated)
3. Enter new value: 525000
4. Select date: Today
5. Submit

**Expected Results:**
- ✅ Asset.currentPrice updated to 525000
- ✅ Holding.currentValue recalculated
- ✅ Unrealized gain updated
- ✅ PriceHistory entry created
- ✅ Holdings table refreshes automatically
- ✅ SC-004: Change reflects immediately

**Test Case 5.2: Price History Tracking**

**Steps:**
1. Update property value 3 times over time
2. Check IndexedDB → priceHistory table

**Expected Results:**
- ✅ 3 price history entries exist
- ✅ Source marked as "manual"
- ✅ Open/high/low/close all equal entered price

**Pass Criteria**: Updates reflect immediately, history tracked

---

## Test Suite 6: Polish & UX

### T019-T020: Visual Badges and Yield Display

**Test Case 6.1: Badge Display**

**Steps:**
1. View holdings table with:
   - Manual stock (valuationMethod: MANUAL)
   - Rental property
   - Fractional ownership property
   - Normal auto-priced stock

**Expected Results:**
- ✅ Manual assets show "Manual" badge
- ✅ Rental properties show "Rental: X.XX%" badge
- ✅ Fractional ownership shows "X% owned" badge
- ✅ Regular stocks show only type badge

**Test Case 6.2: Rental Yield Visibility**

**Steps:**
1. Add rental property with $2000/mo rent, $400k value
2. View in holdings table

**Expected Results:**
- ✅ Green "Rental: 6.00%" badge visible
- ✅ Yield calculation: (2000 * 12 / 400000 * 100) = 6%
- ✅ Badge color: green background

**Pass Criteria**: All visual indicators display correctly

---

## Test Suite 7: Data Persistence

### Database Integrity Tests

**Test Case 7.1: Page Reload**

**Steps:**
1. Add 2 properties with different ownership percentages
2. Refresh page (F5)
3. Verify holdings display

**Expected Results:**
- ✅ All properties still visible
- ✅ Ownership percentages preserved
- ✅ Rental info intact
- ✅ Values calculated correctly

**Test Case 7.2: IndexedDB Verification**

**Steps:**
1. Open DevTools → Application → IndexedDB
2. Navigate to PortfolioTrackerDB
3. Check assets table

**Expected Results:**
- ✅ `valuationMethod` field set to 'MANUAL' for properties
- ✅ `rentalInfo` object present for rental properties
- ✅ `rentalInfo.monthlyRent` stored as string (Decimal serialized)
- ✅ `ownershipPercentage` present in holdings table

**Pass Criteria**: Data persists correctly across sessions

---

## Test Suite 8: Edge Cases & Error Handling

### Edge Case Tests

**Test Case 8.1: Zero Value Property**

**Steps:**
1. Try to add property with Current Value: 0

**Expected Results:**
- ✅ Accepts zero value (valid for land or distressed property)
- ✅ Yield calculation handles division by zero gracefully

**Test Case 8.2: Very Small Ownership**

**Steps:**
1. Add property with 0.01% ownership

**Expected Results:**
- ✅ Calculation accepts fractional ownership
- ✅ Net value displays correctly
- ✅ Badge shows "0.01% owned"

**Test Case 8.3: Large Numbers**

**Steps:**
1. Add property worth $50,000,000

**Expected Results:**
- ✅ No precision loss
- ✅ Displays as $50,000,000.00
- ✅ Calculations remain accurate

**Test Case 8.4: Concurrent Updates**

**Steps:**
1. Open two browser tabs
2. Update property value in tab 1
3. Check tab 2

**Expected Results:**
- ✅ Tab 2 shows updated value after refresh
- ✅ No data corruption
- ✅ IndexedDB handles concurrent access

**Pass Criteria**: Edge cases handled gracefully without crashes

---

## Test Suite 9: Performance (Success Criteria)

### SC-002: Holdings List Render Performance

**Objective**: Verify render time < 200ms for 100 items

**Setup:**
1. Generate mock portfolio with 100 holdings (90 stocks, 10 properties)
2. Use Performance API to measure

**Test Steps:**
```javascript
performance.mark('holdings-start');
// Navigate to holdings page
// Wait for table to render
performance.mark('holdings-end');
performance.measure('holdings-render', 'holdings-start', 'holdings-end');
console.log(performance.getEntriesByName('holdings-render')[0].duration);
```

**Expected Results:**
- ✅ Render time < 200ms on desktop Chrome
- ✅ Table interactive immediately
- ✅ Smooth scrolling with 100+ items

**Pass Criteria**: SC-002 met (< 200ms render time)

---

## Test Suite 10: Integration Tests

### Multi-Asset Portfolio Tests

**Test Case 10.1: Mixed Portfolio Calculations**

**Steps:**
1. Create portfolio with:
   - 10 shares AAPL @ $150 = $1,500
   - 1 property 50% owned @ $500k = $250,000
   - 0.5 BTC @ $40k = $20,000
2. View total portfolio value

**Expected Results:**
- ✅ Total Value: $271,500
- ✅ Each asset contributes correctly
- ✅ Ownership percentages factored in
- ✅ All types visible in unified list

**Test Case 10.2: Filtering Preserves Calculations**

**Steps:**
1. Use mixed portfolio from 10.1
2. Filter to "Real Estate" only

**Expected Results:**
- ✅ Shows only property
- ✅ Total Value shows $250,000
- ✅ Percentage shows property as 92.1% of filtered total
- ✅ Gain/Loss calculated correctly for filtered view

**Pass Criteria**: All asset types work together seamlessly

---

## Regression Testing Checklist

**Verify existing features still work:**

- [ ] Adding stock transactions still works
- [ ] CSV import not affected
- [ ] Dashboard widgets display correctly
- [ ] Portfolio metrics calculate correctly
- [ ] Existing holdings without ownershipPercentage default to 100%
- [ ] Existing assets without valuationMethod default to 'AUTO'
- [ ] Price polling for stocks unaffected
- [ ] Transaction history displays correctly

---

## Bug Report Template

If issues found during testing:

```markdown
**Bug ID**: BUG-009-XXX
**Severity**: Critical / High / Medium / Low
**Test Case**: [Reference test case number]
**Steps to Reproduce**:
1.
2.
3.

**Expected Behavior**:
[What should happen]

**Actual Behavior**:
[What actually happens]

**Screenshots**:
[Attach if applicable]

**Console Errors**:
```
[Error messages]
```

**Environment**:
- Browser: Chrome 120
- OS: Windows 11
- Node: 18.x
```

---

## Testing Sign-Off

**Tester**: _____________
**Date**: _____________
**Test Pass Rate**: ___/___
**Status**: ✅ PASS / ❌ FAIL / ⏸️ BLOCKED

**Notes**:
[Any additional observations]
