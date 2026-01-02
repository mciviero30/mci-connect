import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * ADMIN-ONLY UTILITY
 * Rebuilds EmployeeDirectory from all User records
 * Use when directory is out of sync or empty
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // ADMIN CHECK
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const results = {
      processed: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: []
    };

    // Get all users
    const allUsers = await base44.asServiceRole.entities.User.list();
    const activeUsers = allUsers.filter(u => 
      u.employment_status === 'active' || !u.employment_status
    );

    results.processed = activeUsers.length;

    // Get existing directory entries
    const allDirectory = await base44.asServiceRole.entities.EmployeeDirectory.list();
    
    for (const employee of activeUsers) {
      try {
        const email = employee.email.toLowerCase().trim();
        const existing = allDirectory.find(d => 
          d.employee_email && d.employee_email.toLowerCase().trim() === email
        );

        const directoryData = {
          employee_email: employee.email,
          full_name: employee.full_name || `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || employee.email.split('@')[0],
          first_name: employee.first_name || '',
          last_name: employee.last_name || '',
          position: employee.position || '',
          department: employee.department || '',
          phone: employee.phone || '',
          team_id: employee.team_id || '',
          team_name: employee.team_name || '',
          profile_photo_url: employee.profile_photo_url || employee.avatar_image_url || '',
          status: 'active',
          sync_source: 'manual',
          last_synced_at: new Date().toISOString()
        };

        if (existing) {
          await base44.asServiceRole.entities.EmployeeDirectory.update(existing.id, directoryData);
          results.updated++;
        } else {
          await base44.asServiceRole.entities.EmployeeDirectory.create(directoryData);
          results.created++;
        }
      } catch (error) {
        results.errors.push({
          email: employee.email,
          error: error.message
        });
      }
    }

    return Response.json({ 
      success: true,
      results 
    });

  } catch (error) {
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});