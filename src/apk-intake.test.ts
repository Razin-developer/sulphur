import { describe, expect, it } from 'vitest'
import { apkIntakeIssue, maximumApkBytes } from './apk-intake'

describe('APK intake review', () => {
  it('accepts a ZIP-formatted APK within the review limit', () => {
    expect(apkIntakeIssue({ name: 'app.apk', size: 10, type: 'application/vnd.android.package-archive' }, new Uint8Array([0x50, 0x4b]))).toBeUndefined()
  })

  it('rejects invalid extensions, archives, and oversized files', () => {
    expect(apkIntakeIssue({ name: 'app.zip', size: 10, type: '' })).toBe('Choose an Android APK file.')
    expect(apkIntakeIssue({ name: 'app.apk', size: 10, type: '' }, new Uint8Array([0, 1]))).toBe('This file is not a valid APK archive.')
    expect(apkIntakeIssue({ name: 'app.apk', size: maximumApkBytes + 1, type: '' })).toContain('50 MB')
  })
})
