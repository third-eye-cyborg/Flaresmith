import { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";

/**
 * T029: Rate Limiting Middleware
 * Implements token bucket algorithm per-user and per-project
 */

interface RateLimitBucket {
  tokens: number;
  lastRefill: number;
  maxTokens: number;
  refillRate: number; // tokens per second
}

const userBuckets = new Map<string, RateLimitBucket>();
const projectBuckets = new Map<string, RateLimitBucket>();

const USER_RATE_LIMIT = {
  maxTokens: 120, // burst capacity
  refillRate: 1, // 60 per minute
  costMap: {
    provision: 5,
    chat: 3,
    stream: 0.1, // per 10s
    default: 1,
  },
};

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
  if (path.includes("/provision") || method === "POST") {
    return USER_RATE_LIMIT.costMap.provision;
  }
  if (path.includes("/chat")) {
    return USER_RATE_LIMIT.costMap.chat;
  }
  if (path.includes("/stream")) {
    return USER_RATE_LIMIT.costMap.stream;
  }
  return USER_RATE_LIMIT.costMap.default;
}

export function rateLimitMiddleware() {
  return async (c: Context, next: Next) => {
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
      const retryAfter = Math.ceil(cost / userBucket.refillRate);
      c.header("Retry-After", retryAfter.toString());
      c.header("X-RateLimit-Remaining-User", Math.floor(userBucket.tokens).toString());
      
      throw new HTTPException(429, { 
        message: "User rate limit exceeded",
      });
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
        const retryAfter = Math.ceil(cost / projectBucket.refillRate);
        c.header("Retry-After", retryAfter.toString());
        c.header("X-RateLimit-Remaining-Project", Math.floor(projectBucket.tokens).toString());
        
        throw new HTTPException(429, { 
          message: "Project rate limit exceeded",
        });
      }

      c.header("X-RateLimit-Remaining-Project", Math.floor(projectBucket.tokens).toString());
    }

    c.header("X-RateLimit-Remaining-User", Math.floor(userBucket.tokens).toString());
    await next();
  };
}
