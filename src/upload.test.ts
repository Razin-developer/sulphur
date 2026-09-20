import { describe, expect, it } from 'vitest'
import { validateApk } from './upload'

describe('APK validation', () => {
  it('accepts a non-empty APK file', () => expect(validateApk({ name: 'release.apk', size: 1 })).toBeUndefined())
  it('rejects unsupported and empty files', () => {
    expect(validateApk({ name: 'release.zip', size: 1 })).toBe('Choose an Android APK file.')
    expect(validateApk({ name: 'release.apk', size: 0 })).toBe('This APK file is empty.')
  })
})
