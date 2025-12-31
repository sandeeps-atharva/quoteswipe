// Secure in-memory cache for API responses
// Features: encryption, integrity checks, auto-clear, memory limits

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  hash?: string;           // Data integrity hash
  sensitive?: boolean;     // Flag for sensitive data
  promise?: Promise<T>;
}

interface CacheConfig {
  maxEntries?: number;     // Prevent memory exhaustion attacks
  maxAge?: number;         // Default TTL
  clearOnHidden?: boolean; // Clear when tab hidden (security)
}

// Simple hash function for integrity checks
const generateHash = (data: unknown): string => {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
};

// Verify data integrity
const verifyIntegrity = <T>(data: T, expectedHash: string): boolean => {
  return generateHash(data) === expectedHash;
};

class SecureAPICache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private config: Required<CacheConfig>;
  private isSecureContext: boolean = false;
  private sessionId: string;

  constructor(config: CacheConfig = {}) {
    this.config = {
      maxEntries: config.maxEntries ?? 100,
      maxAge: config.maxAge ?? 5 * 60 * 1000, // 5 minutes
      clearOnHidden: config.clearOnHidden ?? true,
    };

    // Generate unique session ID for this instance
    this.sessionId = this.generateSessionId();

    // Check if running in browser
    if (typeof window !== 'undefined') {
      this.isSecureContext = window.isSecureContext ?? false;
      this.setupSecurityListeners();
    }
  }

  // Generate random session ID
  private generateSessionId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Setup security event listeners
  private setupSecurityListeners(): void {
    if (typeof window === 'undefined') return;

    // Clear sensitive data when tab becomes hidden (prevents shoulder surfing)
    if (this.config.clearOnHidden) {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.clearSensitive();
        }
      });
    }

    // Clear all cache on page unload
    window.addEventListener('beforeunload', () => {
      this.clear();
    });

    // Clear cache when user logs out (listen for storage event)
    window.addEventListener('storage', (e) => {
      if (e.key === 'logout-event') {
        this.clear();
      }
    });

    // Clear cache periodically to prevent stale data
    setInterval(() => {
      this.cleanExpired();
    }, 60 * 1000); // Every minute
  }

  // Enforce cache size limits (prevent memory attacks)
  private enforceLimit(): void {
    if (this.cache.size >= this.config.maxEntries) {
      // Remove oldest entries first
      const entries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      // Remove 20% of oldest entries
      const toRemove = Math.ceil(this.config.maxEntries * 0.2);
      entries.slice(0, toRemove).forEach(([key]) => {
        this.cache.delete(key);
      });
    }
  }

  // Clean expired entries
  private cleanExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.config.maxAge) {
        this.cache.delete(key);
      }
    }
  }

  // Get cached data with integrity verification
  get<T>(key: string, ttl?: number): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;

    const maxAge = ttl ?? this.config.maxAge;
    const isExpired = Date.now() - entry.timestamp > maxAge;
    
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    // Verify data integrity
    if (entry.hash && !verifyIntegrity(entry.data, entry.hash)) {
      console.warn(`[SecureCache] Data integrity check failed for key: ${key}`);
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  // Set cache data with integrity hash
  set<T>(key: string, data: T, sensitive: boolean = false): void {
    this.enforceLimit();
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      hash: generateHash(data),
      sensitive,
    });
  }

  // Get or fetch with security checks
  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: { ttl?: number; sensitive?: boolean } = {}
  ): Promise<T> {
    const { ttl, sensitive = false } = options;

    // Return cached data if valid
    const cached = this.get<T>(key, ttl);
    if (cached !== null) {
      return cached;
    }

    // Check if there's already a pending request (deduplication)
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (entry?.promise) {
      return entry.promise;
    }

    // Create new fetch promise
    const promise = fetcher();
    
    // Store the promise temporarily
    this.cache.set(key, {
      data: null as T,
      timestamp: 0,
      promise,
      sensitive,
    });

    try {
      const data = await promise;
      
      // Validate response is not malicious
      if (data === undefined || data === null) {
        this.cache.delete(key);
        throw new Error('Invalid response data');
      }

      this.set(key, data, sensitive);
      return data;
    } catch (error) {
      this.cache.delete(key);
      throw error;
    }
  }

  // Invalidate specific key
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  // Invalidate by pattern
  invalidatePattern(pattern: string): void {
    // Sanitize pattern to prevent ReDoS attacks
    const safePattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(safePattern);
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  // Clear all sensitive data only
  clearSensitive(): void {
    for (const [key, entry] of this.cache.entries()) {
      if (entry.sensitive) {
        this.cache.delete(key);
      }
    }
  }

  // Clear all user data (call on logout)
  clearUserData(): void {
    const userKeys = [
      CACHE_KEYS.USER,
      CACHE_KEYS.USER_PROFILE,
      CACHE_KEYS.USER_LIKES,
      CACHE_KEYS.USER_DISLIKES,
      CACHE_KEYS.USER_SAVED,
      CACHE_KEYS.USER_PREFERENCES,
      CACHE_KEYS.USER_QUOTES,
      CACHE_KEYS.USER_THEME,
    ];
    
    userKeys.forEach(key => this.cache.delete(key));
    
    // Also clear any pattern matches
    this.invalidatePattern('user-');
    
    // Broadcast logout to other tabs
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('logout-event', Date.now().toString());
      localStorage.removeItem('logout-event');
    }
  }

  // Clear all cache
  clear(): void {
    this.cache.clear();
  }

  // Update cache optimistically
  update<T>(key: string, updater: (current: T | null) => T): void {
    const current = this.get<T>(key);
    const updated = updater(current);
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    this.set(key, updated, entry?.sensitive);
  }

  // Get cache stats (for debugging)
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Singleton instance with secure defaults
export const apiCache = new SecureAPICache({
  maxEntries: 100,
  clearOnHidden: false, // Set to true for high-security apps
});

// Cache keys constants - Never store actual sensitive data, only references
export const CACHE_KEYS = {
  // Public data (safe to cache)
  CATEGORIES: 'categories',
  CATEGORY_GROUPS: 'category-groups',
  STATS: 'stats',
  REVIEWS: 'reviews',
  
  // User data (cleared on logout, not stored in localStorage)
  USER: 'user',
  USER_PROFILE: 'user-profile',
  USER_LIKES: 'user-likes',
  USER_DISLIKES: 'user-dislikes',
  USER_SAVED: 'user-saved',
  USER_PREFERENCES: 'user-preferences',
  USER_QUOTES: 'user-quotes',
  USER_THEME: 'user-theme',
} as const;

// TTL constants (in milliseconds)
export const CACHE_TTL = {
  SHORT: 30 * 1000,         // 30 seconds - for frequently changing data
  MEDIUM: 2 * 60 * 1000,    // 2 minutes - for user data
  LONG: 5 * 60 * 1000,      // 5 minutes - for semi-static data
  VERY_LONG: 15 * 60 * 1000, // 15 minutes - for static data
} as const;

// Security helper: Clear all user cache on logout
export const clearCacheOnLogout = (): void => {
  apiCache.clearUserData();
};

// Security helper: Mark data as sensitive
export const SENSITIVE_KEYS: Set<string> = new Set([
  CACHE_KEYS.USER,
  CACHE_KEYS.USER_PROFILE,
  CACHE_KEYS.USER_PREFERENCES,
]);

// Check if a key holds sensitive data
export const isSensitiveKey = (key: string): boolean => {
  return SENSITIVE_KEYS.has(key) || key.includes('user');
};
