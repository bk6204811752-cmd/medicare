/**
 * Simple in-memory sliding-window rate limiter.
 *
 * Suitable for single-process / Vercel-serverless (one cold-start = fresh map).
 * For multi-instance production, swap for Redis-backed implementation.
 */

const store = new Map<string, number[]>();

// Garbage-collect stale entries every 5 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupStaleEntries(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  const cutoff = now - windowMs * 2; // generous cutoff
  for (const [key, timestamps] of store.entries()) {
    if (timestamps.length === 0 || timestamps[timestamps.length - 1] < cutoff) {
      store.delete(key);
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  retryAfterMs: number;
}

/**
 * Check and record an attempt against a rate limit.
 *
 * @param key     Unique identifier (e.g. `login:user@example.com`)
 * @param limit   Maximum number of attempts in the window
 * @param windowMs  Window size in milliseconds
 * @returns       Whether the attempt is allowed, and metadata
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const windowStart = now - windowMs;

  cleanupStaleEntries(windowMs);

  // Get existing timestamps and prune old ones
  let timestamps = store.get(key) ?? [];
  timestamps = timestamps.filter((t) => t > windowStart);

  if (timestamps.length >= limit) {
    // Blocked — calculate when the oldest attempt in the window expires
    const oldestInWindow = timestamps[0];
    const retryAfterMs = oldestInWindow + windowMs - now;
    store.set(key, timestamps);
    return { allowed: false, remainingAttempts: 0, retryAfterMs };
  }

  // Allowed — record this attempt
  timestamps.push(now);
  store.set(key, timestamps);

  return {
    allowed: true,
    remainingAttempts: limit - timestamps.length,
    retryAfterMs: 0,
  };
}

// ─── Pre-configured limiters for common auth operations ──────

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const TEN_MINUTES = 10 * 60 * 1000;

/** Login: max 5 attempts per email per 15 minutes */
export function checkLoginRateLimit(email: string): RateLimitResult {
  return checkRateLimit(`login:${email.toLowerCase().trim()}`, 5, FIFTEEN_MINUTES);
}

/** OTP send: max 3 per email per 10 minutes */
export function checkOtpSendRateLimit(email: string): RateLimitResult {
  return checkRateLimit(`otp-send:${email.toLowerCase().trim()}`, 3, TEN_MINUTES);
}

/** Password reset request: max 3 per email per 10 minutes */
export function checkPasswordResetRateLimit(email: string): RateLimitResult {
  return checkRateLimit(`pw-reset:${email.toLowerCase().trim()}`, 3, TEN_MINUTES);
}

/** OTP verification: max 5 per email per 15 minutes */
export function checkOtpVerifyRateLimit(email: string): RateLimitResult {
  return checkRateLimit(`otp-verify:${email.toLowerCase().trim()}`, 5, FIFTEEN_MINUTES);
}
