import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * ADMIN FUNCTION: Manually activate employee from invitation
 * Use when syncInvitationOnRegister fails or user already registered
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { email } = await req.json();

    if (!email) {
      return Response.json({ error: 'email required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log(`Activating employee: ${normalizedEmail}`);

    // Step 1: Find EmployeeInvitation
    const invitations = await base44.asServiceRole.entities.EmployeeInvitation.filter(
      { email: normalizedEmail },
      '',
      1
    );

    if (!invitations || invitations.length === 0) {
      return Response.json({ error: 'Invitation not found' }, { status: 404 });
    }

    const invitation = invitations[0];

    // Step 2: Find User by email
    const users = await base44.asServiceRole.entities.User.filter(
      { email: normalizedEmail },
      '',
      1
    );

    if (!users || users.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const targetUser = users[0];

    // Step 3: Update invitation to accepted
    await base44.asServiceRole.entities.EmployeeInvitation.update(invitation.id, {
      status: 'accepted',
      accepted_date: new Date().toISOString()
    });

    console.log(`✅ Invitation marked as accepted`);

    // Step 4: Update User employment_status
    await base44.auth.updateMe({
      employment_status: 'active'
    }, targetUser.id);

    console.log(`✅ User employment_status set to active`);

    // Step 5: Create or update EmployeeProfile
    const profiles = await base44.asServiceRole.entities.EmployeeProfile.filter(
      { user_id: targetUser.id },
      '',
      1
    );

    const hireDate = invitation.hire_date || new Date().toISOString().split('T')[0];

    if (profiles && profiles.length > 0) {
      // Update existing
      await base44.asServiceRole.entities.EmployeeProfile.update(profiles[0].id, {
        employment_status: 'active',
        is_active: true,
        hire_date: hireDate
      });
      console.log(`✅ EmployeeProfile updated`);
    } else {
      // Create new
      await base44.asServiceRole.entities.EmployeeProfile.create({
        user_id: targetUser.id,
        first_name: invitation.first_name || targetUser.first_name || '',
        last_name: invitation.last_name || targetUser.last_name || '',
        position: invitation.position || '',
        hire_date: hireDate,
        employment_status: 'active',
        is_active: true,
        employment_type: 'full_time',
        pay_type: 'hourly'
      });
      console.log(`✅ EmployeeProfile created`);
    }

    // Step 6: Create or update EmployeeDirectory
    const directories = await base44.asServiceRole.entities.EmployeeDirectory.filter(
      { employee_email: normalizedEmail },
      '',
      1
    );

    const directoryData = {
      employee_email: targetUser.email,
      user_id: targetUser.id,
      full_name: targetUser.full_name || `${targetUser.first_name || ''} ${targetUser.last_name || ''}`.trim(),
      first_name: targetUser.first_name || '',
      last_name: targetUser.last_name || '',
      position: invitation.position || '',
      department: invitation.department || '',
      phone: invitation.phone || '',
      team_id: invitation.team_id || '',
      team_name: invitation.team_name || '',
      status: 'active',
      sync_source: 'user_direct',
      last_synced_at: new Date().toISOString()
    };

    if (directories && directories.length > 0) {
      await base44.asServiceRole.entities.EmployeeDirectory.update(directories[0].id, directoryData);
      console.log(`✅ EmployeeDirectory updated`);
    } else {
      await base44.asServiceRole.entities.EmployeeDirectory.create(directoryData);
      console.log(`✅ EmployeeDirectory created`);
    }

    return Response.json({
      success: true,
      message: `Employee ${normalizedEmail} activated successfully`,
      invitation_id: invitation.id,
      user_id: targetUser.id
    });

  } catch (error) {
    console.error('Activation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});