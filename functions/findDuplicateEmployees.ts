import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * Diagnostic: Find duplicate employees by user_id
 * Identifies EmployeeProfiles that share the same user_id
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get all EmployeeProfiles
    const profiles = await base44.asServiceRole.entities.EmployeeProfile.list('', 500);
    const users = await base44.asServiceRole.entities.User.list('', 500);
    
    // Group by user_id
    const byUserId = {};
    profiles.forEach(p => {
      if (!p.user_id) return;
      if (!byUserId[p.user_id]) byUserId[p.user_id] = [];
      byUserId[p.user_id].push(p);
    });

    // Find duplicates
    const duplicates = Object.entries(byUserId)
      .filter(([_, profiles]) => profiles.length > 1)
      .map(([userId, profiles]) => {
        const user = users.find(u => u.id === userId);
        return {
          user_id: userId,
          user_email: user?.email,
          user_full_name: user?.full_name,
          count: profiles.length,
          profile_ids: profiles.map(p => p.id),
          profiles: profiles.map(p => ({
            id: p.id,
            full_name: p.full_name,
            email: p.user_id,
            created_date: p.created_date,
            employment_status: p.employment_status
          }))
        };
      });

    return Response.json({ 
      total_duplicates: duplicates.length,
      affected_users: duplicates.length,
      total_extra_profiles: duplicates.reduce((sum, d) => sum + (d.count - 1), 0),
      duplicates
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});