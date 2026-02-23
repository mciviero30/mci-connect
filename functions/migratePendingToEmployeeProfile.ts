import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * MIGRATION FUNCTION: PendingEmployee → EmployeeProfile
 * Triggered when a PendingEmployee is registered (gets user_id)
 * 
 * Creates EmployeeProfile + updates PendingEmployee status
 * Ensures 1:1 relationship between User and EmployeeProfile
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pending_employee_id } = await req.json();

    if (!pending_employee_id) {
      return Response.json({ error: 'pending_employee_id required' }, { status: 400 });
    }

    // 1. Fetch PendingEmployee record
    const pending = await base44.asServiceRole.entities.PendingEmployee.filter(
      { id: pending_employee_id },
      '',
      1
    );

    if (!pending || pending.length === 0) {
      return Response.json({ error: 'PendingEmployee not found' }, { status: 404 });
    }

    const pendingEmp = pending[0];

    // 2. Check if EmployeeProfile already exists for this user
    const existing = await base44.asServiceRole.entities.EmployeeProfile.filter(
      { user_id: user.id },
      '',
      1
    );

    if (existing && existing.length > 0) {
      // Profile already exists - just update PendingEmployee status
      await base44.asServiceRole.entities.PendingEmployee.update(pending_employee_id, {
        user_id: user.id,
        status: 'active',
        registered_date: new Date().toISOString(),
        migration_status: 'success'
      });

      return Response.json({
        success: true,
        message: 'EmployeeProfile already exists',
        user_id: user.id
      });
    }

    // 3. Create EmployeeProfile from PendingEmployee
    const profileData = {
      user_id: user.id,
      first_name: pendingEmp.first_name || '',
      last_name: pendingEmp.last_name || '',
      full_name: `${pendingEmp.first_name || ''} ${pendingEmp.last_name || ''}`.trim(),
      position: pendingEmp.position || null,
      phone: pendingEmp.phone || null,
      department: pendingEmp.department || null,
      hourly_rate: pendingEmp.hourly_rate || null,
      hire_date: new Date().toISOString().split('T')[0], // Today
      employment_status: 'active',
      is_active: true,
      employment_type: 'full_time',
      pay_type: 'hourly',
      invited_at: new Date().toISOString()
    };

    const createdProfile = await base44.asServiceRole.entities.EmployeeProfile.create(profileData);

    // 4. Update PendingEmployee: mark as migrated
    await base44.asServiceRole.entities.PendingEmployee.update(pending_employee_id, {
      user_id: user.id,
      status: 'active',
      registered_date: new Date().toISOString(),
      migrated_to_user_id: user.id,
      migrated_at: new Date().toISOString(),
      migration_status: 'success'
    });

    return Response.json({
      success: true,
      message: 'Migration successful',
      user_id: user.id,
      profile_id: createdProfile.id
    });

  } catch (error) {
    console.error('Migration error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});