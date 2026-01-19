import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * DEBUG: Check PendingEmployee entity for missing employees
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const currentUser = await base44.auth.me();
    
    if (!currentUser || currentUser.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const pendingEmployees = await base44.asServiceRole.entities.PendingEmployee.list();
    
    const analysis = {
      total: pendingEmployees.length,
      by_status: {},
      employees: pendingEmployees.map(emp => ({
        email: emp.email,
        first_name: emp.first_name,
        last_name: emp.last_name,
        status: emp.status,
        migrated_to_user_id: emp.migrated_to_user_id,
        migration_status: emp.migration_status
      }))
    };

    for (const emp of pendingEmployees) {
      const status = emp.status || 'none';
      analysis.by_status[status] = (analysis.by_status[status] || 0) + 1;
    }

    return Response.json({
      success: true,
      analysis,
      message: `Found ${pendingEmployees.length} records in PendingEmployee`
    });

  } catch (error) {
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});