import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

import { NotificationProps, ThemeConfig } from '@/types';

interface UIState {
  // Theme and appearance
  theme: ThemeConfig;

  // Navigation and layout
  sidebarOpen: boolean;
  mobileMenuOpen: boolean;

  // Notifications
  notifications: NotificationProps[];

  // Modal and dialog states
  modals: {
    addHolding: boolean;
    editHolding: boolean;
    addTransaction: boolean;
    editTransaction: boolean;
    importCSV: boolean;
    createPortfolio: boolean;
    editPortfolio: boolean;
    deleteConfirm: boolean;
  };

  // Loading states
  globalLoading: boolean;

  // Actions
  setTheme: (theme: Partial<ThemeConfig>) => void;
  toggleSidebar: () => void;
  setMobileMenuOpen: (open: boolean) => void;
  addNotification: (notification: Omit<NotificationProps, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  openModal: (modalName: keyof UIState['modals']) => void;
  closeModal: (modalName: keyof UIState['modals']) => void;
  closeAllModals: () => void;
  setGlobalLoading: (loading: boolean) => void;
}

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        theme: {
          mode: 'system',
          primaryColor: '#3B82F6',
          radius: 'md',
          animations: true,
        },

        sidebarOpen: true,
        mobileMenuOpen: false,

        notifications: [],

        modals: {
          addHolding: false,
          editHolding: false,
          addTransaction: false,
          editTransaction: false,
          importCSV: false,
          createPortfolio: false,
          editPortfolio: false,
          deleteConfirm: false,
        },

        globalLoading: false,

        // Actions
        setTheme: (themeUpdates) => {
          set((state) => ({
            theme: { ...state.theme, ...themeUpdates },
          }));
        },

        toggleSidebar: () => {
          set((state) => ({ sidebarOpen: !state.sidebarOpen }));
        },

        setMobileMenuOpen: (open) => {
          set({ mobileMenuOpen: open });
        },

        addNotification: (notification) => {
          const id = crypto.randomUUID();
          const newNotification: NotificationProps = {
            ...notification,
            id,
            duration: notification.duration || 5000,
          };

          set((state) => ({
            notifications: [...state.notifications, newNotification],
          }));

          // Auto-remove notification after duration
          if (newNotification.duration && newNotification.duration > 0) {
            setTimeout(() => {
              get().removeNotification(id);
            }, newNotification.duration);
          }
        },

        removeNotification: (id) => {
          set((state) => ({
            notifications: state.notifications.filter((n) => n.id !== id),
          }));
        },

        clearNotifications: () => {
          set({ notifications: [] });
        },

        openModal: (modalName) => {
          set((state) => ({
            modals: { ...state.modals, [modalName]: true },
          }));
        },

        closeModal: (modalName) => {
          set((state) => ({
            modals: { ...state.modals, [modalName]: false },
          }));
        },

        closeAllModals: () => {
          set((state) => ({
            modals: Object.keys(state.modals).reduce(
              (acc, key) => ({ ...acc, [key]: false }),
              {} as UIState['modals']
            ),
          }));
        },

        setGlobalLoading: (loading) => {
          set({ globalLoading: loading });
        },
      }),
      {
        name: 'ui-store',
        partialize: (state) => ({
          theme: state.theme,
          sidebarOpen: state.sidebarOpen,
        }),
      }
    ),
    {
      name: 'ui-store',
    }
  )
);

// Helper functions for notifications
export const showSuccessNotification = (title: string, message?: string) => {
  useUIStore.getState().addNotification({
    type: 'success',
    title,
    message,
  });
};

export const showErrorNotification = (title: string, message?: string) => {
  useUIStore.getState().addNotification({
    type: 'error',
    title,
    message,
    duration: 0, // Don't auto-dismiss errors
  });
};

export const showWarningNotification = (title: string, message?: string) => {
  useUIStore.getState().addNotification({
    type: 'warning',
    title,
    message,
  });
};

export const showInfoNotification = (title: string, message?: string) => {
  useUIStore.getState().addNotification({
    type: 'info',
    title,
    message,
  });
};
