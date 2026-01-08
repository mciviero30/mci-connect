/**
 * AI Measurement Quality Control
 * 
 * CRITICAL CONSTRAINTS:
 * - MCI does NOT design or fabricate
 * - AI must NOT create, change, or suggest measurements
 * - Advisory only - cannot approve or reject
 */

import { base44 } from '@/api/base44Client';

/**
 * Generate AI Quality Report for measurements
 */
export async function generateAIQualityReport(dimensions, benchmarks, area = null) {
  if (!dimensions || dimensions.length === 0) {
    return {
      status: 'no_data',
      message: 'No measurements available for analysis'
    };
  }

  // Filter by area if specified
  const targetDimensions = area 
    ? dimensions.filter(d => d.area === area)
    : dimensions;

  if (targetDimensions.length === 0) {
    return {
      status: 'no_data',
      message: `No measurements found for area: ${area}`
    };
  }

  // Prepare data for AI analysis
  const analysisData = prepareMeasurementData(targetDimensions, benchmarks);

  // Call AI for quality analysis
  try {
    const aiResponse = await base44.integrations.Core.InvokeLLM({
      prompt: buildQualityControlPrompt(analysisData),
      response_json_schema: {
        type: "object",
        properties: {
          overall_confidence: {
            type: "string",
            enum: ["high", "medium", "low"],
            description: "Overall confidence in measurement quality"
          },
          consistency_status: {
            type: "string",
            enum: ["consistent", "inconsistent", "needs_review"],
            description: "Internal consistency assessment"
          },
          anomalies: {
            type: "array",
            items: {
              type: "object",
              properties: {
                measurement_type: { type: "string" },
                issue: { type: "string" },
                severity: { 
                  type: "string",
                  enum: ["high", "medium", "low"]
                }
              }
            },
            description: "Detected anomalies"
          },
          missing_evidence: {
            type: "array",
            items: { type: "string" },
            description: "Missing supporting evidence"
          },
          benchmark_validation: {
            type: "object",
            properties: {
              status: { 
                type: "string",
                enum: ["valid", "invalid", "needs_review"]
              },
              notes: { type: "string" }
            }
          },
          summary: {
            type: "string",
            description: "Brief summary of quality assessment"
          }
        }
      }
    });

    return {
      status: 'success',
      area: area || 'All Areas',
      dimension_count: targetDimensions.length,
      report: aiResponse,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('AI Quality Control failed:', error);
    return {
      status: 'error',
      message: error.message
    };
  }
}

/**
 * Prepare measurement data for AI analysis
 */
function prepareMeasurementData(dimensions, benchmarks) {
  return {
    dimensions: dimensions.map(d => ({
      measurement_type: d.measurement_type,
      dimension_type: d.dimension_type,
      value_feet: d.value_feet,
      value_inches: d.value_inches,
      value_fraction: d.value_fraction,
      value_mm: d.value_mm,
      unit_system: d.unit_system,
      area: d.area,
      benchmark_id: d.benchmark_id,
      benchmark_label: d.benchmark_label,
      device_type: d.device_type,
      has_photo: !!(d.photo_urls && d.photo_urls.length > 0),
      has_notes: !!(d.notes || d.production_notes)
    })),
    benchmarks: benchmarks.map(b => ({
      id: b.id,
      label: b.label,
      elevation_mm: b.elevation_mm,
      area: b.area,
      is_active: b.is_active
    })),
    metadata: {
      total_dimensions: dimensions.length,
      total_benchmarks: benchmarks.length,
      measurement_types: [...new Set(dimensions.map(d => d.measurement_type))],
      areas: [...new Set(dimensions.map(d => d.area))],
      unit_systems: [...new Set(dimensions.map(d => d.unit_system))]
    }
  };
}

/**
 * Build AI prompt for quality control
 */
function buildQualityControlPrompt(data) {
  return `You are a measurement quality control analyst for MCI, a construction measurement documentation company.

CRITICAL CONSTRAINTS:
- MCI does NOT design or fabricate products
- You must NOT create, change, or suggest measurements
- You must NOT recommend corrections or modifications
- You are ADVISORY ONLY - you cannot approve or reject measurements

YOUR ROLE:
Evaluate the quality of CAPTURED measurement data only.

ANALYZE THE FOLLOWING:
1. Internal consistency across dimensions
2. Benchmark logic (laser to ceiling/floor relationships)
3. Potential anomalies compared to typical construction ranges
4. Missing supporting evidence (photos, notes)

DATA TO ANALYZE:
${JSON.stringify(data, null, 2)}

TYPICAL CONSTRUCTION RANGES (for anomaly detection only):
- Room heights: typically 8-12 feet (2.4-3.6m)
- Wall-to-wall distances: typically 6-50 feet (1.8-15m)
- Benchmark to ceiling (BM-C): typically 6-10 feet (1.8-3m)
- Benchmark to floor (BM-F): typically 2-4 feet (0.6-1.2m)

PROVIDE YOUR QUALITY ASSESSMENT:
- Overall confidence level (high/medium/low)
- Consistency status
- Any anomalies detected (measurements outside typical ranges)
- Missing evidence (photos, benchmarks, notes)
- Benchmark validation status
- Brief summary

REMEMBER: You are only evaluating quality. Do NOT suggest changes or corrections.`;
}

/**
 * Get confidence badge styling
 */
export function getConfidenceBadge(level) {
  switch (level?.toLowerCase()) {
    case 'high':
      return {
        label: 'High Confidence',
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: '✓'
      };
    case 'medium':
      return {
        label: 'Medium Confidence',
        color: 'bg-amber-100 text-amber-800 border-amber-200',
        icon: '⚠'
      };
    case 'low':
      return {
        label: 'Low Confidence',
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: '✗'
      };
    default:
      return {
        label: 'Unknown',
        color: 'bg-slate-100 text-slate-800 border-slate-200',
        icon: '?'
      };
  }
}

/**
 * Get consistency status badge
 */
export function getConsistencyBadge(status) {
  switch (status?.toLowerCase()) {
    case 'consistent':
      return {
        label: 'Consistent',
        color: 'bg-green-100 text-green-800 border-green-200'
      };
    case 'inconsistent':
      return {
        label: 'Inconsistent',
        color: 'bg-red-100 text-red-800 border-red-200'
      };
    case 'needs_review':
      return {
        label: 'Needs Review',
        color: 'bg-amber-100 text-amber-800 border-amber-200'
      };
    default:
      return {
        label: 'Unknown',
        color: 'bg-slate-100 text-slate-800 border-slate-200'
      };
  }
}

/**
 * Get severity badge
 */
export function getSeverityBadge(severity) {
  switch (severity?.toLowerCase()) {
    case 'high':
      return { color: 'bg-red-100 text-red-800 border-red-200', label: 'High' };
    case 'medium':
      return { color: 'bg-amber-100 text-amber-800 border-amber-200', label: 'Medium' };
    case 'low':
      return { color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Low' };
    default:
      return { color: 'bg-slate-100 text-slate-800 border-slate-200', label: 'Unknown' };
  }
}