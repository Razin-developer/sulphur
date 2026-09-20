export type ElementSource = 'semantic' | 'visual'
export type ActionKind = 'tap' | 'type' | 'long_press' | 'scroll' | 'back' | 'wait'
export type PolicyDecision = 'ALLOW' | 'APPROVAL_REQUIRED' | 'BLOCKED'
export type ActionStatus = 'COMPLETED' | 'STALE_SNAPSHOT' | 'APPROVAL_REQUIRED' | 'BLOCKED'

export interface ScreenElement {
  elementId: string
  role: 'button' | 'input' | 'link' | 'text'
  name: string
  enabled: boolean
  source: ElementSource
  confidence: number
  context?: string
}

export interface ScreenState {
  snapshotId: string
  title: string
  coverage: number
  elements: ScreenElement[]
}

export interface AuditEvent {
  id: string
  at: string
  actor: string
  action: string
  target: string
  outcome: ActionStatus | 'ALLOWED'
  detail: string
}

export interface ActionRequest {
  kind: ActionKind
  snapshotId: string
  elementId?: string
  value?: string
  approvalToken?: string
}

export interface ActionResult {
  status: ActionStatus
  message: string
  screen: ScreenState
  approvalToken?: string
}

export interface SessionHarness {
  getScreenState(): ScreenState
  act(request: ActionRequest): ActionResult
  getActionLog(): AuditEvent[]
  pause(): void
  reset(): void
  isPaused(): boolean
}
