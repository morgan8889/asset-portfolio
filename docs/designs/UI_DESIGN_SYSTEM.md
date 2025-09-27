# Portfolio Tracker - UI/UX Design System

## Visual Design Language

### Design Principles
1. **Clarity First**: Financial data must be immediately understandable
2. **Progressive Disclosure**: Show summary first, details on demand
3. **Responsive**: Adapt elegantly from mobile to desktop
4. **Accessible**: WCAG 2.1 AA compliance minimum
5. **Performance**: Instant feedback, smooth animations
6. **Trust**: Professional, secure, reliable appearance

### Visual Hierarchy
```
Level 1: Primary Metrics (Portfolio Value, Day Change)
  ├── Font: Inter Semi-bold 32px
  ├── Color: Foreground primary
  └── Spacing: 32px margin

Level 2: Section Headers (Holdings, Performance)
  ├── Font: Inter Medium 24px
  ├── Color: Foreground secondary
  └── Spacing: 24px margin

Level 3: Data Labels (Symbol, Name, Price)
  ├── Font: Inter Medium 14px
  ├── Color: Muted foreground
  └── Spacing: 16px margin

Level 4: Supporting Text (Percentages, Times)
  ├── Font: Inter Regular 12px
  ├── Color: Muted
  └── Spacing: 8px margin
```

---

## Screen Designs

### 1. Dashboard Screen

```
┌────────────────────────────────────────────────────────────────┐
│                         HEADER                                  │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ 📈 PortfolioTracker    [Overview][Holdings][Analysis]     │  │
│ │                                            [🌙][🔔][👤]   │  │
│ └──────────────────────────────────────────────────────────┘  │
│                                                                │
│                     PORTFOLIO SUMMARY                          │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ ┌────────────────────┐ ┌────────────────────┐           │  │
│ │ │ Total Value        │ │ Day Change         │           │  │
│ │ │ $125,430.22       │ │ ▲ $1,247 (+1.01%)  │           │  │
│ │ └────────────────────┘ └────────────────────┘           │  │
│ │                                                           │  │
│ │ ┌────────────────────┐ ┌────────────────────┐           │  │
│ │ │ Total Gain         │ │ Today's Winners    │           │  │
│ │ │ ▲ $26,930 (+27.3%) │ │ AAPL, TSLA, BTC   │           │  │
│ │ └────────────────────┘ └────────────────────┘           │  │
│ └──────────────────────────────────────────────────────────┘  │
│                                                                │
│                    PERFORMANCE CHART                           │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ Performance Over Time          [1D][1W][1M][3M][1Y][MAX] │  │
│ │ ┌────────────────────────────────────────────────────┐  │  │
│ │ │                                                      │  │  │
│ │ │     $130k ┤                                    ╱─    │  │  │
│ │ │           │                                 ╱─╱      │  │  │
│ │ │     $120k ┤                             ╱──╱         │  │  │
│ │ │           │                         ╱──╱             │  │  │
│ │ │     $110k ┤                     ╱──╱                 │  │  │
│ │ │           │                 ╱──╱                     │  │  │
│ │ │     $100k ┤─────────────╱──╱                         │  │  │
│ │ │           └────────────────────────────────────────  │  │  │
│ │ │            Jan   Feb   Mar   Apr   May   Jun         │  │  │
│ │ └────────────────────────────────────────────────────┘  │  │
│ └──────────────────────────────────────────────────────────┘  │
│                                                                │
│                    ALLOCATION & METRICS                        │
│ ┌─────────────────────┐ ┌─────────────────────────────────┐  │
│ │ Asset Allocation    │ │ Key Metrics                     │  │
│ │                     │ │                                 │  │
│ │      ╭─────╮       │ │ Sharpe Ratio         1.42      │  │
│ │    ╱       ╲      │ │ Max Drawdown        -12.3%     │  │
│ │   │ Stocks  │     │ │ Volatility           18.2%     │  │
│ │   │   65%   │     │ │ Beta                 0.95      │  │
│ │   ╲  ETFs  ╱      │ │ Correlation (SPY)    0.87      │  │
│ │     ╰─────╯       │ │ Win Rate             63%       │  │
│ │  Crypto 20%        │ │                                 │  │
│ │                     │ │ [View Detailed Analytics →]     │  │
│ └─────────────────────┘ └─────────────────────────────────┘  │
│                                                                │
│                     QUICK ACTIONS                              │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ [+ Add Transaction] [📥 Import CSV] [📊 Run Analysis]    │  │
│ │ [⚖️ Check Rebalance] [📈 Tax Report] [⬇️ Export Data]   │  │
│ └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘

Mobile Responsive (375px width):
┌─────────────────┐
│ PortfolioTracker│
├─────────────────┤
│ $125,430.22     │
│ ▲ 1.01%         │
├─────────────────┤
│ [Chart]         │
├─────────────────┤
│ [Allocation]    │
├─────────────────┤
│ [Quick Actions] │
└─────────────────┘
```

### 2. Holdings Management Screen

```
┌────────────────────────────────────────────────────────────────┐
│                        HOLDINGS VIEW                           │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ Holdings (24)          [🔍 Search] [⚙️] [+ Add Holding]  │  │
│ └──────────────────────────────────────────────────────────┘  │
│                                                                │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ Filters: [All Assets ▼] [All Accounts ▼] [Sort: Value ▼] │  │
│ └──────────────────────────────────────────────────────────┘  │
│                                                                │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ Symbol │ Name          │ Shares │ Avg Cost │ Current  │ P&L        │ Value     │ % Port │
│ ├────────┼───────────────┼────────┼──────────┼──────────┼────────────┼───────────┼────────┤
│ │ AAPL   │ Apple Inc.    │ 100    │ $145.00  │ $195.00  │ ▲ $5,000   │ $19,500   │ 15.5%  │
│ │        │               │        │          │          │   (+34.5%) │           │        │
│ ├────────┼───────────────┼────────┼──────────┼──────────┼────────────┼───────────┼────────┤
│ │ MSFT   │ Microsoft     │ 50     │ $350.00  │ $375.00  │ ▲ $1,250   │ $18,750   │ 14.9%  │
│ │        │ Corporation   │        │          │          │   (+7.1%)  │           │        │
│ ├────────┼───────────────┼────────┼──────────┼──────────┼────────────┼───────────┼────────┤
│ │ BTC    │ Bitcoin       │ 0.5    │ $44,000  │ $43,000  │ ▼ $500     │ $21,500   │ 17.1%  │
│ │        │               │        │          │          │   (-2.3%)  │           │        │
│ ├────────┼───────────────┼────────┼──────────┼──────────┼────────────┼───────────┼────────┤
│ │ SPY    │ SPDR S&P 500  │ 25     │ $420.00  │ $450.00  │ ▲ $750     │ $11,250   │ 9.0%   │
│ │        │ ETF          │        │          │          │   (+7.1%)  │           │        │
│ └────────┴───────────────┴────────┴──────────┴──────────┴────────────┴───────────┴────────┘
│                                                                │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ Summary: 24 Holdings │ Cost: $98,500 │ Value: $125,430  │  │
│ │ Total P&L: ▲ $26,930 (+27.3%) │ Today: ▲ $1,247 (+1.0%) │  │
│ └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘

Expanded Row View (on click):
┌──────────────────────────────────────────────────────────┐
│ AAPL - Apple Inc.                              [Close ✕] │
├──────────────────────────────────────────────────────────┤
│ Tax Lots:                                                │
│ • 50 shares @ $140.00 (01/15/2024) - Long Term         │
│ • 50 shares @ $150.00 (06/01/2024) - Short Term        │
│                                                          │
│ Recent Transactions:                                     │
│ • Buy 50 shares @ $150.00 (06/01/2024)                 │
│ • Dividend $0.24/share (05/15/2024)                    │
│                                                          │
│ [View Chart] [Edit] [Add Transaction] [Sell]            │
└──────────────────────────────────────────────────────────┘
```

### 3. Add Transaction Modal

```
┌──────────────────────────────────────────────────────────┐
│                   Add Transaction                    [✕] │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Transaction Type                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ (•) Buy  ( ) Sell  ( ) Dividend  ( ) Transfer    │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  Asset Selection                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ [🔍] Search or select asset...                   │  │
│  │ ┌────────────────────────────────────────────┐  │  │
│  │ │ AAPL - Apple Inc.                          │  │  │
│  │ │ MSFT - Microsoft Corporation               │  │  │
│  │ │ GOOGL - Alphabet Inc.                      │  │  │
│  │ │ + Add new asset                            │  │  │
│  │ └────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  Transaction Details                                     │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Date          [📅 01/15/2024          ]         │  │
│  │                                                   │  │
│  │ Quantity      [100                    ] shares   │  │
│  │                                                   │  │
│  │ Price/Share   [$ 150.00               ]         │  │
│  │                                                   │  │
│  │ Fees          [$ 1.00                 ]         │  │
│  │                                                   │  │
│  │ Total         $ 15,001.00                       │  │
│  │                                                   │  │
│  │ Notes (optional)                                  │  │
│  │ [                                         ]      │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  [Cancel]                              [Add Transaction] │
└──────────────────────────────────────────────────────────┘
```

### 4. Analytics Dashboard

```
┌────────────────────────────────────────────────────────────────┐
│                      PORTFOLIO ANALYTICS                       │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ Time Period: [Last 1 Year ▼]  Compare to: [S&P 500 ▼]   │  │
│ └──────────────────────────────────────────────────────────┘  │
│                                                                │
│              PERFORMANCE COMPARISON                            │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │                                                           │  │
│ │  40% ┤                                          ╱─       │  │
│ │      │                                      ╱──╱ You     │  │
│ │  30% ┤                                  ╱──╱             │  │
│ │      │                              ╱──╱                 │  │
│ │  20% ┤                          ╱──╱──── S&P 500         │  │
│ │      │                      ╱──╱────                     │  │
│ │  10% ┤                  ╱──────                          │  │
│ │      │              ╱──────                              │  │
│ │   0% ┤──────────────                                     │  │
│ │      └──────────────────────────────────────────────    │  │
│ │       J  F  M  A  M  J  J  A  S  O  N  D                │  │
│ └──────────────────────────────────────────────────────────┘  │
│                                                                │
│                    RISK METRICS                                │
│ ┌───────────────────┐ ┌───────────────────┐                  │
│ │ Volatility        │ │ Risk-Adjusted     │                  │
│ │                   │ │ Returns           │                  │
│ │ Annual: 18.2%     │ │ Sharpe: 1.42      │                  │
│ │ Monthly: 5.3%     │ │ Sortino: 2.15     │                  │
│ │ vs S&P: 1.2x      │ │ Alpha: 8.3%       │                  │
│ └───────────────────┘ └───────────────────┘                  │
│                                                                │
│                 SECTOR ALLOCATION                              │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ Technology        ████████████████████ 45%              │  │
│ │ Healthcare        ████████ 18%                          │  │
│ │ Financial         ██████ 15%                            │  │
│ │ Consumer          █████ 12%                             │  │
│ │ Energy            ███ 7%                                │  │
│ │ Other             █ 3%                                  │  │
│ └──────────────────────────────────────────────────────────┘  │
│                                                                │
│                  CORRELATION MATRIX                            │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │         AAPL  MSFT  GOOGL  SPY   BTC                     │  │
│ │ AAPL    1.00  0.82  0.75   0.88  0.12                   │  │
│ │ MSFT    0.82  1.00  0.79   0.91  0.15                   │  │
│ │ GOOGL   0.75  0.79  1.00   0.85  0.18                   │  │
│ │ SPY     0.88  0.91  0.85   1.00  0.21                   │  │
│ │ BTC     0.12  0.15  0.18   0.21  1.00                   │  │
│ └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

### 5. Tax Report Screen

```
┌────────────────────────────────────────────────────────────────┐
│                    TAX REPORT - 2024                          │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ Tax Year: [2024 ▼]  Account: [All ▼]  [Generate PDF]    │  │
│ └──────────────────────────────────────────────────────────┘  │
│                                                                │
│                   CAPITAL GAINS SUMMARY                        │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ ┌─────────────────────┐ ┌─────────────────────┐         │  │
│ │ │ Short-Term Gains    │ │ Long-Term Gains     │         │  │
│ │ │ $2,450              │ │ $8,320              │         │  │
│ │ │ Tax Rate: 32%       │ │ Tax Rate: 15%       │         │  │
│ │ │ Tax Due: $784       │ │ Tax Due: $1,248     │         │  │
│ │ └─────────────────────┘ └─────────────────────┘         │  │
│ │                                                           │  │
│ │ ┌─────────────────────┐ ┌─────────────────────┐         │  │
│ │ │ Total Realized      │ │ Estimated Tax       │         │  │
│ │ │ $10,770             │ │ $2,032              │         │  │
│ │ └─────────────────────┘ └─────────────────────┘         │  │
│ └──────────────────────────────────────────────────────────┘  │
│                                                                │
│                  REALIZED TRANSACTIONS                         │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ Date     │ Asset │ Proceeds │ Cost    │ Gain/Loss │ Type │  │
│ ├──────────┼───────┼──────────┼─────────┼───────────┼──────┤  │
│ │ 03/15/24 │ AAPL  │ $5,850   │ $4,500  │ +$1,350   │ LT   │  │
│ │ 06/20/24 │ TSLA  │ $3,200   │ $3,500  │ -$300     │ ST   │  │
│ │ 09/10/24 │ BTC   │ $12,000  │ $8,000  │ +$4,000   │ LT   │  │
│ │ 11/25/24 │ ETH   │ $2,500   │ $1,800  │ +$700     │ ST   │  │
│ └──────────┴───────┴──────────┴─────────┴───────────┴──────┘  │
│                                                                │
│                TAX OPTIMIZATION OPPORTUNITIES                  │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ 💡 Tax Loss Harvesting Opportunities:                    │  │
│ │                                                           │  │
│ │ • NVDA: Unrealized loss of $1,200 (harvest by 12/31)   │  │
│ │ • ARKK: Unrealized loss of $800 (harvest by 12/31)     │  │
│ │                                                           │  │
│ │ Potential tax savings: $320                              │  │
│ │                                                           │  │
│ │ [Review Opportunities] [Execute Harvesting]              │  │
│ └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

---

## Component Specifications

### Navigation Components

```tsx
// Main Navigation Bar
interface NavBar {
  logo: Brand;
  navigation: NavItem[];
  actions: ActionButton[];
  userMenu: UserMenu;
}

// Navigation States
enum NavState {
  DEFAULT = "default",
  SCROLLED = "scrolled",  // Compact on scroll
  MOBILE = "mobile",      // Hamburger menu
  FOCUSED = "focused"     // Keyboard navigation
}
```

### Data Display Components

```tsx
// Portfolio Value Display
interface ValueDisplay {
  label: string;
  value: number;
  change?: {
    amount: number;
    percent: number;
    period: TimePeriod;
  };
  trend?: "up" | "down" | "neutral";
  sparkline?: number[];
}

// Holdings Table
interface HoldingsTable {
  columns: Column[];
  data: Holding[];
  sortable: boolean;
  filterable: boolean;
  expandable: boolean;
  selectable: boolean;
  actions: RowAction[];
}
```

### Chart Components

```tsx
// Line Chart Configuration
interface LineChartConfig {
  data: TimeSeriesData[];
  xAxis: AxisConfig;
  yAxis: AxisConfig;
  lines: LineConfig[];
  interactions: {
    zoom: boolean;
    pan: boolean;
    tooltip: boolean;
    crosshair: boolean;
  };
  responsive: boolean;
}

// Donut Chart Configuration
interface DonutChartConfig {
  data: SliceData[];
  centerLabel?: string;
  showLegend: boolean;
  interactive: boolean;
  colorScheme: ColorScheme;
}
```

### Form Components

```tsx
// Transaction Form
interface TransactionForm {
  fields: {
    type: RadioGroup<TransactionType>;
    asset: AssetSelector;
    date: DatePicker;
    quantity: NumberInput;
    price: CurrencyInput;
    fees: CurrencyInput;
    notes: TextArea;
  };
  validation: ValidationRules;
  onSubmit: (data: Transaction) => Promise<void>;
}

// CSV Import
interface CSVImporter {
  acceptedFormats: string[];
  maxFileSize: number;
  preview: boolean;
  mapping: FieldMapping[];
  validation: ImportValidation;
  onImport: (data: ParsedData) => Promise<ImportResult>;
}
```

---

## Interaction Patterns

### Loading States
```
Initial Load:
┌──────────────┐
│ ░░░░░░░░░░░░ │ Skeleton loader
│ ░░░░░░░░░░░░ │ Preserves layout
│ ░░░░░░░░░░░░ │ Prevents shift
└──────────────┘

Data Update:
┌──────────────┐
│ $124,183.19  │ Fade transition
│    ↓         │ for value changes
│ $125,430.22  │
└──────────────┘
```

### Error States
```
Network Error:
┌─────────────────────────────┐
│ ⚠️ Unable to fetch prices   │
│ [Retry] [Use Cached]        │
└─────────────────────────────┘

Validation Error:
┌─────────────────────────────┐
│ Symbol: AAPL               │
│ Quantity: [___]             │
│ ⚠️ Quantity must be > 0    │
└─────────────────────────────┘
```

### Empty States
```
No Holdings:
┌─────────────────────────────┐
│                             │
│     📊 No holdings yet      │
│                             │
│  Start by adding your first │
│     investment below        │
│                             │
│    [+ Add First Holding]    │
│                             │
└─────────────────────────────┘
```

---

## Responsive Breakpoints

```css
/* Mobile First Approach */
/* Base (Mobile): 0-639px */
.container {
  padding: 16px;
  max-width: 100%;
}

/* Tablet: 640px-1023px */
@media (min-width: 640px) {
  .container {
    padding: 24px;
    max-width: 768px;
  }
}

/* Desktop: 1024px-1279px */
@media (min-width: 1024px) {
  .container {
    padding: 32px;
    max-width: 1024px;
  }
}

/* Wide: 1280px+ */
@media (min-width: 1280px) {
  .container {
    padding: 40px;
    max-width: 1280px;
  }
}
```

---

## Accessibility Requirements

### WCAG 2.1 AA Compliance
- **Color Contrast**: 4.5:1 for normal text, 3:1 for large text
- **Keyboard Navigation**: All interactive elements keyboard accessible
- **Screen Readers**: Proper ARIA labels and roles
- **Focus Indicators**: Visible focus states for all interactive elements
- **Error Handling**: Clear error messages with suggestions

### Keyboard Shortcuts
```
Global:
Cmd/Ctrl + K: Quick search
Cmd/Ctrl + N: New transaction
Cmd/Ctrl + I: Import data
Cmd/Ctrl + E: Export data

Navigation:
Tab: Next element
Shift + Tab: Previous element
Arrow keys: Navigate within components
Escape: Close modals/dropdowns
Enter: Activate buttons/links
```

---

## Animation & Motion

### Transition Timing
```css
/* Micro-interactions: 100-200ms */
.button {
  transition: all 150ms ease-out;
}

/* Layout changes: 200-300ms */
.modal {
  transition: opacity 250ms ease-out;
}

/* Complex animations: 300-400ms */
.chart-enter {
  animation: slideIn 350ms ease-out;
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Loading Animations
```css
/* Pulse for skeletons */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Spin for loading indicators */
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Progress bars */
@keyframes progress {
  0% { transform: scaleX(0); }
  100% { transform: scaleX(1); }
}
```

---

## Design Tokens

```javascript
export const tokens = {
  // Spacing Scale
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
    '3xl': '64px',
  },

  // Border Radius
  radius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },

  // Shadows
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
  },

  // Z-Index Scale
  zIndex: {
    dropdown: 1000,
    modal: 1050,
    popover: 1100,
    tooltip: 1150,
    notification: 1200,
  },

  // Transitions
  transitions: {
    fast: '150ms ease-out',
    base: '250ms ease-out',
    slow: '350ms ease-out',
  },
};
```