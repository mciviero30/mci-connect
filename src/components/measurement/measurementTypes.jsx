/**
 * MEASUREMENT TYPES & COMMANDS
 * Standard construction measurement abbreviations
 */

export const MEASUREMENT_TYPES = {
  // Horizontal Measurements
  'FF-FF': {
    label: 'Finish Face to Finish Face',
    category: 'horizontal',
    description: 'Distance between two finished surfaces',
    icon: '↔️',
  },
  'CL-FF': {
    label: 'Centerline to Finish Face',
    category: 'horizontal',
    description: 'Distance from centerline to finished surface',
    icon: '↔️',
  },
  'CL-CL': {
    label: 'Centerline to Centerline',
    category: 'horizontal',
    description: 'Distance between two centerlines',
    icon: '↔️',
  },
  'BM-FF': {
    label: 'Bench Mark to Finish Face',
    category: 'horizontal',
    description: 'Distance from reference point to finished surface',
    icon: '↔️',
  },

  // Vertical Measurements
  'FF-BM': {
    label: 'Finish Face to Bench Mark',
    category: 'vertical',
    description: 'Vertical distance from finished surface to benchmark',
    icon: '↕️',
  },
  'BM-C': {
    label: 'Bench Mark to Centerline',
    category: 'vertical',
    description: 'Vertical distance from benchmark to centerline',
    icon: '↕️',
  },
  'FF-FF-V': {
    label: 'Finish Face to Finish Face (Vertical)',
    category: 'vertical',
    description: 'Vertical distance between two finished surfaces',
    icon: '↕️',
  },
  'CL-BM': {
    label: 'Centerline to Bench Mark',
    category: 'vertical',
    description: 'Vertical distance from centerline to benchmark',
    icon: '↕️',
  },

  // Diagonal/Special
  'DIAGONAL': {
    label: 'Diagonal',
    category: 'diagonal',
    description: 'Diagonal measurement (Pythagorean)',
    icon: '⧹',
  },
  'CUSTOM': {
    label: 'Custom Measurement',
    category: 'custom',
    description: 'User-defined measurement type',
    icon: '📐',
  },
};

export const MEASUREMENT_CATEGORIES = {
  horizontal: {
    name: 'Horizontal',
    icon: '↔️',
    description: 'Lateral/left-right measurements',
  },
  vertical: {
    name: 'Vertical',
    icon: '↕️',
    description: 'Up/down measurements',
  },
  diagonal: {
    name: 'Diagonal',
    icon: '⧹',
    description: 'Corner-to-corner measurements',
  },
  custom: {
    name: 'Custom',
    icon: '📐',
    description: 'User-defined measurements',
  },
};

/**
 * Get measurement type details
 */
export function getMeasurementType(type) {
  return MEASUREMENT_TYPES[type] || MEASUREMENT_TYPES.CUSTOM;
}

/**
 * Get all types for a category
 */
export function getTypesByCategory(category) {
  return Object.entries(MEASUREMENT_TYPES)
    .filter(([_, data]) => data.category === category)
    .map(([key, data]) => ({ key, ...data }));
}

/**
 * Validate measurement type
 */
export function isValidMeasurementType(type) {
  return type in MEASUREMENT_TYPES;
}

/**
 * Get measurement abbreviation help
 */
export const MEASUREMENT_HELP = `
MEASUREMENT ABBREVIATIONS:

REFERENCE POINTS:
• FF = Finish Face (final surface)
• CL = Centerline (middle/center)
• BM = Bench Mark (fixed reference point)

DIRECTIONS:
• Horizontal (↔️): Left-right measurements
• Vertical (↕️): Up-down measurements
• Diagonal (⧹): Corner measurements

COMMON TYPES:
• FF-FF: Finish Face to Finish Face
• CL-FF: Centerline to Finish Face
• CL-CL: Centerline to Centerline
• BM-FF: Bench Mark to Finish Face
• FF-BM: Finish Face to Bench Mark (Vertical)
• BM-C: Bench Mark to Centerline (Vertical)
`;