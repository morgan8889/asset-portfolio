/**
 * Zustand store for export progress tracking
 * @feature 011-export-functionality
 */

import { create } from 'zustand';
import type { ExportProgress, ReportConfig } from '@/types/export';

interface ExportState {
  progress: ExportProgress;
  startExport: (config: ReportConfig) => void;
  updateProgress: (progress: Partial<ExportProgress>) => void;
  resetProgress: () => void;
}

const initialProgress: ExportProgress = {
  status: 'idle',
  progress: 0,
  message: undefined,
  error: undefined,
};

export const useExportStore = create<ExportState>((set) => ({
  progress: initialProgress,

  startExport: (config: ReportConfig) => {
    set({
      progress: {
        status: 'preparing',
        progress: 0,
        message: `Preparing ${config.type} export...`,
        error: undefined,
      },
    });
  },

  updateProgress: (progressUpdate: Partial<ExportProgress>) => {
    set((state) => ({
      progress: {
        ...state.progress,
        ...progressUpdate,
      },
    }));
  },

  resetProgress: () => {
    set({ progress: initialProgress });
  },
}));
