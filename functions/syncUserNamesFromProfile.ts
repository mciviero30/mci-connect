import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get all EmployeeProfiles with user_id
    const profiles = await base44.asServiceRole.entities.EmployeeProfile.filter({ 
      user_id: { $ne: null } 
    });

    const updates = [];
    const errors = [];

    for (const profile of profiles) {
      try {
        // Get the User record
        const users = await base44.asServiceRole.entities.User.filter({ 
          id: profile.user_id 
        });

        if (users.length === 0) {
          errors.push({ user_id: profile.user_id, error: 'User not found' });
          continue;
        }

        const userRecord = users[0];
        const profileFullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();

        // Check if names are different
        if (userRecord.full_name !== profileFullName && profileFullName) {
          // Update User.full_name to match EmployeeProfile
          await base44.asServiceRole.entities.User.update(userRecord.id, {
            full_name: profileFullName
          });

          updates.push({
            email: userRecord.email,
            old_name: userRecord.full_name,
            new_name: profileFullName
          });
        }
      } catch (error) {
        errors.push({ 
          user_id: profile.user_id, 
          error: error.message 
        });
      }
    }

    return Response.json({
      success: true,
      updates_count: updates.length,
      updates,
      errors_count: errors.length,
      errors
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});