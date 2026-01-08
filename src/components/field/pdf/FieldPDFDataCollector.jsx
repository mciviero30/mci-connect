/**
 * Field PDF Data Collector
 * 
 * Collects and validates all data required for PDF generation
 */

import { queryLocalStore, STORES } from '../offline/FieldOfflineStorage';

/**
 * Collect complete PDF dataset
 */
export async function collectPDFData(jobId, dimensionSetId, options = {}) {
  try {
    const dataset = {
      job: null,
      dimension_set: null,
      dimensions: [],
      benchmarks: [],
      photos: [],
      plans: [],
      metadata: {
        generated_at: new Date().toISOString(),
        generated_by: options.user_email,
        generated_by_name: options.user_name,
        revision_number: options.revision_number || 1,
        document_id: generateDocumentId(jobId, dimensionSetId),
        offline_generated: !navigator.onLine
      }
    };
    
    // Collect job data
    dataset.job = await collectJobData(jobId);
    
    // Collect dimension set
    dataset.dimension_set = await collectDimensionSetData(dimensionSetId);
    
    // Collect dimensions
    dataset.dimensions = await collectDimensions(dimensionSetId);
    
    // Collect benchmarks
    dataset.benchmarks = await collectBenchmarks(jobId);
    
    // Collect photos (if requested)
    if (options.include_photos) {
      dataset.photos = await collectPhotos(jobId);
    }
    
    // Collect plans
    if (options.include_plans) {
      dataset.plans = await collectPlans(jobId);
    }
    
    // Validate dataset
    const validation = validateDataset(dataset);
    if (!validation.valid) {
      throw new Error(`Invalid dataset: ${validation.errors.join(', ')}`);
    }
    
    return dataset;
    
  } catch (error) {
    console.error('Failed to collect PDF data:', error);
    throw error;
  }
}

/**
 * Collect job metadata
 */
async function collectJobData(jobId) {
  // Try local storage first (offline-first)
  const jobs = await queryLocalStore('jobs', 'id', jobId);
  
  if (jobs.length > 0) {
    return jobs[0];
  }
  
  // Fallback: minimal structure
  return {
    id: jobId,
    name: 'Unknown Job',
    address: 'N/A',
    customer_name: 'N/A'
  };
}

/**
 * Collect dimension set data
 */
async function collectDimensionSetData(dimensionSetId) {
  const sets = await queryLocalStore(STORES.DIMENSION_SETS, 'id', dimensionSetId);
  
  if (sets.length === 0) {
    throw new Error('Dimension set not found');
  }
  
  return sets[0];
}

/**
 * Collect dimensions
 */
async function collectDimensions(dimensionSetId) {
  const set = await collectDimensionSetData(dimensionSetId);
  const dimensionIds = set.dimension_ids || [];
  
  const dimensions = await queryLocalStore(STORES.DIMENSIONS, 'job_id', set.job_id);
  
  // Filter to only dimensions in this set
  return dimensions.filter(d => 
    dimensionIds.includes(d.id) || dimensionIds.includes(d.local_id)
  );
}

/**
 * Collect benchmarks
 */
async function collectBenchmarks(jobId) {
  return await queryLocalStore(STORES.BENCHMARKS, 'job_id', jobId);
}

/**
 * Collect photos
 */
async function collectPhotos(jobId) {
  return await queryLocalStore(STORES.PHOTOS, 'job_id', jobId);
}

/**
 * Collect plans
 */
async function collectPlans(jobId) {
  return await queryLocalStore(STORES.PLANS, 'job_id', jobId);
}

/**
 * Validate dataset completeness
 */
function validateDataset(dataset) {
  const errors = [];
  
  if (!dataset.job) {
    errors.push('Job data missing');
  }
  
  if (!dataset.dimension_set) {
    errors.push('Dimension set missing');
  }
  
  if (!dataset.dimensions || dataset.dimensions.length === 0) {
    errors.push('No dimensions in set');
  }
  
  if (!dataset.metadata.generated_by) {
    errors.push('Generator user not specified');
  }
  
  if (!dataset.metadata.document_id) {
    errors.push('Document ID not generated');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Generate deterministic document ID
 */
function generateDocumentId(jobId, dimensionSetId) {
  const timestamp = Date.now();
  const hash = hashCode(`${jobId}_${dimensionSetId}_${timestamp}`);
  return `MCI-FIELD-${jobId.substring(0, 8)}-${hash}`.toUpperCase();
}

/**
 * Simple hash function for document ID
 */
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).substring(0, 6).toUpperCase();
}