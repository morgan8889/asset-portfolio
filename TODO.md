# Portfolio Tracker - TODO List

## 🎯 Project Overview
A modern, privacy-first financial portfolio tracking application with local data storage, real-time price updates, and comprehensive analytics.

## 📊 Overall Progress: ~90% Complete

### ✅ Completed Features
- [x] Project setup with Next.js 14 App Router
- [x] Database schema with Dexie.js (IndexedDB)
- [x] UI component library (shadcn/ui)
- [x] Navigation and routing structure
- [x] Create Portfolio functionality
- [x] Zustand state management setup
- [x] Basic dashboard with sample data
- [x] All main page shells created
- [x] App initialization and database setup
- [x] Real portfolio data integration on dashboard
- [x] Holdings table with real database data
- [x] Transaction table with database integration
- [x] Automatic holdings calculation system
- [x] Holdings calculator integration with stores
- [x] Asset type support in allocation charts
- [x] Missing favicon assets added

---

## 🔴 Critical Priority - Core Functionality
*These features are essential for basic portfolio tracking*

### Transaction Management
- [x] Connect AddTransactionDialog to Transaction page button
- [x] Connect AddTransactionDialog to Dashboard "Add Transaction" button
- [x] Implement transaction listing with real database data
- [x] Add transaction type badges (buy/sell/dividend)
- [x] Implement transaction pagination
- [ ] Add transaction edit functionality
- [ ] Add transaction delete functionality
- [ ] Implement transaction search and filters
- [ ] Calculate and display running cost basis

### Holdings Management
- [x] Create AddHoldingDialog component
- [x] Connect AddHoldingDialog to Holdings page "Add Holding" button
- [x] Implement holdings listing with real database data
- [x] Replace mock data in HoldingsTable with actual data
- [x] Add holding edit functionality
- [x] Add holding delete functionality
- [x] Implement holdings search functionality
- [x] Calculate real-time market values

### Data Flow Integration
- [x] Connect portfolio store to actual database queries
- [x] Implement real-time portfolio metrics calculations
- [x] Update dashboard to show real portfolio data
- [x] Sync holdings with transactions (auto-calculate positions)
- [ ] Implement proper error handling for all database operations

---

## 🔧 Code Quality & Simplification
*Refactoring for maintainability, type safety, and reduced complexity*

### Phase 1: Type Safety (High Impact, ~4-6 hours)
- [ ] Create typed interfaces for API metadata structures (`/src/app/api/prices/[symbol]/route.ts`)
- [ ] Add generics to storage utility functions (`/src/lib/utils.ts:186`)
- [ ] Fix database operation type assertions (`/src/lib/services/property-service.ts:225`)
- [ ] Define proper route types for navigation (`/src/components/layout/sidebar.tsx:87`)
- [ ] Fix component prop type assertions across codebase
- [ ] Remove 120+ instances of `any` usage in production code

### Phase 2: Code Deduplication (High Impact, ~3-4 hours) ✅ COMPLETE
- [x] Create `/src/lib/services/price-sources.ts` module for shared price-fetching logic
- [x] Refactor `/src/app/api/prices/[symbol]/route.ts` to use shared module (~200 lines saved)
- [x] Refactor `/src/app/api/prices/batch/route.ts` to use shared module
- [x] Consolidate Sharpe ratio calculations (metrics-service.ts + twr-calculator.ts)
- [x] Remove deprecated widget wrappers (top-performers-widget.tsx, biggest-losers-widget.tsx)

### Phase 3: Complexity Reduction (Medium Impact, ~5-7 hours)
- [ ] Split `/src/lib/stores/price.ts` (708 lines) into `price-state.ts` + `price-effects.ts`
- [ ] Refactor `/src/components/forms/csv-import-dialog.tsx` (416 lines) with step components
- [ ] Create generic optimistic update helper for `/src/lib/stores/dashboard.ts`
- [ ] Standardize gain/loss calculations across holdings/portfolio services
- [ ] Extract repeated date range patterns into `/src/lib/utils/date-range.ts`

### Phase 4: Consistency (Medium Impact, ~2-3 hours)
- [ ] Replace 126 console.* calls with logger service (38 files affected)
- [ ] Standardize on price.ts (21 calls) and migrations.ts (27 calls) first
- [ ] Consolidate Decimal serialization patterns
- [ ] Standardize safe division implementations (safePercent vs safeDivide)
- [ ] Create shared date range utility module

### Phase 5: Cleanup (Low Impact, ~1-2 hours)
- [ ] Run `npx ts-prune` to identify unused exports
- [ ] Remove identified dead code
- [ ] Update imports after consolidations
- [ ] Final linting and type-checking verification
- [ ] Update tests affected by refactoring

**Estimated Total Effort:** 15-22 hours across 5 phases
**Expected Benefits:** 87% reduction in duplicated code, 87% reduction in `any` usage, improved maintainability

---

## 🟡 High Priority - Essential Features
*Features needed for a complete MVP*

### CSV Import/Export
- [x] Create CSV import dialog component
- [x] Implement CSV parsing with PapaParse
- [x] Add CSV format validation
- [x] Support multiple broker formats (Schwab, Vanguard, Fidelity)
- [x] Create import preview/confirmation screen
- [x] Implement CSV export functionality
- [x] Add export format options dialog
- [ ] Implement JSON export functionality

### Price Management
- [x] Create price fetching service
- [x] Implement Yahoo Finance API integration
- [x] Implement CoinGecko API for crypto prices
- [x] Add Alpha Vantage API as fallback
- [x] Create price update scheduler
- [x] Implement manual price entry fallback
- [x] Add price history tracking
- [x] Create price cache with expiration (5 min TTL, LRU eviction)

### Basic Reporting
- [x] Implement holdings summary report
- [x] Create transaction history report
- [x] Add basic PDF generation (jsPDF + html2canvas)
- [x] Implement performance summary export
- [x] Create tax report (capital gains/losses)
- [ ] Add dividend income report
- [ ] Implement portfolio snapshot feature

---

## 🟢 Medium Priority - Enhanced Features
*Features that improve user experience*

### Analytics & Visualizations
- [x] Replace mock chart data with real portfolio data
- [x] Implement portfolio performance calculations
- [x] Add time-weighted return calculations
- [x] Create allocation analysis with real data
- [x] Create risk metrics (Sharpe ratio, volatility)
- [ ] Implement benchmark comparisons
- [ ] Add correlation matrix for holdings
- [ ] Implement performance attribution analysis

### Advanced Transaction Features
- [ ] Add bulk transaction import
- [ ] Implement transaction templates
- [ ] Add recurring transaction support
- [ ] Create transaction categories/tags
- [ ] Implement lot selection for tax optimization
- [ ] Add transaction notes with rich text
- [ ] Create transaction audit trail

### Portfolio Management
- [x] Multi-portfolio CRUD (create, edit, delete with graduated confirmations)
- [x] Portfolio switching with recency sorting
- [x] Data isolation between portfolios
- [x] Implement portfolio rebalancing suggestions
- [x] Create target allocation settings
- [ ] Add multiple portfolio comparison
- [ ] Add portfolio performance benchmarking
- [ ] Implement portfolio cloning
- [ ] Add archived portfolio support
- [ ] Create portfolio sharing (read-only links)

---

## 🔵 Low Priority - Nice to Have
*Features for post-MVP enhancement*

### Advanced Features
- [ ] Implement real-time WebSocket price updates
- [ ] Add options trading support
- [ ] Create futures/commodities tracking
- [ ] Implement cryptocurrency DeFi tracking
- [ ] Add real estate investment tracking
- [ ] Create custom asset types
- [ ] Implement multi-currency support with FX rates

### User Experience
- [x] Add customizable dashboard widgets (drag-drop grid layout)
- [x] Implement drag-and-drop for file uploads (CSV import)
- [ ] Add keyboard shortcuts
- [ ] Create interactive tutorials
- [ ] Implement saved views/filters
- [ ] Create mobile app (React Native)
- [ ] Add PWA offline support

### Integration & Automation
- [ ] Add broker API connections
- [ ] Implement Plaid integration
- [ ] Create email reports/alerts
- [ ] Add calendar integration for dividends
- [ ] Implement automated backups
- [ ] Create REST API for external access
- [ ] Add webhook support for events

### Advanced Analytics
- [x] FIRE planning with retirement projections
- [ ] Monte Carlo simulation for projections
- [ ] Tax loss harvesting recommendations
- [ ] Implement Black-Scholes for options
- [ ] Add factor analysis
- [ ] Create custom formula support
- [ ] Implement backtesting framework
- [ ] Add ML-powered insights

---

## 🐛 Known Bugs & Issues

### High Priority Bugs
- [x] Fix missing favicon and manifest icons (404 errors)
- [ ] Resolve React hydration warnings
- [ ] Fix "uncontrolled to controlled" Select warnings

### Medium Priority Bugs
- [ ] Improve error boundaries for better error handling
- [ ] Add loading states for all async operations
- [ ] Fix TypeScript strict mode warnings
- [ ] Optimize bundle size (currently too large)

### Low Priority Bugs
- [x] Clean up console.log statements (code simplification initiative)
- [ ] Standardize date formatting across app
- [ ] Fix minor responsive design issues on mobile
- [ ] Improve accessibility (ARIA labels)

---

## 🧪 Testing Requirements

### Unit Tests (930+ tests across 57 files)
- [x] Test portfolio calculations
- [x] Test transaction CRUD operations
- [x] Test CSV parsing logic (120+ tests)
- [x] Test price fetching service (98.26% coverage)
- [x] Test date/time utilities
- [x] Test currency formatting
- [x] Test tax calculations (91 tests, 90% coverage)
- [x] Test all 14 Zustand stores (209 tests, 100% coverage)

### Integration Tests
- [x] Test database operations
- [x] Test API integrations
- [x] Test state management
- [x] Test form validations

### E2E Tests (370+ tests across 36 files)
- [x] Complete portfolio creation flow
- [x] Transaction management workflow
- [x] Import/export functionality
- [x] Report generation
- [x] Multi-portfolio switching
- [x] Portfolio data isolation
- [x] Tax analysis workflows
- [x] FIRE planning workflows

---

## 📚 Documentation Needs

### User Documentation
- [ ] Getting started guide
- [ ] CSV import format guide
- [ ] Tax reporting guide
- [ ] API keys setup guide
- [ ] Troubleshooting guide

### Developer Documentation
- [ ] API documentation
- [ ] Database schema docs
- [ ] Component library docs
- [ ] Deployment guide
- [ ] Contributing guidelines

---

## 🚀 Deployment & DevOps

### Infrastructure
- [ ] Set up CI/CD pipeline
- [ ] Configure production environment
- [ ] Set up monitoring/logging
- [ ] Implement error tracking (Sentry)
- [ ] Add performance monitoring

### Security
- [ ] Implement Content Security Policy
- [ ] Add rate limiting for API routes
- [ ] Implement input sanitization
- [ ] Add API key encryption
- [ ] Create security audit process

---

## 📈 Performance Optimizations

### Frontend
- [ ] Implement code splitting
- [ ] Add lazy loading for routes
- [ ] Optimize image loading
- [ ] Implement virtual scrolling for large lists
- [ ] Add service worker for caching

### Backend
- [x] Add database indexing (Schema v5 with optimized indexes)
- [x] Optimize price fetching with batching (batch API route)
- [x] Implement request deduplication (price-sources.ts)
- [ ] Optimize database queries
- [ ] Implement query caching

---

## 💡 Future Ideas & Enhancements

### AI/ML Features
- [ ] Portfolio optimization suggestions
- [ ] Anomaly detection for transactions
- [ ] Price prediction models
- [ ] Natural language queries
- [ ] Automated categorization

### Social Features
- [ ] Portfolio sharing (privacy-first)
- [ ] Investment clubs support
- [ ] Social benchmarking
- [ ] Discussion forums
- [ ] Expert advisors integration

### Advanced Integrations
- [ ] Tax software export (TurboTax, etc.)
- [ ] Banking integration
- [ ] Accounting software sync
- [ ] Financial advisor tools
- [ ] Estate planning features

---

## 📝 Notes

### Technical Debt
- ~~Refactor mock data usage in components~~ (Done - real data integrated)
- Standardize error handling patterns
- Improve TypeScript types consistency (Phase 1 of code quality)
- ~~Optimize state management structure~~ (Done - 14 stores, 100% coverage)
- Clean up unused dependencies
- ~~Remove duplicated price fetching code~~ (Done - price-sources.ts extracted)

**Code Simplification Analysis (January 2026):**
- 261 TypeScript/TSX files analyzed
- ~~~400 lines of duplicated code~~ (Phase 2 complete: 500+ lines removed)
- 120+ instances of `any` usage found in production code (Phase 1 pending)
- 4 files exceeding 500 lines needing refactoring (Phase 3 pending)
- Comprehensive 5-phase simplification plan created (Phases 2 complete, 1/3/4/5 remaining)

### Architecture Decisions
- Keep all data local (privacy-first)
- Use IndexedDB for persistence
- Implement progressive enhancement
- Focus on performance over features
- Maintain framework independence where possible

### Priority Justification
1. **Critical**: Makes app functional for basic use
2. **High**: Completes MVP requirements
3. **Medium**: Enhances user experience
4. **Low**: Nice-to-have features

---

## 🎯 Next Sprint Goals

1. Complete Phase 1 code quality: reduce `any` usage across codebase
2. Add transaction edit and delete functionality
3. Implement transaction search and filters
4. Add benchmark comparisons to analytics
5. Improve error boundaries and loading states

## 📅 Estimated Timeline

- **Week 1-2**: Complete Critical Priority items (Completed)
- **Week 3-4**: Complete High Priority items (Completed)
- **Week 5-8**: Code quality improvements and remaining medium priority items (In Progress)
- **Week 9-10**: Advanced analytics and deployment hardening

---

*Last Updated: February 4, 2026*
*Total Tasks: 180+*
*Completed: ~130*
*Remaining: ~50 (includes code quality and advanced features)*