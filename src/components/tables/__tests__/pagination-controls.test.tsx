import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PaginationControls } from '../pagination-controls';

describe('PaginationControls', () => {
  const defaultProps = {
    currentPage: 1,
    totalPages: 4,
    pageSize: 25,
    totalCount: 100,
    onPageChange: vi.fn(),
    onPageSizeChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Info Text', () => {
    it('should display correct range for first page', () => {
      render(<PaginationControls {...defaultProps} />);

      expect(screen.getByText('Showing 1-25 of 100 transactions')).toBeInTheDocument();
    });

    it('should display correct range for middle page', () => {
      render(<PaginationControls {...defaultProps} currentPage={2} />);

      expect(screen.getByText('Showing 26-50 of 100 transactions')).toBeInTheDocument();
    });

    it('should display correct range for last page with partial results', () => {
      render(
        <PaginationControls
          {...defaultProps}
          currentPage={4}
          pageSize={30}
          totalPages={4}
        />
      );

      // 4th page with size 30: starts at 91, ends at 100
      expect(screen.getByText('Showing 91-100 of 100 transactions')).toBeInTheDocument();
    });

    it('should display 0-0 for empty results', () => {
      render(
        <PaginationControls
          {...defaultProps}
          currentPage={1}
          totalPages={0}
          totalCount={0}
        />
      );

      expect(screen.getByText('Showing 0-0 of 0 transactions')).toBeInTheDocument();
    });
  });

  describe('Button States', () => {
    it('should disable Previous button on first page', () => {
      render(<PaginationControls {...defaultProps} currentPage={1} />);

      const previousButton = screen.getByRole('button', { name: /previous/i });
      expect(previousButton).toBeDisabled();
    });

    it('should enable Previous button on second page', () => {
      render(<PaginationControls {...defaultProps} currentPage={2} />);

      const previousButton = screen.getByRole('button', { name: /previous/i });
      expect(previousButton).not.toBeDisabled();
    });

    it('should disable Next button on last page', () => {
      render(<PaginationControls {...defaultProps} currentPage={4} />);

      const nextButton = screen.getByRole('button', { name: /next/i });
      expect(nextButton).toBeDisabled();
    });

    it('should enable Next button when not on last page', () => {
      render(<PaginationControls {...defaultProps} currentPage={1} />);

      const nextButton = screen.getByRole('button', { name: /next/i });
      expect(nextButton).not.toBeDisabled();
    });

    it('should disable all controls when loading', () => {
      render(<PaginationControls {...defaultProps} isLoading={true} />);

      const previousButton = screen.getByRole('button', { name: /previous/i });
      const nextButton = screen.getByRole('button', { name: /next/i });
      const select = screen.getByRole('combobox', { name: /select page size/i });

      expect(previousButton).toBeDisabled();
      expect(nextButton).toBeDisabled();
      expect(select).toBeDisabled();
    });
  });

  describe('Click Handlers', () => {
    it('should call onPageChange with previous page when Previous clicked', () => {
      const onPageChange = vi.fn();
      render(
        <PaginationControls
          {...defaultProps}
          currentPage={2}
          onPageChange={onPageChange}
        />
      );

      const previousButton = screen.getByRole('button', { name: /previous/i });
      fireEvent.click(previousButton);

      expect(onPageChange).toHaveBeenCalledWith(1);
    });

    it('should call onPageChange with next page when Next clicked', () => {
      const onPageChange = vi.fn();
      render(
        <PaginationControls
          {...defaultProps}
          currentPage={1}
          onPageChange={onPageChange}
        />
      );

      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);

      expect(onPageChange).toHaveBeenCalledWith(2);
    });

    it('should not call onPageChange when Previous clicked on first page', () => {
      const onPageChange = vi.fn();
      render(
        <PaginationControls
          {...defaultProps}
          currentPage={1}
          onPageChange={onPageChange}
        />
      );

      const previousButton = screen.getByRole('button', { name: /previous/i });
      fireEvent.click(previousButton);

      expect(onPageChange).not.toHaveBeenCalled();
    });

    it('should not call onPageChange when Next clicked on last page', () => {
      const onPageChange = vi.fn();
      render(
        <PaginationControls
          {...defaultProps}
          currentPage={4}
          onPageChange={onPageChange}
        />
      );

      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);

      expect(onPageChange).not.toHaveBeenCalled();
    });
  });

  describe('Page Size Selector', () => {
    it('should display current page size', () => {
      render(<PaginationControls {...defaultProps} pageSize={25} />);

      const select = screen.getByRole('combobox', { name: /select page size/i });
      expect(select).toHaveTextContent('25');
    });

    it('should have correct page size options', () => {
      render(<PaginationControls {...defaultProps} />);

      const select = screen.getByRole('combobox', { name: /select page size/i });
      fireEvent.click(select);

      // Use getAllByText since '25' appears both in the trigger and in the dropdown
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getAllByText('25').length).toBeGreaterThan(0);
      expect(screen.getByText('50')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner when isLoading is true', () => {
      render(<PaginationControls {...defaultProps} isLoading={true} />);

      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should not show loading spinner when isLoading is false', () => {
      render(<PaginationControls {...defaultProps} isLoading={false} />);

      const spinner = document.querySelector('.animate-spin');
      expect(spinner).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have ARIA labels on buttons', () => {
      render(<PaginationControls {...defaultProps} />);

      expect(screen.getByLabelText('Go to previous page')).toBeInTheDocument();
      expect(screen.getByLabelText('Go to next page')).toBeInTheDocument();
    });

    it('should have ARIA label on select', () => {
      render(<PaginationControls {...defaultProps} />);

      expect(screen.getByLabelText('Select page size')).toBeInTheDocument();
    });
  });
});
