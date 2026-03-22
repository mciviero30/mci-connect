import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * ADMIN REPAIR FUNCTION
 * 
 * Syncs ALL existing EmployeeProfile records to User and EmployeeDirectory
 * Use this to repair historical data issues
 * 
 * Admin/CEO only
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'admin' && user.role !== 'ceo')) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get all EmployeeProfiles with user_id
    const profiles = await base44.asServiceRole.entities.EmployeeProfile.filter({
      is_active: true
    });

    const results = {
      total: profiles.length,
      synced: 0,
      skipped: 0,
      errors: []
    };

    for (const profile of profiles) {
      if (!profile.user_id) {
        results.skipped++;
        continue;
      }

      try {
        // Get User record
        const userRecord = await base44.asServiceRole.entities.User.get(profile.user_id);
        if (!userRecord) {
          results.errors.push({ profile_id: profile.id, error: 'User not found' });
          continue;
        }

        // SYNC PROFILE → USER
        const fullName = profile.full_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
        
        await base44.asServiceRole.entities.User.update(profile.user_id, {
          full_name: fullName,
          phone: profile.phone || null,
          position: profile.position || null,
          department: profile.department || null,
          team_id: profile.team_id || null,
          team_name: profile.team_name || null,
          employment_status: profile.employment_status || 'active'
        });

        // SYNC USER → EMPLOYEE DIRECTORY
        const directoryEntries = await base44.asServiceRole.entities.EmployeeDirectory.filter({
          user_id: profile.user_id
        });

        const directoryData = {
          user_id: profile.user_id,
          employee_email: userRecord.email,
          full_name: fullName,
          first_name: profile.first_name || '',
          last_name: profile.last_name || '',
          position: profile.position || '',
          department: profile.department || '',
          phone: profile.phone || '',
          team_id: profile.team_id || '',
          team_name: profile.team_name || '',
          profile_photo_url: userRecord.profile_photo_url || '',
          status: profile.is_active ? 'active' : 'inactive',
          sync_source: 'admin_bulk_sync',
          last_synced_at: new Date().toISOString()
        };

        if (directoryEntries.length > 0) {
          await base44.asServiceRole.entities.EmployeeDirectory.update(
            directoryEntries[0].id,
            directoryData
          );
        } else {
          await base44.asServiceRole.entities.EmployeeDirectory.create(directoryData);
        }

        results.synced++;
        console.log(`✅ Synced ${userRecord.email}`);

      } catch (error) {
        results.errors.push({ 
          profile_id: profile.id, 
          error: error.message 
        });
      }
    }

    return Response.json({
      success: true,
      results,
      message: `Synced ${results.synced} of ${results.total} employees`
    });

  } catch (error) {
    console.error('❌ Bulk sync failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});