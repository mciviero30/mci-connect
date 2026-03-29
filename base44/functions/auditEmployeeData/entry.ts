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

    const [users, profiles, dirEntries] = await Promise.all([
      base44.asServiceRole.entities.User.list('full_name', 500),
      base44.asServiceRole.entities.EmployeeProfile.list('', 500).catch(() => []),
      base44.asServiceRole.entities.EmployeeDirectory.list('', 500).catch(() => []),
    ]);

    const profileByUserId = Object.fromEntries(profiles.map(p => [p.user_id, p]));
    const dirByUserId     = Object.fromEntries(dirEntries.map(d => [d.user_id, d]));

    const issues = [];

    for (const user of users.filter(u => u.role !== 'client')) {
      const problems = [];
      const profile = profileByUserId[user.id];
      const dir     = dirByUserId[user.id];

      // Check name issues
      if (!user.full_name || user.full_name.trim() === '') {
        problems.push('Missing full_name');
      } else {
        const parts = user.full_name.trim().split(/\s+/);
        if (parts.length < 2) problems.push('full_name appears to have only one part');
      }

      // Check profile sync
      if (!profile) {
        problems.push('No EmployeeProfile record');
      } else {
        if (!profile.first_name) problems.push('Profile missing first_name');
        if (!profile.last_name)  problems.push('Profile missing last_name');
        if (profile.full_name !== user.full_name)
          problems.push(`Name mismatch: User="${user.full_name}" vs Profile="${profile.full_name}"`);
      }

      // Check directory sync
      if (!dir) {
        problems.push('No EmployeeDirectory entry');
      } else if (dir.full_name !== user.full_name) {
        problems.push(`Directory name mismatch: "${dir.full_name}" vs "${user.full_name}"`);
      }

      if (problems.length > 0) {
        const nameParts = (user.full_name || '').trim().split(/\s+/);
        issues.push({
          id:         user.id,
          email:      user.email,
          full_name:  user.full_name || '',
          first_name: profile?.first_name || nameParts[0] || '',
          last_name:  profile?.last_name  || nameParts.slice(1).join(' ') || '',
          type:       !profile ? 'user_only' : 'profile_mismatch',
          problems,
          suggested_fix: {
            first_name: nameParts[0] || '',
            last_name:  nameParts.slice(1).join(' ') || '',
            full_name:  user.full_name || '',
          }
        });
      }
    }

    return Response.json({ issues, total: users.length, issues_count: issues.length });

  } catch (err) {
    console.error('[auditEmployeeData] error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});
