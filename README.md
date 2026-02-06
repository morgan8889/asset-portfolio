# Portfolio Tracker 📈

[![CI](https://github.com/morgan8889/asset-portfolio/actions/workflows/ci.yml/badge.svg)](https://github.com/morgan8889/asset-portfolio/actions/workflows/ci.yml)

A modern, privacy-first financial portfolio tracking application with interactive visualizations for multi-asset investment management and financial planning.

![Portfolio Tracker Dashboard](docs/designs/dashboard-preview.png)

## ✨ Features

**Status Legend**: ✅ Ready | 🔄 In Progress | 📋 Planned

### Core Functionality

- ✅ **Multi-Asset Tracking**: Stocks, ETFs, Cryptocurrencies, Bonds, Real Estate, Commodities
- ✅ **Real-Time Price Updates**: Yahoo Finance, CoinGecko, Alpha Vantage with 5-minute cache and fallback chain
- ✅ **Transaction Management**: Full CRUD with pagination, search, and database integration
- ✅ **Tax Intelligence**: ESPP/RSU tracking with capital gains analysis and aging lot detection
- ✅ **Interactive Visualizations**: Performance charts, allocation donuts, net worth timelines with real data
- ✅ **Privacy-First**: All data stored locally in IndexedDB (no server persistence)
- ✅ **Multi-Portfolio Support**: Create, edit, delete portfolios with data isolation and graduated confirmations

### Key Capabilities

- ✅ **Portfolio Analytics**: Performance tracking, time-weighted returns, benchmark comparisons
- ✅ **Tax Reporting**: Short-term/long-term gains tracking with tax exposure dashboard widget
- ✅ **Interactive Charts**: Recharts-based visualizations with real portfolio data
- ✅ **Data Import/Export**: CSV import/export with tax field support, PDF report generation
- ✅ **FIRE Planning**: Financial independence projections, net worth tracking, liability management
- ✅ **Asset Allocation**: Target allocation planning with rebalancing recommendations
- ✅ **Dark Mode**: Theme switching functional
- ✅ **Responsive Design**: Works on desktop, tablet, and mobile

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm 9+
- Git
- Modern browser (Chrome, Firefox, Safari, Edge)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/portfolio-tracker.git
cd portfolio-tracker

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Start development server
npm run dev

# Open browser to http://localhost:3000
```

### Initial Setup

1. **Create Your First Portfolio**
   - Click "Create Portfolio" on the dashboard
   - Choose portfolio type (Taxable, IRA, 401k, Roth)
   - Set your base currency

2. **Add Holdings**
   - Click "Add Transaction" or "Import CSV"
   - Enter asset details (symbol, quantity, purchase price)
   - Track your cost basis automatically

3. **View Analytics**
   - Navigate to the Analytics tab
   - See performance metrics, risk analysis
   - Compare against benchmarks

## 💼 Tax-Aware Portfolio Tracking

### ESPP & RSU Import Examples

The CSV import system supports tax-specific fields for employee stock compensation:

#### ESPP Purchase Example

```csv
Date,Symbol,Type,Quantity,Price,Grant Date,Discount %,Ordinary Income
2025-01-15,ACME,Buy,100,42.50,2024-07-15,15,750.00
```

**Fields:**
- **Grant Date**: Offering period start (typically 6 months before purchase)
- **Discount %**: ESPP discount percentage (e.g., 15 for 15%)
- **Ordinary Income**: (FMV - Discounted Price) × Quantity

#### RSU Vest Example (Net Shares)

```csv
Date,Symbol,Type,Quantity,Price,Vesting Date,Shares Withheld,Ordinary Income
2025-02-01,ACME,Buy,78,50.00,2025-02-01,22,5000.00
```

**Fields:**
- **Quantity**: Net shares received after tax withholding
- **Shares Withheld**: Shares sold to cover taxes (Gross = Net + Withheld)
- **Ordinary Income**: FMV at vest × Gross shares

#### RSU Vest Example (Gross Shares)

```csv
Date,Symbol,Type,Quantity,Price,Vesting Date,Shares Withheld,Ordinary Income
2025-02-01,ACME,Buy,100,50.00,2025-02-01,22,5000.00
```

The system automatically detects gross vs. net based on the presence of "Shares Withheld":
- **With Shares Withheld**: Quantity is gross, net calculated as (Quantity - Shares Withheld)
- **Without Shares Withheld**: Quantity is net

### Tax Exposure Dashboard

The Tax Exposure widget shows:
- **Estimated Tax Liability**: Potential tax on unrealized gains
- **Short-Term Gains**: Lots held ≤365 days (taxed at ordinary rates)
- **Long-Term Gains**: Lots held >365 days (preferential tax rates)
- **Aging Lots**: Holdings becoming long-term within 30 days

### Tax-Optimized Selling Recommendations

The Analysis page provides tax optimization recommendations:
- **Lot Aging Alerts**: Notifies when lots are 7-30 days from long-term status
- **Potential Savings**: Calculates tax savings by waiting for long-term treatment
- **Disqualifying Disposition Warnings**: Flags ESPP sales within the holding period

### Export with Tax Data

Exports include comprehensive tax information for tax preparation:

**Transaction Export Columns:**
- Grant Date, Vest Date, Discount %, Shares Withheld, Ordinary Income

**Holdings Export Columns:**
- Holding Period (ST/LT/Mixed), Short-Term Gain, Long-Term Gain, Estimated Tax, Basis Adjustment

**Example Use Case:**
Export your transaction history at year-end and provide the CSV to your tax advisor with complete cost basis and compensation income details.

## 📁 Project Structure

```
portfolio-tracker/
├── src/
│   ├── app/                  # Next.js App Router pages
│   ├── components/           # React components
│   │   ├── ui/              # shadcn/ui components
│   │   ├── charts/          # Chart components
│   │   ├── forms/           # Form components
│   │   └── layout/          # Layout components
│   ├── lib/                 # Core logic
│   │   ├── services/        # Business logic services
│   │   ├── db/              # Database layer (Dexie/IndexedDB)
│   │   ├── stores/          # Zustand state management
│   │   └── utils/           # Utility functions
│   └── types/               # TypeScript definitions
├── docs/
│   ├── specifications/      # Technical documentation
│   ├── designs/             # UI/UX designs
│   └── architecture/        # System architecture
├── tests/                   # Test suites
└── public/                  # Static assets
```

## 🛠️ Technology Stack

### Frontend

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) (Radix UI)
- **Charts**: [Recharts](https://recharts.org/) & [Tremor](https://www.tremor.so/)
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/)

### Data & Storage

- **Local Database**: [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) via [Dexie.js](https://dexie.org/)
- **Price APIs**: Yahoo Finance, Alpha Vantage, CoinGecko
- **CSV Processing**: [PapaParse](https://www.papaparse.com/)
- **Precision Math**: [Decimal.js](https://mikemcl.github.io/decimal.js/)

### Development

- **Testing**: [Vitest](https://vitest.dev/) & [Playwright](https://playwright.dev/)
- **Linting**: ESLint & Prettier
- **CI/CD**: GitHub Actions
- **Deployment**: Vercel / Netlify / Docker

## 📊 Data Sources

The application fetches real-time price data from multiple sources:

- **Stocks & ETFs**: Yahoo Finance API (15-min delayed)
- **Cryptocurrencies**: CoinGecko API
- **Alternative**: Alpha Vantage (requires API key)
- **Fallback**: Manual price entry

## 🔒 Security & Privacy

- **Local-First**: All financial data stored in browser only
- **No Tracking**: Zero analytics or telemetry
- **Encrypted Export**: Optional password protection for exports
- **Secure APIs**: All external API calls proxied through backend
- **Open Source**: Full transparency of data handling

## 📝 Documentation

### User Guides

- [Getting Started Guide](docs/guides/getting-started.md)
- [Importing Data](docs/guides/importing-data.md)
- [Tax Reporting](docs/guides/tax-reporting.md)

### Technical Documentation

- [Technical Specification](docs/specifications/TECHNICAL_SPECIFICATION.md)
- [UI Design System](docs/designs/UI_DESIGN_SYSTEM.md)
- [Implementation Guide](docs/specifications/IMPLEMENTATION_GUIDE.md)
- [API Documentation](docs/api/README.md)

## 🧪 Testing

```bash
# Run unit tests
npm run test

# Run unit tests in watch mode
npm run test:watch

# Run E2E tests
npm run test:e2e

# Run E2E tests in UI mode
npm run test:e2e:ui

# Type checking
npm run type-check

# Linting
npm run lint

# Format code
npm run format
```

## 📦 Building for Production

```bash
# Create production build
npm run build

# Run production build locally
npm run start
```

### Docker Deployment

#### Using Pre-built Container (Recommended)

Pull the latest image from GitHub Container Registry:

```bash
# Pull latest version
docker pull ghcr.io/morgan8889/asset-portfolio:latest

# Run with environment variables
docker run -d \
  --name portfolio-tracker \
  -p 3000:3000 \
  -e NEXT_PUBLIC_YAHOO_FINANCE_KEY=your_key_here \
  -e NEXT_PUBLIC_ALPHA_VANTAGE_KEY=your_key_here \
  -e NEXT_PUBLIC_COINGECKO_KEY=your_key_here \
  ghcr.io/morgan8889/asset-portfolio:latest

# Open http://localhost:3000
```

#### Using Docker Compose (Easiest)

Create a `.env` file in the project root:

```env
NEXT_PUBLIC_YAHOO_FINANCE_KEY=your_key_here
NEXT_PUBLIC_ALPHA_VANTAGE_KEY=your_key_here
NEXT_PUBLIC_COINGECKO_KEY=your_key_here
```

Run with Docker Compose:

```bash
# Start the application
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the application
docker-compose down
```

#### Building Locally

```bash
# Build Docker image
docker build -t portfolio-tracker .

# Run container with environment variables
docker run -d \
  --name portfolio-tracker \
  -p 3000:3000 \
  -e NEXT_PUBLIC_YAHOO_FINANCE_KEY=your_key_here \
  portfolio-tracker

# Check health status
docker inspect --format='{{.State.Health.Status}}' portfolio-tracker

# View logs
docker logs -f portfolio-tracker

# Stop container
docker stop portfolio-tracker && docker rm portfolio-tracker
```

#### Environment Variables

The following environment variables can be passed to the container:

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_YAHOO_FINANCE_KEY` | No | Yahoo Finance API key for stock prices |
| `NEXT_PUBLIC_ALPHA_VANTAGE_KEY` | No | Alpha Vantage API key (fallback source) |
| `NEXT_PUBLIC_COINGECKO_KEY` | No | CoinGecko API key for crypto prices |
| `PORT` | No | Server port (default: 3000) |
| `NODE_ENV` | No | Node environment (default: production) |

**Note**: API keys are optional but recommended for live market data. Without them, manual price entry is required.

#### Health Checks

The container includes a built-in health check endpoint at `/api/health`. This is used by:

- Docker's `HEALTHCHECK` instruction
- Kubernetes liveness/readiness probes
- Load balancers and orchestration tools

Check health status:

```bash
# Via Docker
docker inspect --format='{{.State.Health.Status}}' portfolio-tracker

# Via HTTP
curl http://localhost:3000/api/health
```

#### Container Features

- **Multi-stage build**: Optimized image size (~200MB)
- **Non-root user**: Runs as `nextjs:nodejs` for security
- **Health checks**: Built-in monitoring support
- **Layer caching**: Fast rebuilds in CI/CD
- **Security scanning**: Trivy scans on every build
- **Standalone output**: Minimal Next.js production bundle

## 🚀 Deployment

### Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/portfolio-tracker)

### Netlify

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/yourusername/portfolio-tracker)

### Self-Hosted

See [deployment guide](docs/deployment/self-hosted.md) for Docker and VPS deployment instructions.

## 📊 Current Status

**Last Updated**: February 2026
**Progress**: ~85% Complete (16 features shipped, comprehensive test coverage)

**What's Working**:

- ✅ Database layer (Dexie.js Schema v5 with 10+ tables including liabilities and payments)
- ✅ Service layer (15+ business logic services including tax, FIRE, allocation, price sources)
- ✅ State management (14 Zustand stores with 100% store test coverage)
- ✅ Type system (TypeScript strict mode)
- ✅ Price APIs (Yahoo Finance, CoinGecko, Alpha Vantage with fallback chain)
- ✅ Dashboard with drag-drop widget grid and real portfolio data
- ✅ Transaction management with pagination
- ✅ CSV import/export with tax field support
- ✅ Tax analysis (ESPP/RSU, capital gains, lot aging)
- ✅ FIRE planning and net worth tracking
- ✅ Multi-portfolio management with data isolation
- ✅ Asset allocation with rebalancing recommendations
- ✅ PDF/CSV export and reporting
- ✅ 930+ unit tests, 370+ E2E tests

**Remaining Work**:

- 🔄 Code quality improvements (type safety, complexity reduction)
- 📋 Advanced analytics (Monte Carlo, correlation matrix)
- 📋 Production deployment hardening

**For detailed status**, see [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md)

## 🗺️ Roadmap

### ✅ Phase 1 - MVP Foundation - **COMPLETE**

- [x] Database schema and persistence (IndexedDB)
- [x] Service layer architecture
- [x] State management setup (14 Zustand stores)
- [x] Dashboard UI structure with drag-drop grid
- [x] Manual data entry forms
- [x] Cost basis calculation services

### ✅ Phase 2 - Core Features - **COMPLETE**

- [x] Portfolio metrics calculations (service layer)
- [x] Holdings management with real data
- [x] CSV import with auto-detection and validation (PapaParse)
- [x] Charts with real portfolio data (Recharts)
- [x] Tax reporting UI with exposure dashboard widget
- [x] Transaction management with pagination
- [x] Live market data (Yahoo Finance, CoinGecko, Alpha Vantage)
- [x] PDF/CSV export and reporting
- [x] Asset allocation planning with rebalancing
- [x] ESPP/RSU tax tracking and capital gains analysis
- [x] FIRE planning with net worth tracking
- [x] Multi-portfolio management with data isolation

### 🔄 Phase 3 - Code Quality & Enhanced Analytics - **IN PROGRESS**

**Target**: Q1-Q2 2026

- [x] API resilience testing (98.26% coverage for price-sources.ts)
- [x] Tax logic testing (30% → 90% coverage)
- [ ] Type safety improvements (reduce 120+ `any` instances)
- [ ] Complexity reduction (split files >500 lines)
- [ ] Monte Carlo simulations
- [ ] Advanced risk metrics visualization
- [ ] Correlation matrix
- [ ] Performance attribution

### 📋 Phase 4 - Advanced Features - **PLANNED**

**Target**: Q3 2026

- [ ] Tax loss harvesting UI
- [ ] Automated rebalancing workflows
- [ ] Goal-based planning
- [ ] Multiple currency support
- [ ] Options tracking

### 📋 Phase 5 - Platform Expansion - **FUTURE**

**Target**: Q4 2026+

- [ ] Mobile app (React Native or PWA)
- [ ] Optional cloud sync (encrypted)
- [ ] Local authentication (PIN/password/biometric)
- [ ] Collaborative portfolios
- [ ] AI-powered insights

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Follow the existing code style
- Use TypeScript strict mode
- Write tests for new features
- Update documentation as needed

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) for the beautiful component library
- [Recharts](https://recharts.org/) for charting capabilities
- [Dexie.js](https://dexie.org/) for IndexedDB wrapper
- [Yahoo Finance](https://finance.yahoo.com/) for market data
- All contributors and users of this project

## 💬 Support

- **Documentation**: [docs.portfoliotracker.app](https://docs.portfoliotracker.app)
- **Issues**: [GitHub Issues](https://github.com/yourusername/portfolio-tracker/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/portfolio-tracker/discussions)
- **Email**: support@portfoliotracker.app

## ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=yourusername/portfolio-tracker&type=Date)](https://star-history.com/#yourusername/portfolio-tracker&Date)

---

Built with ❤️ by the Portfolio Tracker team
