import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Fix User employment_status from 'pending' to 'active'
 * Admin-only function
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized: Admin only' }, { status: 403 });
    }

    const { except_email = 'marzio.civiero@mci-us.com' } = await req.json();

    const users = await base44.asServiceRole.entities.User.list();
    
    const results = {
      users_updated: 0,
      updated_users: [],
      errors: []
    };

    for (const u of users) {
      // Skip protected email
      if (u.email?.toLowerCase().trim() === except_email.toLowerCase().trim()) {
        // But ensure Marzio is active
        if (u.employment_status !== 'active') {
          try {
            await base44.asServiceRole.entities.User.update(u.id, { 
              employment_status: 'active',
              onboarding_completed: true,
              role: 'admin'
            });
            results.users_updated++;
            results.updated_users.push({
              email: u.email,
              action: 'set_to_active_admin'
            });
          } catch (error) {
            results.errors.push(`Failed to update ${u.email}: ${error.message}`);
          }
        }
        continue;
      }

      // Update other users from 'pending' to 'active'
      if (u.employment_status === 'pending') {
        try {
          await base44.asServiceRole.entities.User.update(u.id, { 
            employment_status: 'active',
            role: 'admin'
          });
          results.users_updated++;
          results.updated_users.push({
            email: u.email,
            action: 'pending_to_active'
          });
        } catch (error) {
          results.errors.push(`Failed to update ${u.email}: ${error.message}`);
        }
      }
    }

    return Response.json({
      success: true,
      message: `Fixed ${results.users_updated} user statuses`,
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});