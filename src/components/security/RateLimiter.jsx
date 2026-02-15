/**
 * Client-Side Rate Limiter
 * Prevents abuse of backend functions and API calls
 */

const RATE_LIMITS = {
  default: { requests: 10, window: 60000 }, // 10 requests per minute
  mutation: { requests: 5, window: 60000 }, // 5 mutations per minute
  file_upload: { requests: 3, window: 60000 }, // 3 uploads per minute
  expensive: { requests: 2, window: 60000 }, // 2 expensive operations per minute
};

class RateLimiter {
  constructor() {
    this.requests = new Map();
  }

  checkLimit(key, limitType = 'default') {
    const limit = RATE_LIMITS[limitType];
    const now = Date.now();
    const windowStart = now - limit.window;

    // Get requests for this key
    let keyRequests = this.requests.get(key) || [];
    
    // Filter out old requests
    keyRequests = keyRequests.filter(timestamp => timestamp > windowStart);

    // Check if limit exceeded
    if (keyRequests.length >= limit.requests) {
      const oldestRequest = Math.min(...keyRequests);
      const timeUntilReset = Math.ceil((oldestRequest + limit.window - now) / 1000);
      
      return {
        allowed: false,
        timeUntilReset,
        message: `Rate limit exceeded. Try again in ${timeUntilReset} seconds.`
      };
    }

    // Add current request
    keyRequests.push(now);
    this.requests.set(key, keyRequests);

    return {
      allowed: true,
      remaining: limit.requests - keyRequests.length
    };
  }

  reset(key) {
    this.requests.delete(key);
  }

  resetAll() {
    this.requests.clear();
  }
}

export const rateLimiter = new RateLimiter();

/**
 * Hook for rate-limited operations
 */
export const useRateLimit = (key, limitType = 'default') => {
  const checkRateLimit = () => {
    return rateLimiter.checkLimit(key, limitType);
  };

  return { checkRateLimit };
};

/**
 * Wrapper for rate-limited mutations
 */
export const withRateLimit = async (fn, key, limitType = 'mutation') => {
  const result = rateLimiter.checkLimit(key, limitType);
  
  if (!result.allowed) {
    throw new Error(result.message);
  }

  return await fn();
};