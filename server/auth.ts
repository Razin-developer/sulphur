import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { emailOTP, username } from 'better-auth/plugins'
import { db } from './db.js'
import { sendOtpEmail } from './email.js'
import * as schema from './auth-schema.js'
import { trustedOrigins } from './origins.js'

const required = (name: string) => {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required to enable authentication.`)
  return value
}

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg', schema }),
  baseURL: required('BETTER_AUTH_URL'),
  secret: required('BETTER_AUTH_SECRET'),
  trustedOrigins,
  // OAuth failures return to the product instead of Better Auth's server-only page.
  onAPIError: { errorURL: `${trustedOrigins[0]}/auth/login` },
  emailAndPassword: { enabled: true },
  socialProviders: {
    google: {
      clientId: required('GOOGLE_CLIENT_ID'),
      clientSecret: required('GOOGLE_CLIENT_SECRET'),
      mapProfileToUser: (profile) => ({ name: profile.name, image: profile.picture }),
    },
    github: {
      clientId: required('GITHUB_CLIENT_ID'),
      clientSecret: required('GITHUB_CLIENT_SECRET'),
      mapProfileToUser: (profile) => ({ name: profile.name ?? profile.login, image: profile.avatar_url }),
    },
  },
  plugins: [username({
    minUsernameLength: 3,
    maxUsernameLength: 30,
    // A username is part of a person's profile, so allow a signed-in user to
    // update it. The plugin continues to enforce uniqueness and validation.
    immutableUsername: false,
    usernameValidator: (value) => /^[a-zA-Z0-9._-]+$/.test(value),
    displayUsernameValidator: (value) => /^[a-zA-Z0-9._-]+$/.test(value),
  }), emailOTP({
    otpLength: 6,
    expiresIn: 600,
    allowedAttempts: 5,
    // A verified address is required before any workspace API becomes available.
    // Keep resends deliberately tight so the service cannot be used to spam email.
    sendVerificationOnSignUp: true,
    rateLimit: { window: 600, max: 3 },
    async sendVerificationOTP({ email, otp, type }) {
      await sendOtpEmail({ to: email, otp, type })
    },
  })],
})
