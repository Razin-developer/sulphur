import type { Context, MiddlewareHandler } from 'hono'

type LimitBucket = { count: number; resetAt: number }

export type RateLimitResult = {
  allowed: boolean
  limit: number
  remaining: number
  retryAfterSeconds: number
  resetAt: number
}

/**
 * Small, deliberately local rate limiter. It is useful for a single service
 * instance; deploy behind a shared Redis/store-backed limiter before scaling
 * the API horizontally.
 */
export class FixedWindowRateLimiter {
  private readonly buckets = new Map<string, LimitBucket>()

  constructor(private readonly limit: number, private readonly windowMs: number) {}

  check(key: string, now = Date.now()): RateLimitResult {
    const bucketKey = key.slice(0, 512)
    let bucket = this.buckets.get(bucketKey)
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + this.windowMs }
      this.buckets.set(bucketKey, bucket)
    }

    bucket.count += 1
    const allowed = bucket.count <= this.limit
    return {
      allowed,
      limit: this.limit,
      remaining: Math.max(0, this.limit - bucket.count),
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
      resetAt: bucket.resetAt,
    }
  }
}

export function clientKey(context: Context) {
  // Only trust forwarding headers after an explicitly configured trusted proxy.
  // Without it, origin is a conservative local-development key and cannot grant
  // a caller access to another tenant's data.
  if (process.env.TRUST_PROXY === 'true') {
    const forwarded = context.req.header('x-forwarded-for')?.split(',')[0]?.trim()
    if (forwarded) return `ip:${forwarded.slice(0, 128)}`
  }
  return `origin:${context.req.header('origin') ?? 'direct'}`
}

export function rateLimit(limiter: FixedWindowRateLimiter, scope: string): MiddlewareHandler {
  return async (context, next) => {
    const result = limiter.check(`${scope}:${clientKey(context)}`)
    context.header('RateLimit-Limit', String(result.limit))
    context.header('RateLimit-Remaining', String(result.remaining))
    context.header('RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)))
    if (!result.allowed) {
      context.header('Retry-After', String(result.retryAfterSeconds))
      return context.json({ message: 'Please wait a moment before trying again.' }, 429)
    }
    await next()
  }
}

export function apiSecurityHeaders(): MiddlewareHandler {
  return async (context, next) => {
    await next()
    context.header('X-Content-Type-Options', 'nosniff')
    context.header('Referrer-Policy', 'no-referrer')
    context.header('X-Frame-Options', 'DENY')
    context.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
    context.header('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'")
    // Auth/session and tenant resources must never be placed in shared caches.
    context.header('Cache-Control', context.req.path === '/health' ? 'public, max-age=30' : 'no-store, private')
    if (context.req.path.startsWith('/api/')) context.header('Vary', 'Origin, Cookie')
  }
}
