import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * GET FEATURE FLAG STATUS
 * 
 * Server-side feature flag resolution with caching.
 * 
 * Usage from backend:
 *   const isEnabled = await base44.functions.invoke('getFeatureFlag', {
 *     flag_name: 'ENABLE_FINANCIAL_ENGINE_V2'
 *   });
 * 
 * Returns: { enabled: boolean, rollout_percentage: number }
 */

// In-memory cache (5 second TTL to allow dynamic changes without redeploy)
const flagCache = new Map();
const CACHE_TTL_MS = 5000;

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const base44 = createClientFromRequest(req);
    const { flag_name, entity_id } = await req.json();

    if (!flag_name) {
      return new Response(JSON.stringify({ 
        error: 'flag_name is required',
        code: '400_MISSING_FLAG_NAME'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check cache first
    const cached = flagCache.get(flag_name);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
      return new Response(JSON.stringify({
        enabled: cached.enabled,
        rollout_percentage: cached.rollout_percentage,
        cached: true
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Fetch from database (service role for system flags)
    const flags = await base44.asServiceRole.entities.FeatureFlag.filter({
      flag_name: flag_name
    });

    if (flags.length === 0) {
      // Flag doesn't exist = default to disabled
      return new Response(JSON.stringify({
        enabled: false,
        rollout_percentage: 0,
        reason: 'FLAG_NOT_FOUND'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const flag = flags[0];

    // Cache result
    flagCache.set(flag_name, {
      enabled: flag.enabled,
      rollout_percentage: flag.rollout_percentage || 100,
      timestamp: Date.now()
    });

    // Gradual rollout support (if needed)
    let effectiveEnabled = flag.enabled;
    if (flag.enabled && flag.rollout_percentage < 100) {
      // Deterministic rollout based on entity_id hash
      if (entity_id) {
        const hash = Array.from(entity_id).reduce((acc, char) => {
          return ((acc << 5) - acc) + char.charCodeAt(0);
        }, 0);
        const bucket = Math.abs(hash) % 100;
        effectiveEnabled = bucket < flag.rollout_percentage;
      } else {
        // Random rollout if no entity_id
        effectiveEnabled = Math.random() * 100 < flag.rollout_percentage;
      }
    }

    return new Response(JSON.stringify({
      enabled: effectiveEnabled,
      rollout_percentage: flag.rollout_percentage || 100,
      scope: flag.scope,
      description: flag.description
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Feature flag error:', error);
    
    // Safe fallback: disabled
    return new Response(JSON.stringify({
      enabled: false,
      error: 'Failed to fetch flag',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});