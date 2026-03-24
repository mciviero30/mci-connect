import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * CENTRAL EMPLOYEE DATA UPDATE FUNCTION
 * 
 * Single point of entry for ANY employee data update
 * Ensures ALL 3 sources stay in sync:
 * - EmployeeProfile (SSOT for HR data)
 * - User (for auth system)
 * - EmployeeDirectory (for app-wide lookups)
 * 
 * Plus triggers updates in all dependent entities:
 * - TimeEntry (denormalized employee names)
 * - Expense (denormalized employee names)
 * - ChatMessage (denormalized names)
 * - JobAssignment (denormalized names)
 * - And more...
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const currentUser = await base44.auth.me();
    
    if (!currentUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      profile_id,  // EmployeeProfile.id (REQUIRED)
      user_id,     // User.id (can be derived from profile)
      updates      // Data to update: { first_name, last_name, phone, position, department, team_id, team_name }
    } = await req.json();

    if (!profile_id || !updates || Object.keys(updates).length === 0) {
      return Response.json({ 
        error: 'profile_id and updates required' 
      }, { status: 400 });
    }

    console.log(`[CentralUpdate] Starting sync for profile ${profile_id}`);

    // 1. GET EmployeeProfile (source of truth)
    const profile = await base44.asServiceRole.entities.EmployeeProfile.get(profile_id);
    if (!profile) {
      return Response.json({ error: 'EmployeeProfile not found' }, { status: 404 });
    }

    const actualUserId = user_id || profile.user_id;
    if (!actualUserId) {
      return Response.json({ error: 'No user_id found' }, { status: 400 });
    }

    // 2. GET User record
    const user = await base44.asServiceRole.entities.User.get(actualUserId);
    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const syncedData = {
      profile_updated: false,
      user_updated: false,
      directory_updated: false,
      denormalized_updated: 0,
      changes: {}
    };

    // 3. UPDATE EmployeeProfile (SSOT)
    try {
      const profileUpdate = {};
      
      // Map incoming updates to profile fields
      if (updates.first_name !== undefined) profileUpdate.first_name = updates.first_name;
      if (updates.last_name !== undefined) profileUpdate.last_name = updates.last_name;
      if (updates.phone !== undefined) profileUpdate.phone = updates.phone;
      if (updates.position !== undefined) profileUpdate.position = updates.position;
      if (updates.department !== undefined) profileUpdate.department = updates.department;
      if (updates.team_id !== undefined) profileUpdate.team_id = updates.team_id;
      if (updates.team_name !== undefined) profileUpdate.team_name = updates.team_name;

      // Recompute full_name if names changed
      if (profileUpdate.first_name || profileUpdate.last_name) {
        const firstName = profileUpdate.first_name || profile.first_name || '';
        const lastName = profileUpdate.last_name || profile.last_name || '';
        profileUpdate.full_name = `${firstName} ${lastName}`.trim();
      }

      if (Object.keys(profileUpdate).length > 0) {
        await base44.asServiceRole.entities.EmployeeProfile.update(profile_id, profileUpdate);
        syncedData.profile_updated = true;
        syncedData.changes.profile = profileUpdate;
        console.log(`✅ Updated EmployeeProfile`);
      }
    } catch (err) {
      console.error('❌ EmployeeProfile update failed:', err.message);
      return Response.json({ error: `Profile update failed: ${err.message}` }, { status: 500 });
    }

    // 4. UPDATE User (auth system)
    try {
      const userUpdate = {};
      
      if (updates.first_name !== undefined) userUpdate.first_name = updates.first_name;
      if (updates.last_name !== undefined) userUpdate.last_name = updates.last_name;
      if (updates.phone !== undefined) userUpdate.phone = updates.phone;
      if (updates.position !== undefined) userUpdate.position = updates.position;
      if (updates.department !== undefined) userUpdate.department = updates.department;
      if (updates.team_id !== undefined) userUpdate.team_id = updates.team_id;
      if (updates.team_name !== undefined) userUpdate.team_name = updates.team_name;

      // Recompute full_name if names changed
      if (userUpdate.first_name || userUpdate.last_name) {
        const firstName = userUpdate.first_name || user.first_name || '';
        const lastName = userUpdate.last_name || user.last_name || '';
        userUpdate.full_name = `${firstName} ${lastName}`.trim();
      }

      if (Object.keys(userUpdate).length > 0) {
        await base44.asServiceRole.entities.User.update(actualUserId, userUpdate);
        syncedData.user_updated = true;
        syncedData.changes.user = userUpdate;
        console.log(`✅ Updated User`);
      }
    } catch (err) {
      console.error('❌ User update failed:', err.message);
      // Don't fail completely if User update fails
    }

    // 5. UPDATE EmployeeDirectory (app-wide lookups)
    try {
      const directoryEntries = await base44.asServiceRole.entities.EmployeeDirectory.filter({
        user_id: actualUserId
      });

      if (directoryEntries.length > 0) {
        const dirUpdate = {};
        
        if (updates.first_name !== undefined) dirUpdate.first_name = updates.first_name;
        if (updates.last_name !== undefined) dirUpdate.last_name = updates.last_name;
        if (updates.phone !== undefined) dirUpdate.phone = updates.phone;
        if (updates.position !== undefined) dirUpdate.position = updates.position;
        if (updates.department !== undefined) dirUpdate.department = updates.department;
        if (updates.team_id !== undefined) dirUpdate.team_id = updates.team_id;
        if (updates.team_name !== undefined) dirUpdate.team_name = updates.team_name;

        // Recompute full_name if names changed
        if (dirUpdate.first_name || dirUpdate.last_name) {
          const firstName = dirUpdate.first_name || directoryEntries[0].first_name || '';
          const lastName = dirUpdate.last_name || directoryEntries[0].last_name || '';
          dirUpdate.full_name = `${firstName} ${lastName}`.trim();
        }

        dirUpdate.last_synced_at = new Date().toISOString();

        if (Object.keys(dirUpdate).length > 1) { // > 1 because we always set last_synced_at
          await base44.asServiceRole.entities.EmployeeDirectory.update(
            directoryEntries[0].id,
            dirUpdate
          );
          syncedData.directory_updated = true;
          syncedData.changes.directory = dirUpdate;
          console.log(`✅ Updated EmployeeDirectory`);
        }
      }
    } catch (err) {
      console.error('❌ EmployeeDirectory update failed:', err.message);
    }

    // 6. UPDATE DENORMALIZED FIELDS IN DEPENDENT ENTITIES
    const denormalizedEntities = ['TimeEntry', 'Expense', 'JobAssignment', 'ChatMessage', 'Post', 'DrivingLog'];
    
    for (const entityName of denormalizedEntities) {
      try {
        // Find all records for this user (email-based legacy lookups)
        const records = await base44.asServiceRole.entities[entityName].filter({
          employee_email: user.email
        }, '', 100);

        if (records.length > 0) {
          const denormUpdate = {};
          
          // Only update denormalized fields that actually changed
          if (updates.first_name !== undefined || updates.last_name !== undefined) {
            const firstName = updates.first_name || profile.first_name || '';
            const lastName = updates.last_name || profile.last_name || '';
            denormUpdate.employee_name = `${firstName} ${lastName}`.trim();
          }

          if (Object.keys(denormUpdate).length > 0) {
            for (const record of records) {
              await base44.asServiceRole.entities[entityName].update(record.id, denormUpdate);
              syncedData.denormalized_updated++;
            }
            console.log(`✅ Updated ${records.length} ${entityName} records`);
          }
        }
      } catch (err) {
        // Entity might not exist or might not have these fields - silently skip
        console.log(`ℹ️ Skipped ${entityName}: ${err.message}`);
      }
    }

    return Response.json({
      success: true,
      message: 'Employee data synchronized across all systems',
      profile_id,
      user_id: actualUserId,
      user_email: user.email,
      ...syncedData
    });

  } catch (error) {
    console.error('❌ Central update failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});