import { describe, expect, it } from 'vitest'
import { runtimePreflight } from './preflight'

describe('Android worker preflight', () => {
  it('refuses an emulator worker without KVM', () => expect(runtimePreflight(false)).toEqual({ ready: false, reason: expect.stringContaining('KVM') }))
  it('accepts a host that exposes KVM', () => expect(runtimePreflight(true)).toEqual({ ready: true }))
})
