import { type CSSProperties, type ReactNode } from 'react'

type FadeContentProps = { children: ReactNode; delay?: number; className?: string }

export function FadeContent({ children, delay = 0, className = '' }: FadeContentProps) {
  return <div className={`fade-content ${className}`} style={{ '--fade-delay': `${delay}ms` } as CSSProperties}>{children}</div>
}
