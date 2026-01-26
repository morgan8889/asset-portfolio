# Quickstart: Performance 3-Year View

## Overview
This feature adds a 3-Year history view to the performance chart and a detailed Year-over-Year (YoY) growth table using Time-Weighted Return (TWR).

## Usage

### Viewing 3-Year History
1. Navigate to the **Performance** page via the main dashboard navigation.
2. Locate the time period selector above the chart.
3. Click the new **3Y** button.
4. The chart will update to show the last 3 years of data (aggregated monthly).

### Viewing Year-over-Year Growth
1. Navigate to the **Performance** page.
2. Scroll down below the main performance chart.
3. Locate the **Annual Growth** section.
4. View the table showing:
   - **Year**: Calendar year (e.g., 2024, 2023).
   - **Growth**: TWR percentage for that year.
   - **Value Change**: Starting vs Ending value.
   - **YTD**: The current year is marked as Year-to-Date.

## implementation Details

- **TWR Calculation**: Growth percentages are Time-Weighted Returns, meaning they are unaffected by your deposits or withdrawals.
- **Data Source**: Data is pulled from your local browser database (`PerformanceSnapshot` table).
- **Updates**: The YoY table updates automatically whenever new transactions are added.

## Troubleshooting

- **"Insufficient Data"**: If you see this message, ensure you have entered transactions dating back at least 1 year.
- **Missing Years**: Years with no transaction history or price data will not appear in the table.
