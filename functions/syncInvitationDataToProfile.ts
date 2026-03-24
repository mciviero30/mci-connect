import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find the invitation for this email
    const invitations = await base44.asServiceRole.entities.EmployeeInvitation.filter(
      { email: user.email },
      '',
      1
    );

    if (!invitations.length) {
      return Response.json({ success: true, message: 'No invitation found for this email' });
    }

    const invitation = invitations[0];

    // Find the employee profile by user_id
    const profiles = await base44.asServiceRole.entities.EmployeeProfile.filter(
      { user_id: user.id },
      '',
      1
    );

    if (!profiles.length) {
      return Response.json({ success: true, message: 'No employee profile found' });
    }

    const profile = profiles[0];

    // Merge invitation data into profile (only if profile fields are empty)
    const updateData = {};
    
    if (!profile.first_name && invitation.first_name) {
      updateData.first_name = invitation.first_name;
    }
    if (!profile.last_name && invitation.last_name) {
      updateData.last_name = invitation.last_name;
    }
    if (!profile.position && invitation.position) {
      updateData.position = invitation.position;
    }
    if (!profile.department && invitation.department) {
      updateData.department = invitation.department;
    }
    if (!profile.phone && invitation.phone) {
      updateData.phone = invitation.phone;
    }
    if (!profile.address_line_1 && invitation.address) {
      updateData.address_line_1 = invitation.address;
    }
    if (!profile.date_of_birth && invitation.dob) {
      updateData.date_of_birth = invitation.dob;
    }
    if (!profile.ssn_encrypted && invitation.ssn_tax_id) {
      updateData.ssn_encrypted = invitation.ssn_tax_id;
    }
    if (!profile.team_id && invitation.team_id) {
      updateData.team_id = invitation.team_id;
    }
    if (!profile.team_name && invitation.team_name) {
      updateData.team_name = invitation.team_name;
    }
    if (!profile.hourly_rate && invitation.hourly_rate) {
      updateData.hourly_rate = invitation.hourly_rate;
    }

    // If there's data to merge, update the profile
    if (Object.keys(updateData).length > 0) {
      await base44.asServiceRole.entities.EmployeeProfile.update(profile.id, updateData);
    }

    return Response.json({ 
      success: true, 
      message: 'Invitation data synced to profile',
      fieldsUpdated: Object.keys(updateData).length
    });
  } catch (error) {
    console.error('syncInvitationDataToProfile error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});