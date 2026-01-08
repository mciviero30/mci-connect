/**
 * Site Notes Confidence Scoring
 * 
 * Evaluates AI-detected items and determines review requirements
 */

/**
 * Confidence thresholds
 */
export const CONFIDENCE_THRESHOLDS = {
  AUTO_SUGGEST: 0.90,
  REQUIRES_CONFIRMATION: 0.75,
  DRAFT_ONLY: 0.60,
  UNCERTAIN: 0.60
};

/**
 * Calculate confidence score for entity
 */
export function calculateConfidenceScore(entity, intent, validationResults = {}) {
  let baseConfidence = intent.confidence / 100; // Convert from 0-100 to 0-1
  
  // Adjust based on entity type
  const typeFactors = {
    'task': 0.95,        // Tasks usually clear from speech
    'general_note': 0.98, // General notes high confidence
    'incident': 0.85,     // Incidents may be unclear
    'dimension': 0.70,    // Measurements need careful extraction
    'benchmark': 0.75     // Benchmarks moderately complex
  };
  
  baseConfidence *= (typeFactors[entity.entity_type] || 0.80);
  
  // Adjust based on entity completeness
  const completeness = calculateCompleteness(entity.entity_data, entity.entity_type);
  baseConfidence *= completeness;
  
  // Adjust based on validation results
  if (validationResults.has_critical_errors) {
    baseConfidence *= 0.5;
  } else if (validationResults.has_warnings) {
    baseConfidence *= 0.85;
  }
  
  // Adjust based on language confidence
  if (entity.detected_language && entity.detected_language !== 'en') {
    baseConfidence *= 0.90; // Slight penalty for translation
  }
  
  // Cap at 0-1 range
  return Math.max(0, Math.min(1, baseConfidence));
}

/**
 * Calculate entity completeness
 */
function calculateCompleteness(entityData, entityType) {
  switch (entityType) {
    case 'task':
      return calculateTaskCompleteness(entityData);
    case 'dimension':
      return calculateDimensionCompleteness(entityData);
    case 'incident':
      return calculateIncidentCompleteness(entityData);
    case 'benchmark':
      return calculateBenchmarkCompleteness(entityData);
    default:
      return 1.0;
  }
}

/**
 * Task completeness
 */
function calculateTaskCompleteness(task) {
  let score = 0;
  
  if (task.title) score += 0.5;
  if (task.description) score += 0.3;
  if (task.priority) score += 0.1;
  if (task.category) score += 0.1;
  
  return score;
}

/**
 * Dimension completeness
 */
function calculateDimensionCompleteness(dimension) {
  let score = 0;
  
  if (dimension.value_feet !== undefined) score += 0.25;
  if (dimension.value_inches !== undefined) score += 0.25;
  if (dimension.measurement_type) score += 0.3;
  if (dimension.dimension_type) score += 0.1;
  if (dimension.location_description) score += 0.1;
  
  return score;
}

/**
 * Incident completeness
 */
function calculateIncidentCompleteness(incident) {
  let score = 0;
  
  if (incident.incident_type) score += 0.3;
  if (incident.severity) score += 0.3;
  if (incident.description) score += 0.4;
  
  return score;
}

/**
 * Benchmark completeness
 */
function calculateBenchmarkCompleteness(benchmark) {
  let score = 0;
  
  if (benchmark.label) score += 0.3;
  if (benchmark.type) score += 0.3;
  if (benchmark.description) score += 0.4;
  
  return score;
}

/**
 * Determine if entity requires review
 */
export function requiresReview(confidenceScore, entityType) {
  // Critical entities always require review below AUTO_SUGGEST
  const criticalEntities = ['dimension', 'incident', 'benchmark'];
  
  if (criticalEntities.includes(entityType)) {
    return confidenceScore < CONFIDENCE_THRESHOLDS.AUTO_SUGGEST;
  }
  
  // Other entities require review below REQUIRES_CONFIRMATION
  return confidenceScore < CONFIDENCE_THRESHOLDS.REQUIRES_CONFIRMATION;
}

/**
 * Get confidence level
 */
export function getConfidenceLevel(confidenceScore) {
  if (confidenceScore >= CONFIDENCE_THRESHOLDS.AUTO_SUGGEST) {
    return 'high';
  }
  
  if (confidenceScore >= CONFIDENCE_THRESHOLDS.REQUIRES_CONFIRMATION) {
    return 'medium';
  }
  
  if (confidenceScore >= CONFIDENCE_THRESHOLDS.UNCERTAIN) {
    return 'low';
  }
  
  return 'very_low';
}

/**
 * Get action recommendation
 */
export function getActionRecommendation(confidenceScore, entityType) {
  const level = getConfidenceLevel(confidenceScore);
  
  const recommendations = {
    'high': {
      action: 'auto_suggest',
      message: 'High confidence - ready for quick review'
    },
    'medium': {
      action: 'requires_confirmation',
      message: 'Medium confidence - user confirmation required'
    },
    'low': {
      action: 'draft_only',
      message: 'Low confidence - review all fields before use'
    },
    'very_low': {
      action: 'uncertain',
      message: 'Very low confidence - manual entry recommended'
    }
  };
  
  return recommendations[level];
}

/**
 * Enrich entity with confidence metadata
 */
export function enrichWithConfidence(entity, intent, validationResults) {
  const confidenceScore = calculateConfidenceScore(entity, intent, validationResults);
  const level = getConfidenceLevel(confidenceScore);
  const recommendation = getActionRecommendation(confidenceScore, entity.entity_type);
  
  return {
    ...entity,
    confidence_score: confidenceScore,
    confidence_level: level,
    requires_review: requiresReview(confidenceScore, entity.entity_type),
    source: 'ai',
    action_recommendation: recommendation.action,
    review_message: recommendation.message
  };
}