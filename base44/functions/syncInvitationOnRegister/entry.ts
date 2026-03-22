import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * POST-REGISTRATION SYNC FUNCTION
 * 
 * Triggered after successful user registration.
 * Creates EmployeeProfile linked to new user if invitation exists.
 * 
 * Payload:
 * {
 *   user_id: string,
 *   email: string,
 *   full_name: string
 * }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Support both direct call format AND entity automation format
    let user_id, email, full_name;
    if (body.event && body.data) {
      // Entity automation payload: triggered on User create
      const userData = body.data;
      user_id = userData.id;
      email = userData.email;
      full_name = userData.full_name;
      console.log(`[AutoSync] Triggered by entity automation for user: ${email}`);
    } else {
      // Direct call format
      user_id = body.user_id;
      email = body.email;
      full_name = body.full_name;
    }

    if (!user_id || !email) {
      return Response.json({ error: 'user_id and email required' }, { status: 400 });
    }

    // 1. Find EmployeeInvitation by email
    const invitations = await base44.asServiceRole.entities.EmployeeInvitation.filter(
      { email: email.toLowerCase() },
      '',
      1
    );

    if (!invitations || invitations.length === 0) {
      // No invitation found - user registered without invite
      return Response.json({
        success: true,
        message: 'No invitation found - user registered independently',
        user_id
      });
    }

    const invitation = invitations[0];

    // 2. Create EmployeeProfile linked to user
    // Use invitation hire_date or default to today
    const hireDate = invitation.hire_date || new Date().toISOString().split('T')[0];

    const profileData = {
      user_id: user_id,
      first_name: invitation.first_name || full_name?.split(' ')[0] || '',
      last_name: invitation.last_name || full_name?.split(' ')[1] || '',
      full_name: invitation.first_name && invitation.last_name
        ? `${invitation.first_name} ${invitation.last_name}`.trim()
        : full_name || '',
      position: invitation.position || null,
      department: invitation.department || null,
      phone: invitation.phone || null,
      address_line_1: invitation.address || null,
      date_of_birth: invitation.dob || null,
      ssn_encrypted: invitation.ssn_tax_id || null,
      team_id: invitation.team_id || null,
      team_name: invitation.team_name || null,
      hourly_rate: invitation.hourly_rate || null,
      hire_date: hireDate,
      employment_status: 'active',
      is_active: true,
      employment_type: 'full_time',
      pay_type: 'hourly'
    };

    const createdProfile = await base44.asServiceRole.entities.EmployeeProfile.create(profileData);

    // 3. Update invitation: mark as accepted
    await base44.asServiceRole.entities.EmployeeInvitation.update(invitation.id, {
      status: 'accepted',
      accepted_date: new Date().toISOString()
    });

    // 4. Update EmployeeDirectory to active (so admin sees them as active)
    try {
      const dirEntries = await base44.asServiceRole.entities.EmployeeDirectory.filter(
        { employee_email: email.toLowerCase() },
        '',
        1
      );
      if (dirEntries && dirEntries.length > 0) {
        await base44.asServiceRole.entities.EmployeeDirectory.update(dirEntries[0].id, {
          status: 'active',
          user_id: user_id,
          last_synced_at: new Date().toISOString()
        });
      }
    } catch (dirErr) {
      console.log('Note: EmployeeDirectory status update failed:', dirErr.message);
    }

    // 5. Sync additional invitation data to profile (department, phone, address, dob, ssn, team, etc)
    try {
      await base44.asServiceRole.functions.invoke('syncInvitationDataToProfile', { userId: user_id });
    } catch (syncErr) {
      console.log('Note: Data sync partially completed - some fields may not have been copied', syncErr.message);
    }

    return Response.json({
      success: true,
      message: 'Invitation accepted - EmployeeProfile created',
      user_id,
      profile_id: createdProfile.id,
      invitation_id: invitation.id
    });

  } catch (error) {
    console.error('Sync invitation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});