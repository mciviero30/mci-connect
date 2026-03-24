import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * DAILY USER-DIRECTORY SYNC CHECK
 * Scheduled automation that runs daily at 3am
 * Ensures all Users have EmployeeDirectory entries
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get all active users
    const allUsers = await base44.asServiceRole.entities.User.list();
    const activeUsers = allUsers.filter(u => !u.email.includes('service+'));

    // Get all EmployeeDirectory entries
    const allDirectoryEntries = await base44.asServiceRole.entities.EmployeeDirectory.list();
    const directoryEmails = new Set(allDirectoryEntries.map(e => e.employee_email));

    // Find users missing EmployeeDirectory
    const missingUsers = activeUsers.filter(u => !directoryEmails.has(u.email));

    let created = 0;
    const errors = [];

    // Create missing entries
    for (const user of missingUsers) {
      try {
        await base44.asServiceRole.entities.EmployeeDirectory.create({
          user_id: user.id,
          employee_email: user.email,
          full_name: user.full_name || user.email.split('@')[0],
          first_name: user.first_name || '',
          last_name: user.last_name || '',
          position: user.position || 'Employee',
          department: user.department || '',
          phone: user.phone || '',
          team_id: user.team_id || '',
          team_name: user.team_name || '',
          profile_photo_url: user.profile_photo_url || '',
          status: 'active',
          sync_source: 'daily_check',
          last_synced_at: new Date().toISOString()
        });
        created++;
      } catch (error) {
        errors.push({ email: user.email, error: error.message });
      }
    }

    return Response.json({ 
      success: true,
      total_users: activeUsers.length,
      missing_entries: missingUsers.length,
      created: created,
      errors: errors
    });
  } catch (error) {
    console.error('❌ Daily directory check failed:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});