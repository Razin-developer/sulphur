import { NavLink } from 'react-router-dom'
import type { ReactNode } from 'react'
import { ArrowLeft, MonitorSmartphone, Square } from 'lucide-react'
import { Badge, Button, Card } from './ui'

export function SessionPanel({ sessionId, screen, setupAction, chat, ending = false, onEnd, demo = false }: { sessionId: string; screen: ReactNode; setupAction: ReactNode; chat?: ReactNode; ending?: boolean; onEnd?: () => void; demo?: boolean }) {
  return <section className={chat ? "session-layout session-layout-agent" : "session-layout"}>
    <Card className="session-screen"><div className="session-screen-bar"><div><strong><MonitorSmartphone size={15} /> Live screen</strong><span>Continuous local preview</span></div><Badge tone="safe">Running</Badge></div>{screen}<div className="session-footer"><span>View-only in this local preview</span>{demo ? <Button variant="outline"><Square size={14} fill="currentColor" /> End session</Button> : <Button variant="outline" disabled={ending} onClick={onEnd}><Square size={14} fill="currentColor" /> {ending ? 'Ending…' : 'End session'}</Button>}</div></Card>
    <Card className="session-info"><p className="eyebrow">SESSION STATUS</p><h2>Android app is running</h2><p>This local mode keeps one active emulator so no workspace can accidentally share a device.</p><div className="session-id"><span>MCP session ID</span><code>{sessionId}</code></div>{setupAction}<NavLink to="/apps"><Button variant="outline"><ArrowLeft size={15} /> Back to apps</Button></NavLink></Card>{chat}
  </section>
}

export function SessionDemoScreen() {
  return <div className="live-screen"><div className="live-screen-stage landing-session-device-stage"><div className="landing-session-phone"><div className="landing-session-notch" /><div className="landing-session-app"><div className="landing-session-status"><span>9:41</span><span>● ● ●</span></div><span className="landing-session-label">SULPHUR DEMO</span><h3>Welcome back</h3><p>Continue your storefront journey.</p><div className="landing-session-card"><strong>Saved items</strong><span>3 products ready for checkout</span></div><button>Continue</button></div></div><span className="screen-status">Screen state verified · snapshot 8f29</span><span className="frame-status">Live preview</span></div></div>
}
