import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * ONE-TIME MIGRATION: Move all PendingEmployee data to User entity
 * Run this once to consolidate data
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
      migrated: 0,
      skipped: 0,
      errors: [],
      details: []
    };

    for (const pending of pendingEmployees) {
      try {
        const email = pending.email.toLowerCase().trim();
        
        // Check if user already exists
        const existingUser = existingUsers.find(u => 
          u.email?.toLowerCase().trim() === email
        );

        if (existingUser) {
          results.skipped++;
          results.details.push({
            email,
            status: 'skipped',
            reason: 'User already exists'
          });
          continue;
        }

        // Build full_name
        const firstName = pending.first_name || '';
        const lastName = pending.last_name || '';
        const fullName = firstName && lastName ? `${firstName} ${lastName}`.trim() : email.split('@')[0];

        // Create User from PendingEmployee data
        const userData = {
          email: pending.email,
          full_name: fullName,
          first_name: firstName,
          last_name: lastName,
          phone: pending.phone || '',
          address: pending.address || '',
          dob: pending.dob || '',
          position: pending.position || '',
          department: pending.department || '',
          team_id: pending.team_id || '',
          team_name: pending.team_name || '',
          ssn_tax_id: pending.ssn_tax_id || '',
          tshirt_size: pending.tshirt_size || '',
          hourly_rate: pending.hourly_rate || 25,
          direct_manager_name: pending.direct_manager_name || '',
          employment_status: pending.status === 'invited' ? 'invited' : 'pending_invitation',
          last_invitation_sent: pending.last_invitation_sent || null,
          invitation_count: pending.invitation_count || 0,
          role: 'user'
        };

        await base44.asServiceRole.entities.User.create(userData);
        
        // Delete PendingEmployee after successful migration
        await base44.asServiceRole.entities.PendingEmployee.delete(pending.id);
        
        results.migrated++;
        results.details.push({
          email,
          status: 'migrated',
          employment_status: userData.employment_status
        });

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
      message: `Migrated ${results.migrated} employees, skipped ${results.skipped}, errors: ${results.errors.length}`
    });

  } catch (error) {
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});