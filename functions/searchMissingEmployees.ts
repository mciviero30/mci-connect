import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Search for specific missing employees in both User and PendingEmployee
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const currentUser = await base44.auth.me();
    
    if (!currentUser || currentUser.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const searchNames = [
      'civiero18ge',
      'rigoberto.pena',
      'angelo.civiero',
      'juancaricote08',
      'rojasdoranteraul',
      'alexandergarciagro',
      'cathihuizacheleonel',
      'ladinojhonatan120'
    ];

    const allUsers = await base44.asServiceRole.entities.User.list();
    const allPending = await base44.asServiceRole.entities.PendingEmployee.list();

    const results = {
      found_in_users: [],
      found_in_pending: [],
      not_found: []
    };

    for (const name of searchNames) {
      const lowerName = name.toLowerCase();
      
      // Check User entity
      const userMatch = allUsers.find(u => 
        u.email?.toLowerCase().includes(lowerName) ||
        u.full_name?.toLowerCase().includes(lowerName) ||
        u.first_name?.toLowerCase().includes(lowerName) ||
        u.last_name?.toLowerCase().includes(lowerName)
      );
      
      // Check PendingEmployee entity
      const pendingMatch = allPending.find(p => 
        p.email?.toLowerCase().includes(lowerName) ||
        p.first_name?.toLowerCase().includes(lowerName) ||
        p.last_name?.toLowerCase().includes(lowerName)
      );

      if (userMatch) {
        results.found_in_users.push({
          search: name,
          email: userMatch.email,
          name: userMatch.full_name,
          status: userMatch.employment_status,
          role: userMatch.role
        });
      } else if (pendingMatch) {
        results.found_in_pending.push({
          search: name,
          email: pendingMatch.email,
          first_name: pendingMatch.first_name,
          last_name: pendingMatch.last_name,
          status: pendingMatch.status
        });
      } else {
        results.not_found.push(name);
      }
    }

    return Response.json({
      success: true,
      results,
      summary: {
        in_users: results.found_in_users.length,
        in_pending: results.found_in_pending.length,
        missing: results.not_found.length
      }
    });

  } catch (error) {
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});