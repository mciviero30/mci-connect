import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Reset an employee back to pending status with correct email
 * Deletes from User and EmployeeDirectory, recreates in PendingEmployee
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin' && user?.role !== 'ceo') {
      return Response.json({ 
        error: 'Forbidden: Admin access required' 
      }, { status: 403 });
    }

    const { current_email, correct_email } = await req.json();

    if (!current_email || !correct_email) {
      return Response.json({ 
        error: 'Both current_email and correct_email are required' 
      }, { status: 400 });
    }

    console.log(`🔄 Resetting ${current_email} to pending as ${correct_email}`);

    // Find User
    const allUsers = await base44.asServiceRole.entities.User.list();
    const targetUser = allUsers.find(u => 
      u.email?.toLowerCase().trim() === current_email.toLowerCase().trim()
    );

    if (!targetUser) {
      return Response.json({ 
        error: `No User found with email: ${current_email}` 
      }, { status: 404 });
    }

    // Extract data from User
    const userData = {
      first_name: targetUser.first_name || '',
      last_name: targetUser.last_name || '',
      email: correct_email,
      phone: targetUser.phone || '',
      address: targetUser.address || '',
      position: targetUser.position || 'technician',
      department: targetUser.department || '',
      team_id: targetUser.team_id || '',
      team_name: targetUser.team_name || '',
      dob: targetUser.dob || '',
      ssn_tax_id: targetUser.ssn_tax_id || '',
      tshirt_size: targetUser.tshirt_size || '',
      hourly_rate: targetUser.hourly_rate || 18,
      status: 'pending',
      invitation_count: 0,
      migration_status: 'pending'
    };

    console.log('📦 Creating PendingEmployee:', userData);

    // Create PendingEmployee with correct email
    await base44.asServiceRole.entities.PendingEmployee.create(userData);

    // Delete from EmployeeDirectory
    const allDirectory = await base44.asServiceRole.entities.EmployeeDirectory.list();
    const dirEntries = allDirectory.filter(d => 
      d.employee_email?.toLowerCase().trim() === current_email.toLowerCase().trim()
    );

    for (const entry of dirEntries) {
      await base44.asServiceRole.entities.EmployeeDirectory.delete(entry.id);
      console.log(`🗑️ Deleted EmployeeDirectory entry: ${entry.id}`);
    }

    // Delete User - CRITICAL: This will log them out
    await base44.asServiceRole.entities.User.delete(targetUser.id);
    console.log(`🗑️ Deleted User: ${targetUser.id}`);

    return Response.json({
      success: true,
      message: `Reset complete. ${targetUser.full_name} moved to pending with email ${correct_email}`,
      actions: [
        'Created PendingEmployee',
        `Deleted ${dirEntries.length} EmployeeDirectory entries`,
        'Deleted User account'
      ]
    });

  } catch (error) {
    console.error('Reset error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});