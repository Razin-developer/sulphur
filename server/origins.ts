const configuredOrigin = process.env.WEB_ORIGIN
if (!configuredOrigin) throw new Error('WEB_ORIGIN is required to start the authentication service.')

// Localhost and 127.0.0.1 are different browser origins. Support both while
// developing locally, without widening production origins.
export const trustedOrigins = [...new Set([
  configuredOrigin,
  ...(configuredOrigin === 'http://localhost:5173' ? ['http://127.0.0.1:5173'] : []),
  ...(configuredOrigin === 'http://127.0.0.1:5173' ? ['http://localhost:5173'] : []),
])]
