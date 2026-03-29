import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const ADMIN_ROLES = ['admin', 'ceo', 'owner', 'super_admin', 'administrator'];
    if (!ADMIN_ROLES.includes(caller.role?.toLowerCase?.())) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Core entities to backup
    const ENTITIES = [
      'Job', 'Invoice', 'Quote', 'Customer', 'User',
      'TimeEntry', 'DrivingLog', 'Expense', 'WeeklyPayroll',
      'EmployeeProfile', 'EmployeeDirectory',
      'PayrollBatch', 'PayrollAllocation',
      'Transaction', 'Commission',
      'Notification', 'AuditLog',
    ];

    const backup = {
      exported_at: new Date().toISOString(),
      exported_by: caller.email,
      version: '1.0',
      entities: {}
    };

    for (const entityName of ENTITIES) {
      try {
        const records = await base44.asServiceRole.entities[entityName]
          .list('', 1000).catch(() => []);
        backup.entities[entityName] = records;
        console.log(`[exportDatabase] ${entityName}: ${records.length} records`);
      } catch (err) {
        console.error(`[exportDatabase] Failed to export ${entityName}:`, err.message);
        backup.entities[entityName] = [];
      }
    }

    const totalRecords = Object.values(backup.entities)
      .reduce((sum, arr) => sum + (arr?.length || 0), 0);

    backup.total_records = totalRecords;

    return Response.json(backup);

  } catch (err) {
    console.error('[exportDatabase] error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});
