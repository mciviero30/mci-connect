/**
 * DUAL-KEY USER RESOLUTION UTILITIES
 * 
 * Transition Mode: email → user_id migration
 * 
 * These utilities resolve user identity using:
 * 1. user_id (preferred, SSOT)
 * 2. email (legacy fallback)
 * 
 * CRITICAL: Do NOT remove email logic until migration is 100% complete.
 */

import { base44 } from '@/api/base44Client';

/**
 * Resolve a single user from a record that may have user_id or email
 * 
 * @param {Object} record - Record with user_id and/or employee_email/email field
 * @param {string} userIdField - Field name for user_id (e.g., 'user_id', 'assigned_to_user_id')
 * @param {string} emailField - Field name for email (e.g., 'employee_email', 'assigned_to')
 * @returns {Promise<Object|null>} User object or null
 */
export async function resolveUser(record, userIdField, emailField) {
  if (!record) return null;

  // Dual-Key Read: user_id preferred, email fallback (legacy)
  if (record[userIdField]) {
    try {
      const users = await base44.entities.User.filter({ id: record[userIdField] });
      return users[0] || null;
    } catch (error) {
      // Fall through to email fallback
    }
  }

  // Legacy email fallback
  if (record[emailField]) {
    try {
      const normalizedEmail = record[emailField].trim().toLowerCase();
      const users = await base44.entities.User.filter({ email: normalizedEmail });
      return users[0] || null;
    } catch (error) {
      return null;
    }
  }

  return null;
}

/**
 * Batch resolve multiple users from records
 * 
 * @param {Array} records - Array of records
 * @param {string} userIdField - Field name for user_id
 * @param {string} emailField - Field name for email
 * @returns {Promise<Map>} Map of record.id → User object
 */
export async function batchResolveUsers(records, userIdField, emailField) {
  if (!records || records.length === 0) return new Map();

  // Dual-Key Read: user_id preferred, email fallback (legacy)
  const userIds = records.map(r => r[userIdField]).filter(Boolean);
  const emails = records.map(r => r[emailField]).filter(Boolean);

  const userMap = new Map();

  // Fetch by user_id (preferred)
  if (userIds.length > 0) {
    try {
      const users = await base44.entities.User.list('', 1000);
      const userById = new Map(users.map(u => [u.id, u]));
      
      for (const record of records) {
        if (record[userIdField] && userById.has(record[userIdField])) {
          userMap.set(record.id, userById.get(record[userIdField]));
        }
      }
    } catch (error) { /* intentionally silenced */ }

  }

  // Legacy email fallback for unresolved
  const unresolvedRecords = records.filter(r => !userMap.has(r.id) && r[emailField]);
  if (unresolvedRecords.length > 0) {
    try {
      const users = await base44.entities.User.list('', 1000);
      const userByEmail = new Map(users.map(u => [u.email.trim().toLowerCase(), u]));
      
      for (const record of unresolvedRecords) {
        const normalizedEmail = record[emailField].trim().toLowerCase();
        if (userByEmail.has(normalizedEmail)) {
          userMap.set(record.id, userByEmail.get(normalizedEmail));
        }
      }
    } catch (error) { /* intentionally silenced */ }

  }

  return userMap;
}

/**
 * Get display name for a user from a record
 * Uses user_id resolution first, falls back to legacy name field
 * 
 * @param {Object} record - Record with user fields
 * @param {string} userIdField - Field name for user_id
 * @param {string} emailField - Field name for email
 * @param {string} nameField - Field name for legacy name
 * @returns {Promise<string>} Display name
 */
export async function resolveDisplayName(record, userIdField, emailField, nameField) {
  // Dual-Key Read: user_id preferred, email fallback (legacy)
  const user = await resolveUser(record, userIdField, emailField);
  
  if (user?.full_name) {
    return user.full_name;
  }

  // Legacy fallback: use denormalized name field
  return record[nameField] || record[emailField] || 'Unknown User';
}

/**
 * Filter records by current user (supports both user_id and email)
 * 
 * @param {Array} records - All records
 * @param {Object} currentUser - Current authenticated user
 * @param {string} userIdField - Field name for user_id in records
 * @param {string} emailField - Field name for email in records
 * @returns {Array} Filtered records for current user
 */
export function filterByCurrentUser(records, currentUser, userIdField, emailField) {
  if (!currentUser || !records) return [];

  // Dual-Key Read: user_id preferred, email fallback (legacy)
  return records.filter(record => {
    // Prefer user_id match
    if (record[userIdField] && currentUser.id) {
      return record[userIdField] === currentUser.id;
    }
    
    // Legacy email match
    if (record[emailField] && currentUser.email) {
      return normalizeEmail(record[emailField]) === normalizeEmail(currentUser.email);
    }
    
    return false;
  });
}

/**
 * Build query filter for user (supports both user_id and email)
 * Returns optimized query that checks user_id OR email
 * 
 * @param {Object} currentUser - Current authenticated user
 * @param {string} userIdField - Field name for user_id
 * @param {string} emailField - Field name for email
 * @returns {Object} Query filter object
 */
export function buildUserQuery(currentUser, userIdField, emailField) {
  if (!currentUser) return {};

  // Dual-Key Read: user_id preferred (SSOT), email fallback (legacy)
  // If the user has a user_id, filter by it (new records); also include email for legacy records
  // Backend `filter` uses AND, so we prefer user_id when available to avoid cross-user leakage
  if (currentUser.id) {
    return { [userIdField]: currentUser.id };
  }

  // Legacy fallback: only email available (old session)
  return { [emailField]: currentUser.email };
}

function normalizeEmail(email) {
  if (!email) return null;
  return email.trim().toLowerCase();
}