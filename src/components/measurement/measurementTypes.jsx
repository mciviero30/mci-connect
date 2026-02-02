
/**
 * MEASUREMENT TYPES & COMMANDS
 * Standard construction measurement abbreviations
 */

// Pure data only - no logic
export const MEASUREMENT_TYPES = [
  {
    id: 'FF-FF',
    label: 'Finish Face to Finish Face',
    short: 'FF–FF',
    orientation: 'horizontal',
    description: 'Between finished faces (wall to wall)',
  },
  {
    id: 'CL-FF',
    label: 'Centerline to Finish Face',
    short: 'CL–FF',
    orientation: 'horizontal',
    description: 'Center of element to finished surface',
  },
  {
    id: 'CL-CL',
    label: 'Centerline to Centerline',
    short: 'CL–CL',
    orientation: 'horizontal',
    description: 'Center to center of elements',
  },
  {
    id: 'FF-BM',
    label: 'Finish Face to Bench Mark',
    short: 'FF–BM',
    orientation: 'vertical',
    description: 'Finished surface to bench mark reference',
  },
  {
    id: 'BM-FF',
    label: 'Bench Mark to Finish Face',
    short: 'BM–FF',
    orientation: 'vertical',
    description: 'Bench mark reference to finished surface',
  },
  {
    id: 'BM-C',
    label: 'Bench Mark to Centerline',
    short: 'BM–C',
    orientation: 'vertical',
    description: 'Bench mark reference to center of element',
  },
];

export const MEASUREMENT_ORIENTATIONS = { // Renamed from MEASUREMENT_CATEGORIES
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
  diagonal: { // Kept for conceptual integrity, even if not in MEASUREMENT_TYPES array
    name: 'Diagonal',
    icon: '⧹',
    description: 'Corner-to-corner measurements',
  },
  custom: { // Kept for conceptual integrity, even if not in MEASUREMENT_TYPES array
    name: 'Custom',
    icon: '📐',
    description: 'User-defined measurements',
  },
};

/**
 * Get measurement type details
 */
export function getMeasurementType(type) {
  const foundType = MEASUREMENT_TYPES.find(mt => mt.id === type);
  // Define a default custom type object, as 'CUSTOM' is no longer explicitly in MEASUREMENT_TYPES array.
  const customDefault = {
    id: 'CUSTOM',
    label: 'Custom Measurement',
    short: 'CUST',
    orientation: 'custom',
    description: 'User-defined measurement type',
  };
  return foundType || customDefault;
}

/**
 * Get all types for a given orientation
 */
export function getTypesByOrientation(orientation) { // Renamed function and parameter
  return MEASUREMENT_TYPES
    .filter(data => data.orientation === orientation);
}

/**
 * Validate measurement type
 */
export function isValidMeasurementType(type) {
  return MEASUREMENT_TYPES.some(mt => mt.id === type);
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

ORIENTATIONS:
• ${MEASUREMENT_ORIENTATIONS.horizontal.name} (${MEASUREMENT_ORIENTATIONS.horizontal.icon}): ${MEASUREMENT_ORIENTATIONS.horizontal.description}
• ${MEASUREMENT_ORIENTATIONS.vertical.name} (${MEASUREMENT_ORIENTATIONS.vertical.icon}): ${MEASUREMENT_ORIENTATIONS.vertical.description}
• ${MEASUREMENT_ORIENTATIONS.diagonal.name} (${MEASUREMENT_ORIENTATIONS.diagonal.icon}): ${MEASUREMENT_ORIENTATIONS.diagonal.description}
• ${MEASUREMENT_ORIENTATIONS.custom.name} (${MEASUREMENT_ORIENTATIONS.custom.icon}): ${MEASUREMENT_ORIENTATIONS.custom.description}

COMMON TYPES:
• FF–FF: Finish Face to Finish Face
• CL–FF: Centerline to Finish Face
• CL–CL: Centerline to Centerline
• FF–BM: Finish Face to Bench Mark
• BM–FF: Bench Mark to Finish Face
• BM–C: Bench Mark to Centerline
`;
