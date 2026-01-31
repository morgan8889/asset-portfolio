# Portfolio Tracker - TODO List

## 🎯 Project Overview
A modern, privacy-first financial portfolio tracking application with local data storage, real-time price updates, and comprehensive analytics.

## 📊 Overall Progress: ~85% Complete

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
- [ ] Add transaction edit functionality
- [ ] Add transaction delete functionality
- [ ] Implement transaction search and filters
- [x] Add transaction type badges (buy/sell/dividend)
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

### Phase 2: Code Deduplication (High Impact, ~3-4 hours)
- [ ] Create `/src/lib/services/price-sources.ts` module for shared price-fetching logic
- [ ] Refactor `/src/app/api/prices/[symbol]/route.ts` to use shared module (~200 lines saved)
- [ ] Refactor `/src/app/api/prices/batch/route.ts` to use shared module
- [ ] Consolidate Sharpe ratio calculations (metrics-service.ts + twr-calculator.ts)
- [ ] Remove deprecated widget wrappers (top-performers-widget.tsx, biggest-losers-widget.tsx)

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
- [ ] Implement JSON export functionality
- [ ] Implement CSV export functionality
- [ ] Add export format options dialog

### Price Management
- [x] Create price fetching service
- [x] Implement Yahoo Finance API integration
- [x] Implement CoinGecko API for crypto prices
- [x] Add Alpha Vantage API as fallback
- [x] Create price update scheduler
- [x] Implement manual price entry fallback
- [ ] Add price history tracking
- [ ] Create price cache with expiration

### Basic Reporting
- [ ] Implement holdings summary report
- [ ] Create transaction history report
- [ ] Add basic PDF generation
- [ ] Implement performance summary export
- [ ] Create tax report (capital gains/losses)
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
- [ ] Implement benchmark comparisons
- [ ] Add correlation matrix for holdings
- [ ] Create risk metrics (Sharpe ratio, volatility)
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
- [ ] Add multiple portfolio comparison
- [ ] Implement portfolio rebalancing suggestions
- [ ] Create target allocation settings
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
- [ ] Add keyboard shortcuts
- [ ] Implement drag-and-drop for file uploads
- [ ] Create interactive tutorials
- [ ] Add customizable dashboard widgets
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
- [ ] Clean up console.log statements
- [ ] Standardize date formatting across app
- [ ] Fix minor responsive design issues on mobile
- [ ] Improve accessibility (ARIA labels)

---

## 🧪 Testing Requirements

### Unit Tests
- [ ] Test portfolio calculations
- [ ] Test transaction CRUD operations
- [ ] Test CSV parsing logic
- [ ] Test price fetching service
- [ ] Test date/time utilities
- [ ] Test currency formatting

### Integration Tests
- [ ] Test database operations
- [ ] Test API integrations
- [ ] Test state management
- [ ] Test form validations

### E2E Tests
- [ ] Complete portfolio creation flow
- [ ] Transaction management workflow
- [ ] Import/export functionality
- [ ] Report generation
- [ ] Multi-portfolio switching

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
- [ ] Optimize database queries
- [ ] Implement query caching
- [ ] Add database indexing
- [ ] Optimize price fetching with batching
- [ ] Implement request deduplication

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
- Refactor mock data usage in components
- Standardize error handling patterns
- Improve TypeScript types consistency
- Optimize state management structure
- Clean up unused dependencies

**Code Simplification Analysis (January 2026):**
- 261 TypeScript/TSX files analyzed
- ~400 lines of duplicated code identified (API routes, calculations)
- 120+ instances of `any` usage found in production code
- 4 files exceeding 500 lines needing refactoring
- Comprehensive 5-phase simplification plan created

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

## 🎯 Next Sprint Goals (Week 1)

1. Connect all existing dialogs to their buttons
2. Implement real data flow for transactions and holdings
3. Create basic CSV import functionality
4. Replace mock data with real calculations
5. Fix high-priority bugs

## 📅 Estimated Timeline

- **Week 1-2**: Complete Critical Priority items (Completed)
- **Week 3-4**: Complete High Priority items (In Progress)
- **Week 5-6**: Complete Medium Priority items
- **Week 7-8**: Testing and bug fixes
- **Week 9-10**: Documentation and deployment

---

*Last Updated: January 31, 2026*
*Total Tasks: 175+*
*Completed: ~100*
*Remaining: ~75 (includes 25 new code quality tasks)*