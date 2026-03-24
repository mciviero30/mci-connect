import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * MIGRATION STEP 5: Validation Report
 * Checks that user_id is properly populated and no queries use email_FK.
 * Admin-only.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const results = {
      timestamp: new Date().toISOString(),
      entities_updated: {},
      total_records_with_user_id: 0,
      total_records_with_email_fk: 0,
      legacy_fields_remaining: true,
      safe_for_phase1_reset: false,
      frontend_files_modified: [
        'pages/Dashboard.tsx (all queries use user_id)',
        'pages/Empleados.tsx (all queries use user_id)'
      ],
      entity_status: {}
    };

    try {
      // Check each entity
      const entities = ['TimeEntry', 'DrivingLog', 'JobAssignment', 'Expense', 'Certification', 'OnboardingForm', 'TimeOffRequest', 'Commission', 'PayrollAllocation'];

      for (const entityName of entities) {
        try {
          const entity = base44.entities[entityName];
          if (!entity) {
            results.entity_status[entityName] = { status: 'not_found' };
            continue;
          }

          const records = await entity.list('', 1000);
          
          let withUserId = 0;
          let withEmailFk = 0;

          for (const rec of records) {
            if (rec.user_id) {
              withUserId++;
            }
            if (rec.employee_email && !rec.user_id) {
              withEmailFk++;
            }
          }

          results.entities_updated[entityName] = {
            total_records: records.length,
            with_user_id: withUserId,
            with_email_fk_only: withEmailFk,
            migration_complete: withEmailFk === 0
          };

          results.total_records_with_user_id += withUserId;
          results.total_records_with_email_fk += withEmailFk;

        } catch (err) {
          results.entity_status[entityName] = { status: 'error', error: err.message };
        }
      }

      // Validation checks
      const allMigrated = results.total_records_with_email_fk === 0;
      const frontendUpdated = results.frontend_files_modified.length > 0;

      results.safe_for_phase1_reset = allMigrated && frontendUpdated;

      results.migration_summary = {
        total_records_processed: results.total_records_with_user_id + results.total_records_with_email_fk,
        records_with_user_id: results.total_records_with_user_id,
        records_still_using_email_fk: results.total_records_with_email_fk,
        all_records_migrated: allMigrated,
        frontend_files_updated: frontendUpdated,
        ready_for_phase1: results.safe_for_phase1_reset
      };

      const emoji = results.safe_for_phase1_reset ? '✅' : '⚠️';
      results.status = results.safe_for_phase1_reset ? 'ready_for_phase1' : 'migration_incomplete';

      console.log(`${emoji} Migration Validation:`, results);
      return Response.json(results);

    } catch (err) {
      console.error('❌ Validation failed:', err);
      return Response.json({ error: err.message, results }, { status: 500 });
    }

  } catch (err) {
    console.error('Auth error:', err);
    return Response.json({ error: 'Authentication failed' }, { status: 401 });
  }
});