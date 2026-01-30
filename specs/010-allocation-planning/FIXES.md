# Specification Fixes Applied

**Date**: 2026-01-30
**Branch**: 010-allocation-planning

## Issues Addressed

### CRITICAL Issues (All Resolved)

#### C1: Missing AllocationCategory Definition
- **Location**: spec.md Key Entities
- **Fix**: Expanded AllocationCategory description to clarify three types (Asset Class, Sector, Region) with examples
- **Files Modified**: spec.md:82-87

#### C2: Missing Task Coverage for FR-008
- **Location**: tasks.md Phase 3
- **Fix**: Added T009 for unclassified-alert.tsx component
- **Files Modified**: tasks.md:39, renumbered subsequent tasks

#### C3: Invalid Decimal Type in TypeScript Interfaces
- **Location**: data-model.md RebalancingPlan/RebalancingItem
- **Fix**: Changed `Decimal` type to `string` with documentation note about runtime conversion
- **Files Modified**: data-model.md:32-49

### HIGH Priority Issues (All Resolved)

#### I1: Account vs Portfolio Terminology Inconsistency
- **Locations**: spec.md (multiple), research.md, quickstart.md
- **Fix**: Standardized all references to use "portfolio" instead of "account"
- **Files Modified**: 
  - spec.md:58, 66, 76, 80
  - research.md:31-41
  - quickstart.md:25

#### I2: Ambiguous AllocationCategory Definition
- **Location**: spec.md:84 vs data-model.md:16
- **Fix**: Clarified in spec.md that it supports three types with string-based extensibility
- **Files Modified**: spec.md:84

#### I3: Database Key Ambiguity
- **Location**: spec.md FR-007, tasks.md T002
- **Fix**: 
  - Added explicit keys to FR-007: `allocation_targets` and `rebalancing_exclusions`
  - Removed conditional language from T002
- **Files Modified**: spec.md:78, tasks.md:22

#### A1: Ambiguous Performance Metric
- **Location**: spec.md SC-001
- **Fix**: Clarified as "client-side rendering after data fetch"
- **Files Modified**: spec.md:92-93

### MEDIUM Priority Issues (Resolved)

#### U1: Missing Hierarchical Drill-Down Task
- **Location**: FR-006 had no implementing task
- **Fix**: Added T016 for hierarchical drill-down interaction
- **Files Modified**: tasks.md:56

## Task Renumbering

Due to insertion of T009 in Phase 3 and T016 in Phase 5:
- Old T010-T017 → New T011-T019
- Total tasks: 17 → 19 (added T009, T016)

## Remaining Items (Optional)

The following LOW priority items were NOT addressed (acceptable for implementation):
- T1: Add cross-reference to Feature 008 for TargetModel reuse claim
- Minor wording improvements in descriptions

## Validation

All CRITICAL and HIGH priority issues from /speckit.analyze have been resolved:
- ✅ Constitution alignment maintained (Privacy-First, Financial Precision)
- ✅ Type safety improved (serializable interfaces)
- ✅ Terminology consistency achieved
- ✅ Full requirement coverage (9/9 FRs now have tasks)
