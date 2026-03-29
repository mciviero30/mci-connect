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

    // Fetch all users
    const users = await base44.asServiceRole.entities.User.list('full_name', 500);
    const employees = users.filter(u => u.role !== 'client');

    // Fetch existing directory entries
    const dirEntries = await base44.asServiceRole.entities.EmployeeDirectory
      .list('', 500).catch(() => []);
    const dirByUserId = Object.fromEntries(dirEntries.map(d => [d.user_id, d]));

    // Fetch existing profiles
    const profiles = await base44.asServiceRole.entities.EmployeeProfile
      .list('', 500).catch(() => []);
    const profileByUserId = Object.fromEntries(profiles.map(p => [p.user_id, p]));

    let synced = 0;
    const errors = [];

    for (const emp of employees) {
      try {
        // Sync EmployeeDirectory
        const dirData = {
          user_id:    emp.id,
          email:      emp.email,
          full_name:  emp.full_name || '',
          position:   emp.position  || '',
          department: emp.department || '',
          role:       emp.role       || '',
          status:     emp.status     || 'active',
        };

        if (dirByUserId[emp.id]) {
          await base44.asServiceRole.entities.EmployeeDirectory
            .update(dirByUserId[emp.id].id, dirData);
        } else {
          await base44.asServiceRole.entities.EmployeeDirectory.create(dirData);
        }

        // Sync EmployeeProfile (create if missing)
        if (!profileByUserId[emp.id]) {
          const parts = (emp.full_name || '').trim().split(' ');
          await base44.asServiceRole.entities.EmployeeProfile.create({
            user_id:    emp.id,
            email:      emp.email,
            full_name:  emp.full_name || '',
            first_name: parts[0] || '',
            last_name:  parts.slice(1).join(' ') || '',
            position:   emp.position   || '',
            department: emp.department || '',
            hourly_rate: emp.hourly_rate || 0,
            status:     'active',
          }).catch(() => {}); // ignore if already exists
        }

        synced++;
      } catch (err) {
        errors.push({ employee: emp.email, error: err.message });
      }
    }

    console.log(`[syncAllEmployeeData] Synced ${synced}/${employees.length} employees`);
    return Response.json({ ok: true, results: { synced, total: employees.length, errors } });

  } catch (err) {
    console.error('[syncAllEmployeeData] error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});
