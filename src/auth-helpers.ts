export function isEmailIdentifier(value: string) {
  return value.trim().includes('@')
}

export function isValidUsername(value: string) {
  return /^[A-Za-z0-9._-]{3,30}$/.test(value)
}
