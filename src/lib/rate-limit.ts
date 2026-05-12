import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "./env";

let _redis: Redis | null = null;

function redis() {
  if (_redis) return _redis;
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  _redis = new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  });
  return _redis;
}

const limiters = new Map<string, Ratelimit>();

export function getRateLimiter(
  name: string,
  tokens: number,
  window: `${number} ${"s" | "m" | "h" | "d"}`,
) {
  const r = redis();
  if (!r) return null;
  let limiter = limiters.get(name);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: r,
      limiter: Ratelimit.slidingWindow(tokens, window),
      prefix: `emberos:${name}`,
    });
    limiters.set(name, limiter);
  }
  return limiter;
}

export async function checkRate(
  name: string,
  identifier: string,
  tokens: number,
  window: `${number} ${"s" | "m" | "h" | "d"}`,
) {
  const limiter = getRateLimiter(name, tokens, window);
  if (!limiter) return { success: true, remaining: tokens, limit: tokens };
  return limiter.limit(identifier);
}
