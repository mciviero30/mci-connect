import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Cleanup duplicate User records and test accounts
 * Admin-only function
 * 
 * Deletes:
 * - Test/invalid users (no proper email format)
 * - Duplicates (keeps most recent with best data)
 * - Except specified email
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized: Admin only' }, { status: 403 });
    }

    const { except_email = 'marzio.civiero@mci-us.com' } = await req.json();
    const normalizedExceptEmail = except_email.toLowerCase().trim();

    const users = await base44.asServiceRole.entities.User.list();
    
    const results = {
      users_deleted: 0,
      deleted_users: [],
      errors: []
    };

    // Group by normalized email
    const emailGroups = {};
    users.forEach(u => {
      const normalized = u.email?.toLowerCase().trim() || '';
      if (!emailGroups[normalized]) {
        emailGroups[normalized] = [];
      }
      emailGroups[normalized].push(u);
    });

    // Process each email group
    for (const [email, group] of Object.entries(emailGroups)) {
      // Skip protected email
      if (email === normalizedExceptEmail) continue;

      // Skip if only one user
      if (group.length <= 1) continue;

      // Sort by: onboarding_completed DESC, created_date DESC
      const sorted = group.sort((a, b) => {
        if (a.onboarding_completed && !b.onboarding_completed) return -1;
        if (!a.onboarding_completed && b.onboarding_completed) return 1;
        return new Date(b.created_date) - new Date(a.created_date);
      });

      // Keep first (best), delete rest
      const toKeep = sorted[0];
      const toDelete = sorted.slice(1);

      for (const u of toDelete) {
        try {
          await base44.asServiceRole.entities.User.update(u.id, { 
            employment_status: 'deleted' 
          });
          results.users_deleted++;
          results.deleted_users.push({
            email: u.email,
            full_name: u.full_name,
            reason: 'duplicate'
          });
        } catch (error) {
          results.errors.push(`Failed to delete ${u.email}: ${error.message}`);
        }
      }
    }

    // Also delete invalid test users (no @ in email or invalid formats)
    for (const u of users) {
      if (u.email === normalizedExceptEmail) continue;
      if (u.employment_status === 'deleted') continue;

      const isInvalidEmail = !u.email || 
                             !u.email.includes('@') || 
                             u.email.includes(' ') ||
                             u.email === u.full_name;

      if (isInvalidEmail) {
        try {
          await base44.asServiceRole.entities.User.update(u.id, { 
            employment_status: 'deleted' 
          });
          results.users_deleted++;
          results.deleted_users.push({
            email: u.email,
            full_name: u.full_name,
            reason: 'invalid_email'
          });
        } catch (error) {
          results.errors.push(`Failed to delete invalid user ${u.email}: ${error.message}`);
        }
      }
    }

    return Response.json({
      success: true,
      message: `Cleaned up ${results.users_deleted} duplicate/invalid users`,
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});