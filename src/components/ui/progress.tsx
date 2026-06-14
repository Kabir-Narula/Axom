"use client"

import * as React from "react"
import { Progress as ProgressPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

/**
 * Progress bar built on the Radix primitive. Accepts a 0..1 fraction.
 * Monochrome by design — the magnitude reads through length, not colour.
 */
function Progress({
  className,
  value,
  indicatorClassName,
  ...props
}: Omit<React.ComponentProps<typeof ProgressPrimitive.Root>, "value"> & {
  value: number
  indicatorClassName?: string
}) {
  const v = Math.min(Math.max(value, 0), 1)
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      value={v * 100}
      className={cn(
        "relative h-1.5 w-full overflow-hidden rounded-full bg-muted",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn(
          "h-full rounded-full bg-foreground/80 transition-all duration-500",
          indicatorClassName
        )}
        style={{ width: `${v * 100}%` }}
      />
    </ProgressPrimitive.Root>
  )
}

/** Minimal monochrome progress ring (custom SVG viz, 0..1). */
function Ring({
  value,
  size = 64,
  stroke = 5,
  className,
  label,
  accent = false,
}: {
  value: number
  size?: number
  stroke?: number
  className?: string
  label?: React.ReactNode
  accent?: boolean
}) {
  const v = Math.min(Math.max(value, 0), 1)
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={accent ? "var(--brand)" : "var(--foreground)"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
          opacity={accent ? 1 : 0.9}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-sm font-medium tabular-nums">
        {label ?? `${Math.round(v * 100)}%`}
      </div>
    </div>
  )
}

export { Progress, Ring }
