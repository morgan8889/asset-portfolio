# Portfolio Tracker 📈

A modern, privacy-first financial portfolio tracking application with interactive visualizations for multi-asset investment management and financial planning.

![Portfolio Tracker Dashboard](docs/designs/dashboard-preview.png)

## ✨ Features

### Core Functionality
- **Multi-Asset Tracking**: Stocks, ETFs, Cryptocurrencies, Bonds, Real Estate, Commodities
- **Real-Time Price Updates**: Live market data with 15-minute delayed fallback
- **Transaction Management**: Complete buy/sell/dividend tracking with cost basis
- **Tax Intelligence**: Comprehensive capital gains tracking and tax optimization
- **Interactive Visualizations**: Beautiful charts powered by Recharts and Tremor
- **Privacy-First**: All data stored locally in your browser (IndexedDB)

### Key Capabilities
- 📊 **Portfolio Analytics**: Performance metrics, risk analysis, correlation matrices
- 💰 **Tax Reporting**: Capital gains/losses, tax lot tracking, harvesting opportunities
- 📈 **Interactive Charts**: Zoomable performance charts, allocation donuts, trend analysis
- 📥 **Data Import/Export**: CSV import, JSON export, broker format support
- 🌙 **Dark Mode**: Automatic theme switching based on system preference
- 📱 **Responsive Design**: Works seamlessly on desktop, tablet, and mobile

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

# Build Docker image
docker build -t portfolio-tracker .

# Run Docker container
docker run -p 3000:3000 portfolio-tracker
```

## 🚀 Deployment

### Vercel (Recommended)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/portfolio-tracker)

### Netlify
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/yourusername/portfolio-tracker)

### Self-Hosted
See [deployment guide](docs/deployment/self-hosted.md) for Docker and VPS deployment instructions.

## 🗺️ Roadmap

### Phase 1 - MVP ✅
- [x] Basic portfolio tracking
- [x] Manual data entry
- [x] CSV import
- [x] Simple charts
- [x] Cost basis tracking

### Phase 2 - Enhanced Analytics (Q2 2024)
- [ ] Monte Carlo simulations
- [ ] Advanced risk metrics
- [ ] Correlation analysis
- [ ] Custom benchmarks
- [ ] Portfolio optimization

### Phase 3 - Advanced Features (Q3 2024)
- [ ] Tax loss harvesting
- [ ] Rebalancing automation
- [ ] Goal-based planning
- [ ] Multiple currency support
- [ ] Options tracking

### Phase 4 - Platform Expansion (Q4 2024)
- [ ] Mobile app (React Native)
- [ ] Desktop app (Electron)
- [ ] Cloud sync (encrypted)
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