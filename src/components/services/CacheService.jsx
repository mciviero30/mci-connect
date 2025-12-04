/**
 * STRATEGIC CACHING SERVICE
 * 
 * Client-side caching layer for frequently accessed dashboard data.
 * Uses localStorage with TTL and automatic invalidation.
 */

const CACHE_PREFIX = 'mci_cache_';
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

// Cache configuration per data type
const CACHE_CONFIG = {
  'financial-dashboard': { ttl: 5 * 60 * 1000, invalidateOn: ['Invoice', 'Expense', 'Transaction', 'FinancialDocument'] },
  'analytics-dashboard': { ttl: 5 * 60 * 1000, invalidateOn: ['Job', 'TimeEntry', 'Expense'] },
  'hr-dashboard': { ttl: 5 * 60 * 1000, invalidateOn: ['User', 'Goal', 'Certification', 'CourseProgress'] },
  'jobs-list': { ttl: 3 * 60 * 1000, invalidateOn: ['Job'] },
  'employees-list': { ttl: 5 * 60 * 1000, invalidateOn: ['User'] },
  'work-units': { ttl: 2 * 60 * 1000, invalidateOn: ['WorkUnit', 'Task'] },
};

// In-memory cache for faster access
const memoryCache = new Map();

/**
 * Generate cache key
 */
function getCacheKey(namespace, params = {}) {
  const paramString = Object.keys(params).sort().map(k => `${k}:${params[k]}`).join('|');
  return `${CACHE_PREFIX}${namespace}_${paramString}`;
}

/**
 * Get cached data
 */
export function getCache(namespace, params = {}) {
  const key = getCacheKey(namespace, params);
  
  // Check memory cache first
  if (memoryCache.has(key)) {
    const memEntry = memoryCache.get(key);
    if (Date.now() < memEntry.expiresAt) {
      return memEntry.data;
    }
    memoryCache.delete(key);
  }
  
  // Check localStorage
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    
    const entry = JSON.parse(stored);
    if (Date.now() > entry.expiresAt) {
      localStorage.removeItem(key);
      return null;
    }
    
    // Populate memory cache
    memoryCache.set(key, entry);
    return entry.data;
  } catch {
    return null;
  }
}

/**
 * Set cached data
 */
export function setCache(namespace, data, params = {}) {
  const key = getCacheKey(namespace, params);
  const config = CACHE_CONFIG[namespace] || { ttl: DEFAULT_TTL };
  
  const entry = {
    data,
    expiresAt: Date.now() + config.ttl,
    createdAt: Date.now(),
    namespace
  };
  
  // Store in memory
  memoryCache.set(key, entry);
  
  // Store in localStorage
  try {
    localStorage.setItem(key, JSON.stringify(entry));
  } catch (e) {
    // localStorage full - clear old entries
    clearExpiredCache();
    try {
      localStorage.setItem(key, JSON.stringify(entry));
    } catch {
      console.warn('Cache storage failed');
    }
  }
  
  return data;
}

/**
 * Invalidate cache by namespace
 */
export function invalidateCache(namespace) {
  const prefix = `${CACHE_PREFIX}${namespace}`;
  
  // Clear memory cache
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
    }
  }
  
  // Clear localStorage
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key?.startsWith(prefix)) {
      localStorage.removeItem(key);
    }
  }
}

/**
 * Invalidate caches affected by entity mutation
 */
export function invalidateByEntity(entityName) {
  for (const [namespace, config] of Object.entries(CACHE_CONFIG)) {
    if (config.invalidateOn?.includes(entityName)) {
      invalidateCache(namespace);
    }
  }
}

/**
 * Clear all expired cache entries
 */
export function clearExpiredCache() {
  const now = Date.now();
  
  // Clear memory
  for (const [key, entry] of memoryCache.entries()) {
    if (now > entry.expiresAt) {
      memoryCache.delete(key);
    }
  }
  
  // Clear localStorage
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_PREFIX)) {
      try {
        const entry = JSON.parse(localStorage.getItem(key));
        if (now > entry.expiresAt) {
          localStorage.removeItem(key);
        }
      } catch {
        localStorage.removeItem(key);
      }
    }
  }
}

/**
 * Clear all cache
 */
export function clearAllCache() {
  memoryCache.clear();
  
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_PREFIX)) {
      localStorage.removeItem(key);
    }
  }
}

/**
 * Hook wrapper for cached queries
 */
export function useCachedQuery(namespace, queryFn, params = {}, options = {}) {
  const { forceRefresh = false } = options;
  
  return async () => {
    // Check cache first
    if (!forceRefresh) {
      const cached = getCache(namespace, params);
      if (cached !== null) {
        return cached;
      }
    }
    
    // Fetch fresh data
    const data = await queryFn();
    
    // Cache it
    setCache(namespace, data, params);
    
    return data;
  };
}

/**
 * Get cache stats
 */
export function getCacheStats() {
  let totalEntries = 0;
  let expiredEntries = 0;
  let totalSize = 0;
  const now = Date.now();
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_PREFIX)) {
      totalEntries++;
      const value = localStorage.getItem(key);
      totalSize += value?.length || 0;
      
      try {
        const entry = JSON.parse(value);
        if (now > entry.expiresAt) {
          expiredEntries++;
        }
      } catch {}
    }
  }
  
  return {
    totalEntries,
    expiredEntries,
    activeEntries: totalEntries - expiredEntries,
    memoryCacheSize: memoryCache.size,
    storageSizeKB: Math.round(totalSize / 1024)
  };
}

// Auto-cleanup on load
if (typeof window !== 'undefined') {
  clearExpiredCache();
  
  // Periodic cleanup every 10 minutes
  setInterval(clearExpiredCache, 10 * 60 * 1000);
}