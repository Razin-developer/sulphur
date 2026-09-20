import React, { useState } from "react"

import { cn } from "@/lib/utils"

interface MagicCardBaseProps {
  children?: React.ReactNode
  className?: string
  gradientSize?: number
  gradientFrom?: string
  gradientTo?: string
}

interface MagicCardGradientProps extends MagicCardBaseProps {
  mode?: "gradient"

  gradientColor?: string
  gradientOpacity?: number

  glowFrom?: never
  glowTo?: never
  glowAngle?: never
  glowSize?: never
  glowBlur?: never
  glowOpacity?: never
}

type MagicCardProps = MagicCardGradientProps

export function MagicCard(props: MagicCardProps) {
  const {
    children,
    className,
    gradientSize = 200,
    gradientColor = "#262626",
    gradientOpacity = 0.8,
    gradientFrom = "#9E7AFF",
    gradientTo = "#FE8BBB",
  } = props
  const [position, setPosition] = useState<{ x: number; y: number } | undefined>()

  return (
    <div
      className={cn(
        "group relative isolate overflow-hidden rounded-[inherit] border border-transparent",
        className
      )}
      onPointerMove={(event) => { const box = event.currentTarget.getBoundingClientRect(); setPosition({ x: event.clientX - box.left, y: event.clientY - box.top }) }}
      onPointerLeave={() => setPosition(undefined)}
      style={{
        background: position ? `radial-gradient(${gradientSize}px circle at ${position.x}px ${position.y}px, ${gradientFrom}, ${gradientTo}, transparent 72%)` : undefined,
      }}
    >
      <div className="bg-background absolute inset-px z-20 rounded-[inherit]" />

      <div className="pointer-events-none absolute inset-px z-30 rounded-[inherit] transition-opacity duration-300" style={{ background: gradientColor, opacity: position ? gradientOpacity : 0 }} />
      <div className="relative z-40">{children}</div>
    </div>
  )
}
