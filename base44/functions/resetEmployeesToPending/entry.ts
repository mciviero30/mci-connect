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

    // Get all users from EmployeeDirectory
    try {
      const employees = await base44.asServiceRole.entities.EmployeeDirectory.list('', 1000);
      
      for (const emp of employees) {
        // Skip the exception user (case insensitive)
        if (emp.email?.toLowerCase() === exceptEmail.toLowerCase()) {
          results.users_skipped++;
          continue;
        }

        // Move to pending
        try {
          await base44.asServiceRole.entities.EmployeeDirectory.update(emp.id, {
            employment_status: 'pending',
            onboarding_completed: false
          });

          // Also update User entity if exists
          try {
            const userRecords = await base44.asServiceRole.entities.User.filter({ email: emp.email });
            if (userRecords.length > 0) {
              await base44.asServiceRole.entities.User.update(userRecords[0].id, {
                employment_status: 'pending',
                onboarding_completed: false
              });
            }
          } catch (userError) {
            // User entity might not exist, that's ok
          }

          results.users_moved++;
          results.moved_users.push({
            email: emp.email,
            name: emp.full_name
          });

        } catch (error) {
          results.errors.push(`${emp.email}: ${error.message}`);
        }
      }

    } catch (error) {
      results.errors.push(`Employee fetch error: ${error.message}`);
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