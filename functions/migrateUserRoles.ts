import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * ROLE MIGRATION FUNCTION
 * Migrates all users from legacy position/department system to unified role system
 * SAFE: Does not overwrite existing valid roles
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    console.log('[Role Migration] Starting user role migration...');

    const results = {
      success: true,
      migrated: [],
      skipped: [],
      errors: [],
    };

    // Role mapping logic (matching roleRules.js)
    const LEGACY_POSITION_TO_ROLE = {
      'CEO': 'ceo',
      'administrator': 'admin',
      'manager': 'manager',
      'supervisor': 'supervisor',
      'foreman': 'foreman',
      'technician': 'technician',
    };

    const ADMIN_DEPARTMENTS = ['HR', 'administration', 'CEO'];

    const suggestRole = (user) => {
      // CEO always CEO role
      if (user.position === 'CEO' || user.role === 'ceo') {
        return 'ceo';
      }

      // Admin departments
      if (ADMIN_DEPARTMENTS.includes(user.department)) {
        return 'admin';
      }

      // Position-based mapping
      if (user.position && LEGACY_POSITION_TO_ROLE[user.position]) {
        return LEGACY_POSITION_TO_ROLE[user.position];
      }

      // Manager role (legacy)
      if (user.role === 'manager') {
        return 'manager';
      }

      // Admin role (legacy)
      if (user.role === 'admin') {
        return 'admin';
      }

      // Default
      return 'employee';
    };

    // Fetch all users
    const users = await base44.asServiceRole.entities.User.list();
    console.log(`[Role Migration] Found ${users.length} users`);

    for (const u of users) {
      try {
        const suggestedRole = suggestRole(u);
        
        // Skip if role is already correct
        if (u.role === suggestedRole) {
          results.skipped.push({
            email: u.email,
            name: u.full_name,
            currentRole: u.role,
            reason: 'Already correct'
          });
          continue;
        }

        // Migrate role
        await base44.asServiceRole.entities.User.update(u.id, {
          role: suggestedRole
        });

        results.migrated.push({
          email: u.email,
          name: u.full_name,
          oldRole: u.role,
          newRole: suggestedRole,
          position: u.position,
          department: u.department
        });

        console.log(`[Role Migration] ✓ ${u.email}: ${u.role} → ${suggestedRole}`);

      } catch (error) {
        results.errors.push({
          email: u.email,
          error: error.message
        });
        console.error(`[Role Migration] ✗ ${u.email}:`, error);
      }
    }

    results.success = results.errors.length === 0;

    console.log('[Role Migration] Completed:', {
      migrated: results.migrated.length,
      skipped: results.skipped.length,
      errors: results.errors.length
    });

    return Response.json(results);

  } catch (error) {
    console.error('[Role Migration] Fatal error:', error);
    return Response.json({ 
      success: false,
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
});