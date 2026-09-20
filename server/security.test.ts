import { describe, expect, it } from 'vitest'
import { FixedWindowRateLimiter } from './security.js'

describe('FixedWindowRateLimiter', () => {
  it('blocks requests after the configured limit and resets on the next window', () => {
    const limiter = new FixedWindowRateLimiter(2, 1_000)
    expect(limiter.check('user', 100).allowed).toBe(true)
    expect(limiter.check('user', 101).allowed).toBe(true)
    const blocked = limiter.check('user', 102)
    expect(blocked.allowed).toBe(false)
    expect(blocked.remaining).toBe(0)
    expect(blocked.retryAfterSeconds).toBe(1)
    expect(limiter.check('user', 1_100).allowed).toBe(true)
  })

  it('keeps route or user keys isolated', () => {
    const limiter = new FixedWindowRateLimiter(1, 1_000)
    expect(limiter.check('upload:user-a', 0).allowed).toBe(true)
    expect(limiter.check('upload:user-b', 0).allowed).toBe(true)
    expect(limiter.check('upload:user-a', 0).allowed).toBe(false)
  })
})
