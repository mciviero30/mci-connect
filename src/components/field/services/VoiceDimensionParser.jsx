/**
 * Voice Dimension Parser
 * 
 * Parses spoken measurements into structured FieldDimension objects
 */

import { enrichWithConfidence } from './SiteNotesConfidenceScoring';

/**
 * Measurement type patterns
 */
const MEASUREMENT_TYPES = {
  'FF-FF': ['finish to finish', 'face to face', 'acabado a acabado', 'cara a cara'],
  'FF-CL': ['finish to center', 'face to centerline', 'acabado a centro', 'cara a línea central'],
  'CL-FF': ['center to finish', 'centerline to face', 'centro a acabado', 'línea central a cara'],
  'CL-CL': ['center to center', 'centerline to centerline', 'centro a centro', 'línea central a línea central'],
  'BM-C': ['benchmark to ceiling', 'laser to ceiling', 'referencia a techo', 'láser a techo'],
  'BM-F': ['benchmark to floor', 'laser to floor', 'referencia a piso', 'láser a piso'],
  'F-C': ['floor to ceiling', 'piso a techo'],
  'BM': ['benchmark only', 'laser line', 'reference point', 'solo referencia', 'línea láser', 'punto de referencia']
};

/**
 * Parse dimension from voice transcript
 */
export async function parseDimension(transcriptEnglish, transcriptOriginal, detectedLanguage, base44Client) {
  try {
    // Use LLM to extract structured dimension data
    const result = await base44Client.integrations.Core.InvokeLLM({
      prompt: `Extract measurement details from this construction dimension voice note.

Transcript (English): ${transcriptEnglish}
Original: ${transcriptOriginal}

Parse:
1. Measurement value (feet, inches, fraction)
2. Measurement type (FF-FF, FF-CL, CL-FF, CL-CL, BM-C, BM-F, F-C, BM)
3. Dimension type (horizontal, vertical, diagonal)
4. Location/area description
5. Unit system (imperial or metric)

Return structured JSON.`,
      response_json_schema: {
        type: "object",
        properties: {
          value_feet: { type: "number" },
          value_inches: { type: "number" },
          value_fraction: { 
            type: "string",
            enum: ["0", "1/16", "1/8", "3/16", "1/4", "5/16", "3/8", "7/16", "1/2", "9/16", "5/8", "11/16", "3/4", "13/16", "7/8", "15/16"]
          },
          value_mm: { type: "number" },
          measurement_type: {
            type: "string",
            enum: ["FF-FF", "FF-CL", "CL-FF", "CL-CL", "BM-C", "BM-F", "F-C", "BM"]
          },
          dimension_type: {
            type: "string",
            enum: ["horizontal", "vertical", "diagonal"]
          },
          area: { type: "string" },
          unit_system: {
            type: "string",
            enum: ["imperial", "metric"]
          },
          confidence_factors: {
            type: "object",
            properties: {
              value_clarity: { type: "number" },
              type_clarity: { type: "number" },
              completeness: { type: "number" }
            }
          }
        }
      }
    });
    
    // Validate and normalize
    const normalized = normalizeDimension(result);
    
    // Calculate confidence
    const confidence = calculateDimensionConfidence(normalized, result.confidence_factors);
    
    return {
      ...normalized,
      detected_language: detectedLanguage,
      source_text: transcriptEnglish,
      source_text_original: transcriptOriginal,
      confidence_score: confidence.score,
      confidence_level: confidence.level,
      requires_review: confidence.requiresReview,
      validation_warnings: confidence.warnings
    };
    
  } catch (error) {
    console.error('Failed to parse dimension:', error);
    throw error;
  }
}

/**
 * Normalize dimension values
 */
function normalizeDimension(rawData) {
  const normalized = { ...rawData };
  
  // Default to imperial if not specified
  if (!normalized.unit_system) {
    normalized.unit_system = 'imperial';
  }
  
  // Convert metric to imperial if needed
  if (normalized.unit_system === 'metric' && normalized.value_mm) {
    const totalInches = normalized.value_mm / 25.4;
    normalized.value_feet = Math.floor(totalInches / 12);
    normalized.value_inches = Math.floor(totalInches % 12);
    normalized.value_fraction = convertDecimalToFraction(totalInches % 1);
  }
  
  // Convert imperial to metric if only imperial provided
  if (normalized.unit_system === 'imperial' && !normalized.value_mm) {
    const totalInches = (normalized.value_feet || 0) * 12 + (normalized.value_inches || 0);
    const fractionInches = fractionToDecimal(normalized.value_fraction || '0');
    normalized.value_mm = Math.round((totalInches + fractionInches) * 25.4);
  }
  
  // Default dimension type
  if (!normalized.dimension_type) {
    normalized.dimension_type = inferDimensionType(normalized.measurement_type);
  }
  
  // Default fraction
  if (!normalized.value_fraction) {
    normalized.value_fraction = '0';
  }
  
  return normalized;
}

/**
 * Infer dimension type from measurement type
 */
function inferDimensionType(measurementType) {
  if (['BM-C', 'F-C', 'BM-F'].includes(measurementType)) {
    return 'vertical';
  }
  return 'horizontal';
}

/**
 * Convert fraction string to decimal
 */
function fractionToDecimal(fraction) {
  if (!fraction || fraction === '0') return 0;
  
  const parts = fraction.split('/');
  if (parts.length !== 2) return 0;
  
  return parseInt(parts[0]) / parseInt(parts[1]);
}

/**
 * Convert decimal to nearest fraction
 */
function convertDecimalToFraction(decimal) {
  const sixteenths = Math.round(decimal * 16);
  
  if (sixteenths === 0) return '0';
  if (sixteenths === 16) return '0'; // Full inch
  
  // Simplify fraction
  const fractions = {
    1: '1/16', 2: '1/8', 3: '3/16', 4: '1/4',
    5: '5/16', 6: '3/8', 7: '7/16', 8: '1/2',
    9: '9/16', 10: '5/8', 11: '11/16', 12: '3/4',
    13: '13/16', 14: '7/8', 15: '15/16'
  };
  
  return fractions[sixteenths] || '0';
}

/**
 * Calculate dimension-specific confidence
 */
function calculateDimensionConfidence(dimension, confidenceFactors = {}) {
  let score = 0.7; // Base confidence for dimensions
  
  // Factor 1: Value clarity (40%)
  if (confidenceFactors.value_clarity) {
    score += confidenceFactors.value_clarity * 0.4;
  } else {
    // Estimate based on value presence
    const hasValue = dimension.value_feet !== undefined || dimension.value_inches !== undefined;
    score += (hasValue ? 0.3 : 0.1);
  }
  
  // Factor 2: Type clarity (30%)
  if (confidenceFactors.type_clarity) {
    score += confidenceFactors.type_clarity * 0.3;
  } else {
    const hasType = dimension.measurement_type !== undefined;
    score += (hasType ? 0.25 : 0.05);
  }
  
  // Factor 3: Completeness (30%)
  if (confidenceFactors.completeness) {
    score += confidenceFactors.completeness * 0.3;
  } else {
    let completeness = 0;
    if (dimension.value_feet !== undefined) completeness += 0.33;
    if (dimension.measurement_type) completeness += 0.33;
    if (dimension.area) completeness += 0.34;
    score += completeness * 0.3;
  }
  
  // Cap at 0-1 range
  score = Math.max(0, Math.min(1, score));
  
  // Determine level and review requirement
  const level = score >= 0.9 ? 'high' : score >= 0.75 ? 'medium' : score >= 0.6 ? 'low' : 'very_low';
  
  // Dimensions ALWAYS require review below 0.90 (critical data)
  const requiresReview = score < 0.90;
  
  // Generate warnings
  const warnings = [];
  
  if (!dimension.measurement_type) {
    warnings.push('Measurement type unclear - verify FF-FF, BM-C, etc.');
  }
  
  if (dimension.value_feet === undefined && dimension.value_inches === undefined) {
    warnings.push('No measurement value detected');
  }
  
  if (!dimension.area) {
    warnings.push('Location/area not specified');
  }
  
  if (dimension.value_fraction && dimension.value_fraction !== '0') {
    // Fractional measurements are precise but harder to hear correctly
    if (score > 0.85) score -= 0.05;
    warnings.push('Verify fractional value accuracy');
  }
  
  return {
    score,
    level,
    requiresReview,
    warnings
  };
}

/**
 * Parse batch dimensions from transcript
 */
export async function parseBatchDimensions(transcriptEnglish, transcriptOriginal, detectedLanguage, base44Client) {
  try {
    // Use LLM to detect multiple dimensions in transcript
    const result = await base44Client.integrations.Core.InvokeLLM({
      prompt: `Extract ALL measurements from this transcript. Some technicians read multiple dimensions in one recording.

Transcript: ${transcriptEnglish}

Find all measurements and return as JSON array. Each dimension should have:
- value (feet, inches, fraction)
- measurement_type (FF-FF, BM-C, etc)
- dimension_type (horizontal/vertical)
- location

Return array of dimensions.`,
      response_json_schema: {
        type: "object",
        properties: {
          dimensions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                value_feet: { type: "number" },
                value_inches: { type: "number" },
                value_fraction: { type: "string" },
                measurement_type: { type: "string" },
                dimension_type: { type: "string" },
                area: { type: "string" }
              }
            }
          }
        }
      }
    });
    
    const dimensions = [];
    
    for (const raw of result.dimensions || []) {
      const normalized = normalizeDimension(raw);
      const confidence = calculateDimensionConfidence(normalized);
      
      dimensions.push({
        ...normalized,
        detected_language: detectedLanguage,
        source_text: transcriptEnglish,
        source_text_original: transcriptOriginal,
        confidence_score: confidence.score,
        confidence_level: confidence.level,
        requires_review: confidence.requiresReview,
        validation_warnings: confidence.warnings
      });
    }
    
    return dimensions;
    
  } catch (error) {
    console.error('Failed to parse batch dimensions:', error);
    throw error;
  }
}

/**
 * Create draft FieldDimension
 */
export function createDimensionDraft(parsedDimension, sessionMetadata) {
  return {
    job_id: sessionMetadata.job_id,
    job_name: sessionMetadata.job_name,
    area: parsedDimension.area || sessionMetadata.area,
    measurement_type: parsedDimension.measurement_type,
    dimension_type: parsedDimension.dimension_type,
    value_feet: parsedDimension.value_feet,
    value_inches: parsedDimension.value_inches,
    value_fraction: parsedDimension.value_fraction || '0',
    value_mm: parsedDimension.value_mm,
    unit_system: parsedDimension.unit_system || 'imperial',
    device_type: 'manual',
    measured_by: sessionMetadata.recorded_by,
    measured_by_name: sessionMetadata.recorded_by_name,
    measurement_date: sessionMetadata.session_start,
    status: 'draft',
    created_from: 'voice_note',
    confidence_score: parsedDimension.confidence_score,
    confidence_level: parsedDimension.confidence_level,
    requires_review: parsedDimension.requires_review,
    validation_warnings: parsedDimension.validation_warnings,
    source: 'ai',
    notes: `Voice captured: ${parsedDimension.source_text}`,
    offline_synced: false
  };
}