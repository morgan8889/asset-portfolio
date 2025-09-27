import '@testing-library/jest-dom'
import { beforeEach, afterEach, vi } from 'vitest'

// Mock Dexie database
vi.mock('./lib/db', () => ({
  db: {
    assets: {
      add: vi.fn(),
      get: vi.fn(),
      toArray: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          toArray: vi.fn()
        }))
      }))
    },
    transactions: {
      add: vi.fn(),
      get: vi.fn(),
      toArray: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          toArray: vi.fn()
        }))
      }))
    },
    portfolioSnapshots: {
      add: vi.fn(),
      get: vi.fn(),
      toArray: vi.fn(),
      orderBy: vi.fn(() => ({
        reverse: vi.fn(() => ({
          limit: vi.fn(() => ({
            toArray: vi.fn()
          }))
        }))
      }))
    }
  }
}))

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn()
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams()
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks()
})

// Setup common test environment
beforeEach(() => {
  // Reset any global state
  localStorage.clear()
  sessionStorage.clear()
})