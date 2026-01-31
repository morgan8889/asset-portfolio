/**
 * Target Model Service
 *
 * Handles cloning and customizing target allocation models.
 */

import { v4 as uuidv4 } from 'uuid';

import { TargetModel } from '@/types/analysis';
import { db } from '@/lib/db/schema';

/**
 * Clone an existing target model
 *
 * Creates a copy of a target model with a new name and ID.
 * Cloned models are always non-system models regardless of source.
 *
 * @param sourceModel - Target model to clone
 * @param name - Name for the cloned model
 * @returns Promise resolving to the newly cloned model
 */
export async function cloneTargetModel(
  sourceModel: TargetModel,
  name: string
): Promise<TargetModel> {
  const clonedModel: TargetModel = {
    ...sourceModel,
    id: uuidv4(),
    name,
    isSystem: false, // Cloned models are never system models
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Save to userSettings using transaction
  await db.transaction('rw', db.userSettings, async () => {
    const existing = await db.userSettings
      .where('key')
      .equals('target_models')
      .first();
    const models = (existing?.value as TargetModel[]) || [];
    models.push(clonedModel);

    await db.userSettings.put({
      id: existing?.id, // Preserve existing record id to update, not create new
      key: 'target_models',
      value: models,
      updatedAt: new Date(),
    });
  });

  return clonedModel;
}

/**
 * Update an existing target model (only non-system models)
 *
 * @param modelId - ID of the model to update
 * @param updates - Partial updates to apply (cannot change id or isSystem)
 * @throws Error if model not found or attempting to update a system model
 */
export async function updateTargetModel(
  modelId: string,
  updates: Partial<Omit<TargetModel, 'id' | 'isSystem'>>
): Promise<void> {
  await db.transaction('rw', db.userSettings, async () => {
    const existing = await db.userSettings
      .where('key')
      .equals('target_models')
      .first();
    const models = (existing?.value as TargetModel[]) || [];

    const modelIndex = models.findIndex((m) => m.id === modelId);
    if (modelIndex === -1) {
      throw new Error('Target model not found');
    }

    const model = models[modelIndex];
    if (model.isSystem) {
      throw new Error('Cannot update system models');
    }

    // Apply updates
    models[modelIndex] = {
      ...model,
      ...updates,
      id: modelId,
      isSystem: false,
      updatedAt: new Date(),
    };

    await db.userSettings.put({
      id: existing?.id, // Preserve existing record id to update, not create new
      key: 'target_models',
      value: models,
      updatedAt: new Date(),
    });
  });
}

/**
 * Delete a target model (only non-system models)
 *
 * @param modelId - ID of the model to delete
 * @throws Error if model not found or attempting to delete a system model
 */
export async function deleteTargetModel(modelId: string): Promise<void> {
  await db.transaction('rw', db.userSettings, async () => {
    const existing = await db.userSettings
      .where('key')
      .equals('target_models')
      .first();
    const models = (existing?.value as TargetModel[]) || [];

    const model = models.find((m) => m.id === modelId);
    if (!model) {
      throw new Error('Target model not found');
    }

    if (model.isSystem) {
      throw new Error('Cannot delete system models');
    }

    const updatedModels = models.filter((m) => m.id !== modelId);

    await db.userSettings.put({
      id: existing?.id, // Preserve existing record id to update, not create new
      key: 'target_models',
      value: updatedModels,
      updatedAt: new Date(),
    });
  });
}

/**
 * Create a custom target model from scratch
 *
 * @param modelData - Model data (id, isSystem, timestamps auto-generated)
 * @returns Promise resolving to the newly created model
 */
export async function createTargetModel(
  modelData: Omit<TargetModel, 'id' | 'isSystem' | 'createdAt' | 'updatedAt'>
): Promise<TargetModel> {
  const newModel: TargetModel = {
    ...modelData,
    id: uuidv4(),
    isSystem: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.transaction('rw', db.userSettings, async () => {
    const existing = await db.userSettings
      .where('key')
      .equals('target_models')
      .first();
    const models = (existing?.value as TargetModel[]) || [];
    models.push(newModel);

    await db.userSettings.put({
      id: existing?.id, // Preserve existing record id to update, not create new
      key: 'target_models',
      value: models,
      updatedAt: new Date(),
    });
  });

  return newModel;
}
