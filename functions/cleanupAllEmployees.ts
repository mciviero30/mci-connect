import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin-only access
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const result = {
      deleted_profiles: 0,
      deleted_users: 0,
      errors: [],
      timestamp: new Date().toISOString(),
      final_status: 'success'
    };

    console.log('🗑️  Cleaning up all employee profiles...');

    // Delete all EmployeeProfile records
    try {
      let offset = 0;
      let hasMore = true;
      
      while (hasMore) {
        const profiles = await base44.asServiceRole.entities.EmployeeProfile.list('', 100);
        
        if (profiles.length === 0) {
          hasMore = false;
          break;
        }

        for (const profile of profiles) {
          try {
            await base44.asServiceRole.entities.EmployeeProfile.delete(profile.id);
            result.deleted_profiles++;
          } catch (err) {
            console.error(`Failed to delete profile ${profile.id}:`, err.message);
            result.errors.push({ type: 'profile', id: profile.id, error: err.message });
          }
        }

        if (profiles.length < 100) {
          hasMore = false;
        }
      }
    } catch (err) {
      console.error('Error deleting profiles:', err.message);
      result.errors.push({ type: 'profile_batch', error: err.message });
    }

    console.log('🗑️  Cleaning up employee users...');

    // Delete all User records with role 'employee' (keep admin users)
    try {
      let offset = 0;
      let hasMore = true;
      
      while (hasMore) {
        const users = await base44.asServiceRole.entities.User.list('', 100);
        
        if (users.length === 0) {
          hasMore = false;
          break;
        }

        for (const u of users) {
          // Only delete employee users, keep admin users
          if (u.role === 'employee' || u.role === 'user') {
            try {
              await base44.asServiceRole.entities.User.delete(u.id);
              result.deleted_users++;
            } catch (err) {
              console.error(`Failed to delete user ${u.id}:`, err.message);
              result.errors.push({ type: 'user', id: u.id, error: err.message });
            }
          }
        }

        if (users.length < 100) {
          hasMore = false;
        }
      }
    } catch (err) {
      console.error('Error deleting users:', err.message);
      result.errors.push({ type: 'user_batch', error: err.message });
    }

    if (result.errors.length > 0) {
      result.final_status = 'partial_success';
    }

    console.log(`✅ Cleanup complete: ${result.deleted_profiles} profiles, ${result.deleted_users} users deleted`);

    return Response.json(result);

  } catch (error) {
    console.error('Function error:', error.message);
    return Response.json({
      error: error.message,
      final_status: 'failed',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
});