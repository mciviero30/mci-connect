import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * FIX: Restore correct employment_status for Users
 * Logic: If user has full_name (registered), they should be 'active'
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
      unchanged: 0,
      details: []
    };

    for (const user of allUsers) {
      try {
        const hasRegistered = user.full_name && !user.full_name.includes('@');
        const currentStatus = user.employment_status;
        
        // If user has registered (has full_name), they should be active
        if (hasRegistered && currentStatus !== 'active' && currentStatus !== 'archived' && currentStatus !== 'deleted') {
          await base44.asServiceRole.entities.User.update(user.id, {
            employment_status: 'active'
          });
          
          results.fixed++;
          results.details.push({
            email: user.email,
            name: user.full_name,
            old_status: currentStatus,
            new_status: 'active'
          });
        } else {
          results.unchanged++;
        }

      } catch (error) {
        results.details.push({
          email: user.email,
          error: error.message
        });
      }
    }

    return Response.json({
      success: true,
      ...results,
      message: `Fixed ${results.fixed} employees back to active, ${results.unchanged} unchanged`
    });

  } catch (error) {
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});