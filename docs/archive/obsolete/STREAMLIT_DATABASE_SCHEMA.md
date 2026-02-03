# Streamlit Portfolio Tracker - Database Schema

**Database**: PostgreSQL 15+
**ORM**: SQLAlchemy 2.0+
**Migrations**: Alembic
**Purpose**: Complete data model for privacy-first financial portfolio tracking

## 🗄️ Database Design Principles

### Core Principles
- **Data Integrity**: ACID compliance for financial data accuracy
- **Auditability**: Track all changes to financial records
- **Performance**: Optimized for analytical queries and reporting
- **Scalability**: Support for multiple users and large transaction volumes
- **Privacy**: User data isolation and secure storage

### Naming Conventions
- **Tables**: Snake_case, plural nouns (e.g., `portfolios`, `transactions`)
- **Columns**: Snake_case (e.g., `created_at`, `total_value`)
- **Indexes**: `idx_table_column` (e.g., `idx_portfolios_user_id`)
- **Foreign Keys**: `fk_table_reference` (e.g., `fk_holdings_portfolio`)

## 📊 Entity Relationship Diagram

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│    USERS    │    │ PORTFOLIOS  │    │   ASSETS    │
│             │    │             │    │             │
│ id (PK)     │◄──┐│ id (PK)     │    │ id (PK)     │
│ email       │   ││ user_id (FK)│    │ symbol      │
│ password    │   ││ name        │    │ name        │
│ created_at  │   ││ currency    │    │ asset_type  │
└─────────────┘   │└─────────────┘    │ sector      │
                  │       │           └─────────────┘
                  │       │                  │
┌─────────────┐   │       │           ┌─────────────┐
│   HOLDINGS  │   │       │           │PRICE_HISTORY│
│             │   │       │           │             │
│ id (PK)     │   │       │           │ id (PK)     │
│portfolio_id │◄──┘       │           │ asset_id(FK)│
│ asset_id(FK)│◄──────────┼───────────┤ date        │
│ quantity    │           │           │ close_price │
│ cost_basis  │           │           │ volume      │
└─────────────┘           │           └─────────────┘
       │                  │
       │           ┌─────────────┐
       │           │TRANSACTIONS │
       │           │             │
       │           │ id (PK)     │
       └───────────┤portfolio_id │
                   │ asset_id(FK)│
                   │ txn_type    │
                   │ quantity    │
                   │ price       │
                   │ date        │
                   └─────────────┘
```

## 📋 Table Definitions

### 1. Users Table
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    timezone VARCHAR(50) DEFAULT 'UTC',
    date_format VARCHAR(20) DEFAULT 'YYYY-MM-DD',
    currency VARCHAR(3) DEFAULT 'USD',
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE UNIQUE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(is_active);
```

### 2. Portfolios Table
```sql
CREATE TABLE portfolios (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    base_currency VARCHAR(3) DEFAULT 'USD',
    benchmark_symbol VARCHAR(20) DEFAULT 'SPY',
    risk_tolerance VARCHAR(20) CHECK (risk_tolerance IN ('conservative', 'moderate', 'aggressive')),
    target_return DECIMAL(5,4), -- e.g., 0.08 for 8%
    rebalance_threshold DECIMAL(4,3) DEFAULT 0.05, -- 5%
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT portfolios_user_name_unique UNIQUE(user_id, name)
);

-- Indexes
CREATE INDEX idx_portfolios_user_id ON portfolios(user_id);
CREATE INDEX idx_portfolios_active ON portfolios(is_active);
```

### 3. Assets Table
```sql
CREATE TABLE assets (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    name VARCHAR(255) NOT NULL,
    asset_type VARCHAR(50) NOT NULL CHECK (asset_type IN (
        'stock', 'etf', 'mutual_fund', 'bond', 'crypto', 'commodity', 'real_estate', 'other'
    )),
    sector VARCHAR(100),
    industry VARCHAR(100),
    exchange VARCHAR(50),
    currency VARCHAR(3) DEFAULT 'USD',
    country VARCHAR(2), -- ISO country code
    market_cap BIGINT,
    is_active BOOLEAN DEFAULT true,
    data_source VARCHAR(50) DEFAULT 'yahoo_finance',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT assets_symbol_unique UNIQUE(symbol)
);

-- Indexes
CREATE UNIQUE INDEX idx_assets_symbol ON assets(symbol);
CREATE INDEX idx_assets_type ON assets(asset_type);
CREATE INDEX idx_assets_sector ON assets(sector);
CREATE INDEX idx_assets_exchange ON assets(exchange);
```

### 4. Asset Metadata Table
```sql
CREATE TABLE asset_metadata (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    pe_ratio DECIMAL(8,2),
    dividend_yield DECIMAL(5,4),
    beta DECIMAL(6,3),
    market_cap BIGINT,
    avg_volume BIGINT,
    week_52_high DECIMAL(12,4),
    week_52_low DECIMAL(12,4),
    analyst_rating VARCHAR(20),
    esg_score INTEGER CHECK (esg_score BETWEEN 0 AND 100),
    metadata_json JSONB, -- Flexible storage for additional data
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT asset_metadata_asset_unique UNIQUE(asset_id)
);

-- Indexes
CREATE INDEX idx_asset_metadata_asset_id ON asset_metadata(asset_id);
CREATE INDEX idx_asset_metadata_updated ON asset_metadata(last_updated);
CREATE INDEX idx_asset_metadata_json ON asset_metadata USING GIN(metadata_json);
```

### 5. Holdings Table
```sql
CREATE TABLE holdings (
    id SERIAL PRIMARY KEY,
    portfolio_id INTEGER NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
    quantity DECIMAL(15,6) NOT NULL CHECK (quantity >= 0),
    average_cost_basis DECIMAL(12,4) NOT NULL CHECK (average_cost_basis >= 0),
    first_purchase_date DATE,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT holdings_portfolio_asset_unique UNIQUE(portfolio_id, asset_id)
);

-- Indexes
CREATE INDEX idx_holdings_portfolio_id ON holdings(portfolio_id);
CREATE INDEX idx_holdings_asset_id ON holdings(asset_id);
CREATE INDEX idx_holdings_updated ON holdings(last_updated);
```

### 6. Transactions Table
```sql
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    portfolio_id INTEGER NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN (
        'buy', 'sell', 'dividend', 'split', 'merger', 'spinoff', 'deposit', 'withdrawal'
    )),
    quantity DECIMAL(15,6) NOT NULL,
    price DECIMAL(12,4) NOT NULL CHECK (price >= 0),
    fees DECIMAL(10,2) DEFAULT 0 CHECK (fees >= 0),
    tax DECIMAL(10,2) DEFAULT 0 CHECK (tax >= 0),
    transaction_date DATE NOT NULL,
    settlement_date DATE,
    notes TEXT,
    external_id VARCHAR(255), -- For broker integration
    broker VARCHAR(100),
    account_number VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_transactions_portfolio_id ON transactions(portfolio_id);
CREATE INDEX idx_transactions_asset_id ON transactions(asset_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date DESC);
CREATE INDEX idx_transactions_type ON transactions(transaction_type);
CREATE INDEX idx_transactions_external_id ON transactions(external_id);
```

### 7. Price History Table
```sql
CREATE TABLE price_history (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    open_price DECIMAL(12,4),
    high_price DECIMAL(12,4),
    low_price DECIMAL(12,4),
    close_price DECIMAL(12,4) NOT NULL,
    adjusted_close DECIMAL(12,4),
    volume BIGINT,
    dividend_amount DECIMAL(10,4) DEFAULT 0,
    split_ratio DECIMAL(10,6) DEFAULT 1,
    data_source VARCHAR(50) DEFAULT 'yahoo_finance',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT price_history_asset_date_unique UNIQUE(asset_id, date)
);

-- Indexes
CREATE INDEX idx_price_history_asset_date ON price_history(asset_id, date DESC);
CREATE INDEX idx_price_history_date ON price_history(date DESC);
CREATE INDEX idx_price_history_source ON price_history(data_source);
```

### 8. Price Cache Table
```sql
CREATE TABLE price_cache (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    current_price DECIMAL(12,4) NOT NULL,
    previous_close DECIMAL(12,4),
    day_change DECIMAL(12,4),
    day_change_percent DECIMAL(8,4),
    volume BIGINT,
    market_cap BIGINT,
    data_source VARCHAR(50) DEFAULT 'yahoo_finance',
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    market_hours_last_trade BOOLEAN DEFAULT false,

    CONSTRAINT price_cache_asset_unique UNIQUE(asset_id)
);

-- Indexes
CREATE INDEX idx_price_cache_updated ON price_cache(last_updated DESC);
CREATE INDEX idx_price_cache_source ON price_cache(data_source);
```

### 9. Portfolio Snapshots Table
```sql
CREATE TABLE portfolio_snapshots (
    id SERIAL PRIMARY KEY,
    portfolio_id INTEGER NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    total_value DECIMAL(15,2) NOT NULL,
    cash_balance DECIMAL(15,2) DEFAULT 0,
    total_cost_basis DECIMAL(15,2) NOT NULL,
    unrealized_gain_loss DECIMAL(15,2),
    realized_gain_loss DECIMAL(15,2) DEFAULT 0,
    dividend_income DECIMAL(15,2) DEFAULT 0,
    number_of_holdings INTEGER DEFAULT 0,
    metrics_json JSONB, -- Store calculated metrics
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT portfolio_snapshots_portfolio_date_unique UNIQUE(portfolio_id, snapshot_date)
);

-- Indexes
CREATE INDEX idx_portfolio_snapshots_portfolio_date ON portfolio_snapshots(portfolio_id, snapshot_date DESC);
CREATE INDEX idx_portfolio_snapshots_date ON portfolio_snapshots(snapshot_date DESC);
CREATE INDEX idx_portfolio_snapshots_metrics ON portfolio_snapshots USING GIN(metrics_json);
```

### 10. Performance Metrics Table
```sql
CREATE TABLE performance_metrics (
    id SERIAL PRIMARY KEY,
    portfolio_id INTEGER NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    metric_period VARCHAR(20) NOT NULL CHECK (metric_period IN (
        '1D', '1W', '1M', '3M', '6M', '1Y', '2Y', '3Y', '5Y', 'YTD', 'ITD'
    )),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_return DECIMAL(8,4), -- e.g., 0.1234 for 12.34%
    annualized_return DECIMAL(8,4),
    volatility DECIMAL(8,4),
    sharpe_ratio DECIMAL(8,4),
    sortino_ratio DECIMAL(8,4),
    max_drawdown DECIMAL(8,4),
    calmar_ratio DECIMAL(8,4),
    beta DECIMAL(6,3),
    alpha DECIMAL(8,4),
    tracking_error DECIMAL(8,4),
    information_ratio DECIMAL(8,4),
    var_95 DECIMAL(8,4), -- Value at Risk
    cvar_95 DECIMAL(8,4), -- Conditional Value at Risk
    benchmark_symbol VARCHAR(20),
    benchmark_return DECIMAL(8,4),
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT performance_metrics_portfolio_period_unique UNIQUE(portfolio_id, metric_period, end_date)
);

-- Indexes
CREATE INDEX idx_performance_metrics_portfolio_period ON performance_metrics(portfolio_id, metric_period);
CREATE INDEX idx_performance_metrics_end_date ON performance_metrics(end_date DESC);
```

### 11. User Settings Table
```sql
CREATE TABLE user_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    setting_key VARCHAR(100) NOT NULL,
    setting_value TEXT,
    setting_type VARCHAR(20) DEFAULT 'string' CHECK (setting_type IN (
        'string', 'number', 'boolean', 'json'
    )),
    description TEXT,
    is_encrypted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT user_settings_user_key_unique UNIQUE(user_id, setting_key)
);

-- Indexes
CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX idx_user_settings_key ON user_settings(setting_key);
```

### 12. Audit Log Table
```sql
CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id INTEGER NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_table_record ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);
```

## 🔧 SQLAlchemy Models

### Base Model
```python
from sqlalchemy import Column, Integer, DateTime, func
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class BaseModel(Base):
    __abstract__ = True

    id = Column(Integer, primary_key=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
```

### User Model
```python
from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.orm import relationship

class User(BaseModel):
    __tablename__ = 'users'

    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(100))
    last_name = Column(String(100))
    timezone = Column(String(50), default='UTC')
    date_format = Column(String(20), default='YYYY-MM-DD')
    currency = Column(String(3), default='USD')
    is_active = Column(Boolean, default=True)
    last_login = Column(DateTime(timezone=True))

    # Relationships
    portfolios = relationship("Portfolio", back_populates="user", cascade="all, delete-orphan")
    settings = relationship("UserSetting", back_populates="user", cascade="all, delete-orphan")
```

### Portfolio Model
```python
from sqlalchemy import Column, String, ForeignKey, Boolean, DECIMAL
from sqlalchemy.orm import relationship

class Portfolio(BaseModel):
    __tablename__ = 'portfolios'

    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(String)
    base_currency = Column(String(3), default='USD')
    benchmark_symbol = Column(String(20), default='SPY')
    risk_tolerance = Column(String(20))
    target_return = Column(DECIMAL(5,4))
    rebalance_threshold = Column(DECIMAL(4,3), default=0.05)
    is_active = Column(Boolean, default=True)

    # Relationships
    user = relationship("User", back_populates="portfolios")
    holdings = relationship("Holding", back_populates="portfolio", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="portfolio", cascade="all, delete-orphan")
    snapshots = relationship("PortfolioSnapshot", back_populates="portfolio", cascade="all, delete-orphan")
```

## 📈 Database Views

### Portfolio Summary View
```sql
CREATE VIEW portfolio_summary AS
SELECT
    p.id,
    p.name,
    p.user_id,
    COUNT(h.id) as num_holdings,
    SUM(h.quantity * pc.current_price) as total_value,
    SUM(h.quantity * h.average_cost_basis) as total_cost_basis,
    SUM(h.quantity * pc.current_price) - SUM(h.quantity * h.average_cost_basis) as unrealized_gain_loss,
    (SUM(h.quantity * pc.current_price) - SUM(h.quantity * h.average_cost_basis)) /
        NULLIF(SUM(h.quantity * h.average_cost_basis), 0) as unrealized_return_pct
FROM portfolios p
LEFT JOIN holdings h ON p.id = h.portfolio_id
LEFT JOIN price_cache pc ON h.asset_id = pc.asset_id
WHERE p.is_active = true
GROUP BY p.id, p.name, p.user_id;
```

### Asset Performance View
```sql
CREATE VIEW asset_performance AS
SELECT
    a.id,
    a.symbol,
    a.name,
    pc.current_price,
    pc.previous_close,
    pc.day_change,
    pc.day_change_percent,
    ph_week.close_price as week_ago_price,
    ph_month.close_price as month_ago_price,
    ph_year.close_price as year_ago_price,
    (pc.current_price - ph_week.close_price) / NULLIF(ph_week.close_price, 0) as week_return,
    (pc.current_price - ph_month.close_price) / NULLIF(ph_month.close_price, 0) as month_return,
    (pc.current_price - ph_year.close_price) / NULLIF(ph_year.close_price, 0) as year_return
FROM assets a
LEFT JOIN price_cache pc ON a.id = pc.asset_id
LEFT JOIN price_history ph_week ON a.id = ph_week.asset_id AND ph_week.date = CURRENT_DATE - INTERVAL '7 days'
LEFT JOIN price_history ph_month ON a.id = ph_month.asset_id AND ph_month.date = CURRENT_DATE - INTERVAL '30 days'
LEFT JOIN price_history ph_year ON a.id = ph_year.asset_id AND ph_year.date = CURRENT_DATE - INTERVAL '365 days';
```

## 🚀 Migration Strategy

### Initial Schema Migration
```python
# Alembic migration file
"""Initial schema

Revision ID: 001_initial_schema
Revises:
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '001_initial_schema'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # Create all tables
    op.create_table('users', ...)
    op.create_table('portfolios', ...)
    # ... etc

    # Create indexes
    op.create_index('idx_users_email', 'users', ['email'], unique=True)
    # ... etc

    # Create views
    op.execute("""
        CREATE VIEW portfolio_summary AS ...
    """)

def downgrade():
    # Drop in reverse order
    op.execute("DROP VIEW IF EXISTS portfolio_summary")
    op.drop_table('audit_log')
    # ... etc
```

### Performance Optimization
```sql
-- Partition large tables by date
CREATE TABLE price_history_2024 PARTITION OF price_history
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

-- Create materialized views for expensive calculations
CREATE MATERIALIZED VIEW portfolio_daily_returns AS
SELECT
    portfolio_id,
    snapshot_date,
    total_value,
    LAG(total_value) OVER (PARTITION BY portfolio_id ORDER BY snapshot_date) as prev_value,
    (total_value - LAG(total_value) OVER (PARTITION BY portfolio_id ORDER BY snapshot_date)) /
        NULLIF(LAG(total_value) OVER (PARTITION BY portfolio_id ORDER BY snapshot_date), 0) as daily_return
FROM portfolio_snapshots
ORDER BY portfolio_id, snapshot_date;

-- Refresh materialized view daily
CREATE UNIQUE INDEX ON portfolio_daily_returns (portfolio_id, snapshot_date);
```

This comprehensive database schema provides a robust foundation for the Streamlit financial portfolio tracker, ensuring data integrity, performance, and scalability while supporting all required financial calculations and reporting features.