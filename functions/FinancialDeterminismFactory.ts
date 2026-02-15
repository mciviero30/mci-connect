import { createHash } from 'node:crypto';

/**
 * UNIFIED FINANCIAL DETERMINISM ENGINE FACTORY
 * 
 * Single source of truth for:
 * - Deterministic hashing (with canonical sorting)
 * - Atomic version increment (via constraints + retries)
 * - Idempotency protection
 * - Permission scoping
 * - Concurrency handling
 * 
 * Used by: calculateQuoteDeterministic, calculateInvoiceDeterministic, calculateCommissionDeterministic
 */

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 50;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Canonical sorting for items array (determinism under reordering)
 */
function canonicalSort(items) {
  if (!Array.isArray(items)) return items;
  
  return [...items].sort((a, b) => {
    // Try to sort by stable key: id > item_name > JSON stringified
    const keyA = (a.id || a.item_name || JSON.stringify(a)).toString();
    const keyB = (b.id || b.item_name || JSON.stringify(b)).toString();
    return keyA.localeCompare(keyB);
  });
}

/**
 * CREATE DETERMINISM ENGINE FOR ENTITY TYPE
 * 
 * Usage:
 * const engine = createDeterminismEngine('Quote');
 * const hash = engine.calculateHash({ items, tax_rate }, ruleVersions);
 */
export function createDeterminismEngine(entityType) {
  return {
    /**
     * Deterministic hash of inputs (NO timestamps, canonical ordering)
     */
    calculateHash(inputs, ruleVersions) {
      const data = JSON.stringify({
        items: canonicalSort(inputs.items),
        customer_id: inputs.customer_id,
        tax_rate: inputs.tax_rate,
        margin_rule_version: ruleVersions.margin_version || 'v1.0',
        commission_rule_version: ruleVersions.commission_version || 'v1.0',
        tax_config_version: ruleVersions.tax_version || 'v1.0',
        pricing_config_version: ruleVersions.pricing_version || 'v1.0'
      });

      return createHash('sha256').update(data).digest('hex');
    },

    /**
     * OUTPUT HASH: Hash of totals for audit trail
     */
    calculateOutputHash(totals) {
      return createHash('sha256').update(JSON.stringify(totals)).digest('hex');
    },

    /**
     * GET NEXT VERSION (with retry logic for race conditions)
     */
    async getNextVersionNumber(base44, entityId, attempt = 0) {
      if (attempt >= MAX_RETRIES) {
        throw new Error('Failed to allocate version number after 3 retries');
      }

      try {
        // Fetch current version
        const current = await base44.entities.CalculationVersion.filter(
          { entity_id: entityId, is_current: true },
          '-recalculated_at',
          1
        );

        const nextVersion = current.length > 0 ? current[0].calculation_version + 1 : 1;

        // Invalidate previous (if exists)
        if (current.length > 0) {
          try {
            await base44.entities.CalculationVersion.update(current[0].id, {
              is_current: false
            });
          } catch (err) {
            // Retry if update failed
            if (attempt < MAX_RETRIES - 1) {
              await sleep(RETRY_DELAY_MS * Math.pow(2, attempt));
              return this.getNextVersionNumber(base44, entityId, attempt + 1);
            }
            throw err;
          }
        }

        return { nextVersion, previousVersionId: current.length > 0 ? current[0].id : null };
      } catch (err) {
        if (attempt < MAX_RETRIES - 1) {
          await sleep(RETRY_DELAY_MS * Math.pow(2, attempt));
          return this.getNextVersionNumber(base44, entityId, attempt + 1);
        }
        throw err;
      }
    },

    /**
     * CREATE VERSION WITH RETRY on UNIQUE constraint collision
     */
    async createVersionWithRetry(base44, entityId, input, attempt = 0) {
      if (attempt >= MAX_RETRIES) {
        throw new Error(`Failed to create ${entityType} calculation version after 3 retries`);
      }

      try {
        return await base44.entities.CalculationVersion.create(input);
      } catch (err) {
        // UNIQUE(entity_id, calculation_version) violation = race condition
        if (err.message && err.message.includes('unique')) {
          if (attempt < MAX_RETRIES - 1) {
            console.warn(`Race condition on ${entityType} version, retry ${attempt + 1}/${MAX_RETRIES}`);
            await sleep(RETRY_DELAY_MS * Math.pow(2, attempt));
            
            // Refetch version number and retry
            const { nextVersion } = await this.getNextVersionNumber(base44, entityId);
            input.calculation_version = nextVersion;
            
            return this.createVersionWithRetry(base44, entityId, input, attempt + 1);
          }
        }
        throw err;
      }
    },

    /**
     * CHECK PERMISSION (shared across all entity types)
     */
    async checkPermission(base44, user, entity, operation) {
      if (!user) {
        throw new Error('Unauthorized: No authenticated user');
      }

      if (user.role === 'admin') {
        return true;
      }

      // Ownership check
      if (operation === 'write' && entity.created_by_user_id === user.id) {
        return true;
      }

      // Job-level check
      if (entity.job_id) {
        const assignments = await base44.entities.JobAssignment.filter({
          user_id: user.id,
          job_id: entity.job_id
        });
        if (assignments.length > 0) {
          return true;
        }
      }

      // Team check
      if (entity.team_id) {
        const team = await base44.entities.Team.filter({ id: entity.team_id });
        if (team.length > 0 && team[0].member_ids?.includes(user.id)) {
          return true;
        }
      }

      return false;
    },

    /**
     * CHECK IDEMPOTENCY: Return cached result if exists
     */
    async checkIdempotency(base44, requestId) {
      if (!requestId) return null;

      const existing = await base44.entities.IdempotencyRecord.filter({
        request_id: requestId
      });

      if (existing.length > 0 && existing[0].status === 'completed') {
        return existing[0].cached_result;
      }

      return null;
    },

    /**
     * SAVE IDEMPOTENCY RECORD for future deduplication
     */
    async saveIdempotency(base44, requestId, mutationId, entityId, result, isPermanent = false) {
      if (!requestId) return;

      try {
        await base44.entities.IdempotencyRecord.create({
          request_id: requestId,
          mutation_id: mutationId,
          mutation_type: `update_${entityType.toLowerCase()}`,
          user_id: (await base44.auth.me()).id,
          entity_type: entityType,
          entity_id: entityId,
          cached_result: result,
          created_at: new Date().toISOString(),
          is_permanent: isPermanent,
          status: 'completed'
        });
      } catch (err) {
        // Duplicate idempotency record (safe to ignore)
        console.warn('Idempotency record already exists:', err.message);
      }
    }
  };
}

export default createDeterminismFactory;