/**
 * COMMISSION RULE VERSIONING SAFETY GUARDS
 * ✅ Verify no overlaps
 * ✅ Verify proper effective dates
 * ✅ Verify immutability
 * ✅ Log anomalies only
 */

import { parseISO, isAfter, isBefore, isEqual } from 'date-fns';

/**
 * Validate date range doesn't overlap with existing rules
 * @param {Date|string} newStart - New version start date
 * @param {Date|string} newEnd - New version end date (optional)
 * @param {Array} existingRules - Existing rule versions to check against
 * @param {string} ignoreRuleId - Rule ID to skip (for updates)
 * @returns {boolean} True if no overlaps
 */
export const validateNoDateOverlap = (newStart, newEnd, existingRules, ignoreRuleId = null) => {
  const newStartDate = parseISO(typeof newStart === 'string' ? newStart : newStart.toISOString());
  const newEndDate = newEnd ? parseISO(typeof newEnd === 'string' ? newEnd : newEnd.toISOString()) : null;

  const hasOverlap = existingRules.some(rule => {
    if (rule.id === ignoreRuleId) return false;

    const existingStart = parseISO(rule.effective_date);
    const existingEnd = rule.end_date ? parseISO(rule.end_date) : null;

    // Check overlap logic
    if (!existingEnd && !newEndDate) return true; // Both indefinite
    if (!existingEnd) return !newEndDate || isAfter(newEndDate, existingStart);
    if (!newEndDate) return isAfter(newStartDate, existingStart) && isBefore(newStartDate, existingEnd);
    
    return (isAfter(newStartDate, existingStart) && isBefore(newStartDate, existingEnd)) ||
           (isAfter(newEndDate, existingStart) && isBefore(newEndDate, existingEnd)) ||
           (isBefore(newStartDate, existingStart) && isAfter(newEndDate, existingEnd));
  });

  if (hasOverlap && import.meta.env.DEV) {
  }

  return !hasOverlap;
};

/**
 * Verify effective date is always in future
 * @param {Date|string} effectiveDate - Date to check
 * @returns {boolean} True if in future
 */
export const validateEffectiveDateIsFuture = (effectiveDate) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const effDate = parseISO(typeof effectiveDate === 'string' ? effectiveDate : effectiveDate.toISOString());
  effDate.setHours(0, 0, 0, 0);

  const isFuture = isAfter(effDate, today);

  if (!isFuture && import.meta.env.DEV) {
  }

  return isFuture;
};

/**
 * Verify at least one active/future version exists per rule family
 * @param {Array} ruleFamilies - Grouped rules by name
 * @returns {Array} Rule families with no active versions (anomalies)
 */
export const validateActiveVersionCoverage = (ruleFamilies) => {
  const anomalies = [];

  ruleFamilies.forEach(family => {
    const hasActiveOrFuture = family.versions.some(v => {
      const effDate = parseISO(v.effective_date);
      const endDate = v.end_date ? parseISO(v.end_date) : null;
      const today = new Date();

      const isActive = effDate <= today && (!endDate || endDate >= today);
      const isFuture = effDate > today;

      return isActive || isFuture;
    });

    if (!hasActiveOrFuture) {
      anomalies.push({
        rule_name: family.name,
        version_count: family.versions.length,
        last_version: family.versions[0]?.version
      });

      if (import.meta.env.DEV) {
      }
    }
  });

  return anomalies;
};

/**
 * Verify rule versions never overlap (critical)
 * @param {Array} versions - All versions of a rule
 * @returns {boolean} True if valid (no overlaps)
 */
export const validateRuleVersionsNeverOverlap = (versions) => {
  if (versions.length < 2) return true;

  for (let i = 0; i < versions.length - 1; i++) {
    const current = versions[i];
    const next = versions[i + 1];

    const currEnd = current.end_date ? parseISO(current.end_date) : null;
    const nextStart = parseISO(next.effective_date);

    // End date should be equal to or before next start
    if (currEnd && isAfter(currEnd, nextStart)) {
      if (import.meta.env.DEV) {
        console.error('[Rule Versioning] Version overlap detected (CRITICAL):', {
          current_version: current.version,
          current_end: currEnd.toISOString(),
          next_version: next.version,
          next_start: nextStart.toISOString()
        });
      }
      return false;
    }
  }

  return true;
};

/**
 * Verify new version was auto-created (previous not manually deleted)
 * @param {object} previousVersion - Previous version record
 * @param {object} newVersion - New version record
 * @returns {boolean} True if valid creation pattern
 */
export const validateVersionCreationPattern = (previousVersion, newVersion) => {
  // Check if previous version has end_date set to new version's effective_date
  if (!previousVersion?.end_date) {
    return false;
  }

  const prevEnd = parseISO(previousVersion.end_date);
  const newStart = parseISO(newVersion.effective_date);

  // End date should be day before new start (or same date if granular to day)
  const isProperClose = isEqual(prevEnd, newStart) || isBefore(prevEnd, newStart);

  if (!isProperClose && import.meta.env.DEV) {
  }

  return isProperClose;
};