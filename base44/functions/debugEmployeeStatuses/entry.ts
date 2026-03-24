import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * DEBUG: Check actual User data and employment_status
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const currentUser = await base44.auth.me();
    
    if (!currentUser || currentUser.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const allUsers = await base44.asServiceRole.entities.User.list();
    
    const analysis = {
      total: allUsers.length,
      by_status: {},
      registered_users: [],
      pending_users: []
    };

    for (const user of allUsers) {
      const status = user.employment_status || 'none';
      analysis.by_status[status] = (analysis.by_status[status] || 0) + 1;
      
      const hasFullName = user.full_name && !user.full_name.includes('@');
      
      if (hasFullName) {
        analysis.registered_users.push({
          email: user.email,
          full_name: user.full_name,
          employment_status: status,
          role: user.role
        });
      } else {
        analysis.pending_users.push({
          email: user.email,
          full_name: user.full_name || 'none',
          employment_status: status,
          role: user.role
        });
      }
    }

    return Response.json({
      success: true,
      analysis,
      message: `Found ${analysis.registered_users.length} registered users, ${analysis.pending_users.length} pending/invited`
    });

  } catch (error) {
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});