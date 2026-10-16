// Einfaches Rate-Limit im Arbeitsspeicher (Fixed Window). Für eine einzelne
// Instanz ausreichend; bei mehreren Instanzen durch Redis o. Ä. ersetzen.

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()
let lastSweep = Date.now()

function sweep(now: number) {
  if (now - lastSweep < 60_000) return
  lastSweep = now
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

export type RateLimitResult = { ok: boolean; retryAfterSeconds: number }

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  sweep(now)
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, retryAfterSeconds: 0 }
  }
  bucket.count++
  if (bucket.count > limit) {
    return { ok: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) }
  }
  return { ok: true, retryAfterSeconds: 0 }
}

export function resetRateLimit(key: string) {
  buckets.delete(key)
}
