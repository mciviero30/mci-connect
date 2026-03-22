import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * AUTO-SYNC EMPLOYEE DIRECTORY ON USER CREATION
 * Entity automation triggered when User is created
 * Creates EmployeeDirectory entry if missing
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    // Only process create events
    if (event.type !== 'create') {
      return Response.json({ skipped: true, reason: 'Not a create event' });
    }

    const user = data;

    // Check if EmployeeDirectory already exists
    const existingEntry = await base44.asServiceRole.entities.EmployeeDirectory.filter({
      employee_email: user.email
    });

    if (existingEntry.length > 0) {
      return Response.json({ 
        skipped: true, 
        reason: 'EmployeeDirectory entry already exists' 
      });
    }

    // Create EmployeeDirectory entry
    const directoryData = {
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
      sync_source: 'auto_on_user_create',
      last_synced_at: new Date().toISOString()
    };

    await base44.asServiceRole.entities.EmployeeDirectory.create(directoryData);

    return Response.json({ 
      success: true,
      user_email: user.email,
      directory_created: true
    });
  } catch (error) {
    console.error('❌ Auto-sync EmployeeDirectory failed:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});