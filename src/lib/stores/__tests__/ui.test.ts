/**
 * Tests for UI Store
 *
 * Tests modal state, notification management, and UI state coordination.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '../ui';

describe('UI Store', () => {
  beforeEach(() => {
    useUIStore.setState({
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
      notifications: [],
      globalLoading: false,
      sidebarOpen: true,
      mobileMenuOpen: false,
      theme: {
        mode: 'system',
        primaryColor: '#3B82F6',
        radius: 'md',
        animations: true,
      },
    });
  });

  describe('Initial State', () => {
    it('should have closed modals initially', () => {
      const state = useUIStore.getState();
      expect(state.modals.addTransaction).toBe(false);
      expect(state.modals.editTransaction).toBe(false);
    });

    it('should have empty notifications', () => {
      expect(useUIStore.getState().notifications).toEqual([]);
    });
  });

  describe('Modal Management', () => {
    it('should open add transaction modal', () => {
      useUIStore.getState().openModal('addTransaction');
      expect(useUIStore.getState().modals.addTransaction).toBe(true);
    });

    it('should close add transaction modal', () => {
      useUIStore.setState({
        modals: {
          addHolding: false,
          editHolding: false,
          addTransaction: true,
          editTransaction: false,
          importCSV: false,
          createPortfolio: false,
          editPortfolio: false,
          deleteConfirm: false,
        }
      });
      useUIStore.getState().closeModal('addTransaction');
      expect(useUIStore.getState().modals.addTransaction).toBe(false);
    });

    it('should open edit transaction modal', () => {
      useUIStore.getState().openModal('editTransaction');

      expect(useUIStore.getState().modals.editTransaction).toBe(true);
    });

    it('should close edit transaction modal', () => {
      useUIStore.setState({
        modals: {
          addHolding: false,
          editHolding: false,
          addTransaction: false,
          editTransaction: true,
          importCSV: false,
          createPortfolio: false,
          editPortfolio: false,
          deleteConfirm: false,
        }
      });

      useUIStore.getState().closeModal('editTransaction');

      expect(useUIStore.getState().modals.editTransaction).toBe(false);
    });

    it('should close all modals', () => {
      useUIStore.setState({
        modals: {
          addHolding: true,
          editHolding: true,
          addTransaction: true,
          editTransaction: true,
          importCSV: true,
          createPortfolio: true,
          editPortfolio: true,
          deleteConfirm: true,
        }
      });

      useUIStore.getState().closeAllModals();

      const state = useUIStore.getState();
      expect(state.modals.addTransaction).toBe(false);
      expect(state.modals.editTransaction).toBe(false);
      expect(state.modals.importCSV).toBe(false);
    });
  });

  describe('Notification Management', () => {
    it('should add notification', () => {
      useUIStore.getState().addNotification({
        type: 'success',
        title: 'Success',
        message: 'Transaction saved',
      });

      expect(useUIStore.getState().notifications).toHaveLength(1);
      expect(useUIStore.getState().notifications[0].message).toBe('Transaction saved');
      expect(useUIStore.getState().notifications[0].title).toBe('Success');
    });

    it('should add multiple notifications', () => {
      useUIStore.getState().addNotification({
        type: 'success',
        title: 'First',
        message: 'First message',
      });
      useUIStore.getState().addNotification({
        type: 'error',
        title: 'Second',
        message: 'Second message',
      });

      expect(useUIStore.getState().notifications).toHaveLength(2);
    });

    it('should remove notification by id', () => {
      const notif1 = { id: '1', type: 'success' as const, title: 'First', message: 'First', duration: 5000 };
      const notif2 = { id: '2', type: 'info' as const, title: 'Second', message: 'Second', duration: 5000 };

      useUIStore.setState({
        notifications: [notif1, notif2],
      });

      useUIStore.getState().removeNotification('1');

      expect(useUIStore.getState().notifications).toHaveLength(1);
      expect(useUIStore.getState().notifications[0].id).toBe('2');
    });

    it('should clear all notifications', () => {
      const notif1 = { id: '1', type: 'success' as const, title: 'First', message: 'First', duration: 5000 };
      const notif2 = { id: '2', type: 'error' as const, title: 'Second', message: 'Second', duration: 5000 };

      useUIStore.setState({
        notifications: [notif1, notif2],
      });

      useUIStore.getState().clearNotifications();

      expect(useUIStore.getState().notifications).toEqual([]);
    });
  });

  describe('Loading State', () => {
    it('should set global loading state', () => {
      useUIStore.getState().setGlobalLoading(true);

      expect(useUIStore.getState().globalLoading).toBe(true);
    });

    it('should clear global loading state', () => {
      useUIStore.setState({ globalLoading: true });

      useUIStore.getState().setGlobalLoading(false);

      expect(useUIStore.getState().globalLoading).toBe(false);
    });
  });

  describe('Notification Types', () => {
    it('should support success notifications', () => {
      useUIStore.getState().addNotification({
        type: 'success',
        title: 'Success',
        message: 'Success message',
      });
      expect(useUIStore.getState().notifications[0].type).toBe('success');
    });

    it('should support error notifications', () => {
      useUIStore.getState().addNotification({
        type: 'error',
        title: 'Error',
        message: 'Error message',
      });
      expect(useUIStore.getState().notifications[0].type).toBe('error');
    });

    it('should support info notifications', () => {
      useUIStore.getState().addNotification({
        type: 'info',
        title: 'Info',
        message: 'Info message',
      });
      expect(useUIStore.getState().notifications[0].type).toBe('info');
    });

    it('should support warning notifications', () => {
      useUIStore.getState().addNotification({
        type: 'warning',
        title: 'Warning',
        message: 'Warning message',
      });
      expect(useUIStore.getState().notifications[0].type).toBe('warning');
    });
  });
});
