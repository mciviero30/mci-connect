import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Transfer data from a PendingEmployee to a User when emails don't match
 * Use case: Employee was invited with email A but registered with email B
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

    const { pending_email, user_email } = await req.json();

    if (!pending_email || !user_email) {
      return Response.json({ 
        error: 'Both pending_email and user_email are required' 
      }, { status: 400 });
    }

    console.log(`🔄 Transferring data from ${pending_email} to ${user_email}`);

    // Find PendingEmployee
    const allPending = await base44.asServiceRole.entities.PendingEmployee.list();
    const pendingEmployee = allPending.find(p => 
      p.email?.toLowerCase().trim() === pending_email.toLowerCase().trim()
    );

    if (!pendingEmployee) {
      return Response.json({ 
        error: `No PendingEmployee found with email: ${pending_email}` 
      }, { status: 404 });
    }

    // Find User
    const allUsers = await base44.asServiceRole.entities.User.list();
    const targetUser = allUsers.find(u => 
      u.email?.toLowerCase().trim() === user_email.toLowerCase().trim()
    );

    if (!targetUser) {
      return Response.json({ 
        error: `No User found with email: ${user_email}` 
      }, { status: 404 });
    }

    // Build update data from pending
    const updateData = {
      first_name: pendingEmployee.first_name,
      last_name: pendingEmployee.last_name,
      phone: pendingEmployee.phone,
      address: pendingEmployee.address,
      position: pendingEmployee.position,
      department: pendingEmployee.department,
      team_id: pendingEmployee.team_id,
      team_name: pendingEmployee.team_name,
      dob: pendingEmployee.dob,
      ssn_tax_id: pendingEmployee.ssn_tax_id,
      tshirt_size: pendingEmployee.tshirt_size,
      hourly_rate: pendingEmployee.hourly_rate,
      full_name: `${pendingEmployee.first_name} ${pendingEmployee.last_name}`.trim()
    };

    console.log('📦 Transferring data:', updateData);

    // Update User
    await base44.asServiceRole.entities.User.update(targetUser.id, updateData);

    // Update EmployeeDirectory
    const allDirectory = await base44.asServiceRole.entities.EmployeeDirectory.list();
    const dirEntry = allDirectory.find(d => 
      d.employee_email?.toLowerCase().trim() === user_email.toLowerCase().trim()
    );

    const directoryData = {
      employee_email: user_email,
      full_name: updateData.full_name,
      first_name: updateData.first_name,
      last_name: updateData.last_name,
      position: updateData.position,
      department: updateData.department,
      phone: updateData.phone,
      team_id: updateData.team_id,
      team_name: updateData.team_name,
      status: 'active',
      sync_source: 'manual_transfer',
      last_synced_at: new Date().toISOString()
    };

    if (dirEntry) {
      await base44.asServiceRole.entities.EmployeeDirectory.update(dirEntry.id, directoryData);
    } else {
      await base44.asServiceRole.entities.EmployeeDirectory.create(directoryData);
    }

    // Delete old PendingEmployee
    await base44.asServiceRole.entities.PendingEmployee.delete(pendingEmployee.id);

    return Response.json({
      success: true,
      message: `Successfully transferred data from ${pending_email} to ${user_email}`,
      transferred_fields: Object.keys(updateData)
    });

  } catch (error) {
    console.error('Transfer error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});