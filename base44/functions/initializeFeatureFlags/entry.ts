import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * INITIALIZE FEATURE FLAGS
 * 
 * One-time setup to create required feature flags.
 * Admin-only. Safe to run multiple times (won't create duplicates).
 */

const REQUIRED_FLAGS = [
  {
    flag_name: 'ENABLE_FINANCIAL_ENGINE_V2',
    enabled: false,
    description: 'Use deterministic financial calculation engine for Quote + Invoice',
    scope: 'global',
    metadata: {
      validation_window_days: 7,
      requires_approval: true
    }
  },
  {
    flag_name: 'ENABLE_SHADOW_MODE',
    enabled: true,
    description: 'Run V1 and V2 calculations in parallel, compare results (V1 wins)',
    scope: 'global',
    metadata: {
      validation_window_days: 7,
      requires_approval: false
    }
  },
  {
    flag_name: 'ENABLE_COMMISSION_ENGINE_V2',
    enabled: false,
    description: 'Use deterministic engine for commission calculations',
    scope: 'commission',
    metadata: {
      validation_window_days: 7,
      requires_approval: true,
      depends_on: ['ENABLE_FINANCIAL_ENGINE_V2']
    }
  }
];

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

    const results = [];

    for (const flagConfig of REQUIRED_FLAGS) {
      // Check if exists
      const existing = await base44.entities.FeatureFlag.filter({
        flag_name: flagConfig.flag_name
      });

      if (existing.length > 0) {
        results.push({
          flag_name: flagConfig.flag_name,
          status: 'already_exists',
          current_value: existing[0].enabled
        });
      } else {
        // Create new flag
        await base44.entities.FeatureFlag.create({
          ...flagConfig,
          last_modified_by: user.id,
          last_modified_at: new Date().toISOString(),
          change_history: [{
            timestamp: new Date().toISOString(),
            changed_by: user.id,
            changed_by_email: user.email,
            old_value: null,
            new_value: flagConfig.enabled,
            reason: 'Initial setup'
          }]
        });

        results.push({
          flag_name: flagConfig.flag_name,
          status: 'created',
          initial_value: flagConfig.enabled
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      results: results,
      message: 'Feature flags initialized successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Initialize feature flags error:', error);
    
    return new Response(JSON.stringify({
      error: 'Failed to initialize flags',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});