import { CheckCircle2, Gauge, Timer, Zap } from 'lucide-react'

const rows = [
  ['Direct ADB', '207.93 s', '531,673', '3,883'],
  ['MCP · redundant snapshots', '220.69 s', '491,216', '2,318'],
  ['MCP · optimized snapshots', '160.42 s', '358,789', '1,275'],
]

export function BenchmarkStats({ compact = false }: { compact?: boolean }) {
  return <section className={compact ? 'benchmark compact' : 'benchmark'} aria-labelledby="benchmark-heading">
    <div className="benchmark-heading"><div><p className="landing-kicker">MEASURED ON A SIMPLE, SAFE TASK</p><h2 id="benchmark-heading">Faster task loops. Fewer tokens.</h2><p>Three sample orders completed successfully in every condition, returning to Home with an empty cart.</p></div><span className="benchmark-verified"><CheckCircle2 className="size-4" />3/3 orders per condition</span></div>
    <div className="benchmark-metrics"><article><span><Timer className="size-4" />Task time</span><strong>1.30×</strong><p>faster than direct ADB</p></article><article><span><Zap className="size-4" />Input tokens</span><strong>32.5%</strong><p>fewer with optimized MCP</p></article><article><span><Gauge className="size-4" />Output tokens</span><strong>67.2%</strong><p>fewer with optimized MCP</p></article></div>
    {!compact && <div className="benchmark-table-wrap"><table className="benchmark-table"><thead><tr><th>Condition</th><th>Task time</th><th>Input tokens</th><th>Output tokens</th><th>Result</th></tr></thead><tbody>{rows.map((row, index) => <tr key={row[0]} className={index === 2 ? 'best' : ''}><td>{row[0]}{index === 2 && <span>BEST</span>}</td><td>{row[1]}</td><td>{row[2]}</td><td>{row[3]}</td><td><CheckCircle2 className="size-4" />3/3</td></tr>)}</tbody></table></div>}
    <p className="benchmark-note">Optimized MCP returns a refreshed, named screen snapshot after each action—reducing repeated raw XML dumps, coordinate inference, and avoidable context.</p>
  </section>
}
