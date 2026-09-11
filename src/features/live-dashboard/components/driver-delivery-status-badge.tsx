"use client"

import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { formatDateTime } from "@/lib/date-time"

type DriverDeliveryStatusBadgeProps = {
  status: string
  latestAction: string
  latestActionAt: string
  focusable?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function DriverDeliveryStatusBadge({
  status,
  latestAction,
  latestActionAt,
  focusable = true,
  open,
  onOpenChange,
}: DriverDeliveryStatusBadgeProps) {
  return (
    <TooltipProvider>
      <Tooltip open={open} onOpenChange={onOpenChange}>
        <TooltipTrigger asChild>
          <Badge
            variant="destructive"
            className="h-[26px] rounded-[2.8px]"
            tabIndex={focusable ? 0 : undefined}
          >
            {status}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="flex flex-col gap-1">
            <span>最新操作：{latestAction || "暂无操作"}</span>
            <span className="tabular-nums">
              操作时间：{formatDateTime(latestActionAt, { includeSeconds: true })}
            </span>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
