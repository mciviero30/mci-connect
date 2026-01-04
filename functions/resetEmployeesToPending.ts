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
        // Skip the exception user (case insensitive)
        if (u.email?.toLowerCase() === exceptEmail.toLowerCase()) {
          results.users_skipped++;
          continue;
        }

        // Skip if already deleted or pending
        if (u.employment_status === 'deleted' || u.employment_status === 'pending') {
          results.users_skipped++;
          continue;
        }

        // Update User to pending and reset onboarding
        try {
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