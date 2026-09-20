import { describe, expect, it } from 'vitest'
import { createIsolatedSessionSpec, ownsSession } from './session-spec'

const first = '11111111-1111-4111-8111-111111111111'
const second = '22222222-2222-4222-8222-222222222222'

describe('isolated Android worker spec', () => {
  it('gives parallel sessions distinct networks without publishing ADB ports', () => {
    const a = createIsolatedSessionSpec(first, 'user-a', 'user-a/app.apk')
    const b = createIsolatedSessionSpec(second, 'user-b', 'user-b/app.apk')
    expect(a.networkName).not.toBe(b.networkName)
    expect(a.publishedPorts).toEqual([])
    expect(a.privileged).toBe(false)
    expect(a.hostNetwork).toBe(false)
  })

  it('keeps session ownership exact and rejects traversal-like artifact references', () => {
    const session = createIsolatedSessionSpec(first, 'user-a', 'user-a/app.apk')
    expect(ownsSession('user-a', session)).toBe(true)
    expect(ownsSession('user-b', session)).toBe(false)
    expect(() => createIsolatedSessionSpec(second, 'user-b', '../app.apk')).toThrow('Invalid artifact')
  })
})
