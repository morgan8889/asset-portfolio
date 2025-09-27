# Portfolio Tracker - Development Setup

## Quick Start

This project has been initialized with a comprehensive Next.js 14 structure following the technical specification. Here's how to get started:

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your API keys (optional for basic functionality).

### 3. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Project Structure Overview

The project follows the exact structure specified in the technical documentation:

```
src/
├── app/                    # Next.js App Router
│   ├── (dashboard)/       # Dashboard route group
│   │   ├── layout.tsx     # Dashboard layout with sidebar
│   │   ├── page.tsx       # Main dashboard
│   │   ├── holdings/      # Holdings management
│   │   ├── transactions/  # Transaction history
│   │   └── analysis/      # Analytics views
│   ├── layout.tsx         # Root layout with theme provider
│   └── page.tsx           # Root page (redirects to dashboard)
│
├── components/
│   ├── ui/                # shadcn/ui base components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── input.tsx
│   └── layout/            # Layout components
│       ├── header.tsx     # Top navigation
│       └── sidebar.tsx    # Side navigation
│
├── lib/
│   ├── db/                # Database layer (Dexie.js)
│   │   ├── schema.ts      # Database schema and models
│   │   ├── queries.ts     # Database queries
│   │   ├── migrations.ts  # Schema migrations
│   │   └── index.ts       # Database exports
│   ├── stores/            # Zustand state management
│   │   ├── portfolio.ts   # Portfolio state
│   │   ├── asset.ts       # Asset state
│   │   ├── transaction.ts # Transaction state
│   │   ├── ui.ts          # UI state and notifications
│   │   └── index.ts       # Store exports
│   └── utils.ts           # Utility functions
│
├── types/                 # TypeScript definitions
│   ├── portfolio.ts       # Portfolio types
│   ├── asset.ts           # Asset types
│   ├── transaction.ts     # Transaction types
│   ├── api.ts             # API types
│   ├── ui.ts              # UI types
│   └── index.ts           # Type exports
│
└── styles/
    └── globals.css        # Global styles with design system
```

## Key Features Implemented

### ✅ Completed Foundation

1. **Next.js 14 with App Router**: Modern React framework with latest features
2. **TypeScript Configuration**: Strict typing with path aliases
3. **Tailwind CSS + Design System**: Complete color palette and component styles
4. **Database Layer**: Dexie.js with IndexedDB for local-first storage
5. **State Management**: Zustand stores for all data management
6. **Type Definitions**: Comprehensive TypeScript interfaces
7. **Basic UI Components**: shadcn/ui foundation components
8. **Layout System**: Responsive header and sidebar navigation

### 📊 Database Schema

The database is fully configured with:
- **Portfolios**: Multi-portfolio support with settings
- **Assets**: Stock, ETF, crypto, and other asset types
- **Holdings**: Position tracking with tax lots
- **Transactions**: Complete transaction history
- **Price Data**: Historical and snapshot price storage
- **User Settings**: Customizable preferences

### 🏪 State Management

Zustand stores are configured for:
- **Portfolio Store**: Portfolio and holdings management
- **Asset Store**: Asset data and price management
- **Transaction Store**: Transaction CRUD and filtering
- **UI Store**: Theme, notifications, and modal states

### 🎨 Design System

Complete design system with:
- Light/dark theme support
- Financial-specific color schemes
- Typography scale
- Component variants
- Responsive utilities

## Next Development Steps

### Immediate Priorities (Week 1-2)

1. **Complete shadcn/ui Components**
   - Add remaining UI components (select, dialog, table, etc.)
   - Create form components with react-hook-form integration

2. **Implement Core Features**
   - Portfolio CRUD operations
   - Asset search and management
   - Transaction entry forms
   - CSV import functionality

3. **Add Charts and Visualizations**
   - Portfolio performance charts (Recharts)
   - Asset allocation charts
   - Interactive financial charts

### Medium Term (Week 3-4)

1. **Price Feed Integration**
   - Yahoo Finance API integration
   - CoinGecko for crypto prices
   - Real-time price updates

2. **Advanced Features**
   - Tax lot tracking and reporting
   - Performance analytics
   - Risk metrics

3. **Testing and Polish**
   - Unit tests with Vitest
   - E2E tests with Playwright
   - Performance optimization

## Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build           # Create production build
npm run start           # Start production server

# Code Quality
npm run lint            # Run ESLint
npm run lint:fix        # Fix ESLint issues
npm run type-check      # TypeScript type checking
npm run format          # Format code with Prettier
npm run format:check    # Check code formatting

# Testing
npm run test            # Run unit tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with coverage
npm run test:e2e        # Run E2E tests
npm run test:e2e:ui     # Run E2E tests with UI
```

## Development Guidelines

### Code Organization
- Use absolute imports with `@/` prefix
- Follow the established folder structure
- Keep components small and focused
- Use TypeScript strict mode

### State Management
- Use Zustand stores for global state
- Keep local state in components when appropriate
- Use the established error handling patterns

### Styling
- Use Tailwind CSS classes
- Follow the design system variables
- Use the `cn()` utility for conditional classes
- Maintain responsive design principles

### Database Operations
- Use the provided query functions
- Handle Decimal.js conversions properly
- Implement proper error handling
- Use transactions for related operations

## Technical Decisions

### Why These Technologies?

1. **Next.js 14**: Latest App Router, React Server Components, optimized performance
2. **TypeScript**: Type safety for financial calculations and data integrity
3. **Tailwind CSS**: Rapid UI development with consistent design system
4. **Dexie.js**: Powerful IndexedDB wrapper for local-first architecture
5. **Zustand**: Lightweight state management without boilerplate
6. **shadcn/ui**: High-quality, accessible UI components
7. **Decimal.js**: Precise financial calculations without floating-point errors

### Architecture Principles

1. **Local-First**: All data stored locally for privacy and performance
2. **Type Safety**: Comprehensive TypeScript for data integrity
3. **Component Composition**: Reusable, composable UI components
4. **Error Boundaries**: Graceful error handling throughout the app
5. **Progressive Enhancement**: Works offline, enhances with network

## Troubleshooting

### Common Issues

1. **Database Initialization Errors**
   - Check browser IndexedDB support
   - Clear browser data if corrupted
   - Verify migration scripts

2. **Build Errors**
   - Run `npm run type-check` to identify TypeScript issues
   - Check import paths and dependencies

3. **Styling Issues**
   - Verify Tailwind CSS configuration
   - Check for conflicting CSS classes
   - Ensure proper dark mode setup

### Getting Help

1. Check the technical specification in `docs/specifications/`
2. Review existing code patterns in the codebase
3. Use TypeScript IntelliSense for API discovery
4. Check browser console for runtime errors

---

This foundation provides a solid base for building the complete Portfolio Tracker application according to the technical specification. The architecture is scalable, maintainable, and follows modern best practices.