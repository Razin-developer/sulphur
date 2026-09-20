import { existsSync } from 'node:fs'

export type RuntimePreflight = { ready: boolean; reason?: string }

export function runtimePreflight(kvmAvailable = existsSync('/dev/kvm')): RuntimePreflight {
  if (!kvmAvailable) return { ready: false, reason: 'Android worker is unavailable: this Docker engine does not expose KVM virtualization.' }
  return { ready: true }
}

if (process.argv[1]?.endsWith('preflight.ts')) {
  const result = runtimePreflight()
  console.log(JSON.stringify(result))
  if (!result.ready) process.exitCode = 1
}
