# Documentation Index

Last Updated: 2026-02-02

This directory contains comprehensive documentation for the Portfolio Tracker application. Documentation is organized by purpose and audience.

---

## User Documentation

**For end users and getting started:**

- [**README.md**](../README.md) - Project overview, features, and quick start guide
- [**README-DEVELOPMENT.md**](../README-DEVELOPMENT.md) - Development setup and environment configuration

---

## Developer Documentation

**For developers working on the codebase:**

- [**CLAUDE.md**](../CLAUDE.md) - **PRIMARY** guide for Claude Code development (31 KB, comprehensive)
- [**TODO.md**](../TODO.md) - Active task list and development priorities
- [**IMPLEMENTATION_SUMMARY_007.md**](../IMPLEMENTATION_SUMMARY_007.md) - Performance analytics implementation summary

---

## Technical Specifications

**For system architecture and design:**

- [**TECHNICAL_SPECIFICATION.md**](specifications/TECHNICAL_SPECIFICATION.md) - Comprehensive technical specification document
- [**IMPLEMENTATION_GUIDE.md**](specifications/IMPLEMENTATION_GUIDE.md) - Step-by-step implementation guide

---

## Feature Specifications

**Detailed specifications for implemented features:**

- [**001-csv-transaction-import/**](../specs/001-csv-transaction-import/) - CSV parsing and transaction import
- [**002-portfolio-dashboard/**](../specs/002-portfolio-dashboard/) - Main dashboard with Recharts
- [**003-dashboard-stacking-layout/**](../specs/003-dashboard-stacking-layout/) - Widget stacking with dnd-kit
- [**004-grid-dense-packing/**](../specs/004-grid-dense-packing/) - Optimized grid layout
- [**005-live-market-data/**](../specs/005-live-market-data/) - Real-time price updates and UK market support
- [**006-performance-analytics/**](../specs/006-performance-analytics/) - Time-weighted returns and performance tracking
- [**007-performance-3yr-view/**](../specs/007-performance-3yr-view/) - Extended 3-year performance analysis
- [**008-financial-analysis/**](../specs/008-financial-analysis/) - Financial metrics and analysis tools
- [**009-holdings-property/**](../specs/009-holdings-property/) - Real estate holdings with rental yield
- [**010-allocation-planning/**](../specs/010-allocation-planning/) - Asset allocation and rebalancing
- [**011-export-functionality/**](../specs/011-export-functionality/) - PDF/CSV export with jsPDF
- [**012-tax-features-stock/**](../specs/012-tax-features-stock/) - ESPP/RSU tracking and capital gains analysis
- [**013-tax-data-integration/**](../specs/013-tax-data-integration/) - Tax field CSV import/export integration
- [**014-net-worth-planning/**](../specs/014-net-worth-planning/) - Net worth planning and liability tracking

---

## Testing Documentation

**For quality assurance and testing:**

- [**E2E Tests**](../tests/e2e/) - 31 Playwright E2E test files covering all major workflows
  - Dashboard & Layout (14 tests)
  - Holdings & Transactions (6 tests)
  - Analysis & Pricing (5 tests)
  - Charts & Visualization (2 tests)
  - Import/Export (2 tests)
  - Settings & Allocation (2 tests)

---

## Security & Compliance

**For security assessment and data protection:**

- [**SECURITY_ASSESSMENT_REPORT.md**](../SECURITY_ASSESSMENT_REPORT.md) - Comprehensive security analysis including tax data privacy

---

## Planning & Analysis

**For project planning and codebase analysis:**

- [**planning/**](planning/) - Planning documents and analysis
  - [**codebase-simplification-analysis.md**](planning/codebase-simplification-analysis.md) - Code quality analysis (261 files)
  - [**README.md**](planning/README.md) - Planning initiative overview
  - [**TODO.md**](planning/TODO.md) - 5-phase task breakdown with progress tracking

---

## Quick Reference

### By Role

**If you are a:**

- **New Developer** → Start with [README-DEVELOPMENT.md](../README-DEVELOPMENT.md) and [CLAUDE.md](../CLAUDE.md)
- **Feature Developer** → See [Feature Specifications](#feature-specifications) and [TODO.md](../TODO.md)
- **Architect** → Read [TECHNICAL_SPECIFICATION.md](specifications/TECHNICAL_SPECIFICATION.md)
- **QA Engineer** → Check [Testing Documentation](#testing-documentation)
- **Security Reviewer** → Review [SECURITY_ASSESSMENT_REPORT.md](../SECURITY_ASSESSMENT_REPORT.md)

### By Task

**If you want to:**

- **Understand the architecture** → [TECHNICAL_SPECIFICATION.md](specifications/TECHNICAL_SPECIFICATION.md)
- **Set up development environment** → [README-DEVELOPMENT.md](../README-DEVELOPMENT.md)
- **Implement a new feature** → [IMPLEMENTATION_GUIDE.md](specifications/IMPLEMENTATION_GUIDE.md)
- **Check development priorities** → [TODO.md](../TODO.md)
- **Review security posture** → [SECURITY_ASSESSMENT_REPORT.md](../SECURITY_ASSESSMENT_REPORT.md)
- **Run tests** → [E2E Tests](../tests/e2e/) and [CLAUDE.md](../CLAUDE.md)
- **Work with Claude Code** → [CLAUDE.md](../CLAUDE.md) (PRIMARY developer guide)

---

## Documentation Standards

All documentation follows these standards:

### Metadata Headers

Every documentation file should include a metadata header:

```markdown
---
Last Updated: YYYY-MM-DD
Status: Active | Stale | Archived
Accuracy: XX%
Audience: Developers | Users | Architects | Security Engineers
Related Features: 001, 012, etc.
---
```

### Status Definitions

- **Active**: Current and maintained
- **Stale**: Needs updates but still useful
- **Archived**: Historical reference only

### Accuracy Ratings

- **95-100%**: Fully current and accurate
- **85-94%**: Mostly accurate, minor updates needed
- **70-84%**: Useful but needs significant updates
- **<70%**: Outdated, use with caution

---

## Contributing to Documentation

When updating documentation:

1. **Update the "Last Updated" date** in the metadata header
2. **Verify accuracy** against current codebase
3. **Update related links** if file structure changes
4. **Follow markdown best practices** for readability
5. **Update this index** if adding/removing major documentation

---

## Contact & Support

For questions about documentation:

- Check [CLAUDE.md](../CLAUDE.md) for development guidance
- Review [PROJECT_STATUS.md](../PROJECT_STATUS.md) for current implementation status
- See [TODO.md](../TODO.md) for planned work

---

**Note**: This is a living documentation system. Keep it current and useful for all contributors.
