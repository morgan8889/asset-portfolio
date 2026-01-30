import { db } from '@/lib/db/schema';
import { TargetModel, RebalancingExclusions } from '@/types/allocation';
import { v4 as uuidv4 } from 'uuid';

const ALLOCATION_TARGETS_KEY = 'allocation_targets';
const REBALANCING_EXCLUSIONS_KEY = 'rebalancing_exclusions';

/**
 * Get all target allocation models
 */
export async function getTargetModels(): Promise<TargetModel[]> {
  const setting = await db.userSettings
    .where('key')
    .equals(ALLOCATION_TARGETS_KEY)
    .first();

  if (!setting || !setting.value) {
    return [];
  }

  const models = setting.value as TargetModel[];
  // Convert date strings to Date objects
  return models.map((model) => ({
    ...model,
    lastUpdated: new Date(model.lastUpdated),
  }));
}

/**
 * Get a specific target model by ID
 */
export async function getTargetModel(
  id: string
): Promise<TargetModel | undefined> {
  const models = await getTargetModels();
  return models.find((model) => model.id === id);
}

/**
 * Create a new target allocation model
 */
export async function createTargetModel(
  name: string,
  targets: Record<string, number>
): Promise<TargetModel> {
  // Validate that targets sum to 100%
  const sum = Object.values(targets).reduce((acc, val) => acc + val, 0);
  if (Math.abs(sum - 100) > 0.01) {
    throw new Error(
      `Target percentages must sum to 100%. Current sum: ${sum.toFixed(2)}%`
    );
  }

  // Validate no negative values
  for (const [category, percentage] of Object.entries(targets)) {
    if (percentage < 0) {
      throw new Error(
        `Target percentage for ${category} cannot be negative: ${percentage}%`
      );
    }
  }

  const newModel: TargetModel = {
    id: uuidv4(),
    name,
    targets,
    lastUpdated: new Date(),
  };

  const existingModels = await getTargetModels();
  const updatedModels = [...existingModels, newModel];

  await db.userSettings.put({
    key: ALLOCATION_TARGETS_KEY,
    value: updatedModels,
    updatedAt: new Date(),
  });

  return newModel;
}

/**
 * Update an existing target allocation model
 */
export async function updateTargetModel(
  id: string,
  updates: Partial<Omit<TargetModel, 'id' | 'lastUpdated'>>
): Promise<TargetModel> {
  const existingModels = await getTargetModels();
  const modelIndex = existingModels.findIndex((model) => model.id === id);

  if (modelIndex === -1) {
    throw new Error(`Target model with id ${id} not found`);
  }

  const updatedModel: TargetModel = {
    ...existingModels[modelIndex],
    ...updates,
    lastUpdated: new Date(),
  };

  // Validate if targets are being updated
  if (updates.targets) {
    const sum = Object.values(updates.targets).reduce((acc, val) => acc + val, 0);
    if (Math.abs(sum - 100) > 0.01) {
      throw new Error(
        `Target percentages must sum to 100%. Current sum: ${sum.toFixed(2)}%`
      );
    }

    for (const [category, percentage] of Object.entries(updates.targets)) {
      if (percentage < 0) {
        throw new Error(
          `Target percentage for ${category} cannot be negative: ${percentage}%`
        );
      }
    }
  }

  existingModels[modelIndex] = updatedModel;

  await db.userSettings.put({
    key: ALLOCATION_TARGETS_KEY,
    value: existingModels,
    updatedAt: new Date(),
  });

  return updatedModel;
}

/**
 * Delete a target allocation model
 */
export async function deleteTargetModel(id: string): Promise<void> {
  const existingModels = await getTargetModels();
  const filteredModels = existingModels.filter((model) => model.id !== id);

  if (filteredModels.length === existingModels.length) {
    throw new Error(`Target model with id ${id} not found`);
  }

  await db.userSettings.put({
    key: ALLOCATION_TARGETS_KEY,
    value: filteredModels,
    updatedAt: new Date(),
  });
}

/**
 * Get portfolio IDs excluded from rebalancing
 */
export async function getRebalancingExclusions(): Promise<string[]> {
  const setting = await db.userSettings
    .where('key')
    .equals(REBALANCING_EXCLUSIONS_KEY)
    .first();

  if (!setting || !setting.value) {
    return [];
  }

  const exclusions = setting.value as RebalancingExclusions;
  return exclusions.portfolioIds || [];
}

/**
 * Set portfolio IDs excluded from rebalancing
 */
export async function setRebalancingExclusions(
  portfolioIds: string[]
): Promise<void> {
  const exclusions: RebalancingExclusions = {
    portfolioIds,
  };

  await db.userSettings.put({
    key: REBALANCING_EXCLUSIONS_KEY,
    value: exclusions,
    updatedAt: new Date(),
  });
}

/**
 * Add a portfolio to the exclusion list
 */
export async function addRebalancingExclusion(
  portfolioId: string
): Promise<void> {
  const existing = await getRebalancingExclusions();
  if (!existing.includes(portfolioId)) {
    await setRebalancingExclusions([...existing, portfolioId]);
  }
}

/**
 * Remove a portfolio from the exclusion list
 */
export async function removeRebalancingExclusion(
  portfolioId: string
): Promise<void> {
  const existing = await getRebalancingExclusions();
  await setRebalancingExclusions(
    existing.filter((id) => id !== portfolioId)
  );
}
