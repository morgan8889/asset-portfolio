/**
 * Category Breakdown Widget Tests
 *
 * Tests widget rendering, size detection, and conditional pie chart display.
 * Pie chart visibility is determined by:
 * - Setting: widgetSettings['category-breakdown'].showPieChart === true
 * - Row span based on column span:
 *   - 1-column widgets: rowSpan >= 4 required for pie chart
 *   - 2-column widgets: rowSpan >= 2 required for pie chart
 * - Width: measured width >= 150px (minWidthForChart)
 *
 * Layout mode (stacked vs side-by-side) is determined by:
 * - Column span: widgetSpans['category-breakdown'] >= 2 for side-by-side
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CategoryBreakdownWidget } from '../category-breakdown-widget';
import { CategoryAllocation } from '@/types/dashboard';
import Decimal from 'decimal.js';

// Create a mock state that can be controlled in tests
let mockDashboardConfig = {
  widgetSettings: {
    'category-breakdown': {
      showPieChart: false,
    },
  },
  widgetRowSpans: {
    'category-breakdown': 1 as 1 | 2 | 3 | 4, // 1 = 1h, 2 = 2h, 3 = 3h, 4 = 4h
  },
  widgetSpans: {
    'category-breakdown': 1 as 1 | 2, // 1 = 1x, 2 = 2x
  },
};

let mockWidgetSize = { width: 0, height: 0 };

// Mock the hooks
vi.mock('@/hooks/useWidgetSize', () => ({
  useWidgetSize: vi.fn(() => mockWidgetSize),
  CATEGORY_BREAKDOWN_THRESHOLDS: {
    minWidthForChart: 150, // Width threshold for pie chart visibility
    minHeightForChart: 350, // Not used in new impl (rowSpan-based)
    sideByWidthThreshold: 400, // Width threshold for side-by-side layout
  },
}));

vi.mock('@/lib/stores/dashboard', () => ({
  useDashboardStore: vi.fn((selector: any) => {
    if (typeof selector === 'function') {
      return selector({ config: mockDashboardConfig });
    }
    return { config: mockDashboardConfig };
  }),
}));

// Mock Recharts components
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
  Legend: () => <div data-testid="legend" />,
  Tooltip: () => <div data-testid="tooltip" />,
}));

describe('CategoryBreakdownWidget', () => {
  const mockAllocations: CategoryAllocation[] = [
    {
      category: 'stock',
      label: 'Stocks',
      value: new Decimal(10000),
      percentage: 50,
      holdingCount: 5,
      color: '#3b82f6',
    },
    {
      category: 'etf',
      label: 'ETFs',
      value: new Decimal(6000),
      percentage: 30,
      holdingCount: 3,
      color: '#22c55e',
    },
    {
      category: 'crypto',
      label: 'Crypto',
      value: new Decimal(4000),
      percentage: 20,
      holdingCount: 2,
      color: '#f97316',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mocks to default state
    mockWidgetSize = { width: 200, height: 400 };
    mockDashboardConfig = {
      widgetSettings: {
        'category-breakdown': {
          showPieChart: false,
        },
      },
      widgetRowSpans: {
        'category-breakdown': 1,
      },
      widgetSpans: {
        'category-breakdown': 1,
      },
    };
  });

  describe('Basic Rendering', () => {
    it('renders loading skeleton when isLoading is true', () => {
      render(
        <CategoryBreakdownWidget
          allocations={[]}
          isLoading={true}
          currency="USD"
        />
      );

      expect(screen.getByText('Category Breakdown')).toBeInTheDocument();
      // Skeleton should have animated elements
      const skeletons = screen.getAllByRole('generic');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('renders empty state when allocations is empty', () => {
      render(
        <CategoryBreakdownWidget
          allocations={[]}
          isLoading={false}
          currency="USD"
        />
      );

      expect(
        screen.getByTestId('category-breakdown-widget')
      ).toBeInTheDocument();
      expect(screen.getByText('No holdings to display')).toBeInTheDocument();
    });

    it('renders progress bars with allocations', () => {
      render(
        <CategoryBreakdownWidget
          allocations={mockAllocations}
          isLoading={false}
          currency="USD"
        />
      );

      expect(screen.getByText('Stocks')).toBeInTheDocument();
      expect(screen.getByText('ETFs')).toBeInTheDocument();
      expect(screen.getByText('Crypto')).toBeInTheDocument();
      expect(screen.getByText('+50.00%')).toBeInTheDocument();
      expect(screen.getByText('+30.00%')).toBeInTheDocument();
      expect(screen.getByText('+20.00%')).toBeInTheDocument();
    });

    it('sorts allocations by percentage descending', () => {
      const unsortedAllocations = [
        mockAllocations[2],
        mockAllocations[0],
        mockAllocations[1],
      ];

      render(
        <CategoryBreakdownWidget
          allocations={unsortedAllocations}
          isLoading={false}
          currency="USD"
        />
      );

      const labels = screen.getAllByText(/Stocks|ETFs|Crypto/);
      expect(labels[0]).toHaveTextContent('Stocks'); // 50%
      expect(labels[1]).toHaveTextContent('ETFs'); // 30%
      expect(labels[2]).toHaveTextContent('Crypto'); // 20%
    });
  });

  describe('Pie Chart Conditional Rendering - Setting Toggle', () => {
    it('hides pie chart when showPieChart setting is false', () => {
      mockWidgetSize = { width: 200, height: 400 };
      mockDashboardConfig = {
        widgetSettings: {
          'category-breakdown': {
            showPieChart: false,
          },
        },
        widgetRowSpans: {
          'category-breakdown': 2, // 2h - meets height requirement
        },
        widgetSpans: {
          'category-breakdown': 1,
        },
      };

      render(
        <CategoryBreakdownWidget
          allocations={mockAllocations}
          isLoading={false}
          currency="USD"
        />
      );

      expect(screen.queryByTestId('pie-chart')).not.toBeInTheDocument();
      expect(screen.getByText('Stocks')).toBeInTheDocument();
    });

    it('shows pie chart when showPieChart setting is true and rowSpan >= 2 (2-column widget)', () => {
      mockWidgetSize = { width: 400, height: 400 };
      mockDashboardConfig = {
        widgetSettings: {
          'category-breakdown': {
            showPieChart: true,
          },
        },
        widgetRowSpans: {
          'category-breakdown': 2, // 2h - meets height requirement for 2-column widget
        },
        widgetSpans: {
          'category-breakdown': 2, // 2-column widgets only need rowSpan >= 2
        },
      };

      render(
        <CategoryBreakdownWidget
          allocations={mockAllocations}
          isLoading={false}
          currency="USD"
        />
      );

      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
      expect(screen.getByText('Stocks')).toBeInTheDocument();
    });
  });

  describe('Pie Chart Conditional Rendering - Row Span Based', () => {
    it('hides pie chart when rowSpan is 1 (1h) even if setting enabled', () => {
      mockWidgetSize = { width: 200, height: 400 };
      mockDashboardConfig = {
        widgetSettings: {
          'category-breakdown': {
            showPieChart: true,
          },
        },
        widgetRowSpans: {
          'category-breakdown': 1, // 1h - does NOT meet height requirement
        },
        widgetSpans: {
          'category-breakdown': 1,
        },
      };

      render(
        <CategoryBreakdownWidget
          allocations={mockAllocations}
          isLoading={false}
          currency="USD"
        />
      );

      expect(screen.queryByTestId('pie-chart')).not.toBeInTheDocument();
      expect(screen.getByText('Stocks')).toBeInTheDocument();
    });

    it('shows pie chart when rowSpan is 4 (4h) and setting enabled for 1-column widget', () => {
      mockWidgetSize = { width: 200, height: 400 };
      mockDashboardConfig = {
        widgetSettings: {
          'category-breakdown': {
            showPieChart: true,
          },
        },
        widgetRowSpans: {
          'category-breakdown': 4, // 4h - meets requirement for 1-column
        },
        widgetSpans: {
          'category-breakdown': 1,
        },
      };

      render(
        <CategoryBreakdownWidget
          allocations={mockAllocations}
          isLoading={false}
          currency="USD"
        />
      );

      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    });

    it('hides pie chart when rowSpan is 3 (3h) for 1-column widget even if setting enabled', () => {
      mockWidgetSize = { width: 200, height: 400 };
      mockDashboardConfig = {
        widgetSettings: {
          'category-breakdown': {
            showPieChart: true,
          },
        },
        widgetRowSpans: {
          'category-breakdown': 3, // 3h - does NOT meet requirement for 1-column (needs 4)
        },
        widgetSpans: {
          'category-breakdown': 1,
        },
      };

      render(
        <CategoryBreakdownWidget
          allocations={mockAllocations}
          isLoading={false}
          currency="USD"
        />
      );

      // 1-column widgets need rowSpan >= 4 for pie chart
      expect(screen.queryByTestId('pie-chart')).not.toBeInTheDocument();
    });
  });

  describe('Pie Chart Conditional Rendering - Width Threshold', () => {
    it('hides pie chart when width is below minWidthForChart (150px)', () => {
      mockWidgetSize = { width: 100, height: 400 }; // Below 150px threshold
      mockDashboardConfig = {
        widgetSettings: {
          'category-breakdown': {
            showPieChart: true,
          },
        },
        widgetRowSpans: {
          'category-breakdown': 2, // Meets height requirement
        },
        widgetSpans: {
          'category-breakdown': 1,
        },
      };

      render(
        <CategoryBreakdownWidget
          allocations={mockAllocations}
          isLoading={false}
          currency="USD"
        />
      );

      expect(screen.queryByTestId('pie-chart')).not.toBeInTheDocument();
    });

    it('shows pie chart at exactly minWidthForChart (150px) with sufficient rowSpan', () => {
      mockWidgetSize = { width: 150, height: 400 }; // Exactly at threshold
      mockDashboardConfig = {
        widgetSettings: {
          'category-breakdown': {
            showPieChart: true,
          },
        },
        widgetRowSpans: {
          'category-breakdown': 4, // 1-column widgets need rowSpan >= 4
        },
        widgetSpans: {
          'category-breakdown': 1,
        },
      };

      render(
        <CategoryBreakdownWidget
          allocations={mockAllocations}
          isLoading={false}
          currency="USD"
        />
      );

      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    });

    it('hides chart at width 149px (minWidthForChart - 1)', () => {
      mockWidgetSize = { width: 149, height: 400 };
      mockDashboardConfig = {
        widgetSettings: {
          'category-breakdown': {
            showPieChart: true,
          },
        },
        widgetRowSpans: {
          'category-breakdown': 4, // Even with sufficient rowSpan
        },
        widgetSpans: {
          'category-breakdown': 1,
        },
      };

      render(
        <CategoryBreakdownWidget
          allocations={mockAllocations}
          isLoading={false}
          currency="USD"
        />
      );

      expect(screen.queryByTestId('pie-chart')).not.toBeInTheDocument();
    });
  });

  describe('Layout Mode - Column Span Based', () => {
    it('uses stacked layout when columnSpan is 1', () => {
      mockWidgetSize = { width: 200, height: 400 };
      mockDashboardConfig = {
        widgetSettings: {
          'category-breakdown': {
            showPieChart: true,
          },
        },
        widgetRowSpans: {
          'category-breakdown': 4, // 1-column widgets need rowSpan >= 4 for pie chart
        },
        widgetSpans: {
          'category-breakdown': 1, // 1x column - stacked layout
        },
      };

      render(
        <CategoryBreakdownWidget
          allocations={mockAllocations}
          isLoading={false}
          currency="USD"
        />
      );

      // With stacked layout, pie chart should be below progress bars
      // Both elements should be present
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
      expect(screen.getByText('Stocks')).toBeInTheDocument();
    });

    it('uses side-by-side layout when columnSpan is 2', () => {
      mockWidgetSize = { width: 500, height: 400 };
      mockDashboardConfig = {
        widgetSettings: {
          'category-breakdown': {
            showPieChart: true,
          },
        },
        widgetRowSpans: {
          'category-breakdown': 2,
        },
        widgetSpans: {
          'category-breakdown': 2, // 2x column - side-by-side layout
        },
      };

      render(
        <CategoryBreakdownWidget
          allocations={mockAllocations}
          isLoading={false}
          currency="USD"
        />
      );

      // With side-by-side layout (45%/55% split), both elements present
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
      expect(screen.getByText('Stocks')).toBeInTheDocument();
    });
  });

  describe('Combined Visibility Scenarios', () => {
    it('shows both progress bars and pie chart in split layout', () => {
      mockWidgetSize = { width: 500, height: 400 };
      mockDashboardConfig = {
        widgetSettings: {
          'category-breakdown': {
            showPieChart: true,
          },
        },
        widgetRowSpans: {
          'category-breakdown': 2,
        },
        widgetSpans: {
          'category-breakdown': 2,
        },
      };

      render(
        <CategoryBreakdownWidget
          allocations={mockAllocations}
          isLoading={false}
          currency="USD"
        />
      );

      // Both visualizations should be present
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      expect(screen.getByText('Stocks')).toBeInTheDocument();
      expect(screen.getByText('ETFs')).toBeInTheDocument();
      expect(screen.getByText('Crypto')).toBeInTheDocument();
    });

    it('hides pie chart when rowSpan is 1 regardless of width', () => {
      mockWidgetSize = { width: 800, height: 400 }; // Large width
      mockDashboardConfig = {
        widgetSettings: {
          'category-breakdown': {
            showPieChart: true,
          },
        },
        widgetRowSpans: {
          'category-breakdown': 1, // 1h - too small
        },
        widgetSpans: {
          'category-breakdown': 2, // 2x column
        },
      };

      render(
        <CategoryBreakdownWidget
          allocations={mockAllocations}
          isLoading={false}
          currency="USD"
        />
      );

      expect(screen.queryByTestId('pie-chart')).not.toBeInTheDocument();
      expect(screen.getByText('Stocks')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('provides ARIA labels for category rows', () => {
      render(
        <CategoryBreakdownWidget
          allocations={mockAllocations}
          isLoading={false}
          currency="USD"
        />
      );

      const groups = screen.getAllByRole('group');
      expect(groups.length).toBeGreaterThan(0);
      expect(groups[0]).toHaveAttribute('aria-label');
    });

    it('shows correct currency formatting', () => {
      render(
        <CategoryBreakdownWidget
          allocations={mockAllocations}
          isLoading={false}
          currency="EUR"
        />
      );

      // Should format with EUR currency
      expect(screen.getByText('€10,000.00')).toBeInTheDocument();
      expect(screen.getByText('€6,000.00')).toBeInTheDocument();
      expect(screen.getByText('€4,000.00')).toBeInTheDocument();
    });

    it('displays singular holding label correctly', () => {
      const singleHoldingAllocation: CategoryAllocation[] = [
        {
          category: 'stock',
          label: 'Stocks',
          value: new Decimal(10000),
          percentage: 100,
          holdingCount: 1,
          color: '#3b82f6',
        },
      ];

      render(
        <CategoryBreakdownWidget
          allocations={singleHoldingAllocation}
          isLoading={false}
          currency="USD"
        />
      );

      expect(screen.getByText('1 holding')).toBeInTheDocument();
      expect(screen.queryByText('1 holdings')).not.toBeInTheDocument();
    });

    it('displays plural holdings label correctly', () => {
      render(
        <CategoryBreakdownWidget
          allocations={mockAllocations}
          isLoading={false}
          currency="USD"
        />
      );

      expect(screen.getByText('5 holdings')).toBeInTheDocument();
      expect(screen.getByText('3 holdings')).toBeInTheDocument();
      expect(screen.getByText('2 holdings')).toBeInTheDocument();
    });
  });
});
