import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { userId, userData } = await req.json().catch(() => ({}));

    if (!userId || !userData) {
      return Response.json({ error: 'userId and userData required' }, { status: 400 });
    }

    // Security: only allow updating own profile (or admin)
    const ADMIN_ROLES = ['admin', 'ceo', 'owner', 'super_admin', 'administrator'];
    if (caller.id !== userId && !ADMIN_ROLES.includes(caller.role?.toLowerCase?.())) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { email, full_name, profile_photo_url, avatar_image_url, preferred_profile_image } = userData;

    const updates = {};
    if (email)                    updates.email = email;
    if (full_name)                updates.full_name = full_name;
    if (profile_photo_url)        updates.profile_photo_url = profile_photo_url;
    if (avatar_image_url)         updates.avatar_image_url = avatar_image_url;
    if (preferred_profile_image)  updates.preferred_profile_image = preferred_profile_image;

    if (Object.keys(updates).length === 0) {
      return Response.json({ ok: true, message: 'No changes to sync' });
    }

    const synced = { user: false, profile: false, directory: false };

    // 1. Update User record
    try {
      await base44.asServiceRole.entities.User.update(userId, updates);
      synced.user = true;
    } catch (err) {
      console.error('[syncUserProfile] User update failed:', err.message);
    }

    // 2. Update EmployeeProfile
    const profiles = await base44.asServiceRole.entities.EmployeeProfile
      .filter({ user_id: userId }, '', 1).catch(() => []);
    if (profiles.length > 0) {
      const profileUpdates = {};
      if (updates.full_name) {
        const parts = updates.full_name.trim().split(' ');
        profileUpdates.first_name = parts[0];
        profileUpdates.last_name  = parts.slice(1).join(' ') || '';
      }
      if (updates.profile_photo_url)       profileUpdates.profile_photo_url = updates.profile_photo_url;
      if (updates.avatar_image_url)        profileUpdates.avatar_image_url  = updates.avatar_image_url;
      if (updates.preferred_profile_image) profileUpdates.preferred_profile_image = updates.preferred_profile_image;

      if (Object.keys(profileUpdates).length > 0) {
        await base44.asServiceRole.entities.EmployeeProfile
          .update(profiles[0].id, profileUpdates).catch(() => {});
        synced.profile = true;
      }
    }

    // 3. Update EmployeeDirectory
    const dirEntries = await base44.asServiceRole.entities.EmployeeDirectory
      .filter({ user_id: userId }, '', 1).catch(() => []);
    if (dirEntries.length > 0) {
      const dirUpdates = {};
      if (updates.full_name)               dirUpdates.full_name = updates.full_name;
      if (updates.email)                   dirUpdates.email = updates.email;
      if (updates.profile_photo_url)       dirUpdates.profile_photo_url = updates.profile_photo_url;
      if (updates.avatar_image_url)        dirUpdates.avatar_image_url  = updates.avatar_image_url;
      if (updates.preferred_profile_image) dirUpdates.preferred_profile_image = updates.preferred_profile_image;

      if (Object.keys(dirUpdates).length > 0) {
        await base44.asServiceRole.entities.EmployeeDirectory
          .update(dirEntries[0].id, dirUpdates).catch(() => {});
        synced.directory = true;
      }
    }

    console.log(`[syncUserProfile] Synced user ${userId}:`, synced);
    return Response.json({ ok: true, synced });

  } catch (err) {
    console.error('[syncUserProfile] error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});
