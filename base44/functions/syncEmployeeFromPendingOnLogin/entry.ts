import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Find matching PendingEmployee by email
    const pending = await base44.asServiceRole.entities.PendingEmployee
      .filter({ email: user.email }, '', 1).catch(() => []);

    if (!pending.length) {
      return Response.json({ ok: true, message: 'No pending record found', migrated: false });
    }

    const p = pending[0];

    // Data to migrate from PendingEmployee
    const profileData = {
      user_id:     user.id,
      email:       user.email,
      full_name:   p.full_name || user.full_name,
      first_name:  p.first_name || '',
      last_name:   p.last_name  || '',
      phone:       p.phone       || '',
      position:    p.position    || '',
      department:  p.department  || '',
      team_id:     p.team_id     || '',
      team_name:   p.team_name   || '',
      hourly_rate: p.hourly_rate || 0,
      start_date:  p.start_date  || '',
      status:      'active',
    };

    // 1. Upsert EmployeeProfile
    const existing = await base44.asServiceRole.entities.EmployeeProfile
      .filter({ user_id: user.id }, '', 1).catch(() => []);

    if (existing.length > 0) {
      await base44.asServiceRole.entities.EmployeeProfile
        .update(existing[0].id, profileData).catch(() => {});
    } else {
      await base44.asServiceRole.entities.EmployeeProfile
        .create(profileData).catch(() => {});
    }

    // 2. Update User record with migrated data
    const userUpdates = {};
    if (p.full_name)   userUpdates.full_name = p.full_name;
    if (p.position)    userUpdates.position  = p.position;
    if (p.department)  userUpdates.department = p.department;
    if (p.hourly_rate) userUpdates.hourly_rate = p.hourly_rate;
    if (p.phone)       userUpdates.phone = p.phone;

    if (Object.keys(userUpdates).length > 0) {
      await base44.asServiceRole.entities.User
        .update(user.id, userUpdates).catch(() => {});
    }

    // 3. Upsert EmployeeDirectory
    const dirEntry = await base44.asServiceRole.entities.EmployeeDirectory
      .filter({ user_id: user.id }, '', 1).catch(() => []);

    const dirData = {
      user_id:    user.id,
      email:      user.email,
      full_name:  p.full_name || user.full_name,
      position:   p.position  || '',
      department: p.department || '',
      team_id:    p.team_id   || '',
      team_name:  p.team_name || '',
      status:     'active',
    };

    if (dirEntry.length > 0) {
      await base44.asServiceRole.entities.EmployeeDirectory
        .update(dirEntry[0].id, dirData).catch(() => {});
    } else {
      await base44.asServiceRole.entities.EmployeeDirectory
        .create(dirData).catch(() => {});
    }

    // 4. Mark PendingEmployee as migrated
    await base44.asServiceRole.entities.PendingEmployee
      .update(p.id, { migrated: true, migrated_at: new Date().toISOString() }).catch(() => {});

    console.log(`[syncEmployeeFromPendingOnLogin] Migrated ${user.email}`);
    return Response.json({ ok: true, migrated: true, email: user.email });

  } catch (err) {
    console.error('[syncEmployeeFromPendingOnLogin] error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});
