import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const ADMIN_ROLES = ['admin', 'ceo', 'owner', 'super_admin', 'administrator'];
    if (!ADMIN_ROLES.includes(caller.role?.toLowerCase?.())) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { enabled, reason } = await req.json().catch(() => ({}));

    await base44.asServiceRole.entities.AuditLog.create({
      action:     'strict_mode_toggle',
      user_id:    caller.id,
      user_email: caller.email,
      timestamp:  new Date().toISOString(),
      details:    JSON.stringify({ strict_mode_enabled: enabled, reason: reason || '' }),
    }).catch(() => {});

    console.log(`[auditStrictModeToggle] ${caller.email} set strict_mode=${enabled}`);
    return Response.json({ ok: true, strict_mode_enabled: enabled });

  } catch (err) {
    console.error('[auditStrictModeToggle] error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});
