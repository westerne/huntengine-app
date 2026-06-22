// Lightweight in-memory, per-IP rate limiter (fixed window).
//
// IMPORTANT — serverless caveat: this state lives in module memory, which is
// per-server-instance. On Vercel's serverless runtime each cold instance has
// its own Map, so this is a meaningful first line of defense against a single
// client hammering the AI endpoints, but it is NOT a hard global guarantee.
// For production-grade limiting, back this with a shared store (Vercel KV or
// Upstash Redis) keyed the same way.

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 10 * 60 * 1000; // 10-minute window
const MAX_REQUESTS = 20;          // requests per IP per window

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
};

export function checkRateLimit(
  ip: string,
  opts?: { max?: number; windowMs?: number }
): RateLimitResult {
  const max = opts?.max ?? MAX_REQUESTS;
  const windowMs = opts?.windowMs ?? WINDOW_MS;
  const now = Date.now();
  const bucket = buckets.get(ip);

  // New window (or first request from this IP)
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(ip, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1, retryAfterSec: 0 };
  }

  if (bucket.count >= max) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  bucket.count += 1;
  return { allowed: true, remaining: max - bucket.count, retryAfterSec: 0 };
}

// Best-effort client IP from proxy headers (Vercel sets x-forwarded-for).
export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
