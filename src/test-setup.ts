// MUST be first import - provides IndexedDB implementation for Dexie in Node.js
import 'fake-indexeddb/auto';

import '@testing-library/jest-dom';
import { beforeEach, afterEach, vi } from 'vitest';

// Mock scrollIntoView - used by Radix UI Select component
HTMLElement.prototype.scrollIntoView = vi.fn();

// Mock ResizeObserver - used by Radix UI Popover, Dialog components
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver - used for visibility detection
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// NOTE: Database is NOT mocked globally - fake-indexeddb provides a real IndexedDB implementation
// Individual tests that need specific mocking should use vi.mock() in their test files

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
});

// Setup common test environment
beforeEach(() => {
  // Reset any global state
  localStorage.clear();
  sessionStorage.clear();
});
