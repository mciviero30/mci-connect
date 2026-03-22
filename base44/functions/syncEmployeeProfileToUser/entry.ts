import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * ENTITY AUTOMATION: EmployeeProfile → User Sync
 * 
 * Triggered on EmployeeProfile create/update
 * Ensures User record reflects latest EmployeeProfile data
 * Then triggers Directory sync
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data: profile } = await req.json();

    // Skip delete events
    if (event.type === 'delete') {
      return Response.json({ skipped: true, reason: 'Delete event - no sync needed' });
    }

    if (!profile.user_id) {
      return Response.json({ skipped: true, reason: 'No user_id in profile' });
    }

    // Get User record
    const user = await base44.asServiceRole.entities.User.get(profile.user_id);
    if (!user) {
      console.error(`User ${profile.user_id} not found - cannot sync`);
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // SYNC PROFILE → USER
    const userUpdateData = {
      full_name: profile.full_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
      phone: profile.phone || null,
      position: profile.position || null,
      department: profile.department || null,
      team_id: profile.team_id || null,
      team_name: profile.team_name || null,
      employment_status: profile.employment_status || 'active'
    };

    await base44.asServiceRole.entities.User.update(profile.user_id, userUpdateData);
    console.log(`✅ [Auto] Synced EmployeeProfile → User for ${user.email}`);

    // SYNC USER → EMPLOYEE DIRECTORY
    const directoryEntries = await base44.asServiceRole.entities.EmployeeDirectory.filter({
      user_id: profile.user_id
    });

    const directoryData = {
      user_id: profile.user_id,
      employee_email: user.email,
      full_name: profile.full_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
      first_name: profile.first_name || '',
      last_name: profile.last_name || '',
      position: profile.position || '',
      department: profile.department || '',
      phone: profile.phone || '',
      team_id: profile.team_id || '',
      team_name: profile.team_name || '',
      profile_photo_url: user.profile_photo_url || '',
      status: profile.is_active ? 'active' : 'inactive',
      sync_source: 'auto_profile_update',
      last_synced_at: new Date().toISOString()
    };

    if (directoryEntries.length > 0) {
      await base44.asServiceRole.entities.EmployeeDirectory.update(
        directoryEntries[0].id,
        directoryData
      );
      console.log(`✅ [Auto] Updated EmployeeDirectory for ${user.email}`);
    } else {
      await base44.asServiceRole.entities.EmployeeDirectory.create(directoryData);
      console.log(`✅ [Auto] Created EmployeeDirectory for ${user.email}`);
    }

    return Response.json({
      success: true,
      event_type: event.type,
      user_email: user.email,
      synced: {
        profile_to_user: true,
        user_to_directory: true
      }
    });

  } catch (error) {
    console.error('❌ Auto-sync EmployeeProfile→User→Directory failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});