export const maximumApkBytes = 50 * 1024 * 1024

export function apkIntakeIssue(file: Pick<File, 'name' | 'size' | 'type'>, signature?: Uint8Array) {
  if (!file.name.toLowerCase().endsWith('.apk')) return 'Choose an Android APK file.'
  if (!file.size) return 'This APK file is empty.'
  if (file.size > maximumApkBytes) return 'This APK is larger than the current 50 MB review limit.'
  if (signature && (signature[0] !== 0x50 || signature[1] !== 0x4b)) return 'This file is not a valid APK archive.'
  return undefined
}
