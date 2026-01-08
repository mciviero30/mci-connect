/**
 * Site Notes Integration Service
 * 
 * Bridges AI-extracted data to actual Field entities
 */

/**
 * Save confirmed dimension to database
 */
export async function saveConfirmedDimension(draftData, user, base44Client) {
  try {
    // Remove draft-specific fields
    const cleanData = { ...draftData };
    delete cleanData.draft;
    delete cleanData.draft_id;
    delete cleanData.source;
    delete cleanData.reviewed;
    delete cleanData.created_at;
    
    // Ensure required metadata
    cleanData.measured_by = cleanData.measured_by || user.email;
    cleanData.measured_by_name = cleanData.measured_by_name || user.full_name;
    cleanData.measurement_date = cleanData.measurement_date || new Date().toISOString();
    cleanData.status = 'confirmed'; // Upgraded from draft
    
    // Create FieldDimension
    const dimension = await base44Client.entities.FieldDimension.create(cleanData);
    
    return {
      success: true,
      dimension_id: dimension.id,
      entity_type: 'FieldDimension'
    };
  } catch (error) {
    console.error('Failed to save dimension:', error);
    throw error;
  }
}

/**
 * Save confirmed benchmark to database
 */
export async function saveConfirmedBenchmark(draftData, user, base44Client) {
  try {
    const cleanData = { ...draftData };
    delete cleanData.draft;
    delete cleanData.draft_id;
    delete cleanData.source;
    delete cleanData.reviewed;
    delete cleanData.created_at;
    
    cleanData.established_by = cleanData.established_by || user.email;
    cleanData.established_by_name = cleanData.established_by_name || user.full_name;
    cleanData.established_date = cleanData.established_date || new Date().toISOString();
    
    const benchmark = await base44Client.entities.Benchmark.create(cleanData);
    
    return {
      success: true,
      benchmark_id: benchmark.id,
      entity_type: 'Benchmark'
    };
  } catch (error) {
    console.error('Failed to save benchmark:', error);
    throw error;
  }
}

/**
 * Save confirmed task to database
 */
export async function saveConfirmedTask(draftData, user, base44Client) {
  try {
    const cleanData = { ...draftData };
    delete cleanData.draft;
    delete cleanData.draft_id;
    delete cleanData.source;
    delete cleanData.reviewed;
    delete cleanData.created_at;
    
    const task = await base44Client.entities.Task.create(cleanData);
    
    return {
      success: true,
      task_id: task.id,
      entity_type: 'Task'
    };
  } catch (error) {
    console.error('Failed to save task:', error);
    throw error;
  }
}

/**
 * Save confirmed incident to database
 */
export async function saveConfirmedIncident(draftData, user, base44Client) {
  try {
    const cleanData = { ...draftData };
    delete cleanData.draft;
    delete cleanData.draft_id;
    delete cleanData.source;
    delete cleanData.reviewed;
    delete cleanData.created_at;
    
    cleanData.reported_by = cleanData.reported_by || user.email;
    cleanData.reported_by_name = cleanData.reported_by_name || user.full_name;
    cleanData.reported_date = cleanData.reported_date || new Date().toISOString();
    
    const incident = await base44Client.entities.SafetyIncident.create(cleanData);
    
    return {
      success: true,
      incident_id: incident.id,
      entity_type: 'SafetyIncident'
    };
  } catch (error) {
    console.error('Failed to save incident:', error);
    throw error;
  }
}

/**
 * Save confirmed entity based on type
 */
export async function saveConfirmedEntity(draft, user, base44Client) {
  const entityType = draft.entity_type;
  const entityData = draft.entity_data;
  
  switch (entityType) {
    case 'dimension':
      return await saveConfirmedDimension(entityData, user, base44Client);
    
    case 'benchmark':
      return await saveConfirmedBenchmark(entityData, user, base44Client);
    
    case 'task':
      return await saveConfirmedTask(entityData, user, base44Client);
    
    case 'incident':
      return await saveConfirmedIncident(entityData, user, base44Client);
    
    case 'general_note':
      // For general notes, could save to a Notes entity or FieldNote
      return {
        success: true,
        entity_type: 'GeneralNote',
        message: 'Note saved'
      };
    
    default:
      throw new Error(`Unknown entity type: ${entityType}`);
  }
}

/**
 * Link extracted entities to media
 */
export async function linkEntitiesToMedia(entityId, entityType, mediaUrls, base44Client) {
  try {
    // Update entity with media references
    const updateData = {
      photo_urls: mediaUrls
    };
    
    if (entityType === 'FieldDimension') {
      await base44Client.entities.FieldDimension.update(entityId, updateData);
    } else if (entityType === 'Task') {
      await base44Client.entities.Task.update(entityId, updateData);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Failed to link media:', error);
    throw error;
  }
}

/**
 * Link extracted entities to drawings/plans
 */
export async function linkEntitiesToDrawing(entityId, entityType, planId, coordinates, base44Client) {
  try {
    const updateData = {
      plan_id: planId,
      plan_coordinates: coordinates
    };
    
    if (entityType === 'FieldDimension') {
      await base44Client.entities.FieldDimension.update(entityId, updateData);
    } else if (entityType === 'Task') {
      // Tasks use different fields
      await base44Client.entities.Task.update(entityId, {
        blueprint_id: planId,
        pin_x: coordinates?.x,
        pin_y: coordinates?.y
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Failed to link to drawing:', error);
    throw error;
  }
}

/**
 * Batch save confirmed entities
 */
export async function batchSaveConfirmedEntities(drafts, user, base44Client) {
  const results = {
    success: [],
    failed: []
  };
  
  for (const draft of drafts) {
    try {
      const result = await saveConfirmedEntity(draft, user, base44Client);
      results.success.push({
        draft_id: draft.draft_id,
        entity_type: draft.entity_type,
        entity_id: result.dimension_id || result.benchmark_id || result.task_id || result.incident_id
      });
    } catch (error) {
      results.failed.push({
        draft_id: draft.draft_id,
        error: error.message
      });
    }
  }
  
  return results;
}