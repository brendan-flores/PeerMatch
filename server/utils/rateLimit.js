/**
 * Simple in-memory rate limiter (per process). Good enough for single-instance Render;
 * use Redis if you scale to multiple API instances.
 */

const buckets = new Map();

function prune() {
  const now = Date.now();
  for (const [key, entry] of buckets.entries()) {
    if (entry.resetAt <= now) buckets.delete(key);
  }
}

function hit(key, { windowMs, max }) {
  prune();
  const now = Date.now();
  let entry = buckets.get(key);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + windowMs };
    buckets.set(key, entry);
  }
  entry.count += 1;
  if (entry.count > max) {
    const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfterSec };
  }
  return { allowed: true, retryAfterSec: 0 };
}

function rateLimitByKey(key, options) {
  const result = hit(key, options);
  if (result.allowed) return null;
  const err = new Error(`Too many attempts. Try again in ${result.retryAfterSec} seconds.`);
  err.status = 429;
  err.retryAfterSec = result.retryAfterSec;
  return err;
}

module.exports = { rateLimitByKey };
