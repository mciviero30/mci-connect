import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * ADMIN-ONLY: Clean Workforce Architecture
 * 
 * Removes:
 * 1. All EmployeeProfile records without user_id (orphans)
 * 2. All Users with role='employee' (EXCEPT admin email)
 * 
 * Returns summary of cleanup
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin-only check
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const adminEmail = 'mciviero30@gmail.com';
    const summary = {
      orphaned_profiles_deleted: 0,
      employee_users_deleted: 0,
      errors: []
    };

    // 1. Delete EmployeeProfile records without user_id
    try {
      const orphanedProfiles = await base44.asServiceRole.entities.EmployeeProfile.list();
      const orphans = orphanedProfiles.filter(p => !p.user_id);
      
      for (const profile of orphans) {
        try {
          await base44.asServiceRole.entities.EmployeeProfile.delete(profile.id);
          summary.orphaned_profiles_deleted++;
        } catch (err) {
          summary.errors.push(`Failed to delete profile ${profile.id}: ${err.message}`);
        }
      }
    } catch (err) {
      summary.errors.push(`Profile deletion error: ${err.message}`);
    }

    // 2. Delete Users with role='employee' EXCEPT admin
    try {
      const allUsers = await base44.asServiceRole.entities.User.list();
      const employeeUsers = allUsers.filter(u => u.role === 'employee' && u.email !== adminEmail);
      
      for (const empUser of employeeUsers) {
        try {
          await base44.asServiceRole.entities.User.delete(empUser.id);
          summary.employee_users_deleted++;
        } catch (err) {
          summary.errors.push(`Failed to delete user ${empUser.email}: ${err.message}`);
        }
      }
    } catch (err) {
      summary.errors.push(`User deletion error: ${err.message}`);
    }

    return Response.json({
      success: true,
      message: 'Workforce cleanup completed',
      summary
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});