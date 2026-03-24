import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * STRICT MODE TOGGLE AUDIT
 * 
 * PHASE 7: Track when write guards are disabled
 * 
 * Called from frontend when window.toggleStrictMode() is invoked
 * Logs who disabled it, when, and why (if provided)
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { enabled, reason } = await req.json();

    // SECURITY: Only admins can disable strict mode
    if (!enabled && user.role !== 'admin' && user.position !== 'CEO') {
      console.error('[STRICT MODE AUDIT] 🚫 Non-admin attempted to disable', {
        user_email: user.email,
        user_role: user.role,
        user_position: user.position
      });

      return Response.json({
        success: false,
        error: 'FORBIDDEN',
        message: 'Only admins can disable strict mode'
      }, { status: 403 });
    }

    // Create audit log
    await base44.asServiceRole.entities.AuditLog.create({
      event_type: enabled ? 'strict_mode_enabled' : 'strict_mode_disabled',
      user_id: user.id,
      user_email: user.email,
      user_role: user.role || user.position,
      timestamp: new Date().toISOString(),
      details: {
        strict_mode_enabled: enabled,
        reason: reason || 'No reason provided',
        environment: Deno.env.get('ENVIRONMENT') || 'production'
      },
      severity: enabled ? 'info' : 'critical',
      category: 'security'
    });

    // Create system alert if disabled in production
    if (!enabled) {
      await base44.asServiceRole.entities.SystemAlert.create({
        alert_type: 'security_risk',
        severity: 'high',
        title: '⚠️ Write Guards Disabled',
        message: `${user.full_name || user.email} disabled strict mode. Data integrity rules are not enforced.`,
        triggered_by: user.email,
        triggered_at: new Date().toISOString(),
        status: 'active',
        metadata: {
          action: 'strict_mode_disabled',
          reason: reason
        }
      });
    }

    console.log(`[STRICT MODE AUDIT] ${enabled ? '✅ Enabled' : '🔴 Disabled'} by ${user.email}`, {
      reason: reason,
      timestamp: new Date().toISOString()
    });

    return Response.json({
      success: true,
      strict_mode_enabled: enabled,
      logged_by: user.email,
      audit_recorded: true
    });

  } catch (error) {
    console.error('[STRICT MODE AUDIT] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});