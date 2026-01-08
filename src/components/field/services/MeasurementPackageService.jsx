/**
 * Measurement Package Service
 * 
 * Creates comprehensive measurement packages for clients/factories
 */

import { base44 } from '@/api/base44Client';

/**
 * Collect all data for measurement package
 */
export async function collectMeasurementPackage(jobId, area = null) {
  try {
    // Fetch all related data
    const [job, dimensions, benchmarks, photos, siteNotes] = await Promise.all([
      base44.entities.Job.filter({ id: jobId }).then(jobs => jobs[0]),
      base44.entities.FieldDimension.filter({ job_id: jobId }),
      base44.entities.Benchmark.filter({ job_id: jobId }),
      base44.entities.Photo.filter({ job_id: jobId }),
      base44.entities.SiteNoteSession.filter({ 
        job_id: jobId,
        processing_status: 'completed'
      })
    ]);

    // Filter by area if specified
    const filteredDimensions = area 
      ? dimensions.filter(d => d.area === area)
      : dimensions;

    const filteredBenchmarks = area
      ? benchmarks.filter(b => b.area === area)
      : benchmarks;

    const filteredPhotos = area
      ? photos.filter(p => p.area === area || p.location === area)
      : photos;

    // Group data
    const packageData = {
      metadata: {
        package_id: generatePackageId(),
        generated_date: new Date().toISOString(),
        job_id: jobId,
        job_name: job?.name || job?.job_name_field,
        client_name: job?.client_name_field,
        area: area || 'All Areas',
        generated_by: null, // Will be set by caller
        disclaimer: getStandardDisclaimer()
      },
      job_info: {
        name: job?.name || job?.job_name_field,
        client: job?.client_name_field,
        address: job?.address,
        status: job?.status
      },
      measurements: {
        dimensions: filteredDimensions.map(d => ({
          id: d.id,
          area: d.area,
          measurement_type: d.measurement_type,
          dimension_type: d.dimension_type,
          value_feet: d.value_feet,
          value_inches: d.value_inches,
          value_fraction: d.value_fraction,
          value_mm: d.value_mm,
          unit_system: d.unit_system,
          benchmark_label: d.benchmark_label,
          measured_by: d.measured_by_name,
          measurement_date: d.measurement_date,
          device_type: d.device_type,
          notes: d.notes,
          production_notes: d.production_notes,
          human_confirmation_status: d.human_confirmation_status,
          human_confirmation_by: d.human_confirmation_name,
          human_confirmation_role: d.human_confirmation_role,
          human_confirmation_date: d.human_confirmation_date,
          human_confirmation_comment: d.human_confirmation_comment
        })),
        total_count: filteredDimensions.length,
        by_type: groupByType(filteredDimensions),
        by_area: groupByArea(filteredDimensions)
      },
      benchmarks: {
        data: filteredBenchmarks.map(b => ({
          id: b.id,
          label: b.label,
          elevation_mm: b.elevation_mm,
          area: b.area,
          established_by: b.established_by_name,
          established_date: b.established_date,
          is_active: b.is_active
        })),
        total_count: filteredBenchmarks.length
      },
      laser_heights: extractLaserHeights(filteredDimensions),
      media: {
        photos: filteredPhotos.map(p => ({
          id: p.id,
          caption: p.caption,
          photo_url: p.photo_url,
          area: p.area || p.location,
          captured_date: p.captured_date,
          captured_by: p.captured_by_name
        })),
        total_photos: filteredPhotos.length
      },
      site_notes: siteNotes
        .filter(s => s.review_status && s.review_status !== 'needs_followup')
        .map(s => ({
          ...s,
          _readonly: true
        })),
      field_notes: {
        dimension_notes: filteredDimensions
          .filter(d => d.notes || d.production_notes)
          .map(d => ({
            dimension_id: d.id,
            measurement_type: d.measurement_type,
            notes: d.notes,
            production_notes: d.production_notes
          }))
      },
      deprecated_field_notes: {
        site_notes: siteNotes.map(s => ({
          id: s.id,
          area: s.area,
          transcript: s.transcript_raw,
          detected_language: s.detected_language,
          recorded_by: s.recorded_by_name,
          session_start: s.session_start,
          duration_seconds: s.duration_seconds
        })),
        dimension_notes: filteredDimensions
          .filter(d => d.notes || d.production_notes)
          .map(d => ({
            dimension_id: d.id,
            measurement_type: d.measurement_type,
            notes: d.notes,
            production_notes: d.production_notes
          }))
      },
      human_confirmations: extractConfirmations(filteredDimensions),
      summary: generateSummary(filteredDimensions, filteredBenchmarks, filteredPhotos)
    };

    return packageData;
  } catch (error) {
    console.error('Failed to collect measurement package:', error);
    throw error;
  }
}

/**
 * Extract laser height measurements
 */
function extractLaserHeights(dimensions) {
  const laserTypes = ['BM-C', 'BM-F', 'F-C'];
  const laserDims = dimensions.filter(d => laserTypes.includes(d.measurement_type));

  return {
    measurements: laserDims.map(d => ({
      measurement_type: d.measurement_type,
      value_mm: d.value_mm,
      value_imperial: formatImperial(d),
      benchmark_label: d.benchmark_label,
      area: d.area
    })),
    total_count: laserDims.length
  };
}

/**
 * Extract human confirmations
 */
function extractConfirmations(dimensions) {
  const confirmed = dimensions.filter(d => 
    d.human_confirmation_status && d.human_confirmation_status !== 'pending'
  );

  return {
    total_measurements: dimensions.length,
    confirmed_count: confirmed.length,
    pending_count: dimensions.length - confirmed.length,
    confirmations: confirmed.map(d => ({
      dimension_id: d.id,
      measurement_type: d.measurement_type,
      area: d.area,
      status: d.human_confirmation_status,
      confirmed_by: d.human_confirmation_name,
      confirmed_role: d.human_confirmation_role,
      confirmed_date: d.human_confirmation_date,
      comment: d.human_confirmation_comment
    })),
    by_status: {
      verified: confirmed.filter(d => d.human_confirmation_status === 'verified_conditions_existing').length,
      irregular: confirmed.filter(d => d.human_confirmation_status === 'irregular_conditions_noted').length,
      remeasure: confirmed.filter(d => d.human_confirmation_status === 'remeasure_required').length
    }
  };
}

/**
 * Generate package summary
 */
function generateSummary(dimensions, benchmarks, photos) {
  return {
    total_dimensions: dimensions.length,
    total_benchmarks: benchmarks.length,
    total_photos: photos.length,
    measurement_types: [...new Set(dimensions.map(d => d.measurement_type))],
    areas_covered: [...new Set(dimensions.map(d => d.area))],
    unit_systems_used: [...new Set(dimensions.map(d => d.unit_system))],
    confirmation_rate: dimensions.length > 0 
      ? Math.round((dimensions.filter(d => d.human_confirmation_status && d.human_confirmation_status !== 'pending').length / dimensions.length) * 100)
      : 0
  };
}

/**
 * Group dimensions by type
 */
function groupByType(dimensions) {
  return dimensions.reduce((acc, dim) => {
    const type = dim.measurement_type;
    if (!acc[type]) acc[type] = 0;
    acc[type]++;
    return acc;
  }, {});
}

/**
 * Group dimensions by area
 */
function groupByArea(dimensions) {
  return dimensions.reduce((acc, dim) => {
    const area = dim.area || 'Unknown';
    if (!acc[area]) acc[area] = 0;
    acc[area]++;
    return acc;
  }, {});
}

/**
 * Generate unique package ID
 */
function generatePackageId() {
  return `PKG-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
}

/**
 * Get standard disclaimer
 */
function getStandardDisclaimer() {
  return "Measurements captured and documented by MCI. AI review evaluates internal consistency only. Final design and fabrication decisions are the responsibility of the client or manufacturer.";
}

/**
 * Format imperial dimension
 */
function formatImperial(dim) {
  let result = '';
  if (dim.value_feet) result += `${dim.value_feet}'`;
  if (dim.value_inches) result += ` ${dim.value_inches}`;
  if (dim.value_fraction && dim.value_fraction !== '0') result += ` ${dim.value_fraction}`;
  result += '"';
  return result.trim();
}