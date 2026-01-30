/**
 * Tests for Target Model Service
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { db } from '@/lib/db/schema';
import {
  cloneTargetModel,
  updateTargetModel,
  deleteTargetModel,
  createTargetModel,
} from '../target-model-service';
import { TargetModel } from '@/types/analysis';

// Mock uuid for predictable IDs
let uuidCounter = 0;
vi.mock('uuid', () => ({
  v4: () => `test-uuid-${++uuidCounter}`,
}));

describe('Target Model Service', () => {
  beforeEach(async () => {
    // Reset UUID counter
    uuidCounter = 0;
    vi.clearAllMocks();

    // Clear userSettings table before each test
    await db.userSettings.clear();
  });

  afterEach(async () => {
    // Clean up after each test
    await db.userSettings.clear();
  });

  describe('cloneTargetModel', () => {
    it('should clone a target model with new ID and name', async () => {
      const sourceModel: TargetModel = {
        id: 'source-model',
        name: 'Original Model',
        description: 'Original description',
        isSystem: true,
        allocations: {
          stock: 60,
          bond: 40,
          etf: 0,
          crypto: 0,
          real_estate: 0,
          commodity: 0,
          cash: 0,
          index: 0,
          other: 0,
        },
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      };

      const clonedModel = await cloneTargetModel(sourceModel, 'Cloned Model');

      expect(clonedModel.id).toBe('test-uuid-1');
      expect(clonedModel.name).toBe('Cloned Model');
      expect(clonedModel.description).toBe('Original description');
      expect(clonedModel.isSystem).toBe(false); // Cloned models are never system
      expect(clonedModel.allocations).toEqual(sourceModel.allocations);
      expect(clonedModel.createdAt).toBeInstanceOf(Date);
      expect(clonedModel.updatedAt).toBeInstanceOf(Date);
    });

    it('should save cloned model to IndexedDB', async () => {
      const sourceModel: TargetModel = {
        id: 'source-model',
        name: 'Original Model',
        isSystem: true,
        allocations: {
          stock: 50,
          bond: 50,
          etf: 0,
          crypto: 0,
          real_estate: 0,
          commodity: 0,
          cash: 0,
          index: 0,
          other: 0,
        },
      };

      await cloneTargetModel(sourceModel, 'Cloned Model');

      const stored = await db.userSettings.where('key').equals('target_models').first();
      expect(stored).toBeDefined();
      expect(stored?.value).toHaveLength(1);
      expect((stored?.value as TargetModel[])[0].name).toBe('Cloned Model');
    });

    it('should append to existing models in IndexedDB', async () => {
      // Add an existing model
      const existingModel: TargetModel = {
        id: 'existing-model',
        name: 'Existing Model',
        isSystem: false,
        allocations: {
          stock: 70,
          bond: 30,
          etf: 0,
          crypto: 0,
          real_estate: 0,
          commodity: 0,
          cash: 0,
          index: 0,
          other: 0,
        },
      };

      await db.userSettings.put({
        key: 'target_models',
        value: [existingModel],
        updatedAt: new Date(),
      });

      // Clone a new model
      const sourceModel: TargetModel = {
        id: 'source-model',
        name: 'Source Model',
        isSystem: true,
        allocations: {
          stock: 60,
          bond: 40,
          etf: 0,
          crypto: 0,
          real_estate: 0,
          commodity: 0,
          cash: 0,
          index: 0,
          other: 0,
        },
      };

      await cloneTargetModel(sourceModel, 'Cloned Model');

      const stored = await db.userSettings.where('key').equals('target_models').first();
      expect(stored?.value).toHaveLength(2);
      const models = stored?.value as TargetModel[];
      expect(models.map((m) => m.name)).toEqual(['Existing Model', 'Cloned Model']);
    });
  });

  describe('updateTargetModel', () => {
    beforeEach(async () => {
      // Set up some test models
      const models: TargetModel[] = [
        {
          id: 'user-model-1',
          name: 'User Model 1',
          isSystem: false,
          allocations: {
            stock: 60,
            bond: 40,
            etf: 0,
            crypto: 0,
            real_estate: 0,
            commodity: 0,
            cash: 0,
            index: 0,
            other: 0,
          },
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-01'),
        },
        {
          id: 'system-model-1',
          name: 'System Model 1',
          isSystem: true,
          allocations: {
            stock: 50,
            bond: 50,
            etf: 0,
            crypto: 0,
            real_estate: 0,
            commodity: 0,
            cash: 0,
            index: 0,
            other: 0,
          },
        },
      ];

      await db.userSettings.put({
        key: 'target_models',
        value: models,
        updatedAt: new Date(),
      });
    });

    it('should update a non-system model', async () => {
      await updateTargetModel('user-model-1', {
        name: 'Updated User Model',
        description: 'New description',
        allocations: {
          stock: 70,
          bond: 30,
          etf: 0,
          crypto: 0,
          real_estate: 0,
          commodity: 0,
          cash: 0,
          index: 0,
          other: 0,
        },
      });

      const stored = await db.userSettings.where('key').equals('target_models').first();
      const models = stored?.value as TargetModel[];
      const updated = models.find((m) => m.id === 'user-model-1');

      expect(updated?.name).toBe('Updated User Model');
      expect(updated?.description).toBe('New description');
      expect(updated?.allocations.stock).toBe(70);
      expect(updated?.updatedAt).toBeInstanceOf(Date);
    });

    it('should throw error when updating system model', async () => {
      await expect(
        updateTargetModel('system-model-1', {
          name: 'Should Fail',
        })
      ).rejects.toThrow('Cannot update system models');
    });

    it('should throw error when model not found', async () => {
      await expect(
        updateTargetModel('non-existent', {
          name: 'Should Fail',
        })
      ).rejects.toThrow('Target model not found');
    });

    it('should preserve id and isSystem fields', async () => {
      await updateTargetModel('user-model-1', {
        name: 'Updated Model',
        // Trying to change these should be ignored
        id: 'different-id' as any,
        isSystem: true as any,
      });

      const stored = await db.userSettings.where('key').equals('target_models').first();
      const models = stored?.value as TargetModel[];
      const updated = models.find((m) => m.id === 'user-model-1');

      expect(updated?.id).toBe('user-model-1'); // Unchanged
      expect(updated?.isSystem).toBe(false); // Unchanged
    });
  });

  describe('deleteTargetModel', () => {
    beforeEach(async () => {
      const models: TargetModel[] = [
        {
          id: 'user-model-1',
          name: 'User Model 1',
          isSystem: false,
          allocations: {
            stock: 60,
            bond: 40,
            etf: 0,
            crypto: 0,
            real_estate: 0,
            commodity: 0,
            cash: 0,
            index: 0,
            other: 0,
          },
        },
        {
          id: 'user-model-2',
          name: 'User Model 2',
          isSystem: false,
          allocations: {
            stock: 50,
            bond: 50,
            etf: 0,
            crypto: 0,
            real_estate: 0,
            commodity: 0,
            cash: 0,
            index: 0,
            other: 0,
          },
        },
        {
          id: 'system-model-1',
          name: 'System Model 1',
          isSystem: true,
          allocations: {
            stock: 70,
            bond: 30,
            etf: 0,
            crypto: 0,
            real_estate: 0,
            commodity: 0,
            cash: 0,
            index: 0,
            other: 0,
          },
        },
      ];

      await db.userSettings.put({
        key: 'target_models',
        value: models,
        updatedAt: new Date(),
      });
    });

    it('should delete a non-system model', async () => {
      await deleteTargetModel('user-model-1');

      const stored = await db.userSettings.where('key').equals('target_models').first();
      const models = stored?.value as TargetModel[];

      expect(models).toHaveLength(2);
      expect(models.find((m) => m.id === 'user-model-1')).toBeUndefined();
      expect(models.find((m) => m.id === 'user-model-2')).toBeDefined();
      expect(models.find((m) => m.id === 'system-model-1')).toBeDefined();
    });

    it('should throw error when deleting system model', async () => {
      await expect(deleteTargetModel('system-model-1')).rejects.toThrow(
        'Cannot delete system models'
      );
    });

    it('should throw error when model not found', async () => {
      await expect(deleteTargetModel('non-existent')).rejects.toThrow(
        'Target model not found'
      );
    });
  });

  describe('createTargetModel', () => {
    it('should create a new target model', async () => {
      const modelData = {
        name: 'My Custom Model',
        description: 'Custom allocation strategy',
        allocations: {
          stock: 45,
          bond: 35,
          etf: 10,
          crypto: 5,
          real_estate: 5,
          commodity: 0,
          cash: 0,
          index: 0,
          other: 0,
        },
      };

      const newModel = await createTargetModel(modelData);

      expect(newModel.id).toBe('test-uuid-1');
      expect(newModel.name).toBe('My Custom Model');
      expect(newModel.description).toBe('Custom allocation strategy');
      expect(newModel.isSystem).toBe(false);
      expect(newModel.allocations).toEqual(modelData.allocations);
      expect(newModel.createdAt).toBeInstanceOf(Date);
      expect(newModel.updatedAt).toBeInstanceOf(Date);
    });

    it('should save new model to IndexedDB', async () => {
      const modelData = {
        name: 'My Custom Model',
        allocations: {
          stock: 50,
          bond: 50,
          etf: 0,
          crypto: 0,
          real_estate: 0,
          commodity: 0,
          cash: 0,
          index: 0,
          other: 0,
        },
      };

      await createTargetModel(modelData);

      const stored = await db.userSettings.where('key').equals('target_models').first();
      expect(stored).toBeDefined();
      expect(stored?.value).toHaveLength(1);
      expect((stored?.value as TargetModel[])[0].name).toBe('My Custom Model');
    });

    it('should append to existing models', async () => {
      // Add an existing model
      const existingModel: TargetModel = {
        id: 'existing-model',
        name: 'Existing Model',
        isSystem: false,
        allocations: {
          stock: 60,
          bond: 40,
          etf: 0,
          crypto: 0,
          real_estate: 0,
          commodity: 0,
          cash: 0,
          index: 0,
          other: 0,
        },
      };

      await db.userSettings.put({
        key: 'target_models',
        value: [existingModel],
        updatedAt: new Date(),
      });

      // Create a new model
      const modelData = {
        name: 'New Model',
        allocations: {
          stock: 70,
          bond: 30,
          etf: 0,
          crypto: 0,
          real_estate: 0,
          commodity: 0,
          cash: 0,
          index: 0,
          other: 0,
        },
      };

      await createTargetModel(modelData);

      const stored = await db.userSettings.where('key').equals('target_models').first();
      expect(stored?.value).toHaveLength(2);
      const models = stored?.value as TargetModel[];
      expect(models.map((m) => m.name)).toEqual(['Existing Model', 'New Model']);
    });
  });

  describe('IndexedDB error handling', () => {
    it('should handle IndexedDB errors gracefully in cloneTargetModel', async () => {
      // Mock db.userSettings.where().equals().first() chain to throw an error
      const originalWhere = db.userSettings.where;
      vi.spyOn(db.userSettings, 'where').mockReturnValueOnce({
        equals: () => ({
          first: () => Promise.reject(new Error('Database error')),
        }),
      } as any);

      const sourceModel: TargetModel = {
        id: 'source-model',
        name: 'Source Model',
        isSystem: true,
        allocations: {
          stock: 60,
          bond: 40,
          etf: 0,
          crypto: 0,
          real_estate: 0,
          commodity: 0,
          cash: 0,
          index: 0,
          other: 0,
        },
      };

      await expect(cloneTargetModel(sourceModel, 'Clone')).rejects.toThrow(
        'Database error'
      );

      // Restore original function
      db.userSettings.where = originalWhere;
    });

    it('should handle IndexedDB put errors in createTargetModel', async () => {
      // Mock db.userSettings.put to throw an error
      const originalPut = db.userSettings.put;
      vi.spyOn(db.userSettings, 'put').mockRejectedValueOnce(
        new Error('Write error')
      );

      const modelData = {
        name: 'Test Model',
        allocations: {
          stock: 100,
          bond: 0,
          etf: 0,
          crypto: 0,
          real_estate: 0,
          commodity: 0,
          cash: 0,
          index: 0,
          other: 0,
        },
      };

      await expect(createTargetModel(modelData)).rejects.toThrow('Write error');

      // Restore original function
      db.userSettings.put = originalPut;
    });
  });
});
