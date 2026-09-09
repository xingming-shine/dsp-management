"use client"

import type { ComponentProps } from "react"
import { TruckIcon } from "lucide-react"

import type { DriverSnapshot } from "@/features/live-dashboard/mock-data"
import { formatDate, formatTime } from "@/lib/date-time"
import { cn } from "@/lib/utils"

type MapDriver = Pick<DriverSnapshot, "name" | "rating" | "status" | "updatedAt" | "coordinates">

/** Shared map symbol; map engines retain ownership of positioning and selection. */
export function DriverMapMarker({ driver, selected, onSelect }: {
  driver: MapDriver
  selected: boolean
  onSelect: () => void
}) {
  const needsAttention = /(?:\d+h|\d+min|小时).*未派送/.test(driver.status)

  return (
    <button
      type="button"
      className="delivery-driver-marker group flex cursor-pointer flex-col items-center gap-0.5 rounded-md font-sans outline-none focus-visible:ring-1 focus-visible:ring-ring"
      aria-label={`${selected ? "取消选择" : "选择"}司机 ${driver.name}`}
      aria-pressed={selected}
      onClick={onSelect}
    >
      <span className="relative flex size-9 items-center justify-center">
        {selected && <span className="absolute inset-0 animate-ping rounded-full bg-brand/25 motion-reduce:animate-none" aria-hidden="true" />}
        <span className={cn(
          "delivery-driver-icon relative flex size-8 items-center justify-center rounded-full border-2 shadow-md transition-all duration-200 group-hover:shadow-lg motion-reduce:transition-none",
          selected
            ? "-translate-y-1 scale-110 border-brand bg-brand text-brand-foreground shadow-lg"
            : "border-chart-2 bg-card text-chart-2 group-hover:-translate-y-0.5",
        )}>
          <TruckIcon className="size-[1.125rem]" strokeWidth={2.25} aria-hidden="true" />
        </span>
      </span>
      <span className={cn("delivery-driver-name max-w-28 truncate rounded-sm bg-card/95 px-1.5 py-0.5 text-xs font-medium shadow-sm", needsAttention ? "text-destructive" : "text-foreground")}>{driver.name}</span>
    </button>
  )
}

export function DriverLocationBubble({ driver, className, children, ...props }: ComponentProps<"div"> & { driver: MapDriver }) {
  return (
    <div {...props} className={cn("driver-location-bubble w-64 rounded-lg bg-popover p-3 text-left font-sans text-popover-foreground shadow-lg", className)} role="status" aria-label={`${driver.name}定位信息`}>
      <div className="flex items-center gap-2">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted font-heading text-xs font-semibold text-brand">{driver.rating}★</span>
        <strong className="min-w-0 truncate text-sm font-medium">{driver.name}</strong>
      </div>
      <dl className="mt-3 grid gap-1 text-xs">
        <div className="flex justify-between gap-3"><dt className="shrink-0 text-muted-foreground">最新定位时间</dt><dd className="text-right tabular-nums">{formatDate(driver.updatedAt)} {formatTime(driver.updatedAt)}</dd></div>
        <div className="flex justify-between gap-3"><dt className="shrink-0 text-muted-foreground">经纬度</dt><dd className="text-right tabular-nums">{driver.coordinates}</dd></div>
      </dl>
      {children}
    </div>
  )
}
