/**
 * Performance Monitoring Utility
 * Tracks API response times, cache hits, and slow queries
 * Production-safe with minimal overhead
 */

interface PerfMetric {
  route: string;
  duration: number;
  timestamp: number;
  cached: boolean;
  userId?: string;
}

interface AggregatedMetrics {
  avgResponseTime: number;
  p50: number;
  p95: number;
  p99: number;
  cacheHitRate: number;
  slowRequests: number;
  totalRequests: number;
}

// In-memory metrics store (circular buffer)
const metrics: PerfMetric[] = [];
const MAX_METRICS = 1000;

// Route-specific thresholds (ms)
const SLOW_THRESHOLDS: Record<string, number> = {
  '/api/quotes': 200,
  '/api/categories': 100,
  '/api/initial-data': 300,
  '/api/user/likes': 150,
  '/api/user/saved': 150,
  'default': 200,
};

/**
 * Record a performance metric
 * Call at the end of each API handler
 */
export function recordMetric(
  route: string,
  duration: number,
  cached: boolean = false,
  userId?: string
): void {
  // Enforce circular buffer limit
  if (metrics.length >= MAX_METRICS) {
    metrics.shift();
  }
  
  metrics.push({
    route,
    duration,
    timestamp: Date.now(),
    cached,
    userId,
  });
  
  // Log slow requests in production
  const threshold = SLOW_THRESHOLDS[route] || SLOW_THRESHOLDS.default;
  if (duration > threshold) {
    console.warn(`[PERF] SLOW ${route}: ${duration}ms (threshold: ${threshold}ms)${userId ? ` user: ${userId.slice(0, 8)}...` : ''}`);
  }
}

/**
 * Get percentile value from sorted array
 */
function getPercentile(sorted: number[], percentile: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Get aggregated metrics for a specific time window
 */
export function getMetrics(windowMs: number = 60000): AggregatedMetrics {
  const now = Date.now();
  const recent = metrics.filter(m => now - m.timestamp < windowMs);
  
  if (recent.length === 0) {
    return {
      avgResponseTime: 0,
      p50: 0,
      p95: 0,
      p99: 0,
      cacheHitRate: 0,
      slowRequests: 0,
      totalRequests: 0,
    };
  }
  
  const durations = recent.map(m => m.duration).sort((a, b) => a - b);
  const cachedCount = recent.filter(m => m.cached).length;
  const slowCount = recent.filter(m => {
    const threshold = SLOW_THRESHOLDS[m.route] || SLOW_THRESHOLDS.default;
    return m.duration > threshold;
  }).length;
  
  return {
    avgResponseTime: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
    p50: getPercentile(durations, 50),
    p95: getPercentile(durations, 95),
    p99: getPercentile(durations, 99),
    cacheHitRate: Math.round((cachedCount / recent.length) * 100) / 100,
    slowRequests: slowCount,
    totalRequests: recent.length,
  };
}

/**
 * Get metrics by route
 */
export function getMetricsByRoute(windowMs: number = 60000): Record<string, AggregatedMetrics> {
  const now = Date.now();
  const recent = metrics.filter(m => now - m.timestamp < windowMs);
  
  const byRoute: Record<string, PerfMetric[]> = {};
  
  recent.forEach(m => {
    if (!byRoute[m.route]) {
      byRoute[m.route] = [];
    }
    byRoute[m.route].push(m);
  });
  
  const result: Record<string, AggregatedMetrics> = {};
  
  Object.entries(byRoute).forEach(([route, routeMetrics]) => {
    const durations = routeMetrics.map(m => m.duration).sort((a, b) => a - b);
    const cachedCount = routeMetrics.filter(m => m.cached).length;
    const threshold = SLOW_THRESHOLDS[route] || SLOW_THRESHOLDS.default;
    const slowCount = routeMetrics.filter(m => m.duration > threshold).length;
    
    result[route] = {
      avgResponseTime: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
      p50: getPercentile(durations, 50),
      p95: getPercentile(durations, 95),
      p99: getPercentile(durations, 99),
      cacheHitRate: Math.round((cachedCount / routeMetrics.length) * 100) / 100,
      slowRequests: slowCount,
      totalRequests: routeMetrics.length,
    };
  });
  
  return result;
}

/**
 * Middleware helper for timing requests
 * Usage: const end = startTimer(); ... const duration = end();
 */
export function startTimer(): () => number {
  const start = performance.now();
  return () => Math.round(performance.now() - start);
}

/**
 * Higher-order function to wrap API handlers with performance tracking
 */
export function withPerf<T extends (...args: any[]) => Promise<Response>>(
  route: string,
  handler: T
): T {
  return (async (...args: Parameters<T>): Promise<Response> => {
    const start = performance.now();
    let cached = false;
    
    try {
      const response = await handler(...args);
      
      // Check if response was from cache (by checking timing)
      const duration = Math.round(performance.now() - start);
      cached = duration < 50; // Likely cached if under 50ms
      
      recordMetric(route, duration, cached);
      
      return response;
    } catch (error) {
      const duration = Math.round(performance.now() - start);
      recordMetric(route, duration, false);
      throw error;
    }
  }) as T;
}

/**
 * Log current metrics summary
 */
export function logMetricsSummary(): void {
  const summary = getMetrics(60000);
  console.log('[PERF] Last 60s summary:', {
    requests: summary.totalRequests,
    avgMs: summary.avgResponseTime,
    p95Ms: summary.p95,
    cacheHit: `${Math.round(summary.cacheHitRate * 100)}%`,
    slow: summary.slowRequests,
  });
}

// Export types
export type { PerfMetric, AggregatedMetrics };
