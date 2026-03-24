import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * PHASE 1 CLEANUP - Safe completion after partial execution
 * - Checks if entities exist before attempting deletion
 * - Ignores missing entities
 * - Does NOT re-delete already deleted records
 * - Does NOT touch protected entities
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const result = {
      records_deleted_per_entity: {},
      entities_not_found: [],
      final_status: 'success',
      timestamp: new Date().toISOString()
    };

    // Array of entities to cleanup (in order)
    const entitiesToCleanup = ['Commission', 'PayrollAllocation', 'PayrollBatch', 'PendingEmployee'];

    for (const entityName of entitiesToCleanup) {
      try {
        let records = [];
        try {
          records = await base44.asServiceRole.entities[entityName].list('', 1000);
        } catch (err) {
          if (err.message?.includes('not found') || err.status === 404) {
            result.entities_not_found.push(entityName);
            continue;
          }
          throw err;
        }

        let deletedCount = 0;
        for (const record of records) {
          await base44.asServiceRole.entities[entityName].delete(record.id);
          deletedCount++;
        }

        result.records_deleted_per_entity[entityName] = deletedCount;

      } catch (err) {
        console.error(`❌ Error cleaning up ${entityName}:`, err.message);
        result.final_status = 'partial_success';
        result.records_deleted_per_entity[entityName] = 0;
      }
    }

    return Response.json(result);

  } catch (err) {
    console.error('❌ Phase 1 cleanup failed:', err);
    return Response.json(
      { 
        error: err.message,
        final_status: 'failed',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
});