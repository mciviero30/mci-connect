/**
 * Site Notes Review Workflow
 * 
 * Handles draft review, correction, and publishing
 */

import { recordCorrection } from './SiteNotesCorrectionLearning';

/**
 * Review and publish draft entity
 */
export async function reviewAndPublish(draft, correctedData, user, base44Client) {
  try {
    const { 
      draftId, 
      entityType, 
      entityData, 
      confidenceScore, 
      sessionId, 
      context 
    } = draft;
    
    // Record correction if values changed
    const hasChanges = JSON.stringify(entityData) !== JSON.stringify(correctedData);
    
    if (hasChanges || correctedData === null) {
      await recordCorrection({
        sessionId,
        entityType,
        draftId,
        originalValue: entityData,
        correctedValue: correctedData,
        user,
        context,
        originalConfidence: confidenceScore,
        feedback: correctedData?.user_feedback
      }, base44Client);
    }
    
    // If rejected, mark as reviewed and skip publishing
    if (correctedData === null) {
      markDraftReviewed(draftId);
      return {
        published: false,
        rejected: true
      };
    }
    
    // Publish entity
    const publishedEntity = await publishEntity(entityType, correctedData, base44Client);
    
    // Mark draft as reviewed
    markDraftReviewed(draftId);
    
    return {
      published: true,
      entity_id: publishedEntity.id,
      entity_type: entityType
    };
    
  } catch (error) {
    console.error('Failed to review and publish:', error);
    throw error;
  }
}

/**
 * Publish entity to database
 */
async function publishEntity(entityType, entityData, base44Client) {
  // Remove draft flag and metadata
  const cleanData = {
    ...entityData,
    draft: false,
    source: 'voice_note',
    published_at: new Date().toISOString()
  };
  
  // Delete temporary fields
  delete cleanData.user_feedback;
  delete cleanData.confidence_score;
  delete cleanData.requires_review;
  
  switch (entityType) {
    case 'task':
      return await base44Client.entities.Task.create(cleanData);
    case 'incident':
      return await base44Client.entities.SafetyIncident.create(cleanData);
    case 'dimension':
      return await base44Client.entities.FieldDimension.create(cleanData);
    case 'benchmark':
      return await base44Client.entities.Benchmark.create(cleanData);
    case 'general_note':
      return await base44Client.entities.FieldNote.create(cleanData);
    default:
      throw new Error(`Unknown entity type: ${entityType}`);
  }
}

/**
 * Mark draft as reviewed
 */
function markDraftReviewed(draftId) {
  const draftsKey = `site_note_drafts`;
  const drafts = JSON.parse(localStorage.getItem(draftsKey) || '[]');
  
  const updated = drafts.map(d => 
    d.draft_id === draftId ? { ...d, reviewed: true, reviewed_at: new Date().toISOString() } : d
  );
  
  localStorage.setItem(draftsKey, JSON.stringify(updated));
}

/**
 * Batch publish high-confidence drafts
 */
export async function batchPublishHighConfidence(minConfidence = 0.90, base44Client, user) {
  const draftsKey = `site_note_drafts`;
  const drafts = JSON.parse(localStorage.getItem(draftsKey) || '[]');
  
  const highConfidence = drafts.filter(d => 
    !d.reviewed && 
    d.confidence_score >= minConfidence
  );
  
  const results = {
    total: highConfidence.length,
    published: 0,
    failed: 0,
    errors: []
  };
  
  for (const draft of highConfidence) {
    try {
      await reviewAndPublish({
        draftId: draft.draft_id,
        entityType: draft.entity_type,
        entityData: draft.entity_data,
        confidenceScore: draft.confidence_score,
        sessionId: draft.session_id,
        context: {
          source_text: draft.source_text,
          source_text_original: draft.source_text_original
        }
      }, draft.entity_data, user, base44Client);
      
      results.published++;
    } catch (error) {
      results.failed++;
      results.errors.push({
        draft_id: draft.draft_id,
        error: error.message
      });
    }
  }
  
  return results;
}

/**
 * Get drafts requiring review
 */
export function getDraftsRequiringReview(minConfidence = 0.0) {
  const draftsKey = `site_note_drafts`;
  const drafts = JSON.parse(localStorage.getItem(draftsKey) || '[]');
  
  return drafts
    .filter(d => !d.reviewed && d.confidence_score >= minConfidence)
    .sort((a, b) => b.confidence_score - a.confidence_score);
}