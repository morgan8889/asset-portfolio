# Asset Portfolio Tracker - Test Suite Plan

Comprehensive test suite for the portfolio tracking application with full coverage across unit, integration, and E2E tests.

## 🧪 Test Coverage

### Current Test Suite
- **Unit Tests**: 80%+ coverage target
- **Integration Tests**: Critical user flows
- **E2E Tests**: Complete user journeys
- **Component Tests**: UI component behavior

### Test Categories

#### Unit Tests
- **Database Operations** (`src/lib/db/__tests__/`)
  - Portfolio CRUD operations
  - Transaction queries and filtering
  - Asset management
  - Settings persistence

- **Store Management** (`src/lib/stores/__tests__/`)
  - Portfolio state management
  - Transaction state management
  - Error handling and loading states

- **Utilities** (`src/lib/utils/__tests__/`)
  - Input validation and sanitization
  - Form schemas and data validation
  - Security utilities
  - Rate limiting

#### Component Tests
- **Forms** (`src/components/forms/__tests__/`)
  - Add transaction dialog
  - Form validation
  - User interactions
  - Error states

#### Integration Tests
- **Portfolio Workflow** (`src/__tests__/integration/`)
  - Complete portfolio creation and management
  - Multi-asset transaction flows
  - Data consistency during failures
  - Bulk operations

- **API Routes** (`src/__tests__/integration/`)
  - Price API endpoints
  - Rate limiting
  - Error handling
  - Security headers

#### E2E Tests
- **User Journeys** (`tests/e2e/`)
  - Portfolio dashboard navigation
  - Transaction management
  - Holdings table functionality
  - Chart visualizations

## 🚀 Running Tests

### Install Dependencies
```bash
npm install
```

### Unit & Integration Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage report
npm run test:coverage

# Run tests once (CI mode)
npm run test:run

# Interactive test UI
npm run test:ui
```

### E2E Tests
```bash
# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui
```

### All Tests
```bash
# Run complete test suite
npm run test:all
```

## 📊 Coverage Targets

### Quality Gates
- **Statements**: 80%
- **Branches**: 75%
- **Functions**: 85%
- **Lines**: 80%

### Coverage by Area
```
src/lib/db/           ████████████ 95%
src/lib/stores/       ████████████ 90%
src/lib/utils/        ████████████ 92%
src/components/       ████████░░░░ 75%
src/app/api/          ████████░░░░ 80%
```

## 🔧 Test Configuration

### Vitest Setup
- **Framework**: Vitest with React Testing Library
- **Environment**: jsdom for DOM simulation
- **Coverage**: v8 provider
- **Mocking**: Vi mocking system

### Test Structure
```
src/
├── __tests__/
│   ├── integration/
│   │   ├── portfolio-workflow.test.ts
│   │   └── api-routes.test.ts
│   └── setup.ts
├── lib/
│   ├── db/__tests__/
│   ├── stores/__tests__/
│   └── utils/__tests__/
├── components/
│   └── **/__tests__/
└── test-utils/
    ├── index.ts
    ├── test-factories.ts
    ├── test-helpers.ts
    └── test-providers.tsx
```

## 🛠️ Test Utilities

### Test Factories
```typescript
import { createMockAsset, createMockTransaction } from '@/test-utils'

const asset = createMockAsset({ symbol: 'AAPL', currentPrice: new Decimal(150) })
const transaction = createMockTransaction({ type: TransactionType.BUY })
```

### Test Helpers
```typescript
import { render, screen, fireEvent } from '@/test-utils'

const { user } = render(<MyComponent />)
await user.click(screen.getByRole('button'))
```

### Mock Providers
```typescript
import { TestProviders } from '@/test-utils'

render(<MyComponent />, { wrapper: TestProviders })
```

## 📋 Test Checklist

### Pre-commit Tests
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Coverage thresholds met
- [ ] No test warnings
- [ ] Type checking passes

### CI/CD Pipeline
- [ ] All test suites pass
- [ ] Coverage reports generated
- [ ] E2E tests in multiple browsers
- [ ] Performance regression tests

## 🔍 Debugging Tests

### Common Issues
1. **Mock not working**: Check mock placement and vi.clearAllMocks()
2. **Async test failures**: Ensure proper await and waitFor usage
3. **Component not rendering**: Verify test providers and setup

### Debug Commands
```bash
# Run specific test file
npm test src/lib/db/__tests__/queries.test.ts

# Debug mode
npm test -- --reporter=verbose

# Coverage for specific file
npm run test:coverage -- src/lib/stores/portfolio.ts
```

## 📈 Continuous Improvement

### Test Metrics Tracking
- Coverage trends over time
- Test execution time
- Flaky test identification
- Failure rate analysis

### Best Practices
- Write tests before implementation (TDD)
- Test behavior, not implementation
- Keep tests isolated and independent
- Use descriptive test names
- Mock external dependencies

## 🎯 Future Enhancements

### Planned Additions
- [ ] Visual regression testing
- [ ] Performance benchmarking
- [ ] Accessibility testing automation
- [ ] Security vulnerability scanning
- [ ] Load testing for API endpoints

### Test Environment Improvements
- [ ] Parallel test execution
- [ ] Test data seeding
- [ ] Custom test reporters
- [ ] CI test optimization

## 📝 Implementation Details

### Database Tests (`src/lib/db/__tests__/queries.test.ts`)
```typescript
describe('Portfolio Queries', () => {
  it('should create portfolio with generated id and timestamps', async () => {
    const portfolioData = { name: 'Test Portfolio', description: 'Test' }
    const result = await portfolioQueries.create(portfolioData)

    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        ...portfolioData,
        id: expect.stringMatching(/mock-uuid-/),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      })
    )
  })
})
```

### Store Tests (`src/lib/stores/__tests__/portfolio.test.ts`)
```typescript
describe('Portfolio Store', () => {
  it('should calculate portfolio metrics correctly', async () => {
    const mockHoldings = [/* test data */]
    mockHoldingQueries.getByPortfolio.mockResolvedValue(mockHoldings)

    await usePortfolioStore.getState().calculateMetrics('p1')

    const state = usePortfolioStore.getState()
    expect(state.metrics!.totalValue.toNumber()).toBe(2000)
    expect(state.metrics!.totalGain.toNumber()).toBe(0)
  })
})
```

### Component Tests (`src/components/forms/__tests__/add-transaction.test.tsx`)
```typescript
describe('AddTransactionDialog', () => {
  it('should validate required fields', async () => {
    render(<AddTransactionDialog />)

    fireEvent.click(screen.getByRole('button', { name: /add transaction/i }))
    fireEvent.click(screen.getByRole('button', { name: /add transaction$/i }))

    await waitFor(() => {
      expect(screen.getByText(/asset symbol is required/i)).toBeInTheDocument()
    })
  })
})
```

### Integration Tests (`src/__tests__/integration/portfolio-workflow.test.ts`)
```typescript
describe('Portfolio Workflow Integration Tests', () => {
  it('should create portfolio, add transactions, and calculate metrics', async () => {
    // Test complete user workflow
    const portfolioStore = usePortfolioStore.getState()
    await portfolioStore.createPortfolio(portfolioData)

    const transactionStore = useTransactionStore.getState()
    await transactionStore.createTransaction(transactionData)

    await portfolioStore.calculateMetrics(portfolioId)

    const state = usePortfolioStore.getState()
    expect(state.metrics).toBeDefined()
  })
})
```

## 🔒 Security Testing

### Input Validation Tests
- SQL injection prevention
- XSS protection
- File upload security
- Rate limiting validation

### API Security Tests
- Authentication bypass attempts
- Authorization checks
- CORS configuration
- Security headers validation

## 🌐 Cross-Browser Testing

### E2E Test Matrix
- **Chrome**: Latest stable
- **Firefox**: Latest stable
- **Safari**: Latest stable (macOS)
- **Edge**: Latest stable

### Responsive Testing
- **Desktop**: 1920x1080, 1366x768
- **Tablet**: 768x1024, 1024x768
- **Mobile**: 375x667, 414x896

## 📊 Performance Testing

### Metrics Tracked
- Initial page load time
- Time to interactive
- First contentful paint
- Bundle size analysis

### Load Testing
- Concurrent user simulation
- API endpoint stress testing
- Database query performance
- Memory usage monitoring

## 🔄 CI/CD Integration

### GitHub Actions Workflow
```yaml
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:coverage
      - run: npm run test:e2e
      - uses: codecov/codecov-action@v3
```

### Quality Gates
- All tests must pass
- Coverage thresholds met
- No TypeScript errors
- Linting rules passed
- Security vulnerabilities checked

---

This comprehensive test suite ensures the portfolio tracker application is robust, reliable, and maintainable. The combination of unit, integration, and E2E tests provides confidence in code quality and user experience.