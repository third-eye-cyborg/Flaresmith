import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import { circuitBreakerRegistry } from "@flaresmith/utils";
import { incrementCounter, METRICS, observeHistogram } from "../lib/metrics";

/**
 * T139: Rate Limiting Middleware (enhanced)
 * Implements token bucket algorithm per-user and per-project with endpoint weights & standardized headers.
 */

interface RateLimitBucket {
  tokens: number;
  lastRefill: number;
  maxTokens: number;
  refillRate: number; // tokens per second
}

// Exported status accessor (T112)
export function getRateLimitSnapshot(userId: string, projectId?: string) {
  const userBucket = userBuckets.get(userId);
  const user = userBucket ? {
    remaining: Math.floor(userBucket.tokens),
    limit: userBucket.maxTokens,
    refillRate: userBucket.refillRate,
    secondsToFull: Number(((userBucket.maxTokens - userBucket.tokens) / userBucket.refillRate).toFixed(2)),
  } : {
    remaining: USER_RATE_LIMIT.maxTokens,
    limit: USER_RATE_LIMIT.maxTokens,
    refillRate: USER_RATE_LIMIT.refillRate,
    secondsToFull: 0,
  };
  let project: any = undefined;
  if (projectId) {
    const projectBucket = projectBuckets.get(projectId);
    project = projectBucket ? {
      remaining: Math.floor(projectBucket.tokens),
      limit: projectBucket.maxTokens,
      refillRate: projectBucket.refillRate,
      secondsToFull: Number(((projectBucket.maxTokens - projectBucket.tokens) / projectBucket.refillRate).toFixed(2)),
    } : {
      remaining: PROJECT_RATE_LIMIT.maxTokens,
      limit: PROJECT_RATE_LIMIT.maxTokens,
      refillRate: PROJECT_RATE_LIMIT.refillRate,
      secondsToFull: 0,
    };
  }
  return { user, project };
}

const userBuckets = new Map<string, RateLimitBucket>();
const projectBuckets = new Map<string, RateLimitBucket>();

const USER_RATE_LIMIT = {
  maxTokens: 120, // burst capacity
  refillRate: 1, // 60 per minute steady state
  costMap: {
    provision: 5,
    chat: 3,
    stream: 0.1, // streaming sustain cost (approx per 10s)
    read: 1,
    default: 1,
  },
} as const;

const PROJECT_RATE_LIMIT = {
  maxTokens: 600, // burst capacity
  refillRate: 5, // 300 per minute
  costMap: {
    provision: 5,
    default: 1,
  },
};

function refillBucket(bucket: RateLimitBucket): void {
  const now = Date.now();
  const elapsed = (now - bucket.lastRefill) / 1000;
  const refillAmount = elapsed * bucket.refillRate;
  
  bucket.tokens = Math.min(bucket.maxTokens, bucket.tokens + refillAmount);
  bucket.lastRefill = now;
}

function consumeTokens(bucket: RateLimitBucket, cost: number): boolean {
  refillBucket(bucket);
  
  if (bucket.tokens >= cost) {
    bucket.tokens -= cost;
    return true;
  }
  
  return false;
}

function getCost(path: string, method: string): number {
  // Provisioning endpoints
  if (method === "POST" && path === "/projects") {
    return USER_RATE_LIMIT.costMap.provision;
  }
  // Spec apply heavy operation
  if (method === "POST" && path === "/specs/apply") {
    return USER_RATE_LIMIT.costMap.provision;
  }
  // Chat operations
  if (method === "POST" && /\/chat\/(stream|apply-diff)$/.test(path)) {
    return USER_RATE_LIMIT.costMap.chat;
  }
  // Streaming sustain token consumption (handled by periodic calls)
  if (/\/stream$/.test(path)) {
    return USER_RATE_LIMIT.costMap.stream;
  }
  // Reads
  if (method === "GET") {
    return USER_RATE_LIMIT.costMap.read;
  }
  return USER_RATE_LIMIT.costMap.default;
}

export function rateLimitMiddleware() {
  return async (c: Context, next: Next) => {
    const start = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    const userId = c.get("userId") as string;
    const projectId = c.req.param("projectId") || c.req.query("projectId");
    const path = c.req.path;
    const method = c.req.method;

    if (!userId) {
      throw new HTTPException(401, { message: "Authentication required" });
    }

    // Get or create user bucket
    if (!userBuckets.has(userId)) {
      userBuckets.set(userId, {
        tokens: USER_RATE_LIMIT.maxTokens,
        lastRefill: Date.now(),
        maxTokens: USER_RATE_LIMIT.maxTokens,
        refillRate: USER_RATE_LIMIT.refillRate,
      });
    }

    const userBucket = userBuckets.get(userId)!;
    const cost = getCost(path, method);

    if (!consumeTokens(userBucket, cost)) {
      incrementCounter(METRICS.rateLimitExceeded);
      const retryAfter = Math.ceil(cost / userBucket.refillRate);
      c.header("Retry-After", retryAfter.toString());
      c.header("X-RateLimit-Limit-User", USER_RATE_LIMIT.maxTokens.toString());
      c.header("X-RateLimit-Remaining-User", Math.floor(userBucket.tokens).toString());
      c.header("X-RateLimit-Reset-User", (Date.now() + retryAfter * 1000).toString());
      throw new HTTPException(429, { message: "User rate limit exceeded" });
    }

    // Project-level rate limiting
    if (projectId) {
      if (!projectBuckets.has(projectId)) {
        projectBuckets.set(projectId, {
          tokens: PROJECT_RATE_LIMIT.maxTokens,
          lastRefill: Date.now(),
          maxTokens: PROJECT_RATE_LIMIT.maxTokens,
          refillRate: PROJECT_RATE_LIMIT.refillRate,
        });
      }

      const projectBucket = projectBuckets.get(projectId)!;
      
      if (!consumeTokens(projectBucket, cost)) {
        incrementCounter(METRICS.rateLimitExceeded);
        const retryAfter = Math.ceil(cost / projectBucket.refillRate);
        c.header("Retry-After", retryAfter.toString());
        c.header("X-RateLimit-Limit-Project", PROJECT_RATE_LIMIT.maxTokens.toString());
        c.header("X-RateLimit-Remaining-Project", Math.floor(projectBucket.tokens).toString());
        c.header("X-RateLimit-Reset-Project", (Date.now() + retryAfter * 1000).toString());
        throw new HTTPException(429, { message: "Project rate limit exceeded" });
      }
      c.header("X-RateLimit-Limit-Project", PROJECT_RATE_LIMIT.maxTokens.toString());
      c.header("X-RateLimit-Remaining-Project", Math.floor(projectBucket.tokens).toString());
      c.set("rateLimitProjectRemaining", Math.floor(projectBucket.tokens));
    }

    incrementCounter(METRICS.rateLimitHits);
    c.header("X-RateLimit-Limit-User", USER_RATE_LIMIT.maxTokens.toString());
    c.header("X-RateLimit-Remaining-User", Math.floor(userBucket.tokens).toString());
    c.set("rateLimitUserRemaining", Math.floor(userBucket.tokens));

    // Overhead measurement ends BEFORE invoking downstream handler; the latency cost of rate limiting logic itself
    const end = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    const overheadMs = end - start;
    observeHistogram(METRICS.rateLimitOverheadMs, overheadMs);
    await next();

    // Attach circuit breaker states as headers for observability
    const breakers = circuitBreakerRegistry.getAll();
    breakers.forEach((breaker, name) => {
      const metrics = breaker.getMetrics();
      c.header(`X-CircuitBreaker-${name}`, metrics.state);
      if (metrics.state === 'open') incrementCounter(METRICS.circuitBreakerOpen);
      if (metrics.state === 'half_open') incrementCounter(METRICS.circuitBreakerHalfOpen);
    });
  };
}
