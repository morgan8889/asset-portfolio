# Obsolete Documentation Archive

This directory contains documentation for **abandoned initiatives** that are no longer relevant to the project.

## Streamlit Migration (2025) - ABANDONED

The following files documented a planned migration from Next.js to Streamlit that was **never executed**:

- `STREAMLIT_DATABASE_SCHEMA.md` - PostgreSQL schema (project uses IndexedDB)
- `STREAMLIT_FUNCTIONAL_REQUIREMENTS.md` - Streamlit UI requirements (project is Next.js)
- `STREAMLIT_MIGRATION_TASKS.md` - Migration tasks that were never started
- `STREAMLIT_TECHNICAL_ARCHITECTURE.md` - Obsolete architecture design
- `STREAMLIT_UX_DESIGN_GUIDE.md` - Obsolete UX design

**Why Archived** (February 2026):
- The project successfully continued with Next.js 14 App Router
- No Streamlit code was ever implemented (verified via `git grep -i streamlit src/`)
- Maintaining these docs caused confusion for new developers
- Total size: ~90KB of obsolete content with zero active references

**Current Architecture**:
- Frontend: Next.js 14 (App Router) + React 18 + TypeScript
- Database: IndexedDB (via Dexie.js) - Privacy-first local storage
- See `CLAUDE.md` and `README.md` for current architecture

---

**Note**: These files are preserved for historical reference only. They do not reflect the current or planned state of the project.
