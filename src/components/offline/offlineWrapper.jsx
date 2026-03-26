/**
 * Prompt #85: Offline Wrapper for base44 SDK
 * Intercepts SDK calls and queues them when offline
 */

import { queueMutation, MUTATION_TYPES, OFFLINE_ENTITIES } from './mutationQueue';

/**
 * Wrap base44 entity operations with offline support
 */
export const wrapEntityWithOffline = (entityName, baseEntity) => {
  const isOfflineEnabled = Object.values(OFFLINE_ENTITIES).includes(entityName);

  if (!isOfflineEnabled) {
    return baseEntity; // Return original if offline not supported
  }

  return {
    ...baseEntity,

    /**
     * Create with offline support
     */
    create: async (data) => {
      const isOnline = navigator.onLine;

      if (isOnline) {
        try {
          return await baseEntity.create(data);
        } catch (error) {
          // If online call fails, queue it
          const tempId = `temp_${Date.now()}_${Math.random()}`;
          await queueMutation(entityName, MUTATION_TYPES.CREATE, data, tempId);
          
          return {
            ...data,
            id: tempId,
            _isOffline: true,
            _tempId: tempId
          };
        }
      } else {
        // Offline - queue immediately
        const tempId = `temp_${Date.now()}_${Math.random()}`;
        await queueMutation(entityName, MUTATION_TYPES.CREATE, data, tempId);
        
        
        return {
          ...data,
          id: tempId,
          _isOffline: true,
          _tempId: tempId
        };
      }
    },

    /**
     * Update with offline support
     */
    update: async (id, data) => {
      const isOnline = navigator.onLine;

      if (isOnline) {
        try {
          return await baseEntity.update(id, data);
        } catch (error) {
          await queueMutation(entityName, MUTATION_TYPES.UPDATE, { ...data, id });
          return { ...data, id, _isOffline: true };
        }
      } else {
        // Offline - queue immediately
        await queueMutation(entityName, MUTATION_TYPES.UPDATE, { ...data, id });
        return { ...data, id, _isOffline: true };
      }
    },

    /**
     * Delete with offline support
     */
    delete: async (id) => {
      const isOnline = navigator.onLine;

      if (isOnline) {
        try {
          return await baseEntity.delete(id);
        } catch (error) {
          await queueMutation(entityName, MUTATION_TYPES.DELETE, { id });
          return { success: true, _isOffline: true };
        }
      } else {
        // Offline - queue immediately
        await queueMutation(entityName, MUTATION_TYPES.DELETE, { id });
        return { success: true, _isOffline: true };
      }
    }
  };
};

/**
 * Wrap entire base44 SDK with offline support
 */
export const wrapBase44WithOffline = (base44SDK) => {
  return {
    ...base44SDK,
    entities: {
      ...base44SDK.entities,
      // Wrap critical entities
      TimeEntry: wrapEntityWithOffline(OFFLINE_ENTITIES.TIME_ENTRY, base44SDK.entities.TimeEntry),
      Expense: wrapEntityWithOffline(OFFLINE_ENTITIES.EXPENSE, base44SDK.entities.Expense),
      Job: wrapEntityWithOffline(OFFLINE_ENTITIES.JOB, base44SDK.entities.Job),
      DrivingLog: wrapEntityWithOffline(OFFLINE_ENTITIES.DRIVING_LOG, base44SDK.entities.DrivingLog)
    }
  };
};