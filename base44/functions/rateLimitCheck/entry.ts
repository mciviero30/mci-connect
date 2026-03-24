import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Backend Rate Limiter - Protect expensive operations
 * 
 * Usage:
 * const rateLimitCheck = await import('@/functions/rateLimitCheck');
 * const result = await rateLimitCheck.default({ user_id: user.id, operation: 'file_upload' });
 */

const RATE_LIMITS = {
  default: { requests: 20, window: 60000 }, // 20 per minute
  file_upload: { requests: 5, window: 60000 }, // 5 uploads per minute
  ai_generation: { requests: 10, window: 60000 }, // 10 AI calls per minute
  email_send: { requests: 10, window: 60000 }, // 10 emails per minute
};

// In-memory store (resets on function redeploy)
const requestLog = new Map();

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { operation = 'default' } = await req.json();
    const limit = RATE_LIMITS[operation] || RATE_LIMITS.default;
    const key = `${user.id}_${operation}`;
    const now = Date.now();
    const windowStart = now - limit.window;

    // Get requests for this key
    let keyRequests = requestLog.get(key) || [];
    
    // Filter out old requests
    keyRequests = keyRequests.filter(timestamp => timestamp > windowStart);

    // Check if limit exceeded
    if (keyRequests.length >= limit.requests) {
      const oldestRequest = Math.min(...keyRequests);
      const timeUntilReset = Math.ceil((oldestRequest + limit.window - now) / 1000);
      
      return Response.json({
        allowed: false,
        timeUntilReset,
        message: `Rate limit exceeded. Try again in ${timeUntilReset} seconds.`
      }, { status: 429 });
    }

    // Add current request
    keyRequests.push(now);
    requestLog.set(key, keyRequests);

    return Response.json({
      allowed: true,
      remaining: limit.requests - keyRequests.length
    });
  } catch (error) {
    console.error('Rate limit check error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});