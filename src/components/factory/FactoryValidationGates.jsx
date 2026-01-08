/**
 * Factory Validation Gates
 * 
 * Validates requirements before production status changes
 */

import { base44 } from '@/api/base44Client';
import { PRODUCTION_STATUS } from './FactoryProductionLifecycle';

/**
 * Validate dimension set before status change
 */
export async function validateProductionGate(dimensionSetId, targetStatus) {
  const checks = {
    dimensions_exist: false,
    benchmarks_valid: false,
    conflicts_resolved: false,
    latest_revision: false
  };

  const errors = [];
  const warnings = [];

  try {
    // Fetch dimension set
    const dimensionSet = await base44.entities.DimensionSet.filter({ 
      id: dimensionSetId 
    }).then(sets => sets[0]);

    if (!dimensionSet) {
      errors.push('Dimension set not found');
      return { passed: false, checks, errors, warnings };
    }

    // Check 1: Required dimensions exist
    if (!dimensionSet.dimension_ids || dimensionSet.dimension_ids.length === 0) {
      errors.push('No dimensions in this set - cannot proceed to fabrication');
      checks.dimensions_exist = false;
    } else {
      const dimensions = await base44.entities.FieldDimension.filter({
        id: { $in: dimensionSet.dimension_ids }
      });

      if (dimensions.length === 0) {
        errors.push('Dimension data missing - database integrity issue');
        checks.dimensions_exist = false;
      } else if (dimensions.length < dimensionSet.dimension_ids.length) {
        warnings.push(`Only ${dimensions.length}/${dimensionSet.dimension_ids.length} dimensions found`);
        checks.dimensions_exist = true;
      } else {
        checks.dimensions_exist = true;
      }

      // Check for incomplete measurements
      const incomplete = dimensions.filter(d => 
        !d.value_feet && !d.value_inches && !d.value_mm
      );

      if (incomplete.length > 0) {
        errors.push(`${incomplete.length} dimension(s) have no measurement values`);
      }
    }

    // Check 2: Benchmarks valid
    const dimensions = await base44.entities.FieldDimension.filter({
      id: { $in: dimensionSet.dimension_ids || [] }
    });

    const dimensionsNeedingBenchmark = dimensions.filter(d => 
      ['BM-C', 'BM-F', 'F-C', 'BM'].includes(d.measurement_type)
    );

    if (dimensionsNeedingBenchmark.length > 0) {
      const missingBenchmark = dimensionsNeedingBenchmark.filter(d => !d.benchmark_id);
      
      if (missingBenchmark.length > 0) {
        errors.push(`${missingBenchmark.length} vertical measurement(s) missing benchmark reference`);
        checks.benchmarks_valid = false;
      } else {
        // Verify benchmarks exist
        const benchmarkIds = [...new Set(dimensionsNeedingBenchmark.map(d => d.benchmark_id))];
        const benchmarks = await base44.entities.Benchmark.filter({
          id: { $in: benchmarkIds }
        });

        if (benchmarks.length < benchmarkIds.length) {
          errors.push('Referenced benchmarks not found in database');
          checks.benchmarks_valid = false;
        } else {
          // Check benchmark validity
          const invalidBenchmarks = benchmarks.filter(b => 
            !b.elevation || !b.is_established
          );

          if (invalidBenchmarks.length > 0) {
            errors.push(`${invalidBenchmarks.length} benchmark(s) not established or missing elevation`);
            checks.benchmarks_valid = false;
          } else {
            checks.benchmarks_valid = true;
          }
        }
      }
    } else {
      checks.benchmarks_valid = true; // No benchmarks needed
    }

    // Check 3: Conflicts resolved
    const hasConflicts = dimensionSet.validation_flags?.requires_supervisor_review ||
                        dimensionSet.validation_flags?.low_confidence_measurements;

    if (hasConflicts) {
      warnings.push('Dimension set flagged for supervisor review');
    }

    // Check if there are pending revision requests
    if (dimensionSet.production_status_requested) {
      warnings.push('Pending status change request from Field');
    }

    checks.conflicts_resolved = !hasConflicts;

    // Check 4: Latest revision
    const newerVersions = await base44.entities.DimensionSet.filter({
      parent_version_id: dimensionSetId
    });

    if (newerVersions.length > 0) {
      errors.push(`This is revision ${dimensionSet.version_number} - revision ${newerVersions[0].version_number} exists and supersedes this data`);
      checks.latest_revision = false;
    } else {
      checks.latest_revision = true;
    }

    // Additional check: Must be locked for production
    if (targetStatus !== PRODUCTION_STATUS.PENDING && !dimensionSet.is_locked) {
      errors.push('Dimension set must be locked before advancing to production');
    }

  } catch (error) {
    console.error('Validation gate check failed:', error);
    errors.push('Validation check failed: ' + error.message);
  }

  const passed = errors.length === 0 && 
                 checks.dimensions_exist && 
                 checks.benchmarks_valid && 
                 checks.conflicts_resolved && 
                 checks.latest_revision;

  return {
    passed,
    checks,
    errors,
    warnings
  };
}

/**
 * Get gate status badge
 */
export function getGateStatusBadge(check, passed) {
  if (passed) {
    return {
      label: '✓ Pass',
      color: 'text-green-600',
      bg: 'bg-green-50'
    };
  } else {
    return {
      label: '✗ Fail',
      color: 'text-red-600',
      bg: 'bg-red-50'
    };
  }
}

/**
 * Check if status change requires gate validation
 */
export function requiresGateValidation(targetStatus) {
  // Gate validation required when moving to fabrication or beyond
  const gatedStatuses = [
    PRODUCTION_STATUS.APPROVED_FOR_PRODUCTION,
    PRODUCTION_STATUS.IN_FABRICATION,
    PRODUCTION_STATUS.FABRICATED,
    PRODUCTION_STATUS.QC_CHECKED,
    PRODUCTION_STATUS.READY_FOR_INSTALL
  ];

  return gatedStatuses.includes(targetStatus);
}