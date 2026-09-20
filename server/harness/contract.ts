/**
 * The only boundary a future emulator worker may expose to the control plane.
 * Browser clients never receive ADB addresses or raw emulator access.
 */
export type HarnessSnapshot = {
  id: string
  capturedAt: string
  semanticCoverage: number
  elements: Array<{ id: string; role: string; name: string; enabled: boolean; confidence: number }>
}

export type HarnessAction = {
  snapshotId: string
  kind: 'tap' | 'type' | 'long_press' | 'scroll' | 'back' | 'wait'
  elementId?: string
  value?: string
}

export interface AndroidHarness {
  getSnapshot(): Promise<HarnessSnapshot>
  act(action: HarnessAction): Promise<{ status: 'completed' | 'stale_snapshot' | 'approval_required' | 'blocked'; snapshot: HarnessSnapshot }>
  captureRedactedScreenshot(): Promise<Uint8Array>
  stop(): Promise<void>
}
