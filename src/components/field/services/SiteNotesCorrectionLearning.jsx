/**
 * Site Notes Correction Learning
 * 
 * Tracks user corrections for future AI improvement
 */

/**
 * Create correction event
 */
export async function recordCorrection(correctionData, base44Client) {
  const {
    sessionId,
    entityType,
    draftId,
    originalValue,
    correctedValue,
    user,
    context,
    originalConfidence,
    feedback
  } = correctionData;
  
  try {
    // Determine correction type
    const correctionType = determineCorrectionType(originalValue, correctedValue);
    
    // Create correction event
    const correctionEvent = await base44Client.entities.CorrectionEvent.create({
      session_id: sessionId,
      entity_type: entityType,
      draft_id: draftId,
      original_value: originalValue,
      corrected_value: correctedValue,
      correction_type: correctionType,
      corrected_by: user.email,
      corrected_by_name: user.full_name,
      corrected_at: new Date().toISOString(),
      context,
      original_confidence: originalConfidence,
      improvement_feedback: feedback
    });
    
    // Update local correction stats
    await updateCorrectionStats(entityType, correctionType, originalConfidence);
    
    return correctionEvent;
    
  } catch (error) {
    console.error('Failed to record correction:', error);
    throw error;
  }
}

/**
 * Determine correction type
 */
function determineCorrectionType(originalValue, correctedValue) {
  // Rejected - entity was wrong
  if (!correctedValue || Object.keys(correctedValue).length === 0) {
    return 'rejected';
  }
  
  // Confirmed - no changes
  if (JSON.stringify(originalValue) === JSON.stringify(correctedValue)) {
    return 'confirmed';
  }
  
  // Check if entity type changed
  if (originalValue.entity_type !== correctedValue.entity_type) {
    return 'entity_changed';
  }
  
  // Field modified
  return 'field_modified';
}

/**
 * Update local correction statistics
 */
async function updateCorrectionStats(entityType, correctionType, originalConfidence) {
  const statsKey = 'site_notes_correction_stats';
  const stats = JSON.parse(localStorage.getItem(statsKey) || '{}');
  
  if (!stats[entityType]) {
    stats[entityType] = {
      total_corrections: 0,
      confirmed: 0,
      field_modified: 0,
      entity_changed: 0,
      rejected: 0,
      confidence_buckets: {
        high: { total: 0, correct: 0 },
        medium: { total: 0, correct: 0 },
        low: { total: 0, correct: 0 }
      }
    };
  }
  
  stats[entityType].total_corrections++;
  stats[entityType][correctionType]++;
  
  // Update confidence buckets
  const bucket = originalConfidence >= 0.90 ? 'high' : 
                 originalConfidence >= 0.75 ? 'medium' : 'low';
  
  stats[entityType].confidence_buckets[bucket].total++;
  
  if (correctionType === 'confirmed') {
    stats[entityType].confidence_buckets[bucket].correct++;
  }
  
  localStorage.setItem(statsKey, JSON.stringify(stats));
}

/**
 * Get correction statistics
 */
export function getCorrectionStats(entityType = null) {
  const statsKey = 'site_notes_correction_stats';
  const stats = JSON.parse(localStorage.getItem(statsKey) || '{}');
  
  if (entityType) {
    return stats[entityType] || null;
  }
  
  return stats;
}

/**
 * Calculate AI accuracy by entity type
 */
export function calculateAccuracy(entityType) {
  const stats = getCorrectionStats(entityType);
  
  if (!stats || stats.total_corrections === 0) {
    return null;
  }
  
  const accuracy = {
    entity_type: entityType,
    total_samples: stats.total_corrections,
    confirmed_rate: (stats.confirmed / stats.total_corrections) * 100,
    rejection_rate: (stats.rejected / stats.total_corrections) * 100,
    modification_rate: ((stats.field_modified + stats.entity_changed) / stats.total_corrections) * 100,
    by_confidence: {}
  };
  
  // Calculate accuracy by confidence bucket
  Object.keys(stats.confidence_buckets).forEach(bucket => {
    const bucketStats = stats.confidence_buckets[bucket];
    if (bucketStats.total > 0) {
      accuracy.by_confidence[bucket] = {
        samples: bucketStats.total,
        accuracy: (bucketStats.correct / bucketStats.total) * 100
      };
    }
  });
  
  return accuracy;
}

/**
 * Get learning dataset for AI fine-tuning
 */
export async function getLearningDataset(base44Client, options = {}) {
  try {
    const { entityType, minSamples = 10, startDate, endDate } = options;
    
    // Fetch correction events
    const query = {};
    if (entityType) query.entity_type = entityType;
    
    const corrections = await base44Client.entities.CorrectionEvent.list('-created_date');
    
    // Filter by date if specified
    let filtered = corrections;
    if (startDate || endDate) {
      filtered = corrections.filter(c => {
        const correctionDate = new Date(c.corrected_at);
        if (startDate && correctionDate < new Date(startDate)) return false;
        if (endDate && correctionDate > new Date(endDate)) return false;
        return true;
      });
    }
    
    // Group by entity type
    const grouped = {};
    filtered.forEach(correction => {
      const type = correction.entity_type;
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(correction);
    });
    
    // Format for AI training
    const dataset = Object.keys(grouped).map(type => ({
      entity_type: type,
      sample_count: grouped[type].length,
      samples: grouped[type].map(c => ({
        input: {
          source_text: c.context.source_text,
          source_text_original: c.context.source_text_original,
          detected_language: c.context.detected_language
        },
        ai_output: c.original_value,
        ground_truth: c.corrected_value,
        correction_type: c.correction_type,
        original_confidence: c.original_confidence,
        corrected_at: c.corrected_at,
        feedback: c.improvement_feedback
      }))
    }));
    
    return {
      total_samples: filtered.length,
      by_entity_type: dataset,
      generated_at: new Date().toISOString(),
      filters: options
    };
    
  } catch (error) {
    console.error('Failed to generate learning dataset:', error);
    throw error;
  }
}

/**
 * Analyze correction patterns
 */
export function analyzeCorrectionPatterns(corrections) {
  const patterns = {
    common_mistakes: [],
    language_specific: {},
    field_specific: {},
    time_of_day: {}
  };
  
  corrections.forEach(correction => {
    // Language-specific errors
    const lang = correction.context.detected_language;
    if (lang) {
      if (!patterns.language_specific[lang]) {
        patterns.language_specific[lang] = { total: 0, errors: [] };
      }
      patterns.language_specific[lang].total++;
      if (correction.correction_type !== 'confirmed') {
        patterns.language_specific[lang].errors.push({
          type: correction.entity_type,
          correction_type: correction.correction_type
        });
      }
    }
    
    // Field/area specific errors
    const area = correction.context.area;
    if (area) {
      if (!patterns.field_specific[area]) {
        patterns.field_specific[area] = { total: 0, errors: 0 };
      }
      patterns.field_specific[area].total++;
      if (correction.correction_type !== 'confirmed') {
        patterns.field_specific[area].errors++;
      }
    }
    
    // Time of day patterns (when do errors occur?)
    const hour = new Date(correction.corrected_at).getHours();
    const timeSlot = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
    
    if (!patterns.time_of_day[timeSlot]) {
      patterns.time_of_day[timeSlot] = { total: 0, errors: 0 };
    }
    patterns.time_of_day[timeSlot].total++;
    if (correction.correction_type !== 'confirmed') {
      patterns.time_of_day[timeSlot].errors++;
    }
  });
  
  return patterns;
}

/**
 * Get AI improvement suggestions
 */
export function getImprovementSuggestions(correctionStats) {
  const suggestions = [];
  
  Object.keys(correctionStats).forEach(entityType => {
    const stats = correctionStats[entityType];
    const accuracy = (stats.confirmed / stats.total_corrections) * 100;
    
    if (accuracy < 70) {
      suggestions.push({
        entity_type: entityType,
        priority: 'high',
        suggestion: `${entityType} accuracy is ${accuracy.toFixed(1)}% - requires model fine-tuning`,
        recommended_action: 'Collect more training samples'
      });
    } else if (accuracy < 85) {
      suggestions.push({
        entity_type: entityType,
        priority: 'medium',
        suggestion: `${entityType} accuracy is ${accuracy.toFixed(1)}% - moderate improvement needed`,
        recommended_action: 'Review common error patterns'
      });
    }
  });
  
  return suggestions;
}