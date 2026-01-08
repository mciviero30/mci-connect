/**
 * Site Notes Confirmation Workflow
 * 
 * Manages user confirmation before saving extracted data
 */

import { validateExtractedEntity, checkDuplicates } from './SiteNotesValidation';
import { saveConfirmedEntity } from './SiteNotesIntegration';
import { autoLinkToContext } from './SiteNotesLinkingService';

/**
 * Confirmation states
 */
export const CONFIRMATION_STATES = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  REJECTED: 'rejected',
  EDITED: 'edited'
};

/**
 * Prepare draft for user review
 */
export async function prepareDraftForReview(draft, sessionMetadata, base44Client) {
  try {
    // Validate
    const validation = validateExtractedEntity(draft);
    
    // Check duplicates
    const duplicateCheck = await checkDuplicates(draft, base44Client);
    
    // Build review data
    const review = {
      draft_id: draft.draft_id,
      entity_type: draft.entity_type,
      entity_data: draft.entity_data,
      confidence_score: draft.confidence_score,
      confidence_level: draft.confidence_level,
      requires_review: draft.requires_review,
      validation,
      duplicate_check: duplicateCheck,
      source_text: draft.source_text,
      source_text_original: draft.source_text_original,
      detected_language: draft.detected_language,
      can_auto_confirm: !draft.requires_review && validation.valid && !duplicateCheck.has_duplicates,
      review_priority: calculateReviewPriority(draft, validation, duplicateCheck)
    };
    
    return review;
  } catch (error) {
    console.error('Failed to prepare draft for review:', error);
    throw error;
  }
}

/**
 * Calculate review priority
 */
function calculateReviewPriority(draft, validation, duplicateCheck) {
  let priority = 0;
  
  // High priority: errors or duplicates
  if (validation.errors.length > 0) priority += 10;
  if (duplicateCheck.has_duplicates) priority += 8;
  
  // Medium priority: low confidence
  if (draft.confidence_score < 0.75) priority += 5;
  
  // Medium priority: requires manual review
  if (draft.requires_review) priority += 4;
  
  // Low priority: warnings only
  if (validation.warnings.length > 0) priority += 2;
  
  if (priority >= 10) return 'critical';
  if (priority >= 5) return 'high';
  if (priority >= 2) return 'medium';
  return 'low';
}

/**
 * Confirm and save draft
 */
export async function confirmDraft(draftId, editedData, user, base44Client) {
  try {
    // Get draft from localStorage
    const draftsKey = 'site_note_drafts';
    const drafts = JSON.parse(localStorage.getItem(draftsKey) || '[]');
    const draft = drafts.find(d => d.draft_id === draftId);
    
    if (!draft) {
      throw new Error('Draft not found');
    }
    
    // Use edited data if provided, otherwise use original
    const dataToSave = editedData || draft;
    
    // Save to database
    const result = await saveConfirmedEntity(dataToSave, user, base44Client);
    
    // Auto-link to context
    const links = await autoLinkToContext(
      result.dimension_id || result.benchmark_id || result.task_id || result.incident_id,
      result.entity_type,
      {
        area: dataToSave.entity_data.area,
        latitude: dataToSave.entity_data.latitude,
        longitude: dataToSave.entity_data.longitude
      },
      base44Client
    );
    
    // Mark as reviewed in localStorage
    draft.reviewed = true;
    draft.confirmed_at = new Date().toISOString();
    draft.confirmed_by = user.email;
    localStorage.setItem(draftsKey, JSON.stringify(drafts));
    
    return {
      success: true,
      ...result,
      links
    };
  } catch (error) {
    console.error('Failed to confirm draft:', error);
    throw error;
  }
}

/**
 * Reject draft
 */
export function rejectDraft(draftId, reason) {
  try {
    const draftsKey = 'site_note_drafts';
    const drafts = JSON.parse(localStorage.getItem(draftsKey) || '[]');
    const draft = drafts.find(d => d.draft_id === draftId);
    
    if (!draft) {
      throw new Error('Draft not found');
    }
    
    draft.reviewed = true;
    draft.rejected = true;
    draft.rejection_reason = reason;
    draft.rejected_at = new Date().toISOString();
    
    localStorage.setItem(draftsKey, JSON.stringify(drafts));
    
    return { success: true };
  } catch (error) {
    console.error('Failed to reject draft:', error);
    throw error;
  }
}

/**
 * Edit draft before confirmation
 */
export function editDraft(draftId, editedEntityData) {
  try {
    const draftsKey = 'site_note_drafts';
    const drafts = JSON.parse(localStorage.getItem(draftsKey) || '[]');
    const draftIndex = drafts.findIndex(d => d.draft_id === draftId);
    
    if (draftIndex === -1) {
      throw new Error('Draft not found');
    }
    
    drafts[draftIndex].entity_data = editedEntityData;
    drafts[draftIndex].edited = true;
    drafts[draftIndex].edited_at = new Date().toISOString();
    
    localStorage.setItem(draftsKey, JSON.stringify(drafts));
    
    return {
      success: true,
      draft: drafts[draftIndex]
    };
  } catch (error) {
    console.error('Failed to edit draft:', error);
    throw error;
  }
}

/**
 * Batch confirm drafts
 */
export async function batchConfirmDrafts(draftIds, user, base44Client) {
  const results = {
    success: [],
    failed: []
  };
  
  for (const draftId of draftIds) {
    try {
      const result = await confirmDraft(draftId, null, user, base44Client);
      results.success.push(result);
    } catch (error) {
      results.failed.push({
        draft_id: draftId,
        error: error.message
      });
    }
  }
  
  return results;
}

/**
 * Get confirmation summary
 */
export function getConfirmationSummary(drafts) {
  const summary = {
    total: drafts.length,
    by_type: {},
    by_priority: {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    },
    requires_review: 0,
    has_duplicates: 0,
    has_errors: 0
  };
  
  drafts.forEach(draft => {
    // Count by type
    const type = draft.entity_type || 'unknown';
    summary.by_type[type] = (summary.by_type[type] || 0) + 1;
    
    // Count by priority
    const priority = draft.review_priority || 'low';
    if (summary.by_priority[priority] !== undefined) {
      summary.by_priority[priority]++;
    }
    
    // Count flags
    if (draft.requires_review) summary.requires_review++;
    if (draft.duplicate_check?.has_duplicates) summary.has_duplicates++;
    if (draft.validation?.errors?.length > 0) summary.has_errors++;
  });
  
  return summary;
}