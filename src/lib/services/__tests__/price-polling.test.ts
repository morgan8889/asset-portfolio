import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  PricePollingService,
  createPricePollingService,
  type PollingCallbacks,
} from '../price-polling';
import type { PriceUpdatePreferences } from '@/types/market';

describe('PricePollingService', () => {
  let mockCallbacks: PollingCallbacks;
  let service: PricePollingService;

  beforeEach(() => {
    vi.useFakeTimers();

    // Mock callbacks
    mockCallbacks = {
      onRefresh: vi.fn().mockResolvedValue(undefined),
      onUpdateStaleness: vi.fn(),
      onNetworkChange: vi.fn(),
      onLoadCache: vi.fn().mockResolvedValue(undefined),
      onPersistCache: vi.fn().mockResolvedValue(undefined),
    };

    service = createPricePollingService(mockCallbacks);
  });

  afterEach(async () => {
    if (service.isPolling) {
      await service.stop();
    }
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('Factory Function', () => {
    it('should create a PricePollingService instance', () => {
      const newService = createPricePollingService(mockCallbacks);
      expect(newService).toBeInstanceOf(PricePollingService);
    });
  });

  describe('Initial State', () => {
    it('should start with isPolling = false', () => {
      expect(service.isPolling).toBe(false);
    });

    it('should start with isOnline = true in non-browser environment', () => {
      expect(service.isOnline).toBe(true);
    });
  });

  describe('start()', () => {
    const preferences: PriceUpdatePreferences = {
      refreshInterval: 'standard',
      showStalenessIndicator: true,
      pauseWhenHidden: false,
    };

    it('should not start if refreshInterval is "manual"', async () => {
      await service.start({
        ...preferences,
        refreshInterval: 'manual',
      });

      expect(service.isPolling).toBe(false);
      expect(mockCallbacks.onLoadCache).not.toHaveBeenCalled();
    });

    it('should load cached prices on start', async () => {
      await service.start(preferences);

      expect(mockCallbacks.onLoadCache).toHaveBeenCalledTimes(1);
    });

    it('should set isPolling to true after starting', async () => {
      await service.start(preferences);

      expect(service.isPolling).toBe(true);
    });

    it('should not start if already polling', async () => {
      await service.start(preferences);
      const mockFn = mockCallbacks.onLoadCache as ReturnType<typeof vi.fn>;
      const firstCallCount = mockFn.mock.calls.length;

      await service.start(preferences);

      // Should not call onLoadCache again
      expect(mockCallbacks.onLoadCache).toHaveBeenCalledTimes(firstCallCount);
    });

    it('should trigger polling at specified interval', async () => {
      await service.start({
        ...preferences,
        refreshInterval: 'standard', // 60 seconds
      });

      // Initial state
      expect(mockCallbacks.onRefresh).toHaveBeenCalledTimes(0);

      // After 60 seconds
      vi.advanceTimersByTime(60000);
      expect(mockCallbacks.onRefresh).toHaveBeenCalledTimes(1);

      // After another 60 seconds
      vi.advanceTimersByTime(60000);
      expect(mockCallbacks.onRefresh).toHaveBeenCalledTimes(2);
    });

    it('should trigger staleness updates every 5 seconds', async () => {
      await service.start(preferences);

      expect(mockCallbacks.onUpdateStaleness).toHaveBeenCalledTimes(0);

      // After 5 seconds
      vi.advanceTimersByTime(5000);
      expect(mockCallbacks.onUpdateStaleness).toHaveBeenCalledTimes(1);

      // After another 5 seconds
      vi.advanceTimersByTime(5000);
      expect(mockCallbacks.onUpdateStaleness).toHaveBeenCalledTimes(2);
    });

    it('should handle different refresh intervals correctly', async () => {
      // Realtime: 15 seconds
      await service.start({
        ...preferences,
        refreshInterval: 'realtime',
      });

      vi.advanceTimersByTime(15000);
      expect(mockCallbacks.onRefresh).toHaveBeenCalledTimes(1);

      await service.stop();
      vi.clearAllMocks();

      // Frequent: 30 seconds
      await service.start({
        ...preferences,
        refreshInterval: 'frequent',
      });

      vi.advanceTimersByTime(30000);
      expect(mockCallbacks.onRefresh).toHaveBeenCalledTimes(1);
    });
  });

  describe('stop()', () => {
    const preferences: PriceUpdatePreferences = {
      refreshInterval: 'standard',
      showStalenessIndicator: true,
      pauseWhenHidden: false,
    };

    it('should persist cache before stopping', async () => {
      await service.start(preferences);
      await service.stop();

      expect(mockCallbacks.onPersistCache).toHaveBeenCalledTimes(1);
    });

    it('should set isPolling to false after stopping', async () => {
      await service.start(preferences);
      expect(service.isPolling).toBe(true);

      await service.stop();
      expect(service.isPolling).toBe(false);
    });

    it('should clear polling intervals', async () => {
      await service.start(preferences);

      // Verify polling is working
      vi.advanceTimersByTime(60000);
      expect(mockCallbacks.onRefresh).toHaveBeenCalled();

      vi.clearAllMocks();

      // Stop and verify polling stops
      await service.stop();
      vi.advanceTimersByTime(60000);
      expect(mockCallbacks.onRefresh).not.toHaveBeenCalled();
    });

    it('should remove event listeners', async () => {
      await service.start(preferences);
      expect(service.hasActiveHandlers()).toBe(true);

      await service.stop();
      expect(service.hasActiveHandlers()).toBe(false);
    });
  });

  describe('setOnline()', () => {
    it('should update online state', () => {
      service.setOnline(false);
      expect(service.isOnline).toBe(false);

      service.setOnline(true);
      expect(service.isOnline).toBe(true);
    });

    it('should trigger network change callback', () => {
      service.setOnline(false);
      expect(mockCallbacks.onNetworkChange).toHaveBeenCalledWith(false);

      service.setOnline(true);
      expect(mockCallbacks.onNetworkChange).toHaveBeenCalledWith(true);
    });

    it('should refresh prices when connection is restored', async () => {
      // Start offline
      service.setOnline(false);
      vi.clearAllMocks();

      // Restore connection
      service.setOnline(true);

      expect(mockCallbacks.onRefresh).toHaveBeenCalledTimes(1);
    });

    it('should not refresh prices when going offline', async () => {
      service.setOnline(true);
      vi.clearAllMocks();

      service.setOnline(false);

      expect(mockCallbacks.onRefresh).not.toHaveBeenCalled();
    });

    it('should handle refresh errors gracefully', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      mockCallbacks.onRefresh = vi
        .fn()
        .mockRejectedValue(new Error('Network error'));

      service.setOnline(false);
      service.setOnline(true);
      await vi.runOnlyPendingTimersAsync();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('restart()', () => {
    const preferences: PriceUpdatePreferences = {
      refreshInterval: 'standard',
      showStalenessIndicator: true,
      pauseWhenHidden: false,
    };

    it('should stop then start with new preferences', async () => {
      await service.start(preferences);
      expect(service.isPolling).toBe(true);

      vi.clearAllMocks();

      await service.restart({
        ...preferences,
        refreshInterval: 'frequent',
      });

      expect(mockCallbacks.onPersistCache).toHaveBeenCalledTimes(1);
      expect(mockCallbacks.onLoadCache).toHaveBeenCalledTimes(1);
      expect(service.isPolling).toBe(true);
    });

    it('should not start if new interval is manual', async () => {
      await service.start(preferences);
      expect(service.isPolling).toBe(true);

      await service.restart({
        ...preferences,
        refreshInterval: 'manual',
      });

      expect(service.isPolling).toBe(false);
    });

    it('should properly update polling interval', async () => {
      await service.start({
        ...preferences,
        refreshInterval: 'standard', // 60s
      });

      // Verify standard interval
      vi.advanceTimersByTime(60000);
      expect(mockCallbacks.onRefresh).toHaveBeenCalledTimes(1);

      vi.clearAllMocks();

      // Restart with frequent interval (30s)
      await service.restart({
        ...preferences,
        refreshInterval: 'frequent',
      });

      vi.advanceTimersByTime(30000);
      expect(mockCallbacks.onRefresh).toHaveBeenCalledTimes(1);
    });
  });

  describe('Visibility Handling', () => {
    it('should skip polling when tab is hidden and pauseWhenHidden is true', async () => {
      // Mock document visibility
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => 'hidden',
      });

      await service.start({
        refreshInterval: 'standard',
        showStalenessIndicator: true,
        pauseWhenHidden: true,
      });

      vi.advanceTimersByTime(60000);

      // Should not refresh when hidden
      expect(mockCallbacks.onRefresh).not.toHaveBeenCalled();
    });

    it('should poll when tab is visible and pauseWhenHidden is true', async () => {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => 'visible',
      });

      await service.start({
        refreshInterval: 'standard',
        showStalenessIndicator: true,
        pauseWhenHidden: true,
      });

      vi.advanceTimersByTime(60000);

      expect(mockCallbacks.onRefresh).toHaveBeenCalled();
    });

    it('should always poll when pauseWhenHidden is false', async () => {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => 'hidden',
      });

      await service.start({
        refreshInterval: 'standard',
        showStalenessIndicator: true,
        pauseWhenHidden: false, // Don't pause when hidden
      });

      vi.advanceTimersByTime(60000);

      expect(mockCallbacks.onRefresh).toHaveBeenCalled();
    });
  });

  describe('Offline Resilience', () => {
    const preferences: PriceUpdatePreferences = {
      refreshInterval: 'standard',
      showStalenessIndicator: true,
      pauseWhenHidden: false,
    };

    it('should not poll when offline', async () => {
      await service.start(preferences);

      // Set offline AFTER starting (setupNetworkHandlers resets online state)
      service.setOnline(false);

      // Reset only the onRefresh call count after setting offline
      (mockCallbacks.onRefresh as ReturnType<typeof vi.fn>).mockClear();

      vi.advanceTimersByTime(60000);

      // Should not refresh when offline
      expect(mockCallbacks.onRefresh).not.toHaveBeenCalled();
    });

    it('should resume polling when coming back online', async () => {
      await service.start(preferences);
      service.setOnline(false);

      vi.advanceTimersByTime(60000);
      expect(mockCallbacks.onRefresh).toHaveBeenCalledTimes(0);

      service.setOnline(true);

      // Should refresh immediately when coming online
      expect(mockCallbacks.onRefresh).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle refresh errors gracefully during polling', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      mockCallbacks.onRefresh = vi
        .fn()
        .mockRejectedValue(new Error('API Error'));

      await service.start({
        refreshInterval: 'standard',
        showStalenessIndicator: true,
        pauseWhenHidden: false,
      });

      vi.advanceTimersByTime(60000);
      await vi.runOnlyPendingTimersAsync();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Polling error:',
        expect.any(Error)
      );
      expect(service.isPolling).toBe(true); // Should continue polling

      consoleSpy.mockRestore();
    });
  });

  describe('hasActiveHandlers()', () => {
    it('should return false initially', () => {
      expect(service.hasActiveHandlers()).toBe(false);
    });

    it('should return true after starting with pauseWhenHidden', async () => {
      await service.start({
        refreshInterval: 'standard',
        showStalenessIndicator: true,
        pauseWhenHidden: true,
      });

      expect(service.hasActiveHandlers()).toBe(true);
    });

    it('should return false after stopping', async () => {
      await service.start({
        refreshInterval: 'standard',
        showStalenessIndicator: true,
        pauseWhenHidden: true,
      });

      await service.stop();

      expect(service.hasActiveHandlers()).toBe(false);
    });
  });
});
