/**
 * Factory View Service
 * 
 * Read-only access to all Field data types for Factory consumption
 */

import { base44 } from '@/api/base44Client';
import { validateFactoryAccess } from './FactoryPermissions';
import { MODES } from './FactoryModeContext';
import { filterForProduction, getLatestRevision, validateProductionReadiness } from './FactoryProductionFilter';

/**
 * Fetch dimensions for Factory view
 */
export async function fetchDimensionsForFactory(dimensionSetId, base44Client) {
  try {
    const dimensionSet = await base44Client.entities.DimensionSet.filter({ 
      id: dimensionSetId 
    }).then(sets => sets[0]);
    
    if (!dimensionSet) {
      throw new Error('Dimension set not found');
    }
    
    // Validate Factory access
    const access = validateFactoryAccess(dimensionSet, MODES.FACTORY);
    if (!access.allowed) {
      throw new Error(access.reason);
    }
    
    const dimensions = await base44Client.entities.FieldDimension.filter({
      id: { $in: dimensionSet.dimension_ids }
    });
    
    return {
      dimension_set: dimensionSet,
      dimensions: dimensions.map(d => ({ ...d, _readonly: true })),
      status: getDataStatus(dimensionSet)
    };
  } catch (error) {
    console.error('Failed to fetch dimensions:', error);
    throw error;
  }
}

/**
 * Fetch benchmarks for Factory view
 */
export async function fetchBenchmarksForFactory(jobId, base44Client) {
  try {
    const benchmarks = await base44Client.entities.Benchmark.filter({
      job_id: jobId,
      is_active: true
    });
    
    return benchmarks.map(b => ({ ...b, _readonly: true }));
  } catch (error) {
    console.error('Failed to fetch benchmarks:', error);
    throw error;
  }
}

/**
 * Fetch drawings/plans for Factory view
 */
export async function fetchDrawingsForFactory(jobId, base44Client) {
  try {
    const plans = await base44Client.entities.Plan.filter({
      job_id: jobId
    }, '-created_date');
    
    return plans.map(p => ({ ...p, _readonly: true }));
  } catch (error) {
    console.error('Failed to fetch drawings:', error);
    throw error;
  }
}

/**
 * Fetch photos for Factory view
 */
export async function fetchPhotosForFactory(jobId, base44Client) {
  try {
    const photos = await base44Client.entities.Photo.filter({
      job_id: jobId
    }, '-created_date');
    
    return photos.map(p => ({ ...p, _readonly: true }));
  } catch (error) {
    console.error('Failed to fetch photos:', error);
    throw error;
  }
}

/**
 * Fetch AI Site Notes for Factory view
 */
export async function fetchSiteNotesForFactory(jobId, base44Client) {
  try {
    const sessions = await base44Client.entities.SiteNoteSession.filter({
      job_id: jobId,
      processing_status: 'completed'
    }, '-session_start');
    
    return sessions.map(s => ({ ...s, _readonly: true }));
  } catch (error) {
    console.error('Failed to fetch site notes:', error);
    throw error;
  }
}

/**
 * Get comprehensive Factory view for a job
 */
export async function getFactoryJobView(jobId, base44Client) {
  try {
    // Fetch all data in parallel
    const [dimensionSets, benchmarks, drawings, photos, siteNotes] = await Promise.all([
      base44Client.entities.DimensionSet.filter({
        job_id: jobId,
        workflow_state: { $in: ['approved', 'locked'] }
      }, '-created_date'),
      fetchBenchmarksForFactory(jobId, base44Client),
      fetchDrawingsForFactory(jobId, base44Client),
      fetchPhotosForFactory(jobId, base44Client),
      fetchSiteNotesForFactory(jobId, base44Client)
    ]);
    
    return {
      job_id: jobId,
      dimension_sets: dimensionSets.map(ds => ({
        ...ds,
        status: getDataStatus(ds),
        _readonly: true
      })),
      benchmarks,
      drawings,
      photos,
      site_notes: siteNotes,
      metadata: {
        total_dimension_sets: dimensionSets.length,
        locked_sets: dimensionSets.filter(ds => ds.is_locked).length,
        approved_sets: dimensionSets.filter(ds => ds.workflow_state === 'approved').length,
        total_benchmarks: benchmarks.length,
        total_drawings: drawings.length,
        total_photos: photos.length,
        total_site_notes: siteNotes.length
      }
    };
  } catch (error) {
    console.error('Failed to get Factory job view:', error);
    throw error;
  }
}

/**
 * Get data status (Draft/Approved/Superseded)
 */
export function getDataStatus(dimensionSet) {
  // Superseded if has a child revision
  if (dimensionSet._has_revision) {
    return 'superseded';
  }
  
  // Locked = production approved
  if (dimensionSet.is_locked) {
    return 'approved';
  }
  
  // Approved by supervisor
  if (dimensionSet.workflow_state === 'approved') {
    return 'approved';
  }
  
  // Draft
  return 'draft';
}

/**
 * Check if dimension set is superseded
 */
export async function checkSuperseded(dimensionSetId, base44Client) {
  try {
    // Find any dimension set with this as parent
    const children = await base44Client.entities.DimensionSet.filter({
      parent_version_id: dimensionSetId
    });
    
    return children.length > 0;
  } catch (error) {
    console.error('Failed to check superseded status:', error);
    return false;
  }
}

/**
 * Get complete Factory view data (production-filtered)
 */
export async function getFactoryViewData(dimensionSetId) {
  try {
    const dimensionSet = await base44.entities.DimensionSet.filter({ 
      id: dimensionSetId 
    }).then(sets => sets[0]);
    
    if (!dimensionSet) {
      throw new Error('Dimension set not found');
    }
    
    const access = validateFactoryAccess(dimensionSet, MODES.FACTORY);
    if (!access.allowed) {
      throw new Error(access.reason);
    }
    
    // Fetch all related data
    const [dimensions, benchmarks, job, photos] = await Promise.all([
      base44.entities.FieldDimension.filter({
        id: { $in: dimensionSet.dimension_ids || [] }
      }),
      base44.entities.Benchmark.filter({
        job_id: dimensionSet.job_id
      }),
      base44.entities.Job.filter({ id: dimensionSet.job_id }).then(jobs => jobs[0]),
      base44.entities.Photo.filter({
        job_id: dimensionSet.job_id
      })
    ]);
    
    // Apply production filters
    const rawData = {
      dimension_set: dimensionSet,
      dimensions,
      benchmarks,
      photos,
      job,
      metadata: {}
    };
    
    const filtered = filterForProduction(rawData);
    
    // Validate production readiness
    const readiness = validateProductionReadiness(dimensionSet, dimensions);
    
    return {
      ...filtered,
      dimension_set: { ...filtered.dimension_set, _readonly: true },
      dimensions: filtered.dimensions.map(d => ({ ...d, _readonly: true })),
      benchmarks: filtered.benchmarks.map(b => ({ ...b, _readonly: true })),
      photos: filtered.photos.map(p => ({ ...p, _readonly: true })),
      job: filtered.job ? { ...filtered.job, _readonly: true } : null,
      status: getDataStatus(dimensionSet),
      production_readiness: readiness,
      metadata: {
        ...filtered.metadata,
        is_production_ready: dimensionSet.is_locked
      }
    };
  } catch (error) {
    console.error('Failed to get Factory view data:', error);
    throw error;
  }
}

/**
 * Get export data for Factory
 */
export async function getFactoryExportData(dimensionSetId, base44Client) {
  try {
    const dimensionSet = await base44Client.entities.DimensionSet.filter({ 
      id: dimensionSetId 
    }).then(sets => sets[0]);
    
    if (!dimensionSet) {
      throw new Error('Dimension set not found');
    }
    
    const access = validateFactoryAccess(dimensionSet, MODES.FACTORY);
    if (!access.allowed) {
      throw new Error(access.reason);
    }
    
    const dimensions = await base44Client.entities.FieldDimension.filter({
      id: { $in: dimensionSet.dimension_ids }
    });
    
    return {
      dimension_set: dimensionSet,
      dimensions: dimensions,
      status: getDataStatus(dimensionSet),
      export_timestamp: new Date().toISOString(),
      is_production_ready: dimensionSet.is_locked
    };
  } catch (error) {
    console.error('Failed to get export data:', error);
    throw error;
  }
}