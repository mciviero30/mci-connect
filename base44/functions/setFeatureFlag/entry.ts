import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * SET FEATURE FLAG
 * 
 * Admin-only endpoint to enable/disable feature flags dynamically.
 * Changes take effect within 5 seconds (cache TTL).
 * 
 * Usage:
 *   await base44.functions.invoke('setFeatureFlag', {
 *     flag_name: 'ENABLE_FINANCIAL_ENGINE_V2',
 *     enabled: true,
 *     reason: 'Phase 1 validation passed'
 *   });
 */

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // ADMIN-ONLY
    if (!user || user.role !== 'admin') {
      return new Response(JSON.stringify({ 
        error: 'Forbidden: Admin access required',
        code: '403_ADMIN_ONLY'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { flag_name, enabled, reason, rollout_percentage } = await req.json();

    if (!flag_name || enabled === undefined) {
      return new Response(JSON.stringify({ 
        error: 'flag_name and enabled are required',
        code: '400_MISSING_PARAMS'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if flag exists
    const existing = await base44.entities.FeatureFlag.filter({
      flag_name: flag_name
    });

    const changeRecord = {
      timestamp: new Date().toISOString(),
      changed_by: user.id,
      changed_by_email: user.email,
      old_value: existing.length > 0 ? existing[0].enabled : null,
      new_value: enabled,
      reason: reason || 'Manual change'
    };

    if (existing.length > 0) {
      // Update existing flag
      const flag = existing[0];
      
      await base44.entities.FeatureFlag.update(flag.id, {
        enabled: enabled,
        rollout_percentage: rollout_percentage !== undefined ? rollout_percentage : flag.rollout_percentage,
        last_modified_by: user.id,
        last_modified_at: new Date().toISOString(),
        change_history: [...(flag.change_history || []), changeRecord]
      });

      return new Response(JSON.stringify({
        success: true,
        flag_name: flag_name,
        enabled: enabled,
        rollout_percentage: rollout_percentage !== undefined ? rollout_percentage : flag.rollout_percentage,
        message: `Flag updated successfully. Changes take effect in 5 seconds.`
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      // Create new flag
      return new Response(JSON.stringify({
        error: 'Flag does not exist. Use admin UI to create flags first.',
        code: '404_FLAG_NOT_FOUND'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('Set feature flag error:', error);
    
    return new Response(JSON.stringify({
      error: 'Failed to set flag',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});