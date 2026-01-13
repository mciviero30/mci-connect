import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'admin' && user.position !== 'CEO')) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get all pending employees
    const pending = await base44.asServiceRole.entities.PendingEmployee.list();
    
    // Delete all
    let deleted = 0;
    const errors = [];

    for (const emp of pending) {
      try {
        await base44.asServiceRole.entities.PendingEmployee.delete(emp.id);
        deleted++;
      } catch (error) {
        errors.push({ email: emp.email, error: error.message });
      }
    }

    // Also clean up invited users (employment_status = 'invited')
    const users = await base44.asServiceRole.entities.User.list();
    const invitedUsers = users.filter(u => u.employment_status === 'invited');
    
    let invitedDeleted = 0;
    for (const user of invitedUsers) {
      try {
        await base44.asServiceRole.entities.User.update(user.id, { 
          employment_status: 'deleted' 
        });
        invitedDeleted++;
      } catch (error) {
        errors.push({ email: user.email, error: error.message });
      }
    }

    return Response.json({
      success: true,
      pending_deleted: deleted,
      invited_deleted: invitedDeleted,
      total_deleted: deleted + invitedDeleted,
      errors: errors.length > 0 ? errors : null
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    return Response.json({ 
      error: 'Cleanup failed',
      details: error.message 
    }, { status: 500 });
  }
});