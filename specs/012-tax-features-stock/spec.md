# Feature Specification: Stock Tax Features (ESPP, RSU, Capital Gains)

**Feature Branch**: `012-tax-features-stock`
**Created**: 2026-01-27
**Status**: Draft
**Input**: User description: "tax treatment, capital gains, espp, rsu features for stock"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Track ESPP with Discounts and Lookback (Priority: P1)

As an employee, I want to track my Employee Stock Purchase Plan (ESPP) acquisitions, including the discount and purchase date, so that my cost basis and gain calculations accurately reflect the plan's tax advantages.

**Why this priority**: ESPP tracking is complex and underserved by generic tools. Getting the cost basis right is critical for accurate performance and tax reporting.

**Independent Test**: Can be fully tested by adding a new "ESPP Purchase" transaction with a 15% discount, verifying the cost basis is recorded as the discounted price but the market value uses the current price.

**Acceptance Scenarios**:

1. **Given** the "Add Transaction" form, **When** I select "ESPP Purchase", **Then** I see fields for "Grant Date", "Purchase Date", "Market Price on Grant Date", "Market Price on Purchase Date", and "Discount %".
2. **Given** an ESPP transaction, **When** I view the holding details, **Then** I see the "Acquisition Cost" (actual price paid) vs. "Market Value at Purchase" (for tax purposes).

---

### User Story 2 - Track RSU Vesting and Taxation (Priority: P2)

As an employee, I want to record Restricted Stock Unit (RSU) vesting events, including shares withheld for taxes, so that my portfolio reflects the net shares received and my correct tax basis.

**Why this priority**: RSUs are a common compensation component. Users need to track the "income" event (vesting) separate from the "capital gain" potential (holding).

**Independent Test**: Can be tested by adding an "RSU Vest" transaction with "Shares Vested" and "Shares Withheld", verifying the resulting holding quantity equals (Vested - Withheld).

**Acceptance Scenarios**:

1. **Given** the "Add Transaction" form, **When** I select "RSU Vest", **Then** I can enter "Gross Shares Vested", "Shares Withheld for Tax", and "Vesting Price".
2. **Given** an RSU vest transaction, **When** I save it, **Then** the system creates a "Buy" transaction for the *Net Shares* with a cost basis equal to the *Vesting Price*.

---

### User Story 3 - View Estimated Capital Gains Tax Liability (Priority: P3)

As an investor, I want to see my estimated unrealized capital gains broken down by Short Term vs. Long Term, so that I can make informed selling decisions to minimize tax liability.

**Why this priority**: This transforms the portfolio tracker from a passive viewer to an active tax planning tool.

**Independent Test**: Can be tested by viewing a holding with multiple lots (some >1 year, some <1 year) and verifying the "Tax Liability" view correctly separates the gains based on the holding period.

**Acceptance Scenarios**:

1. **Given** a holding with mixed-age tax lots, **When** I view the "Tax Analysis" tab, **Then** I see a breakdown of "Unrealized Short Term Gains" and "Unrealized Long Term Gains".
2. **Given** I input my estimated tax brackets (e.g., 24% income, 15% capital gains), **When** I view the analysis, **Then** I see an estimated dollar amount for "Potential Tax Bill" if I were to sell today.

### Edge Cases

- What happens with "Qualifying" vs "Disqualifying" dispositions for ESPP? (System should flag sales that occur too soon after purchase/grant dates).
- How are wash sales handled? (Out of scope for MVP automated detection, but allow manual "Wash Sale Adjustment" on cost basis).
- How are stock splits handled for RSU/ESPP lots? (Apply standard split ratio logic to the lot quantity and basis).

## Clarifications

### Session 2026-01-27

- Q: How should the "Bargain Element" (discount) of ESPP shares be treated for cost basis? → A: Cost Basis Adjustment - Store the discounted price as the initial basis, but flag the bargain element. Upon sale, display the "Adjusted Cost Basis" (Purchase Price + Bargain Element) to the user for accurate tax reporting and to avoid double-taxation on the income portion.
- Q: What should be the cost basis for RSU shares received after vesting? → A: FMV at Vesting - Automatically set the cost basis of the net shares to the market price (Fair Market Value) on the vesting date.
- Q: What default lot identification method should be used for capital gains estimates? → A: FIFO Default - Assume First-In-First-Out for all liability estimates unless a specific lot selection mechanism is implemented.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide specialized transaction types for "ESPP Purchase" and "RSU Vest" in the Add Transaction form.
- **FR-002**: System MUST calculate ESPP cost basis based on the actual purchase price, while tracking and displaying the "Bargain Element" (discount) to allow for "Adjusted Cost Basis" calculations at the time of sale.
- **FR-003**: System MUST automatically set the cost basis for RSU shares to the Fair Market Value (FMV) on the vesting date.
- **FR-004**: System MUST differentiate between Short Term (<1 year) and Long Term (>1 year) holding periods for all tax lots.
- **FR-005**: System MUST allow users to input their estimated Short Term (Income) and Long Term Capital Gains tax rates in Settings.
- **FR-006**: System MUST display an "Estimated Tax Liability" metric for unrealized gains using FIFO (First-In-First-Out) as the default lot identification method.
- **FR-007**: System MUST flag potential "Disqualifying Dispositions" for ESPP shares if sold within: 2 years of Grant Date OR 1 year of Purchase Date.
- **FR-008**: System MUST persist all tax lot metadata (grant dates, vesting dates, bargain elements) in IndexedDB.

### Key Entities

- **TaxLot (Extended)**: Add fields for `lotType` (Standard, ESPP, RSU), `grantDate`, `vestingDate`, `bargainElement`.
- **TaxSettings**: User preferences for ST/LT tax rates.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can enter an RSU vest with tax withholding in < 30 seconds.
- **SC-002**: Capital Gains estimates are accurate to the cent based on provided tax rates and cost basis methods (FIFO/LIFO).
- **SC-003**: 100% of ESPP dispositions sold "too early" are visually flagged as Disqualifying.
- **SC-004**: System handles multiple ESPP lots with different grant dates correctly in the tax breakdown.