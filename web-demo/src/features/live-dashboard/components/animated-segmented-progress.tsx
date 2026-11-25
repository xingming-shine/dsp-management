"use client"

import { useEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"

type ProgressSegment = {
  className: string
  value: number
}

export function AnimatedSegmentedProgress({
  ariaLabel,
  className,
  segments,
  value,
}: {
  ariaLabel: string
  className?: string
  segments: ProgressSegment[]
  value: number
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    let frame = 0
    let observer: IntersectionObserver | null = null

    const reveal = () => {
      frame = window.requestAnimationFrame(() => setIsVisible(true))
      observer?.disconnect()
    }

    const syncMotionPreference = () => {
      if (motionQuery.matches) reveal()
    }

    if (motionQuery.matches || typeof IntersectionObserver === "undefined") {
      reveal()
    } else {
      observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) reveal()
      }, { rootMargin: "40px 0px" })
      observer.observe(container)
    }

    motionQuery.addEventListener("change", syncMotionPreference)

    return () => {
      window.cancelAnimationFrame(frame)
      motionQuery.removeEventListener("change", syncMotionPreference)
      observer?.disconnect()
    }
  }, [])

  const normalizedValue = Math.min(100, Math.max(0, value))

  return (
    <div
      ref={containerRef}
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={normalizedValue}
      className={cn("overflow-hidden rounded-full bg-muted", className)}
    >
      <div
        className="flex size-full transition-[clip-path] duration-[820ms] ease-out motion-reduce:transition-none"
        style={{ clipPath: isVisible ? "inset(0 0 0 0)" : "inset(0 100% 0 0)" }}
      >
        {segments.map((segment, index) => (
          <span
            key={index}
            aria-hidden="true"
            className={cn("h-full shrink-0", segment.className)}
            style={{ width: `${Math.min(100, Math.max(0, segment.value))}%` }}
          />
        ))}
      </div>
    </div>
  )
}
