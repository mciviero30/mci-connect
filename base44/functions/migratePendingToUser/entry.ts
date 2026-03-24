import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * ONE-TIME MIGRATION: Merge PendingEmployee data into existing User records
 * Updates existing Users with PendingEmployee data and deletes PendingEmployee records
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const currentUser = await base44.auth.me();
    
    if (!currentUser || currentUser.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const pendingEmployees = await base44.asServiceRole.entities.PendingEmployee.list();
    const existingUsers = await base44.asServiceRole.entities.User.list();
    
    const results = {
      updated: 0,
      needsInvitation: [],
      deleted: 0,
      errors: [],
      details: []
    };

    for (const pending of pendingEmployees) {
      try {
        const email = pending.email.toLowerCase().trim();
        
        // Find matching User
        const matchedUser = existingUsers.find(u => 
          u.email?.toLowerCase().trim() === email
        );

        if (matchedUser) {
          // User exists - update with PendingEmployee data
          const firstName = pending.first_name || matchedUser.first_name || '';
          const lastName = pending.last_name || matchedUser.last_name || '';
          
          const updateData = {
            first_name: firstName,
            last_name: lastName,
            phone: pending.phone || matchedUser.phone || '',
            address: pending.address || matchedUser.address || '',
            dob: pending.dob || matchedUser.dob || '',
            position: pending.position || matchedUser.position || '',
            department: pending.department || matchedUser.department || '',
            team_id: pending.team_id || matchedUser.team_id || '',
            team_name: pending.team_name || matchedUser.team_name || '',
            ssn_tax_id: pending.ssn_tax_id || matchedUser.ssn_tax_id || '',
            tshirt_size: pending.tshirt_size || matchedUser.tshirt_size || '',
            hourly_rate: pending.hourly_rate || matchedUser.hourly_rate || 25,
            direct_manager_name: pending.direct_manager_name || matchedUser.direct_manager_name || '',
            employment_status: pending.status === 'invited' ? 'invited' : 
                              pending.status === 'active' ? 'active' : 
                              matchedUser.employment_status || 'active',
            last_invitation_sent: pending.last_invitation_sent || matchedUser.last_invitation_sent,
            invitation_count: pending.invitation_count || matchedUser.invitation_count || 0
          };

          await base44.asServiceRole.entities.User.update(matchedUser.id, updateData);
          
          // Delete PendingEmployee after successful merge
          await base44.asServiceRole.entities.PendingEmployee.delete(pending.id);
          
          results.updated++;
          results.deleted++;
          results.details.push({
            email,
            status: 'merged',
            action: 'Updated User, deleted PendingEmployee'
          });

        } else {
          // No matching User - needs invitation first
          results.needsInvitation.push({
            email,
            name: `${pending.first_name} ${pending.last_name}`.trim(),
            position: pending.position
          });
          
          results.details.push({
            email,
            status: 'needs_invitation',
            action: 'Kept PendingEmployee - invite manually first'
          });
        }

      } catch (error) {
        results.errors.push({
          email: pending.email,
          error: error.message
        });
      }
    }

    return Response.json({
      success: true,
      ...results,
      message: `Updated ${results.updated} users, deleted ${results.deleted} pending records. ${results.needsInvitation.length} employees need invitation first.`
    });

  } catch (error) {
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});