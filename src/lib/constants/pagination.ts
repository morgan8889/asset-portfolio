/**
 * Pagination constants for consistent configuration across the application
 */

/**
 * Available page size options for pagination controls
 */
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

/**
 * Default page size for paginated views
 */
export const DEFAULT_PAGE_SIZE = 10;

/**
 * Default page number (1-indexed)
 */
export const DEFAULT_PAGE = 1;

/**
 * Minimum page size
 */
export const MIN_PAGE_SIZE = 10;

/**
 * Maximum page size
 */
export const MAX_PAGE_SIZE = 100;

/**
 * Type for valid page sizes
 */
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

/**
 * Validates if a page size is valid
 */
export function isValidPageSize(size: number): size is PageSize {
  return PAGE_SIZE_OPTIONS.includes(size as PageSize);
}
