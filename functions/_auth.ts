/**
 * CENTRALIZED AUTH MIDDLEWARE FOR BACKEND FUNCTIONS
 * Provides consistent authentication and authorization checks
 */

/**
 * Require authenticated user (any role)
 * @throws {Response} 401 if not authenticated
 */
export async function requireUser(base44) {
  const user = await base44.auth.me();
  
  if (!user) {
    throw new Response(
      JSON.stringify({ error: 'Unauthorized' }), 
      { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  
  return user;
}

/**
 * Require admin access (admin, CEO, or administrator)
 * @throws {Response} 403 if not admin
 */
export async function requireAdmin(base44) {
  const user = await requireUser(base44);
  
  const isAdmin = user.role === 'admin' || 
                  user.position === 'CEO' || 
                  user.position === 'administrator';
  
  if (!isAdmin) {
    throw new Response(
      JSON.stringify({ error: 'Forbidden: Admin access required' }), 
      { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  
  return user;
}

/**
 * Require specific role(s)
 * @param {string[]} allowedRoles - Array of allowed roles/positions
 * @throws {Response} 403 if user doesn't have required role
 */
export async function requireRole(base44, allowedRoles) {
  const user = await requireUser(base44);
  
  const hasRole = allowedRoles.includes(user.role) || 
                  allowedRoles.includes(user.position);
  
  if (!hasRole) {
    throw new Response(
      JSON.stringify({ error: 'Forbidden: Insufficient permissions' }), 
      { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  
  return user;
}

/**
 * Validate token-based auth (for webhooks, cross-app calls)
 * @param {Request} req - Request object
 * @param {string} secretName - Name of env secret containing expected token
 * @throws {Response} 401 if token invalid
 */
export function requireToken(req, secretName) {
  const xAuthToken = req.headers.get('x-auth-token');
  const authHeader = req.headers.get('Authorization');
  const bearerToken = authHeader?.replace('Bearer ', '');
  const providedToken = xAuthToken || bearerToken;
  const expectedToken = Deno.env.get(secretName);
  
  if (!providedToken || providedToken !== expectedToken) {
    throw new Response(
      JSON.stringify({ error: 'Unauthorized: Invalid token' }), 
      { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  
  return true;
}

/**
 * Verify user owns or has access to a resource
 * @param {Object} resource - The resource to check
 * @param {Object} user - Current user
 * @param {string} emailField - Field name containing email (default: 'created_by')
 * @returns {boolean} true if user has access
 */
export function verifyOwnership(resource, user, emailField = 'created_by') {
  const isAdmin = user.role === 'admin' || 
                  user.position === 'CEO' || 
                  user.position === 'administrator';
  
  if (isAdmin) return true;
  
  const resourceEmail = resource[emailField];
  return resourceEmail === user.email;
}

/**
 * Safe JSON error response (sanitized for production)
 * @param {string} message - Error message
 * @param {number} status - HTTP status code
 * @param {any} details - Additional details (DEV only)
 */
export function safeJsonError(message, status = 500, details = null) {
  const isDev = import.meta.env?.DEV;
  
  return Response.json(
    { 
      error: message,
      ...(isDev && details ? { details } : {})
    }, 
    { status }
  );
}

/**
 * Rate limiting helper (simple in-memory)
 * For production, use Redis or similar
 */
const rateLimitStore = new Map();

export function checkRateLimit(identifier, maxRequests = 10, windowMs = 60000) {
  const now = Date.now();
  const key = identifier;
  
  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, []);
  }
  
  const requests = rateLimitStore.get(key);
  
  // Remove expired requests
  const validRequests = requests.filter(time => now - time < windowMs);
  
  if (validRequests.length >= maxRequests) {
    throw new Response(
      JSON.stringify({ error: 'Rate limit exceeded' }), 
      { 
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  
  validRequests.push(now);
  rateLimitStore.set(key, validRequests);
  
  return true;
}