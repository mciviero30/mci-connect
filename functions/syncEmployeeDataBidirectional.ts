import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * BIDIRECTIONAL EMPLOYEE DATA SYNC
 * 
 * Ensures EmployeeProfile → User → EmployeeDirectory sync
 * Triggered on EmployeeProfile updates
 * 
 * Flow:
 * 1. EmployeeProfile (source of truth for employee data)
 * 2. → Sync to User (for auth system integration)
 * 3. → Sync to EmployeeDirectory (for app-wide employee lookups)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { user_id, profile_id } = await req.json();

    if (!user_id && !profile_id) {
      return Response.json({ error: 'user_id or profile_id required' }, { status: 400 });
    }

    // 1. Get EmployeeProfile (source of truth)
    let profile;
    if (profile_id) {
      profile = await base44.asServiceRole.entities.EmployeeProfile.get(profile_id);
    } else {
      const profiles = await base44.asServiceRole.entities.EmployeeProfile.filter({ user_id });
      if (profiles.length === 0) {
        return Response.json({ error: 'EmployeeProfile not found' }, { status: 404 });
      }
      profile = profiles[0];
    }

    // 2. Get User record
    const user = await base44.asServiceRole.entities.User.get(profile.user_id);
    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // REPAIR: If EmployeeProfile missing team_id, try to find it from EmployeeInvitation
    let team_id = profile.team_id;
    let team_name = profile.team_name;
    
    if (!team_id && user.email) {
      const invitations = await base44.asServiceRole.entities.EmployeeInvitation.filter({
        email: user.email.toLowerCase()
      });
      if (invitations.length > 0) {
        team_id = invitations[0].team_id || team_id;
        team_name = invitations[0].team_name || team_name;
      }
    }

    // 3. SYNC PROFILE → USER
    const userUpdateData = {
      full_name: profile.full_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
      phone: profile.phone || null,
      position: profile.position || null,
      department: profile.department || null,
      team_id: team_id || null,
      team_name: team_name || null,
      employment_status: profile.employment_status || 'active'
    };

    await base44.asServiceRole.entities.User.update(profile.user_id, userUpdateData);
    console.log(`✅ Synced EmployeeProfile → User for ${user.email}`);

    // 4. SYNC USER → EMPLOYEE DIRECTORY
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
      team_id: team_id || '',
      team_name: team_name || '',
      profile_photo_url: user.profile_photo_url || '',
      status: profile.is_active ? 'active' : 'inactive',
      sync_source: 'user_direct',
      last_synced_at: new Date().toISOString()
    };

    if (directoryEntries.length > 0) {
      // Update existing
      await base44.asServiceRole.entities.EmployeeDirectory.update(
        directoryEntries[0].id,
        directoryData
      );
      console.log(`✅ Updated EmployeeDirectory for ${user.email}`);
    } else {
      // Create new
      await base44.asServiceRole.entities.EmployeeDirectory.create(directoryData);
      console.log(`✅ Created EmployeeDirectory for ${user.email}`);
    }

    return Response.json({
      success: true,
      synced: {
        profile_to_user: true,
        user_to_directory: true
      },
      user_email: user.email
    });

  } catch (error) {
    console.error('❌ Bidirectional sync failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});