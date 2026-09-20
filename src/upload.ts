export function validateApk(file?: Pick<File, 'name' | 'size'>): string | undefined {
  if (!file) return 'Choose an APK before saving.'
  if (!file.name.toLowerCase().endsWith('.apk')) return 'Choose an Android APK file.'
  if (file.size === 0) return 'This APK file is empty.'
  return undefined
}
