import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * REPAIR: User ↔ EmployeeDirectory Sync
 * 
 * Fixes the critical desync where all EmployeeDirectory records have user_id: null
 * Links User.id → EmployeeDirectory.user_id by matching email addresses
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get all users
    const users = await base44.asServiceRole.entities.User.list();
    
    // Get all EmployeeDirectory records
    const directories = await base44.asServiceRole.entities.EmployeeDirectory.list();

    const results = {
      total_users: users.length,
      total_directories: directories.length,
      linked: 0,
      not_found: 0,
      errors: []
    };

    // Match and link by email
    for (const dir of directories) {
      try {
        const matchingUser = users.find(u => 
          u.email.toLowerCase() === dir.employee_email?.toLowerCase()
        );

        if (matchingUser) {
          await base44.asServiceRole.entities.EmployeeDirectory.update(dir.id, {
            user_id: matchingUser.id,
            last_synced_at: new Date().toISOString()
          });
          results.linked++;
        } else {
          results.not_found++;
          results.errors.push({
            directory_id: dir.id,
            email: dir.employee_email,
            reason: 'No matching User found'
          });
        }
      } catch (error) {
        results.errors.push({
          directory_id: dir.id,
          email: dir.employee_email,
          error: error.message
        });
      }
    }

    return Response.json({
      success: true,
      message: `Linked ${results.linked} EmployeeDirectory records to Users`,
      results
    });

  } catch (error) {
    console.error('Repair failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});