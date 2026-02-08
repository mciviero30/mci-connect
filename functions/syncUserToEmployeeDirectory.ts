import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * SYNC USER TO EMPLOYEE DIRECTORY (Manual Trigger + Auto Fallback)
 * Called when: 
 * - User logs in for first time (Layout fallback)
 * - Admin manually triggers sync
 * - Scheduled daily check for missing entries
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { user_id, user_email } = await req.json();

    // Get user data
    let user;
    if (user_id) {
      const users = await base44.asServiceRole.entities.User.filter({ id: user_id });
      if (users.length === 0) {
        return Response.json({ error: 'User not found' }, { status: 404 });
      }
      user = users[0];
    } else if (user_email) {
      const users = await base44.asServiceRole.entities.User.filter({ email: user_email });
      if (users.length === 0) {
        return Response.json({ error: 'User not found' }, { status: 404 });
      }
      user = users[0];
    } else {
      return Response.json({ error: 'user_id or user_email required' }, { status: 400 });
    }

    // Check if EmployeeDirectory already exists
    const existing = await base44.asServiceRole.entities.EmployeeDirectory.filter({
      employee_email: user.email
    });

    if (existing.length > 0) {
      // Update existing entry with latest User data
      await base44.asServiceRole.entities.EmployeeDirectory.update(existing[0].id, {
        user_id: user.id,
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
        sync_source: 'auto_sync',
        last_synced_at: new Date().toISOString()
      });

      return Response.json({ 
        success: true,
        action: 'updated',
        user_email: user.email
      });
    }

    // Create new EmployeeDirectory entry
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
      sync_source: 'auto_sync',
      last_synced_at: new Date().toISOString()
    });

    return Response.json({ 
      success: true,
      action: 'created',
      user_email: user.email
    });
  } catch (error) {
    console.error('❌ Sync User to EmployeeDirectory failed:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});