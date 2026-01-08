/**
 * Site Notes Normalization Service
 * 
 * Normalizes multilingual voice input to English technical terms
 */

/**
 * Technical term mappings (Spanish → English)
 */
const TECHNICAL_TERMS = {
  // Measurement types
  'acabado': 'finish',
  'cara': 'face',
  'centro': 'center',
  'línea central': 'centerline',
  'referencia': 'benchmark',
  'láser': 'laser',
  'techo': 'ceiling',
  'piso': 'floor',
  'suelo': 'floor',
  
  // Dimension types
  'horizontal': 'horizontal',
  'vertical': 'vertical',
  'diagonal': 'diagonal',
  
  // Units
  'pies': 'feet',
  'pie': 'foot',
  'pulgadas': 'inches',
  'pulgada': 'inch',
  'milímetros': 'millimeters',
  'metros': 'meters',
  
  // Common terms
  'puerta': 'door',
  'ventana': 'window',
  'pared': 'wall',
  'columna': 'column',
  'viga': 'beam',
  'esquina': 'corner',
  'pasillo': 'hallway',
  'entrada': 'entrance',
  'salida': 'exit'
};

/**
 * Normalize measurement type to English code
 */
export function normalizeMeasurementType(spokenText, detectedLanguage) {
  const text = spokenText.toLowerCase();
  
  // Direct English codes
  const englishCodes = ['ff-ff', 'ff-cl', 'cl-ff', 'cl-cl', 'bm-c', 'bm-f', 'f-c', 'bm'];
  for (const code of englishCodes) {
    if (text.includes(code.replace('-', ' ')) || text.includes(code)) {
      return code.toUpperCase();
    }
  }
  
  // Pattern matching
  if (text.includes('finish') && text.includes('finish')) return 'FF-FF';
  if (text.includes('face') && text.includes('face')) return 'FF-FF';
  if (text.includes('acabado') && text.includes('acabado')) return 'FF-FF';
  
  if ((text.includes('finish') || text.includes('face')) && (text.includes('center') || text.includes('centerline'))) return 'FF-CL';
  if (text.includes('acabado') && text.includes('centro')) return 'FF-CL';
  
  if ((text.includes('center') || text.includes('centerline')) && (text.includes('finish') || text.includes('face'))) return 'CL-FF';
  if (text.includes('centro') && text.includes('acabado')) return 'CL-FF';
  
  if ((text.includes('center') && text.includes('center')) || text.includes('centerline')) return 'CL-CL';
  if (text.includes('centro') && text.includes('centro')) return 'CL-CL';
  
  if ((text.includes('benchmark') || text.includes('laser') || text.includes('referencia')) && (text.includes('ceiling') || text.includes('techo'))) return 'BM-C';
  
  if ((text.includes('benchmark') || text.includes('laser') || text.includes('referencia')) && (text.includes('floor') || text.includes('piso'))) return 'BM-F';
  
  if ((text.includes('floor') || text.includes('piso')) && (text.includes('ceiling') || text.includes('techo'))) return 'F-C';
  
  if (text.includes('benchmark') || text.includes('laser line') || text.includes('referencia') || text.includes('láser')) return 'BM';
  
  return null; // Unable to determine
}

/**
 * Normalize area/location to consistent format
 */
export function normalizeArea(spokenArea, detectedLanguage) {
  if (!spokenArea) return null;
  
  let normalized = spokenArea.trim();
  
  // Translate common Spanish terms
  if (detectedLanguage === 'es' || detectedLanguage === 'spa') {
    Object.entries(TECHNICAL_TERMS).forEach(([spanish, english]) => {
      const regex = new RegExp(spanish, 'gi');
      normalized = normalized.replace(regex, english);
    });
  }
  
  // Capitalize first letter of each word
  normalized = normalized
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  return normalized;
}

/**
 * Normalize spoken number to numeric value
 */
export function normalizeSpokenNumber(spokenNumber) {
  if (typeof spokenNumber === 'number') {
    return spokenNumber;
  }
  
  const text = spokenNumber.toLowerCase().trim();
  
  // Number words to digits
  const numberWords = {
    'zero': 0, 'cero': 0,
    'one': 1, 'uno': 1, 'una': 1,
    'two': 2, 'dos': 2,
    'three': 3, 'tres': 3,
    'four': 4, 'cuatro': 4,
    'five': 5, 'cinco': 5,
    'six': 6, 'seis': 6,
    'seven': 7, 'siete': 7,
    'eight': 8, 'ocho': 8,
    'nine': 9, 'nueve': 9,
    'ten': 10, 'diez': 10,
    'eleven': 11, 'once': 11,
    'twelve': 12, 'doce': 12,
    'thirteen': 13, 'trece': 13,
    'fourteen': 14, 'catorce': 14,
    'fifteen': 15, 'quince': 15,
    'sixteen': 16, 'dieciséis': 16,
    'seventeen': 17, 'diecisiete': 17,
    'eighteen': 18, 'dieciocho': 18,
    'nineteen': 19, 'diecinueve': 19,
    'twenty': 20, 'veinte': 20
  };
  
  // Check if it's a word
  if (numberWords[text] !== undefined) {
    return numberWords[text];
  }
  
  // Parse as number
  const parsed = parseFloat(text.replace(/[^\d.-]/g, ''));
  return isNaN(parsed) ? null : parsed;
}

/**
 * Normalize unit system
 */
export function normalizeUnitSystem(spokenUnits) {
  if (!spokenUnits) return 'imperial'; // Default
  
  const text = spokenUnits.toLowerCase();
  
  // Metric indicators
  if (text.includes('mm') || text.includes('millimeter') || text.includes('milímetro')) {
    return 'metric';
  }
  
  if (text.includes('meter') || text.includes('metro')) {
    return 'metric';
  }
  
  // Imperial indicators
  if (text.includes('feet') || text.includes('foot') || text.includes('pies') || text.includes('pie')) {
    return 'imperial';
  }
  
  if (text.includes('inch') || text.includes('pulgada')) {
    return 'imperial';
  }
  
  return 'imperial'; // Default
}

/**
 * Normalize complete dimension object
 */
export function normalizeDimensionData(rawData, detectedLanguage) {
  return {
    measurement_type: normalizeMeasurementType(rawData.measurement_type_spoken || '', detectedLanguage),
    dimension_type: rawData.dimension_type || 'horizontal',
    value_feet: normalizeSpokenNumber(rawData.value_feet),
    value_inches: normalizeSpokenNumber(rawData.value_inches),
    value_fraction: rawData.value_fraction || '0',
    value_mm: normalizeSpokenNumber(rawData.value_mm),
    unit_system: normalizeUnitSystem(rawData.unit_system_spoken || ''),
    area: normalizeArea(rawData.area, detectedLanguage)
  };
}

/**
 * Normalize benchmark data
 */
export function normalizeBenchmarkData(rawData, detectedLanguage) {
  return {
    label: rawData.label?.toUpperCase(),
    type: rawData.type?.toLowerCase(),
    elevation: normalizeSpokenNumber(rawData.elevation),
    elevation_unit: normalizeUnitSystem(rawData.elevation_unit) === 'metric' ? 'mm' : 'in',
    area: normalizeArea(rawData.area, detectedLanguage),
    description: rawData.description
  };
}

/**
 * Clean and normalize all extracted data
 */
export function normalizeExtractedData(extractedEntities, detectedLanguage) {
  return extractedEntities.map(entity => {
    if (entity.entity_type === 'dimension') {
      return {
        ...entity,
        entity_data: normalizeDimensionData(entity.entity_data, detectedLanguage)
      };
    }
    
    if (entity.entity_type === 'benchmark') {
      return {
        ...entity,
        entity_data: normalizeBenchmarkData(entity.entity_data, detectedLanguage)
      };
    }
    
    // Other types pass through
    return entity;
  });
}