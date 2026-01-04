import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Total employee wipe - keeps only marzio.civiero@mci-us.com
 * Deletes ALL other users and ALL PendingEmployee records
 * Admin-only function
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized: Admin only' }, { status: 403 });
    }

    const { keep_email = 'mciviero30@gmail.com' } = await req.json();
    const normalizedKeep = keep_email.toLowerCase().trim();

    const results = {
      users_deleted: 0,
      pending_employees_deleted: 0,
      deleted_users: [],
      errors: []
    };

    // Delete ALL PendingEmployee records
    const pending = await base44.asServiceRole.entities.PendingEmployee.list('-created_date', 100);
    for (const p of pending) {
      try {
        await base44.asServiceRole.entities.PendingEmployee.delete(p.id);
        results.pending_employees_deleted++;
      } catch (error) {
        results.errors.push(`Failed to delete PendingEmployee ${p.email}: ${error.message}`);
      }
    }

    // Delete ALL users except the one we keep
    const users = await base44.asServiceRole.entities.User.list();
    for (const u of users) {
      const normalized = u.email?.toLowerCase().trim();
      if (normalized === normalizedKeep) {
        continue; // Skip the owner
      }

      try {
        await base44.asServiceRole.entities.User.delete(u.id);
        results.users_deleted++;
        results.deleted_users.push(u.email);
      } catch (error) {
        results.errors.push(`Failed to delete User ${u.email}: ${error.message}`);
      }
    }

    return Response.json({
      success: true,
      message: `Total wipe completed. Kept only ${keep_email}`,
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});