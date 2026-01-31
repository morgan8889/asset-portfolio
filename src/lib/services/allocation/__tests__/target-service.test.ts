import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getTargetModels,
  createTargetModel,
  updateTargetModel,
  deleteTargetModel,
  getRebalancingExclusions,
  setRebalancingExclusions,
  addRebalancingExclusion,
  removeRebalancingExclusion,
} from '../target-service';
import { db } from '@/lib/db/schema';

// Mock the database
vi.mock('@/lib/db/schema', () => ({
  db: {
    userSettings: {
      where: vi.fn().mockReturnThis(),
      equals: vi.fn().mockReturnThis(),
      first: vi.fn(),
      put: vi.fn(),
    },
  },
}));

describe('TargetService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTargetModels', () => {
    it('should return empty array when no models exist', async () => {
      vi.mocked((db.userSettings as any).first).mockResolvedValue(undefined);

      const models = await getTargetModels();

      expect(models).toEqual([]);
    });

    it('should return models with converted dates', async () => {
      const mockModels = [
        {
          id: '1',
          name: 'Conservative',
          targets: { Stock: 40, Bond: 60 },
          lastUpdated: '2024-01-01T00:00:00.000Z',
        },
      ];

      vi.mocked((db.userSettings as any).first).mockResolvedValue({
        key: 'allocation_targets',
        value: mockModels,
        updatedAt: new Date(),
      });

      const models = await getTargetModels();

      expect(models).toHaveLength(1);
      expect(models[0].lastUpdated).toBeInstanceOf(Date);
    });
  });

  describe('createTargetModel', () => {
    it('should create a new target model', async () => {
      vi.mocked((db.userSettings as any).first).mockResolvedValue(undefined);

      const model = await createTargetModel('Balanced', {
        Stock: 60,
        Bond: 40,
      });

      expect(model.name).toBe('Balanced');
      expect(model.targets).toEqual({ Stock: 60, Bond: 40 });
      expect(model.id).toBeDefined();
      expect(db.userSettings.put).toHaveBeenCalled();
    });

    it('should throw error if targets do not sum to 100%', async () => {
      await expect(
        createTargetModel('Invalid', { Stock: 50, Bond: 30 })
      ).rejects.toThrow('must sum to 100%');
    });

    it('should throw error if targets have negative values', async () => {
      await expect(
        createTargetModel('Invalid', { Stock: 120, Bond: -20 })
      ).rejects.toThrow('cannot be negative');
    });

    it('should accept targets within 0.01% tolerance', async () => {
      vi.mocked((db.userSettings as any).first).mockResolvedValue(undefined);

      const model = await createTargetModel('Balanced', {
        Stock: 60.005,
        Bond: 39.995,
      });

      expect(model.name).toBe('Balanced');
    });
  });

  describe('updateTargetModel', () => {
    it('should update an existing model', async () => {
      const existingModels = [
        {
          id: '1',
          name: 'Old Name',
          targets: { Stock: 60, Bond: 40 },
          lastUpdated: new Date(),
        },
      ];

      vi.mocked((db.userSettings as any).first).mockResolvedValue({
        key: 'allocation_targets',
        value: existingModels,
        updatedAt: new Date(),
      });

      const updated = await updateTargetModel('1', { name: 'New Name' });

      expect(updated.name).toBe('New Name');
      expect(updated.targets).toEqual({ Stock: 60, Bond: 40 });
    });

    it('should throw error if model not found', async () => {
      vi.mocked((db.userSettings as any).first).mockResolvedValue(undefined);

      await expect(
        updateTargetModel('nonexistent', { name: 'Test' })
      ).rejects.toThrow('not found');
    });

    it('should validate targets when updating', async () => {
      const existingModels = [
        {
          id: '1',
          name: 'Test',
          targets: { Stock: 60, Bond: 40 },
          lastUpdated: new Date(),
        },
      ];

      vi.mocked((db.userSettings as any).first).mockResolvedValue({
        key: 'allocation_targets',
        value: existingModels,
        updatedAt: new Date(),
      });

      await expect(
        updateTargetModel('1', { targets: { Stock: 50, Bond: 30 } })
      ).rejects.toThrow('must sum to 100%');
    });
  });

  describe('deleteTargetModel', () => {
    it('should delete a model', async () => {
      const existingModels = [
        {
          id: '1',
          name: 'Test',
          targets: { Stock: 60, Bond: 40 },
          lastUpdated: new Date(),
        },
      ];

      vi.mocked((db.userSettings as any).first).mockResolvedValue({
        key: 'allocation_targets',
        value: existingModels,
        updatedAt: new Date(),
      });

      await deleteTargetModel('1');

      expect(db.userSettings.put).toHaveBeenCalledWith(
        expect.objectContaining({
          value: [],
        })
      );
    });

    it('should throw error if model not found', async () => {
      vi.mocked((db.userSettings as any).first).mockResolvedValue(undefined);

      await expect(deleteTargetModel('nonexistent')).rejects.toThrow(
        'not found'
      );
    });
  });

  describe('Rebalancing Exclusions', () => {
    it('should get empty array when no exclusions exist', async () => {
      vi.mocked((db.userSettings as any).first).mockResolvedValue(undefined);

      const exclusions = await getRebalancingExclusions();

      expect(exclusions).toEqual([]);
    });

    it('should set exclusions', async () => {
      await setRebalancingExclusions(['portfolio1', 'portfolio2']);

      expect(db.userSettings.put).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'rebalancing_exclusions',
          value: { portfolioIds: ['portfolio1', 'portfolio2'] },
        })
      );
    });

    it('should add exclusion', async () => {
      vi.mocked((db.userSettings as any).first).mockResolvedValue({
        key: 'rebalancing_exclusions',
        value: { portfolioIds: ['portfolio1'] },
        updatedAt: new Date(),
      });

      await addRebalancingExclusion('portfolio2');

      expect(db.userSettings.put).toHaveBeenCalledWith(
        expect.objectContaining({
          value: { portfolioIds: ['portfolio1', 'portfolio2'] },
        })
      );
    });

    it('should not add duplicate exclusion', async () => {
      vi.mocked((db.userSettings as any).first).mockResolvedValue({
        key: 'rebalancing_exclusions',
        value: { portfolioIds: ['portfolio1'] },
        updatedAt: new Date(),
      });

      await addRebalancingExclusion('portfolio1');

      expect(db.userSettings.put).not.toHaveBeenCalled();
    });

    it('should remove exclusion', async () => {
      vi.mocked((db.userSettings as any).first).mockResolvedValue({
        key: 'rebalancing_exclusions',
        value: { portfolioIds: ['portfolio1', 'portfolio2'] },
        updatedAt: new Date(),
      });

      await removeRebalancingExclusion('portfolio1');

      expect(db.userSettings.put).toHaveBeenCalledWith(
        expect.objectContaining({
          value: { portfolioIds: ['portfolio2'] },
        })
      );
    });
  });
});
