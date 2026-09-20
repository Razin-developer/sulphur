import { useEffect, useState } from "react";

type LoaderStatus = "working" | "error";

/** A local adaptation of the React Bits Lattice Loader pattern. */
export function LatticeLoader({ status = "working", label, detail }: { status?: LoaderStatus; label: string; detail: string }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (status !== "working") return;
    const started = Date.now();
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1_000)), 1_000);
    return () => window.clearInterval(timer);
  }, [status]);
  const minutes = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const seconds = String(elapsed % 60).padStart(2, "0");
  return <div className={`lattice-loader ${status}`} role="status" aria-live="polite" aria-label={label}>
    <span className="lattice-loader-grid" aria-hidden="true">{Array.from({ length: 9 }, (_, index) => <i key={index} style={{ animationDelay: `${index * 85}ms` }} />)}</span>
    <span className="lattice-loader-copy"><strong>{label}</strong><small>{detail}</small></span>
    <time>{minutes}:{seconds}</time>
  </div>;
}
