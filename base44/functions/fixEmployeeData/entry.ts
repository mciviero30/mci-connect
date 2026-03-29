import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const ADMIN_ROLES = ['admin', 'ceo', 'owner', 'super_admin', 'administrator'];
    if (!ADMIN_ROLES.includes(caller.role?.toLowerCase?.()) && caller.position !== 'CEO') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { employeeId, type, first_name, last_name, full_name } = await req.json();
    if (!employeeId || !first_name || !last_name) {
      return Response.json({ error: 'employeeId, first_name, last_name required' }, { status: 400 });
    }

    const resolvedFullName = full_name || `${first_name} ${last_name}`.trim();
    const updated = { user: false, profile: false, directory: false };

    // 1. Update User
    await base44.asServiceRole.entities.User
      .update(employeeId, { full_name: resolvedFullName }).catch(() => {});
    updated.user = true;

    // 2. Update EmployeeProfile
    const profiles = await base44.asServiceRole.entities.EmployeeProfile
      .filter({ user_id: employeeId }, '', 1).catch(() => []);
    if (profiles.length > 0) {
      await base44.asServiceRole.entities.EmployeeProfile.update(profiles[0].id, {
        first_name, last_name, full_name: resolvedFullName
      });
      updated.profile = true;
    } else {
      // Create missing profile
      const user = await base44.asServiceRole.entities.User.get(employeeId);
      await base44.asServiceRole.entities.EmployeeProfile.create({
        user_id: employeeId, email: user?.email || '',
        first_name, last_name, full_name: resolvedFullName, status: 'active'
      }).catch(() => {});
      updated.profile = true;
    }

    // 3. Update EmployeeDirectory
    const dirEntries = await base44.asServiceRole.entities.EmployeeDirectory
      .filter({ user_id: employeeId }, '', 1).catch(() => []);
    if (dirEntries.length > 0) {
      await base44.asServiceRole.entities.EmployeeDirectory.update(dirEntries[0].id, {
        full_name: resolvedFullName
      });
      updated.directory = true;
    }

    return Response.json({ ok: true, updated, full_name: resolvedFullName });

  } catch (err) {
    console.error('[fixEmployeeData] error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});
