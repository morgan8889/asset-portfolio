/**
 * Tests for Export Store
 *
 * Tests export progress tracking, state management, and error handling.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useExportStore } from '../export';
import type { ReportConfig } from '@/types/export';

describe('Export Store', () => {
  beforeEach(() => {
    // Reset store to initial state
    useExportStore.setState({
      progress: {
        status: 'idle',
        progress: 0,
        message: undefined,
        error: undefined,
      },
    });
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useExportStore.getState();

      expect(state.progress.status).toBe('idle');
      expect(state.progress.progress).toBe(0);
      expect(state.progress.message).toBeUndefined();
      expect(state.progress.error).toBeUndefined();
    });
  });

  describe('startExport', () => {
    it('should start PDF export', () => {
      const config: ReportConfig = {
        type: 'performance',
        portfolioId: 'portfolio-1',
        dateRange: 'YTD',
        format: 'pdf',
      };

      useExportStore.getState().startExport(config);

      const state = useExportStore.getState();
      expect(state.progress.status).toBe('preparing');
      expect(state.progress.progress).toBe(0);
      expect(state.progress.message).toBe('Preparing performance export...');
      expect(state.progress.error).toBeUndefined();
    });

    it('should start CSV export', () => {
      const config: ReportConfig = {
        type: 'transactions',
        portfolioId: 'portfolio-1',
        dateRange: 'ALL',
        format: 'csv',
      };

      useExportStore.getState().startExport(config);

      const state = useExportStore.getState();
      expect(state.progress.status).toBe('preparing');
      expect(state.progress.message).toBe('Preparing transactions export...');
    });

    it('should clear previous error on new export', () => {
      useExportStore.setState({
        progress: {
          status: 'error',
          progress: 0,
          message: undefined,
          error: 'Previous error',
        },
      });

      const config: ReportConfig = {
        type: 'holdings',
        portfolioId: 'portfolio-1',
        dateRange: 'YTD',
        format: 'pdf',
      };

      useExportStore.getState().startExport(config);

      const state = useExportStore.getState();
      expect(state.progress.error).toBeUndefined();
    });
  });

  describe('updateProgress', () => {
    it('should update progress percentage', () => {
      useExportStore.getState().updateProgress({ progress: 50 });

      const state = useExportStore.getState();
      expect(state.progress.progress).toBe(50);
    });

    it('should update status to generating', () => {
      useExportStore.getState().updateProgress({
        status: 'generating',
        progress: 30,
        message: 'Generating report...',
      });

      const state = useExportStore.getState();
      expect(state.progress.status).toBe('generating');
      expect(state.progress.progress).toBe(30);
      expect(state.progress.message).toBe('Generating report...');
    });

    it('should update status to complete', () => {
      useExportStore.getState().updateProgress({
        status: 'complete',
        progress: 100,
        message: 'Export complete',
      });

      const state = useExportStore.getState();
      expect(state.progress.status).toBe('complete');
      expect(state.progress.progress).toBe(100);
    });

    it('should update status to error', () => {
      useExportStore.getState().updateProgress({
        status: 'error',
        progress: 0,
        error: 'Failed to generate PDF',
      });

      const state = useExportStore.getState();
      expect(state.progress.status).toBe('error');
      expect(state.progress.error).toBe('Failed to generate PDF');
    });

    it('should preserve existing fields when partially updating', () => {
      useExportStore.setState({
        progress: {
          status: 'generating',
          progress: 50,
          message: 'Generating...',
          error: undefined,
        },
      });

      useExportStore.getState().updateProgress({ progress: 75 });

      const state = useExportStore.getState();
      expect(state.progress.status).toBe('generating');
      expect(state.progress.progress).toBe(75);
      expect(state.progress.message).toBe('Generating...');
    });
  });

  describe('resetProgress', () => {
    it('should reset to initial idle state', () => {
      useExportStore.setState({
        progress: {
          status: 'complete',
          progress: 100,
          message: 'Export complete',
          error: undefined,
        },
      });

      useExportStore.getState().resetProgress();

      const state = useExportStore.getState();
      expect(state.progress.status).toBe('idle');
      expect(state.progress.progress).toBe(0);
      expect(state.progress.message).toBeUndefined();
      expect(state.progress.error).toBeUndefined();
    });

    it('should clear error on reset', () => {
      useExportStore.setState({
        progress: {
          status: 'error',
          progress: 0,
          message: undefined,
          error: 'Export failed',
        },
      });

      useExportStore.getState().resetProgress();

      const state = useExportStore.getState();
      expect(state.progress.error).toBeUndefined();
    });
  });

  describe('Progress Workflow', () => {
    it('should follow typical export workflow', () => {
      const config: ReportConfig = {
        type: 'performance',
        portfolioId: 'portfolio-1',
        dateRange: 'YTD',
        format: 'pdf',
      };

      // Start export
      useExportStore.getState().startExport(config);
      expect(useExportStore.getState().progress.status).toBe('preparing');

      // Update to exporting
      useExportStore.getState().updateProgress({
        status: 'generating',
        progress: 30,
      });
      expect(useExportStore.getState().progress.status).toBe('generating');
      expect(useExportStore.getState().progress.progress).toBe(30);

      // Progress to 60%
      useExportStore.getState().updateProgress({ progress: 60 });
      expect(useExportStore.getState().progress.progress).toBe(60);

      // Complete
      useExportStore.getState().updateProgress({
        status: 'complete',
        progress: 100,
        message: 'Export complete',
      });
      expect(useExportStore.getState().progress.status).toBe('complete');

      // Reset for next export
      useExportStore.getState().resetProgress();
      expect(useExportStore.getState().progress.status).toBe('idle');
    });

    it('should handle export failure workflow', () => {
      const config: ReportConfig = {
        type: 'transactions',
        portfolioId: 'portfolio-1',
        dateRange: 'ALL',
        format: 'csv',
      };

      // Start export
      useExportStore.getState().startExport(config);

      // Fail during export
      useExportStore.getState().updateProgress({
        status: 'error',
        progress: 0,
        error: 'Network error',
      });

      const state = useExportStore.getState();
      expect(state.progress.status).toBe('error');
      expect(state.progress.error).toBe('Network error');

      // Reset to try again
      useExportStore.getState().resetProgress();
      expect(useExportStore.getState().progress.status).toBe('idle');
      expect(useExportStore.getState().progress.error).toBeUndefined();
    });
  });
});
