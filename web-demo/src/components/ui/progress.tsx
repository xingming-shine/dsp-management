"use client"

import * as React from "react"
import { Progress as ProgressPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  const normalizedValue = Math.min(100, Math.max(0, value ?? 0))
  const [displayValue, setDisplayValue] = React.useState(0)

  React.useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    let frame = 0

    const updateProgress = () => {
      if (motionQuery.matches) {
        setDisplayValue(normalizedValue)
        return
      }

      frame = window.requestAnimationFrame(() => setDisplayValue(normalizedValue))
    }

    updateProgress()
    motionQuery.addEventListener("change", updateProgress)

    return () => {
      window.cancelAnimationFrame(frame)
      motionQuery.removeEventListener("change", updateProgress)
    }
  }, [normalizedValue])

  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      value={normalizedValue}
      className={cn(
        "relative flex h-1 w-full items-center overflow-x-hidden rounded-full bg-muted",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="size-full flex-1 bg-primary transition-transform duration-[820ms] ease-out motion-reduce:transition-none"
        style={{ transform: `translateX(-${100 - displayValue}%)` }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
