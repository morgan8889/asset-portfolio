/**
 * Price Polling Service
 *
 * Extracted polling infrastructure from price store for better testability
 * and separation of concerns. Manages intervals, event listeners, and
 * visibility/network state.
 */

import type { RefreshInterval, PriceUpdatePreferences } from '@/types/market';
import { REFRESH_INTERVALS } from '@/types/market';

// =============================================================================
// Types
// =============================================================================

export interface PollingCallbacks {
  /** Called when prices should be refreshed */
  onRefresh: () => Promise<void>;
  /** Called when staleness should be recalculated */
  onUpdateStaleness: () => void;
  /** Called when network state changes */
  onNetworkChange: (online: boolean) => void;
  /** Called to load cached prices on start */
  onLoadCache: () => Promise<void>;
  /** Called to persist cache before stopping */
  onPersistCache: () => Promise<void>;
}

export interface PollingState {
  isPolling: boolean;
  isOnline: boolean;
}

// =============================================================================
// Price Polling Service Class
// =============================================================================

/**
 * Service class that manages price polling infrastructure.
 * Encapsulates interval management, event listeners, and visibility handling.
 *
 * Benefits over inline store logic:
 * - Interval IDs are class members, not module-level (SSR-safe)
 * - Event handlers are properly tracked and cleaned up
 * - Logic is testable in isolation
 * - Single responsibility for polling concerns
 */
export class PricePollingService {
  private pollIntervalId: ReturnType<typeof setInterval> | null = null;
  private stalenessIntervalId: ReturnType<typeof setInterval> | null = null;
  private visibilityHandler: (() => void) | null = null;
  private onlineHandler: (() => void) | null = null;
  private offlineHandler: (() => void) | null = null;

  private callbacks: PollingCallbacks;
  private _isPolling = false;
  private _isOnline =
    typeof navigator !== 'undefined' ? navigator.onLine : true;

  private static readonly STALENESS_UPDATE_INTERVAL_MS = 5000;

  constructor(callbacks: PollingCallbacks) {
    this.callbacks = callbacks;
  }

  // ==========================================================================
  // Public API
  // ==========================================================================

  get isPolling(): boolean {
    return this._isPolling;
  }

  get isOnline(): boolean {
    return this._isOnline;
  }

  /**
   * Start polling with the given preferences.
   * Sets up price refresh interval, staleness updates, and event listeners.
   */
  async start(preferences: PriceUpdatePreferences): Promise<void> {
    // Don't start if already polling or in manual mode
    if (this._isPolling || preferences.refreshInterval === 'manual') {
      return;
    }

    const intervalMs = REFRESH_INTERVALS[preferences.refreshInterval];
    if (intervalMs <= 0) return;

    // Load cached prices first for offline resilience
    await this.callbacks.onLoadCache();

    // Clear any existing intervals and event listeners
    this.clearIntervals();
    this.removeEventListeners();

    // Set up polling interval
    this.pollIntervalId = setInterval(() => {
      this.handlePollTick(preferences);
    }, intervalMs);

    // Set up staleness updates
    this.stalenessIntervalId = setInterval(() => {
      this.callbacks.onUpdateStaleness();
    }, PricePollingService.STALENESS_UPDATE_INTERVAL_MS);

    // Set up visibility change handler
    this.setupVisibilityHandler(preferences);

    // Set up online/offline handlers
    this.setupNetworkHandlers();

    this._isPolling = true;
  }

  /**
   * Stop polling and clean up all resources.
   */
  async stop(): Promise<void> {
    // Persist cache before stopping
    await this.callbacks.onPersistCache();

    this.clearIntervals();
    this.removeEventListeners();

    this._isPolling = false;
  }

  /**
   * Update online state and trigger appropriate actions.
   */
  setOnline(online: boolean): void {
    const wasOffline = !this._isOnline;
    this._isOnline = online;
    this.callbacks.onNetworkChange(online);

    if (online && wasOffline) {
      // Connection restored - refresh prices
      console.log('Network connection restored, refreshing prices...');
      this.callbacks.onRefresh().catch((error) => {
        console.error('Error refreshing after network restore:', error);
      });
    } else if (!online) {
      console.log('Network connection lost, using cached prices');
    }
  }

  /**
   * Restart polling with new preferences.
   * Returns a promise that resolves when restart is complete.
   */
  async restart(preferences: PriceUpdatePreferences): Promise<void> {
    await this.stop();

    if (preferences.refreshInterval !== 'manual') {
      await this.start(preferences);
    }
  }

  /**
   * Check if service has active event handlers.
   * Useful for testing and debugging.
   */
  hasActiveHandlers(): boolean {
    return !!(
      this.visibilityHandler ||
      this.onlineHandler ||
      this.offlineHandler
    );
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private handlePollTick(preferences: PriceUpdatePreferences): void {
    // Only poll if tab is visible (if pauseWhenHidden is true) and online
    const shouldPoll =
      this._isOnline &&
      (!preferences.pauseWhenHidden ||
        typeof document === 'undefined' ||
        document.visibilityState === 'visible');

    if (shouldPoll) {
      this.callbacks.onRefresh().catch((error) => {
        console.error('Polling error:', error);
      });
    }
  }

  private setupVisibilityHandler(preferences: PriceUpdatePreferences): void {
    if (typeof document === 'undefined' || !preferences.pauseWhenHidden) {
      return;
    }

    this.visibilityHandler = () => {
      if (document.visibilityState === 'visible' && this._isOnline) {
        // Resume and fetch fresh data
        this.callbacks.onRefresh().catch((error) => {
          console.error('Visibility resume error:', error);
        });
      }
    };

    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  private setupNetworkHandlers(): void {
    if (typeof window === 'undefined') {
      return;
    }

    this.onlineHandler = () => this.setOnline(true);
    this.offlineHandler = () => this.setOnline(false);

    window.addEventListener('online', this.onlineHandler);
    window.addEventListener('offline', this.offlineHandler);

    // Set initial online state
    this._isOnline = navigator.onLine;
  }

  private clearIntervals(): void {
    if (this.pollIntervalId) {
      clearInterval(this.pollIntervalId);
      this.pollIntervalId = null;
    }

    if (this.stalenessIntervalId) {
      clearInterval(this.stalenessIntervalId);
      this.stalenessIntervalId = null;
    }
  }

  private removeEventListeners(): void {
    if (this.visibilityHandler && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }

    if (typeof window !== 'undefined') {
      if (this.onlineHandler) {
        window.removeEventListener('online', this.onlineHandler);
        this.onlineHandler = null;
      }
      if (this.offlineHandler) {
        window.removeEventListener('offline', this.offlineHandler);
        this.offlineHandler = null;
      }
    }
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a new PricePollingService instance.
 * Use this instead of direct instantiation for easier testing.
 */
export function createPricePollingService(
  callbacks: PollingCallbacks
): PricePollingService {
  return new PricePollingService(callbacks);
}
