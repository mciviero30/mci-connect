import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * RECOVERY FUNCTION: Sync missing employee data from PendingEmployee to User
 * Use this to fix employees that were invited but didn't get all their data migrated
 * Can be run manually or by admin to force full migration
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Require admin
    if (user?.role !== 'admin' && user?.role !== 'ceo') {
      return Response.json({ 
        error: 'Forbidden: Admin access required' 
      }, { status: 403 });
    }

    const results = {
      total_users_checked: 0,
      total_pending: 0,
      synced: 0,
      already_complete: 0,
      errors: [],
      details: []
    };

    // Get all active users
    const allUsers = await base44.asServiceRole.entities.User.list();
    const allPending = await base44.asServiceRole.entities.PendingEmployee.list();
    
    results.total_users_checked = allUsers.length;
    results.total_pending = allPending.length;

    // For each pending employee, find matching user and sync
    for (const pending of allPending) {
      const pendingEmail = pending.email?.toLowerCase().trim();
      if (!pendingEmail) continue;

      // Find matching user
      const matchingUser = allUsers.find(u => 
        u.email?.toLowerCase().trim() === pendingEmail
      );

      if (!matchingUser) {
        results.details.push({
          email: pending.email,
          status: 'no_user_found',
          message: 'No active user found for this pending employee'
        });
        continue;
      }

      // Build sync data (only migrate if user field is missing/empty)
      const syncData = {};
      
      if (pending.first_name && !matchingUser.first_name) {
        syncData.first_name = pending.first_name;
      }
      if (pending.last_name && !matchingUser.last_name) {
        syncData.last_name = pending.last_name;
      }
      if (pending.phone && !matchingUser.phone) {
        syncData.phone = pending.phone;
      }
      if (pending.address && !matchingUser.address) {
        syncData.address = pending.address;
      }
      if (pending.position && !matchingUser.position) {
        syncData.position = pending.position;
      }
      if (pending.department && !matchingUser.department) {
        syncData.department = pending.department;
      }
      if (pending.team_id && !matchingUser.team_id) {
        syncData.team_id = pending.team_id;
      }
      if (pending.team_name && !matchingUser.team_name) {
        syncData.team_name = pending.team_name;
      }
      if (pending.dob && !matchingUser.dob) {
        syncData.dob = pending.dob;
      }
      if (pending.ssn_tax_id && !matchingUser.ssn_tax_id) {
        syncData.ssn_tax_id = pending.ssn_tax_id;
      }
      if (pending.tshirt_size && !matchingUser.tshirt_size) {
        syncData.tshirt_size = pending.tshirt_size;
      }
      if (pending.hourly_rate && !matchingUser.hourly_rate) {
        syncData.hourly_rate = pending.hourly_rate;
      }
      
      // Fix full_name if only have first/last names
      if (pending.first_name && pending.last_name) {
        const fullName = `${pending.first_name} ${pending.last_name}`.trim();
        if (!matchingUser.full_name || matchingUser.full_name.includes('@') || matchingUser.full_name !== fullName) {
          syncData.full_name = fullName;
        }
      }

      // If nothing to sync, mark as complete
      if (Object.keys(syncData).length === 0) {
        results.already_complete++;
        results.details.push({
          email: pending.email,
          name: matchingUser.full_name || matchingUser.email,
          status: 'already_complete',
          message: 'User already has all data'
        });
        continue;
      }

      // Perform sync
      try {
        await base44.asServiceRole.entities.User.update(matchingUser.id, syncData);
        
        // Also update EmployeeDirectory
        const allDirectory = await base44.asServiceRole.entities.EmployeeDirectory.list();
        const dirEntry = allDirectory.find(d => 
          d.employee_email?.toLowerCase().trim() === pendingEmail
        );
        
        const directoryData = {
          employee_email: matchingUser.email,
          full_name: syncData.full_name || matchingUser.full_name || `${syncData.first_name || matchingUser.first_name} ${syncData.last_name || matchingUser.last_name}`.trim(),
          first_name: syncData.first_name || matchingUser.first_name || '',
          last_name: syncData.last_name || matchingUser.last_name || '',
          position: syncData.position || matchingUser.position || '',
          department: syncData.department || matchingUser.department || '',
          phone: syncData.phone || matchingUser.phone || '',
          team_id: syncData.team_id || matchingUser.team_id || '',
          team_name: syncData.team_name || matchingUser.team_name || '',
          status: 'active',
          sync_source: 'recovery',
          last_synced_at: new Date().toISOString()
        };

        if (dirEntry) {
          await base44.asServiceRole.entities.EmployeeDirectory.update(dirEntry.id, directoryData);
        } else {
          await base44.asServiceRole.entities.EmployeeDirectory.create(directoryData);
        }

        results.synced++;
        results.details.push({
          email: pending.email,
          name: syncData.full_name || matchingUser.full_name,
          status: 'synced',
          fields_synced: Object.keys(syncData),
          message: `Synced ${Object.keys(syncData).length} fields`
        });

      } catch (error) {
        results.errors.push({
          email: pending.email,
          error: error.message
        });
        results.details.push({
          email: pending.email,
          status: 'error',
          error: error.message
        });
      }
    }

    return Response.json({
      success: true,
      summary: {
        total_users_checked: results.total_users_checked,
        total_pending_employees: results.total_pending,
        synced: results.synced,
        already_complete: results.already_complete,
        errors: results.errors.length
      },
      details: results.details,
      errors: results.errors
    });

  } catch (error) {
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});