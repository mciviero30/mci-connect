/**
 * Site Notes Entity Extractor
 * 
 * Extracts structured entities from classified intents (DRAFT only)
 */

/**
 * Extract entities from intents
 */
export async function extractEntities(intents, sessionMetadata, base44Client) {
  const entities = [];
  
  // Import confidence scoring
  const { enrichWithConfidence } = await import('./SiteNotesConfidenceScoring.js');
  
  for (const intent of intents) {
    try {
      const extracted = await extractEntityForIntent(intent, sessionMetadata, base44Client);
      if (extracted) {
        const entity = {
          entity_type: intent.intent,
          entity_data: extracted,
          confidence: intent.confidence,
          source_text: intent.text_english,
          source_text_original: intent.text_original,
          timestamp: sessionMetadata.session_start,
          detected_language: sessionMetadata.detected_language
        };
        
        // Enrich with confidence scoring
        const enriched = enrichWithConfidence(entity, intent);
        entities.push(enriched);
      }
    } catch (error) {
      console.error(`Failed to extract entity for ${intent.intent}:`, error);
    }
  }
  
  return entities;
}

/**
 * Extract entity for specific intent
 */
async function extractEntityForIntent(intent, sessionMetadata, base44Client) {
  switch (intent.intent) {
    case 'task':
      return await extractTask(intent, sessionMetadata, base44Client);
    case 'incident':
      return await extractIncident(intent, sessionMetadata, base44Client);
    case 'dimension':
      return await extractDimension(intent, sessionMetadata, base44Client);
    case 'benchmark':
      return await extractBenchmark(intent, sessionMetadata, base44Client);
    case 'general_note':
      return extractGeneralNote(intent, sessionMetadata);
    default:
      return null;
  }
}

/**
 * Extract Task entity
 */
async function extractTask(intent, sessionMetadata, base44Client) {
  const result = await base44Client.integrations.Core.InvokeLLM({
    prompt: `Extract task details from: "${intent.text_english}"

Provide:
- title (brief, action-oriented)
- description (details)
- priority (low/medium/high/urgent)
- category (installation/change_order/rfi)

Format as JSON.`,
    response_json_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
        category: { type: "string", enum: ["installation", "change_order", "rfi"] }
      }
    }
  });
  
  return {
    ...result,
    job_id: sessionMetadata.job_id,
    area: sessionMetadata.area,
    status: 'pending',
    task_type: 'task',
    created_from: 'voice_note',
    draft: true
  };
}

/**
 * Extract Incident entity
 */
async function extractIncident(intent, sessionMetadata, base44Client) {
  const result = await base44Client.integrations.Core.InvokeLLM({
    prompt: `Extract incident details from: "${intent.text_english}"

Provide:
- incident_type (safety/quality/damage/other)
- severity (minor/moderate/severe/critical)
- description
- immediate_action_taken

Format as JSON.`,
    response_json_schema: {
      type: "object",
      properties: {
        incident_type: { type: "string" },
        severity: { type: "string", enum: ["minor", "moderate", "severe", "critical"] },
        description: { type: "string" },
        immediate_action_taken: { type: "string" }
      }
    }
  });
  
  return {
    ...result,
    job_id: sessionMetadata.job_id,
    area: sessionMetadata.area,
    status: 'reported',
    created_from: 'voice_note',
    draft: true
  };
}

/**
 * Extract Dimension entity
 */
async function extractDimension(intent, sessionMetadata, base44Client) {
  const result = await base44Client.integrations.Core.InvokeLLM({
    prompt: `Extract dimension measurement from: "${intent.text_english}"

Provide:
- value_feet (integer)
- value_inches (integer)
- value_fraction (string like "1/8", "1/4", "0")
- measurement_type (FF-FF/FF-CL/CL-FF/CL-CL/BM-C/BM-F/F-C)
- dimension_type (horizontal/vertical/diagonal)
- location_description

Format as JSON.`,
    response_json_schema: {
      type: "object",
      properties: {
        value_feet: { type: "number" },
        value_inches: { type: "number" },
        value_fraction: { type: "string" },
        measurement_type: { type: "string" },
        dimension_type: { type: "string" },
        location_description: { type: "string" }
      }
    }
  });
  
  return {
    ...result,
    job_id: sessionMetadata.job_id,
    area: sessionMetadata.area || result.location_description,
    unit_system: 'imperial',
    device_type: 'manual',
    status: 'draft',
    measured_by: sessionMetadata.recorded_by,
    measured_by_name: sessionMetadata.recorded_by_name,
    measurement_date: sessionMetadata.session_start,
    created_from: 'voice_note',
    draft: true
  };
}

/**
 * Extract Benchmark entity
 */
async function extractBenchmark(intent, sessionMetadata, base44Client) {
  const result = await base44Client.integrations.Core.InvokeLLM({
    prompt: `Extract benchmark reference from: "${intent.text_english}"

Provide:
- label (e.g., "BM-1", "Laser Line A")
- type (laser/floor_mark/physical_mark/transit)
- elevation (number)
- elevation_unit (in/ft/mm/m)
- description (location details)

Format as JSON.`,
    response_json_schema: {
      type: "object",
      properties: {
        label: { type: "string" },
        type: { type: "string" },
        elevation: { type: "number" },
        elevation_unit: { type: "string" },
        description: { type: "string" }
      }
    }
  });
  
  return {
    ...result,
    job_id: sessionMetadata.job_id,
    area: sessionMetadata.area,
    established_by: sessionMetadata.recorded_by,
    established_by_name: sessionMetadata.recorded_by_name,
    established_date: sessionMetadata.session_start,
    is_active: true,
    created_from: 'voice_note',
    draft: true
  };
}

/**
 * Extract General Note
 */
function extractGeneralNote(intent, sessionMetadata) {
  return {
    note: intent.text_english,
    note_original: intent.text_original,
    job_id: sessionMetadata.job_id,
    area: sessionMetadata.area,
    recorded_by: sessionMetadata.recorded_by,
    recorded_by_name: sessionMetadata.recorded_by_name,
    timestamp: sessionMetadata.session_start,
    created_from: 'voice_note',
    draft: true
  };
}

/**
 * Create draft entities (DO NOT publish)
 */
export async function createDraftEntities(entities, base44Client) {
  const drafts = [];
  
  for (const entity of entities) {
    try {
      // Store as draft - DO NOT create actual entity yet
      const draftId = `draft_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      // Store in localStorage for later review
      const draftsKey = `site_note_drafts`;
      const existingDrafts = JSON.parse(localStorage.getItem(draftsKey) || '[]');
      
      existingDrafts.push({
        draft_id: draftId,
        entity_type: entity.entity_type,
        entity_data: entity.entity_data,
        confidence: entity.confidence,
        confidence_score: entity.confidence_score,
        confidence_level: entity.confidence_level,
        requires_review: entity.requires_review,
        source: entity.source || 'ai',
        action_recommendation: entity.action_recommendation,
        review_message: entity.review_message,
        source_text: entity.source_text,
        source_text_original: entity.source_text_original,
        timestamp: entity.timestamp,
        created_at: new Date().toISOString(),
        reviewed: false
      });
      
      localStorage.setItem(draftsKey, JSON.stringify(existingDrafts));
      
      drafts.push({
        draft_id: draftId,
        entity_type: entity.entity_type,
        confidence_score: entity.confidence_score,
        requires_review: entity.requires_review,
        status: 'draft_pending_review'
      });
      
    } catch (error) {
      console.error('Failed to create draft:', error);
    }
  }
  
  return drafts;
}

/**
 * Get all pending drafts
 */
export function getPendingDrafts() {
  const draftsKey = `site_note_drafts`;
  return JSON.parse(localStorage.getItem(draftsKey) || '[]');
}

/**
 * Clear reviewed drafts
 */
export function clearReviewedDrafts() {
  const draftsKey = `site_note_drafts`;
  const drafts = JSON.parse(localStorage.getItem(draftsKey) || '[]');
  const pending = drafts.filter(d => !d.reviewed);
  localStorage.setItem(draftsKey, JSON.stringify(pending));
}