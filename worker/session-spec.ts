export type IsolatedSessionSpec = {
  sessionId: string
  ownerUserId: string
  containerName: string
  networkName: string
  readOnlyArtifactMount: string
  privileged: false
  hostNetwork: false
  publishedPorts: []
  egress: 'blocked'
}

/**
 * A worker receives one session and its private artifact mount. It must keep
 * ADB inside the worker network; browsers receive video through a gateway only.
 */
export function createIsolatedSessionSpec(sessionId: string, ownerUserId: string, artifactKey: string): IsolatedSessionSpec {
  if (!/^[a-f0-9-]{36}$/i.test(sessionId)) throw new Error('Invalid session identifier.')
  if (!ownerUserId) throw new Error('A session owner is required.')
  if (!/^[a-zA-Z0-9._/-]+\.apk$/.test(artifactKey) || artifactKey.includes('..')) throw new Error('Invalid artifact reference.')
  const safeSessionId = sessionId.toLowerCase()
  return {
    sessionId,
    ownerUserId,
    containerName: `sulphur-session-${safeSessionId}`,
    networkName: `sulphur-session-${safeSessionId}`,
    readOnlyArtifactMount: `/artifacts/${artifactKey.replace(/\\/g, '/')}`,
    privileged: false,
    hostNetwork: false,
    publishedPorts: [],
    egress: 'blocked',
  }
}

export function ownsSession(ownerUserId: string, session: Pick<IsolatedSessionSpec, 'ownerUserId'>) {
  return Boolean(ownerUserId) && ownerUserId === session.ownerUserId
}
