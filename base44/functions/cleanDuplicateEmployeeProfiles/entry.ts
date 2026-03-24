import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * Clean Duplicate EmployeeProfiles
 * For each user_id with multiple profiles, keep the NEWEST one and delete the rest
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const profiles = await base44.asServiceRole.entities.EmployeeProfile.list('', 500);
    
    // Group by user_id
    const byUserId = {};
    profiles.forEach(p => {
      if (!p.user_id) return;
      if (!byUserId[p.user_id]) byUserId[p.user_id] = [];
      byUserId[p.user_id].push(p);
    });

    // Find duplicates
    const duplicates = Object.values(byUserId).filter(group => group.length > 1);
    
    let deletedCount = 0;
    const deletedProfiles = [];

    for (const group of duplicates) {
      // Sort by created_date DESC (newest first)
      group.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      
      // Keep first (newest), delete the rest
      const toKeep = group[0];
      const toDelete = group.slice(1);

      for (const oldProfile of toDelete) {
        await base44.asServiceRole.entities.EmployeeProfile.delete(oldProfile.id);
        deletedProfiles.push({
          id: oldProfile.id,
          full_name: oldProfile.full_name,
          created_date: oldProfile.created_date,
          kept_profile: toKeep.id
        });
        deletedCount++;
      }
    }

    return Response.json({ 
      success: true,
      deleted_count: deletedCount,
      duplicates_cleaned: duplicates.length,
      deleted_profiles: deletedProfiles
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});