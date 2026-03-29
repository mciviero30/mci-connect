import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const ADMIN_ROLES = ['admin', 'ceo', 'owner', 'super_admin', 'administrator'];
    if (!ADMIN_ROLES.includes(caller.role?.toLowerCase?.()) && caller.position !== 'CEO') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const allPending = await base44.asServiceRole.entities.PendingEmployee
      .list('', 500).catch(() => []);

    // Delete all pending employees that haven't been migrated or are test data
    const toDelete = allPending.filter(p =>
      p.status === 'pending' || p.status === 'invited' || !p.migrated
    );

    let pending_deleted = 0;
    let invited_deleted = 0;

    for (const emp of toDelete) {
      try {
        await base44.asServiceRole.entities.PendingEmployee.delete(emp.id);
        if (emp.status === 'invited') invited_deleted++;
        else pending_deleted++;
      } catch (err) {
        console.error('Failed to delete pending employee:', emp.id, err.message);
      }
    }

    const total_deleted = pending_deleted + invited_deleted;
    console.log(`[cleanupPendingEmployees] Deleted ${total_deleted} records`);
    return Response.json({ ok: true, total_deleted, pending_deleted, invited_deleted });

  } catch (err) {
    console.error('[cleanupPendingEmployees] error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});
