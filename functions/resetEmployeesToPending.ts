import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Move all employees to Pending EXCEPT specified user
 * Admin-only function
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized: Admin only' }, { status: 403 });
    }

    const { body } = await req.json();
    const exceptEmail = body?.except_email || 'marzio@mci-us.com';

    const results = {
      users_moved: 0,
      users_skipped: 0,
      except_user: exceptEmail,
      moved_users: [],
      errors: []
    };

    // Get all active users from User entity
    try {
      const users = await base44.asServiceRole.entities.User.list('', 1000);
      
      for (const u of users) {
        // Skip the exception user and admins
        if (u.email === exceptEmail || u.role === 'admin') {
          results.users_skipped++;
          continue;
        }

        // Skip if already deleted or pending
        if (u.employment_status === 'deleted' || u.employment_status === 'pending') {
          results.users_skipped++;
          continue;
        }

        // Create PendingEmployee record
        try {
          await base44.asServiceRole.entities.PendingEmployee.create({
            email: u.email,
            full_name: u.full_name,
            position: u.position,
            department: u.department,
            phone: u.phone,
            hourly_rate: u.hourly_rate,
            date_of_birth: u.date_of_birth,
            address: u.address,
            ssn: u.ssn,
            tshirt_size: u.tshirt_size,
            hire_date: u.hire_date,
            profile_photo_url: u.profile_photo_url,
            avatar_image_url: u.avatar_image_url,
            emergency_contact_name: u.emergency_contact_name,
            emergency_contact_phone: u.emergency_contact_phone,
            emergency_contact_relationship: u.emergency_contact_relationship,
            status: 'pending'
          });

          // Update User to pending
          await base44.asServiceRole.entities.User.update(u.id, {
            employment_status: 'pending',
            onboarding_completed: false
          });

          results.users_moved++;
          results.moved_users.push({
            email: u.email,
            name: u.full_name
          });

        } catch (error) {
          results.errors.push(`${u.email}: ${error.message}`);
        }
      }

    } catch (error) {
      results.errors.push(`User fetch error: ${error.message}`);
    }

    return Response.json({
      success: true,
      message: `Moved ${results.users_moved} employees to pending`,
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Reset employees error:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});