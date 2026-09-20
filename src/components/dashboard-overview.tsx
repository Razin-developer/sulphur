import { NavLink } from 'react-router-dom'
import { Upload } from 'lucide-react'
import { Button, Card } from './ui'

export function DashboardOverview({ appsCount }: { appsCount: number }) {
  return <>
    <header className="topbar">
      <span className="workspace"><span className="workspace-dot" />Your workspace</span>
      <NavLink to="/apps"><Button><Upload size={16} />Upload APK</Button></NavLink>
    </header>
    <section className="page-heading dashboard-heading">
      <div><p className="eyebrow">WORKSPACE OVERVIEW</p><h1>Welcome to Sulphur</h1><p>Keep your Android apps organized and ready for a future agent test session.</p></div>
    </section>
    <section className="metric-grid">
      <Card><span>Saved apps</span><strong>{appsCount}</strong><p>APK{appsCount === 1 ? '' : 's'} in this workspace</p></Card>
      <Card><span>Active sessions</span><strong>0</strong><p>The Android worker is not connected</p></Card>
      <Card><span>Agent connections</span><strong>0</strong><p>MCP connections appear here</p></Card>
    </section>
    <Card className="dashboard-card">
      <div><p className="eyebrow">NEXT STEP</p><h2>Upload an APK to get started</h2><p>Apps are stored privately. When the isolated Android worker is ready, you can prepare one for a controlled agent session.</p></div>
      <NavLink to="/apps"><Button variant="outline">Manage apps</Button></NavLink>
    </Card>
  </>
}
