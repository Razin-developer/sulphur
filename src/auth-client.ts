import { createAuthClient } from 'better-auth/react'
import { emailOTPClient, usernameClient } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_AUTH_URL ?? window.location.origin,
  plugins: [usernameClient(), emailOTPClient()],
})
