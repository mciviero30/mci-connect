import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * FIX: Change registered users from 'invited' to 'active'
 * Only updates employment_status field
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const currentUser = await base44.auth.me();
    
    if (!currentUser || currentUser.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const allUsers = await base44.asServiceRole.entities.User.list();
    
    const results = {
      fixed: 0,
      errors: [],
      fixed_users: []
    };

    for (const user of allUsers) {
      try {
        // Skip owner
        if (user.email === 'marzio.civiero@mci-us.com' || user.email === 'projects@mci-us.com') {
          continue;
        }

        const hasFullName = user.full_name && !user.full_name.includes('@');
        const isInvitedButRegistered = user.employment_status === 'invited' && hasFullName;
        
        if (isInvitedButRegistered) {
          // ONLY update employment_status, nothing else
          await base44.asServiceRole.entities.User.update(user.id, {
            employment_status: 'active'
          });
          
          results.fixed++;
          results.fixed_users.push({
            email: user.email,
            name: user.full_name
          });
        }

      } catch (error) {
        results.errors.push({
          email: user.email,
          error: error.message
        });
      }
    }

    return Response.json({
      success: true,
      fixed: results.fixed,
      fixed_users: results.fixed_users,
      errors: results.errors,
      message: `Fixed ${results.fixed} employees: invited → active`
    });

  } catch (error) {
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});