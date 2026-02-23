import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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
    const { user_id, email, full_name } = await req.json();

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
    const profileData = {
      user_id: user_id,
      first_name: invitation.first_name || full_name?.split(' ')[0] || '',
      last_name: invitation.last_name || full_name?.split(' ')[1] || '',
      position: invitation.position || null,
      hire_date: new Date().toISOString().split('T')[0], // Today
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