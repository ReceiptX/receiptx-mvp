type Bucket = {
  tokens: number;
  lastRefill: number; // ms timestamp
};

const buckets = new Map<string, Bucket>();

// Periodically purge very old buckets to avoid unbounded memory growth.
const BUCKET_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
setInterval(() => {
  const now = Date.now();
  for (const [k, b] of buckets) {
    if (now - b.lastRefill > BUCKET_TTL_MS) buckets.delete(k);
  }
}, 60 * 60 * 1000).unref?.();

/**
 * Token-bucket rate limiter.
 * @param key Unique key for rate limiting (IP/user/id)
 * @param limit Maximum tokens (burst size)
 * @param windowMs Window in milliseconds that `limit` tokens refill over
 * @returns {allowed:boolean, remaining:number, resetMs:number}
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
) {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { tokens: limit, lastRefill: now };

  // Refill tokens proportional to elapsed time.
  const refillRatePerMs = limit / windowMs;
  const elapsed = now - bucket.lastRefill;
  const refill = elapsed * refillRatePerMs;
  if (refill > 0) {
    bucket.tokens = Math.min(limit, bucket.tokens + refill);
    bucket.lastRefill = now;
  }

  const allowed = bucket.tokens >= 1;
  if (allowed) {
    bucket.tokens = bucket.tokens - 1;
  }

  buckets.set(key, bucket);

  const remaining = Math.floor(Math.max(0, bucket.tokens));
  // estimate reset in ms until at least 1 token available
  const missing = Math.max(0, 1 - bucket.tokens);
  const resetMs = missing > 0 ? Math.ceil(missing / refillRatePerMs) : 0;

  return { allowed, remaining, resetMs };
}

export function resetRateLimit(key: string) {
  buckets.delete(key);
}
