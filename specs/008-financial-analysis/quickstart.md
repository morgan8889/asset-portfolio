# Quickstart: Financial Analysis

## Overview
This feature adds a new "Analysis" section to the portfolio tracker, providing health scoring, actionable recommendations, and asset allocation modeling.

## Usage

### Viewing Portfolio Health
1. Navigate to the **Analysis** tab in the sidebar.
2. View your **Health Score** (0-100) at the top.
3. Click on the score components (Diversification, Performance, Volatility) to see details.
4. Use the **Profile Selector** (e.g., "Growth", "Safety") to adjust how your score is calculated based on your goals.

### Checking Recommendations
1. Scroll to the **Recommendations** section.
2. Review cards for issues like "High Cash Drag" or "Concentration Risk".
3. Follow the suggested actions (e.g., "Review Allocation") to improve your score.

### Asset Allocation & Rebalancing
1. Navigate to the **Allocation** sub-tab (or scroll down).
2. Select a **Target Model** (e.g., "60/40 Standard" or create your own).
3. View the **Rebalancing Table** to see exactly how much of each asset class to Buy or Sell to hit your target.

### Managing Property & Manual Assets
1. Go to **Holdings**.
2. Click on a Property asset (or add a new one with type 'Real Estate').
3. Notice the **"Manual Valuation"** badge.
4. Click **"Update Value"** to input the current estimated price directly.

## Implementation Details

- **Privacy**: All calculations happen in your browser.
- **Regions**: The system guesses asset regions (US, Int'l) from tickers. You can correct this in the Asset Edit modal.
- **Math**: Calculations use high-precision decimal arithmetic.

## Troubleshooting

- **"No Score"**: Ensure you have added at least one holding with a valid price.
- **"Unclassified Assets"**: Check your holdings for assets with missing types and update them.
