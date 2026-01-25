# Feature Specification: Dashboard Grid Dense Packing

**Feature Branch**: `004-grid-dense-packing`
**Created**: 2026-01-25
**Status**: Draft
**Input**: User description: "Include the ability to fit multiple layers in the grid alongside larger tiles. Filling the gaps like in the image."

## Overview

Enhance the dashboard grid layout to support "dense packing" (masonry-style) where smaller widgets automatically fill vertical gaps created by larger widgets. This allows for more efficient use of screen space by stacking multiple smaller widgets in the same row as a taller widget.

**Visual Example**: A large chart widget (spanning 3 columns and multiple rows) sits on the left, while 2-3 smaller metric widgets stack vertically on the right in the remaining column, filling the vertical space.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Enable Dense Grid Packing Mode (Priority: P1)

A user wants to maximize screen real estate by having smaller widgets fill the gaps alongside larger widgets, creating a masonry-style layout where no vertical space is wasted.

**Why this priority**: This is the core feature - without dense packing enabled, the dashboard cannot achieve the gap-filling layout shown in the reference image.

**Independent Test**: Can be fully tested by toggling the dense packing option in settings and observing that smaller widgets flow into gaps beside larger widgets.

**Acceptance Scenarios**:

1. **Given** the user has dense packing disabled, **When** they enable dense packing in dashboard settings, **Then** smaller widgets automatically reflow to fill vertical gaps beside taller widgets
2. **Given** dense packing is enabled, **When** a widget with height span 2 is in column 1, **Then** two widgets with height span 1 can stack in column 2 beside it
3. **Given** dense packing is enabled, **When** the user disables it, **Then** widgets return to standard row-by-row flow without gap filling

---

### User Story 2 - Configure Widget Row Spans (Priority: P1)

A user wants to configure how many "rows" a widget occupies, allowing taller widgets (like charts) to span multiple rows while smaller widgets (like metrics cards) span a single row.

**Why this priority**: Row spans are essential for dense packing to work - without specifying widget heights, the system cannot determine which widgets fit into gaps.

**Independent Test**: Can be fully tested by changing a widget's row span in settings and observing the widget height change proportionally.

**Acceptance Scenarios**:

1. **Given** the user is in dashboard settings, **When** they view a widget configuration, **Then** they see a row span option (1, 2, or 3 rows)
2. **Given** a widget has row span 1, **When** the user changes it to row span 2, **Then** the widget height doubles and other widgets reflow accordingly
3. **Given** a widget has row span 2, **When** dense packing is enabled, **Then** two widgets with row span 1 can fit beside it vertically

---

### User Story 3 - Automatic Widget Placement Optimization (Priority: P2)

The system automatically determines optimal widget placement to minimize gaps and maximize space utilization, while respecting the user's configured widget order.

**Why this priority**: Automatic optimization improves the user experience by handling complex layout calculations without manual intervention.

**Independent Test**: Can be tested by adding widgets of varying sizes and verifying the system places them to minimize empty space.

**Acceptance Scenarios**:

1. **Given** dense packing is enabled and widgets have varying row spans, **When** the dashboard renders, **Then** widgets are placed to minimize total vertical gaps
2. **Given** the user has configured a specific widget order, **When** dense packing places widgets, **Then** the relative order is preserved as much as possible while filling gaps
3. **Given** a widget configuration changes, **When** the dashboard re-renders, **Then** all widgets reflow to optimal positions within 200ms

---

### User Story 4 - Preview Layout Changes Before Applying (Priority: P3)

A user wants to see how their layout changes will look before committing them, preventing unexpected dashboard rearrangements.

**Why this priority**: Nice-to-have polish that improves user confidence when making layout changes.

**Independent Test**: Can be tested by making changes in settings and observing a preview before clicking "Apply".

**Acceptance Scenarios**:

1. **Given** the user is in settings and changes a row span, **When** they view the preview, **Then** they see how the dashboard will look with the new configuration
2. **Given** the user previews changes, **When** they click cancel, **Then** no changes are applied and the dashboard remains unchanged

---

### Edge Cases

- What happens when all widgets have the same row span? → Falls back to standard grid flow (dense packing has no effect when all heights are equal)
- What happens when a widget's row span exceeds available rows? → Row span is clamped to maximum available space
- How does the system handle very narrow viewports (mobile)? → Dense packing is automatically disabled on mobile; single-column stacking takes precedence
- What happens when widget column span + row span creates an impossibly large widget? → Widget is constrained to fit within viewport bounds
- How does drag-and-drop reordering work with dense packing? → Users can still drag widgets; the system recalculates optimal placement after drop

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a "Dense Packing" toggle in dashboard settings that enables/disables masonry-style gap filling
- **FR-002**: System MUST allow users to configure widget row spans (1, 2, or 3 rows) independently of column spans
- **FR-003**: System MUST automatically calculate widget placement to minimize vertical gaps when dense packing is enabled
- **FR-004**: System MUST preserve configured widget order as the primary sorting criteria, using gap-filling as secondary optimization
- **FR-005**: System MUST persist dense packing preference and row span configurations in user settings
- **FR-006**: System MUST disable dense packing automatically on mobile viewports (< 768px) and use single-column stacking instead
- **FR-007**: System MUST recalculate widget placement when any layout setting changes (dense packing toggle, row spans, column spans, widget order)
- **FR-008**: System MUST display row span configuration option only when dense packing is enabled (hidden otherwise)
- **FR-009**: System MUST provide default row spans based on widget type (charts: 2, metrics cards: 1, tables: 2)
- **FR-010**: System MUST support widgets spanning both multiple columns AND multiple rows simultaneously

### Key Entities

- **Widget Row Span**: Number of grid rows a widget occupies (1, 2, or 3); stored per-widget similar to column spans
- **Dense Packing Mode**: Boolean flag indicating whether gap-filling placement algorithm is active
- **Widget Placement**: Calculated grid position (column, row) determined by the layout algorithm based on spans and order

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can enable dense packing and see widgets fill gaps in under 1 second
- **SC-002**: Dashboard with mixed widget sizes utilizes at least 85% of available grid space when dense packing is enabled (vs ~60-70% without)
- **SC-003**: Widget configuration changes (row span, column span) reflect visually within 200ms
- **SC-004**: Users can configure row spans for all 8 dashboard widgets through the settings interface
- **SC-005**: Layout remains stable and predictable - same configuration always produces identical widget placement
- **SC-006**: 90% of users can successfully configure a mixed-size layout on first attempt (no support needed)

## Assumptions

- Row spans follow the same 1-2-3 pattern (1 = normal height, 2 = double height, 3 = triple height for large charts)
- The existing dashboard settings modal will be extended to include these new options
- Default widget heights are determined by widget type (metric cards are compact, charts are tall)
- Dense packing respects the underlying layout system and browser capabilities
- Performance impact is negligible for the current 8-widget dashboard

## Out of Scope

- Arbitrary pixel-based widget sizing (only discrete row spans: 1, 2, 3)
- User-resizable widgets via drag handles (only configuration-based sizing)
- Saved layout presets/templates
- Widget overlap or layering
- Animation during layout transitions (instant reflow is acceptable)
