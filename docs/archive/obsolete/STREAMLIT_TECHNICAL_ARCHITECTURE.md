# Streamlit Financial Portfolio Tracker - Technical Architecture

**Project**: Privacy-First Financial Portfolio Tracker
**Technology**: Streamlit + Python Ecosystem
**Deployment**: Self-Hosted Container Environment

## 🏗️ System Architecture Overview

### Architecture Principles
- **Privacy-First**: User owns infrastructure, controls all financial data
- **Local Processing**: All calculations and analysis performed on user's server
- **Containerized Deployment**: Docker-based for easy deployment and scaling
- **Python-Native**: Leverage Python's superior financial ecosystem
- **Real-Time Analytics**: Live portfolio tracking with advanced metrics

### High-Level Architecture Diagram
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Browser   │    │  Streamlit App  │    │   PostgreSQL    │
│                 │◄──►│                 │◄──►│    Database     │
│  User Interface │    │  (Python/Flask) │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │  External APIs  │
                       │ (Yahoo Finance, │
                       │  Alpha Vantage) │
                       └─────────────────┘
```

## 🛠️ Technology Stack

### Core Framework
```yaml
streamlit: ">=1.28.0"          # Web application framework
pandas: ">=2.0.0"              # Data manipulation and analysis
numpy: ">=1.24.0"              # Numerical computing
plotly: ">=5.15.0"             # Interactive visualizations
```

### Financial Libraries
```yaml
yfinance: ">=0.2.18"           # Market data (Yahoo Finance)
empyrical: ">=0.5.5"           # Portfolio performance metrics
quantlib: ">=1.31"             # Advanced financial calculations
scipy: ">=1.11.0"              # Statistical analysis
```

### Database and Storage
```yaml
sqlalchemy: ">=2.0.0"          # ORM and database abstraction
alembic: ">=1.12.0"            # Database migrations
psycopg2-binary: ">=2.9.0"     # PostgreSQL adapter
```

### Development and Testing
```yaml
pytest: ">=7.4.0"             # Testing framework
pytest-streamlit: ">=0.1.0"   # Streamlit testing utilities
black: ">=23.7.0"             # Code formatting
ruff: ">=0.0.280"              # Linting and code quality
```

## 🗄️ Database Architecture

### Database Selection: PostgreSQL
**Rationale**:
- ACID compliance for financial data integrity
- JSON support for flexible metadata storage
- Strong performance for analytical queries
- Excellent backup and replication capabilities

### Connection Management
```python
# Database configuration
DATABASE_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': int(os.getenv('DB_PORT', 5432)),
    'database': os.getenv('DB_NAME', 'portfolio_tracker'),
    'username': os.getenv('DB_USER', 'portfolio_user'),
    'password': os.getenv('DB_PASSWORD'),
    'pool_size': 10,
    'max_overflow': 20,
    'pool_timeout': 30,
    'pool_recycle': 3600
}
```

### Core Tables Structure
```sql
-- Users and authentication
users (id, email, password_hash, created_at, last_login)

-- Portfolio management
portfolios (id, user_id, name, description, currency, benchmark, created_at)
portfolio_settings (portfolio_id, risk_tolerance, investment_goals, rebalance_threshold)

-- Asset management
assets (id, symbol, name, asset_type, sector, exchange, currency)
asset_metadata (asset_id, market_cap, pe_ratio, dividend_yield, metadata_json)

-- Holdings and transactions
holdings (id, portfolio_id, asset_id, quantity, cost_basis, purchase_date)
transactions (id, portfolio_id, asset_id, transaction_type, quantity, price, date, fees)

-- Price data and caching
price_history (id, asset_id, date, open, high, low, close, volume, adjusted_close)
price_cache (asset_id, price, last_updated, source)

-- Analytics and reports
portfolio_snapshots (id, portfolio_id, date, total_value, metrics_json)
performance_metrics (id, portfolio_id, period, returns, volatility, sharpe_ratio, max_drawdown)
```

## 🔧 Application Architecture

### Multi-Page Application Structure
```python
# Main application entry point
app.py                          # Streamlit app configuration and routing

# Page structure
pages/
├── 📊_Dashboard.py            # Portfolio overview and summary
├── 💼_Holdings.py             # Holdings management and analysis
├── 📈_Transactions.py         # Transaction tracking and entry
├── 🧮_Analytics.py            # Advanced portfolio analytics
├── ⚙️_Settings.py             # Portfolio and user settings
└── 📋_Reports.py              # Report generation and export
```

### Service Layer Architecture
```python
# Business logic services
services/
├── portfolio_service.py       # Portfolio CRUD and calculations
├── holdings_service.py        # Holdings management and analysis
├── transaction_service.py     # Transaction processing
├── price_service.py           # Price data fetching and caching
├── analytics_service.py       # Financial metrics and analysis
├── report_service.py          # Report generation
└── auth_service.py            # Authentication and user management
```

### Data Access Layer
```python
# Database models and queries
data/
├── models/
│   ├── user.py                # User model and authentication
│   ├── portfolio.py           # Portfolio and settings models
│   ├── asset.py               # Asset and metadata models
│   ├── holding.py             # Holdings model
│   ├── transaction.py         # Transaction model
│   └── price.py               # Price data models
├── repositories/
│   ├── portfolio_repository.py # Portfolio data access
│   ├── holdings_repository.py  # Holdings data access
│   ├── transaction_repository.py # Transaction data access
│   └── price_repository.py     # Price data access
└── database.py                # Database connection and session management
```

## 🔌 External API Integration

### Price Data Sources
```python
# Primary: Yahoo Finance (yfinance)
PRICE_SOURCES = {
    'yahoo': {
        'library': 'yfinance',
        'rate_limit': '2000/hour',
        'coverage': 'Global stocks, ETFs, crypto',
        'cost': 'Free'
    },
    'alpha_vantage': {
        'library': 'alpha_vantage',
        'rate_limit': '5/minute',
        'coverage': 'US stocks, forex, crypto',
        'cost': 'Free tier available'
    },
    'iex_cloud': {
        'library': 'iexfinance',
        'rate_limit': '100/second',
        'coverage': 'US stocks and ETFs',
        'cost': 'Paid'
    }
}
```

### API Integration Pattern
```python
class PriceDataService:
    def __init__(self):
        self.providers = [
            YahooFinanceProvider(),
            AlphaVantageProvider(),
            IEXCloudProvider()
        ]

    async def get_price(self, symbol: str) -> Optional[Price]:
        for provider in self.providers:
            try:
                price = await provider.fetch_price(symbol)
                if price:
                    await self.cache_price(symbol, price)
                    return price
            except Exception as e:
                logger.warning(f"Provider {provider.name} failed: {e}")

        return await self.get_cached_price(symbol)
```

## 🔐 Security Architecture

### Authentication and Authorization
```python
# Session-based authentication
SECURITY_CONFIG = {
    'session_timeout': 3600,  # 1 hour
    'password_min_length': 12,
    'password_complexity': True,
    'max_login_attempts': 5,
    'lockout_duration': 900,  # 15 minutes
    'secure_cookies': True,
    'csrf_protection': True
}
```

### Data Encryption
```python
# Encryption for sensitive data
ENCRYPTION_CONFIG = {
    'algorithm': 'AES-256-GCM',
    'key_derivation': 'PBKDF2',
    'salt_length': 32,
    'iterations': 100000
}
```

### API Security
```python
# Rate limiting and API protection
RATE_LIMITS = {
    'price_updates': '100/minute',
    'bulk_operations': '10/minute',
    'report_generation': '5/minute',
    'data_export': '3/hour'
}
```

## 📊 Performance Architecture

### Caching Strategy
```python
# Multi-level caching
CACHE_CONFIG = {
    'price_data': {
        'ttl': 300,  # 5 minutes for real-time prices
        'backend': 'redis'
    },
    'portfolio_calculations': {
        'ttl': 60,   # 1 minute for portfolio metrics
        'backend': 'memory'
    },
    'static_data': {
        'ttl': 86400,  # 24 hours for asset metadata
        'backend': 'redis'
    }
}
```

### Database Optimization
```sql
-- Key indexes for performance
CREATE INDEX CONCURRENTLY idx_holdings_portfolio_id ON holdings(portfolio_id);
CREATE INDEX CONCURRENTLY idx_transactions_portfolio_date ON transactions(portfolio_id, date DESC);
CREATE INDEX CONCURRENTLY idx_price_history_asset_date ON price_history(asset_id, date DESC);
CREATE INDEX CONCURRENTLY idx_price_cache_asset_updated ON price_cache(asset_id, last_updated DESC);
```

### Computation Optimization
```python
# Vectorized financial calculations
class PortfolioCalculator:
    @staticmethod
    def calculate_returns(prices: pd.DataFrame) -> pd.Series:
        """Vectorized return calculations using pandas"""
        return prices.pct_change().fillna(0)

    @staticmethod
    def calculate_portfolio_value(holdings: pd.DataFrame, prices: pd.Series) -> float:
        """Efficient portfolio valuation"""
        return (holdings['quantity'] * prices).sum()
```

## 🚀 Deployment Architecture

### Container Strategy
```dockerfile
# Multi-stage Docker build
FROM python:3.11-slim as builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --user -r requirements.txt

FROM python:3.11-slim
WORKDIR /app
COPY --from=builder /root/.local /root/.local
COPY . .
EXPOSE 8501
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8501/_stcore/health || exit 1
CMD ["streamlit", "run", "app.py", "--server.port=8501", "--server.address=0.0.0.0"]
```

### Docker Compose Configuration
```yaml
version: '3.8'
services:
  streamlit-app:
    build: .
    ports:
      - "8501:8501"
    environment:
      - DB_HOST=postgres
      - DB_NAME=portfolio_tracker
      - DB_USER=portfolio_user
      - DB_PASSWORD=${DB_PASSWORD}
    depends_on:
      - postgres
      - redis
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=portfolio_tracker
      - POSTGRES_USER=portfolio_user
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### Production Environment
```yaml
# Production deployment considerations
infrastructure:
  - reverse_proxy: "nginx with SSL termination"
  - ssl_certificates: "Let's Encrypt or custom CA"
  - monitoring: "Prometheus + Grafana"
  - logging: "ELK stack or similar"
  - backups: "Automated database and data backups"
  - scaling: "Horizontal scaling with load balancer"
```

## 🔄 Development Workflow

### Environment Setup
```bash
# Development environment
git clone <repository>
cd portfolio-tracker-streamlit
python -m venv venv
source venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env
# Configure environment variables
docker-compose up -d postgres redis
alembic upgrade head
streamlit run app.py
```

### Code Quality Pipeline
```yaml
# CI/CD pipeline
stages:
  - code_quality:
      - black --check .
      - ruff check .
      - mypy .
  - testing:
      - pytest tests/unit/
      - pytest tests/integration/
      - pytest tests/e2e/
  - security:
      - bandit -r .
      - safety check
  - deployment:
      - docker build and push
      - deploy to staging
      - run acceptance tests
      - deploy to production
```

## 📈 Scalability Considerations

### Horizontal Scaling
- **Stateless Application**: Streamlit app can be replicated
- **Database Scaling**: Read replicas for analytics queries
- **Caching**: Redis cluster for distributed caching
- **Load Balancing**: nginx or cloud load balancer

### Performance Optimization
- **Connection Pooling**: Database connection pooling
- **Query Optimization**: Indexed queries and query analysis
- **Caching**: Multi-level caching strategy
- **Async Operations**: Async price data fetching

### Monitoring and Observability
```python
# Application monitoring
MONITORING_CONFIG = {
    'metrics': 'Prometheus',
    'logging': 'Structured JSON logs',
    'tracing': 'OpenTelemetry',
    'alerting': 'Grafana alerts',
    'health_checks': 'Built-in health endpoints'
}
```

This technical architecture provides a comprehensive foundation for building a robust, scalable, and secure Streamlit-based financial portfolio tracker with enterprise-grade capabilities while maintaining privacy-first principles.