import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * FASE 4: SYNC USER TO EMPLOYEE DIRECTORY - STRICT ROLE ENFORCEMENT
 * 
 * CRITICAL SECURITY:
 * - Admin/CEO only (no exceptions, no legacy bypasses)
 * - Validates enum roles strictly
 * - Rejects invalid role values
 * 
 * Called when: 
 * - Admin manually triggers sync
 * - Scheduled daily check for missing entries
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // FASE 4: STRICT ADMIN-ONLY ACCESS (no legacy bypasses)
    const caller = await base44.auth.me();
    if (!caller) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // FASE 4: Enforce strict enum roles
    const VALID_ADMIN_ROLES = ['admin', 'ceo'];
    if (!VALID_ADMIN_ROLES.includes(caller.role)) {
      console.warn(`[FASE 4] Access denied: User ${caller.email} with role "${caller.role}" attempted admin function`);
      return Response.json({ 
        error: 'Forbidden: Admin or CEO access required',
        user_role: caller.role 
      }, { status: 403 });
    }
    
    const { user_id, user_email } = await req.json();

    // FASE 4: Validate input
    if (!user_id && !user_email) {
      return Response.json({ error: 'user_id or user_email required' }, { status: 400 });
    }

    // Get user data
    let user;
    if (user_id) {
      const users = await base44.asServiceRole.entities.User.filter({ id: user_id });
      if (users.length === 0) {
        return Response.json({ error: 'User not found' }, { status: 404 });
      }
      user = users[0];
    } else if (user_email) {
      const users = await base44.asServiceRole.entities.User.filter({ email: user_email });
      if (users.length === 0) {
        return Response.json({ error: 'User not found' }, { status: 404 });
      }
      user = users[0];
    }

    // FASE 4: STRICT ROLE VALIDATION (reject invalid enum values)
    const VALID_USER_ROLES = ['admin', 'ceo', 'manager', 'supervisor', 'foreman', 'employee'];
    if (user.role && !VALID_USER_ROLES.includes(user.role)) {
      console.error(`[FASE 4] REJECTED: User ${user.email} has invalid role: "${user.role}"`);
      return Response.json({ 
        error: 'Invalid user role detected',
        user_email: user.email,
        invalid_role: user.role,
        valid_roles: VALID_USER_ROLES
      }, { status: 400 });
    }

    // Check if EmployeeDirectory already exists
    const existing = await base44.asServiceRole.entities.EmployeeDirectory.filter({
      employee_email: user.email
    });

    // FASE 4: Prepare validated data (no legacy permissive defaults)
    const syncData = {
      user_id: user.id,
      full_name: user.full_name || user.email.split('@')[0],
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      position: user.position || null,  // FASE 4: null instead of 'Employee'
      department: user.department || null,  // FASE 4: null instead of ''
      phone: user.phone || '',
      team_id: user.team_id || '',
      team_name: user.team_name || '',
      profile_photo_url: user.profile_photo_url || '',
      status: 'active',
      sync_source: 'admin_sync',  // FASE 4: Changed from 'auto_sync'
      last_synced_at: new Date().toISOString()
    };

    if (existing.length > 0) {
      // Update existing entry with validated data
      await base44.asServiceRole.entities.EmployeeDirectory.update(existing[0].id, syncData);

      console.log(`[FASE 4] Directory updated: ${user.email} | Role: ${user.role}`);

      return Response.json({ 
        success: true,
        action: 'updated',
        user_email: user.email,
        user_role: user.role
      });
    }

    // Create new EmployeeDirectory entry with validated data
    await base44.asServiceRole.entities.EmployeeDirectory.create({
      ...syncData,
      employee_email: user.email
    });

    console.log(`[FASE 4] Directory created: ${user.email} | Role: ${user.role}`);

    return Response.json({ 
      success: true,
      action: 'created',
      user_email: user.email,
      user_role: user.role
    });
  } catch (error) {
    console.error('[FASE 4] ❌ Sync User to EmployeeDirectory failed:', error);
    return Response.json({ 
      error: error.message,
      success: false,
      phase: 'FASE_4_STRICT_ENFORCEMENT'
    }, { status: 500 });
  }
});