"use client"

import { DeliveryDriverFilters, useDeliveryDriverFilters } from "./delivery-driver-filters"
import { DeliveryDriverCard } from "./delivery-driver-card"
import { alertMetricGroups } from "../alert-metric-config"
import { overviewCardsByMode, overviewCardTitles, type OverviewCardId, type OverviewDetailAction, type PickupPeriod } from "../overview-card-config"

import { memo, useEffect, useMemo, useRef, useState } from "react"
import type { ReactNode } from "react"
import type { EChartsOption } from "echarts"
import {
  ArrowRightIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  ChartNoAxesColumnIcon,
  CircleHelpIcon,
  PackageCheckIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { EChartsChart } from "@/features/data-cockpit/components/echarts-chart"
import { DriverLiveMap } from "@/features/live-dashboard/components/driver-live-map"
import type { WaybillAlert } from "@/features/live-dashboard/driver-monitor-data"
import { CurrentPickupMonitor } from "@/features/live-dashboard/components/current-pickup-monitor"
import { AnimatedSegmentedProgress } from "@/features/live-dashboard/components/animated-segmented-progress"
import {
  createDeliveryDetailKey,
  type DeliveryDetailSource,
} from "@/features/live-dashboard/components/delivery-detail-view"
import {
  exceptionReasons,
  realtimeOverview,
  type MonitorView,
  type WorkMode,
} from "@/features/live-dashboard/mock-data"
import { cn } from "@/lib/utils"
import { formatDate, formatTime } from "@/lib/date-time"

import { driverRows } from "@/features/live-dashboard/driver-rows"
import { calculateDeliveryResultRates } from "@/features/live-dashboard/delivery-result-metrics"

const driverMonitorTabs: Array<{ value: MonitorView; label: string; description: string }> = [
  {
    value: "current-pickup",
    label: "当期领件任务监控",
    description: "监控昨日8：00到今日8：00站点推送的应领件量（包括8:00后推送的需当日派送的包裹），各个司机的领件情况。",
  },
  {
    value: "delivery",
    label: "派件监控",
    description: "监控昨日12:00到今日12:00领取的快递和历史领件未完成派送的快递,各个司机的派件情况。",
  },
  {
    value: "next-pickup",
    label: "下期领件任务监控",
    description: "监控今日8:00后站点推送且派送日期不是当日的应领件量,各个司机的领件情况。",
  },
]

type HandoffData = { [K in keyof typeof realtimeOverview.handoff]: number }
const emptyHandoff = Object.fromEntries(Object.keys(realtimeOverview.handoff).map((key) => [key, 0])) as HandoffData
type AllocationData = {
  expected: number
  tasks: number
  assigned: number
  unassigned: number
  completionRate: number
}

type AlertActionItem = {
  label: string
  value: string
  description: string
  urgent?: boolean
  info?: boolean
  bubble?: { label: string; value: string; description: string }
}

const alertGroups: Array<{ title: string; items: AlertActionItem[] }> = alertMetricGroups.map((group) => ({
  title: group.title,
  items: group.items.filter((item) => !item.nested).map((item) => {
    const nested = item.key === "pending" ? group.items.find((entry) => entry.nested) : undefined
    return {
      label: item.label,
      value: String(item.value),
      description: item.description,
      urgent: ["pod", "delivery-location", "pending"].includes(item.key),
      info: ["fake-delivery", "dsp-tracking"].includes(item.key),
      ...(nested ? { bubble: { label: nested.label, value: String(nested.value), description: nested.description } } : {}),
    }
  }),
}))

const exceptionChartColors: string[] = ["--exception-overview-normal", "--exception-overview-fake"]
const exceptionChartSeriesColors: Array<string | null> = [null, "--exception-overview-fake"]
const exceptionChartSeriesGradients: Array<[string, string] | null> = [
  ["--exception-overview-normal-start", "--exception-overview-normal"],
  null,
]
const exceptionChartLabelColors: string[] = ["--brand-foreground", "--brand-foreground"]

export function DesktopRealtimeOverview({ mode, onDetail }: { mode: WorkMode; onDetail: OverviewDetailAction }) {
  const overviewRef = useRef<HTMLDivElement>(null)
  const alertRowRef = useRef<HTMLDivElement>(null)
  const [pinnedAlertBounds, setPinnedAlertBounds] = useState<{ left: number; width: number } | null>(null)
  const [isPinnedAlertCollapsed, setIsPinnedAlertCollapsed] = useState(false)
  const [selectedMapDriverId, setSelectedMapDriverId] = useState<string | null>(null)
  const exceptionOption = useMemo<EChartsOption>(() => ({
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    legend: { bottom: 6, icon: "circle", itemWidth: 8, itemHeight: 8, itemGap: 16 },
    grid: { left: 112, right: 28, top: 4, bottom: 46 },
    xAxis: {
      type: "value",
      max: 35,
      splitLine: { lineStyle: { type: "dashed" } },
    },
    yAxis: {
      type: "category", inverse: true, data: exceptionReasons.map((item) => item.reason),
      axisLabel: { width: 112, overflow: "truncate" },
    },
    series: [
      {
        name: "正常问题件", type: "bar", stack: "issue", barWidth: 14,
        data: [
          { value: 22, itemStyle: { borderRadius: [7, 0, 0, 7] } },
          { value: 16, itemStyle: { borderRadius: [7, 0, 0, 7] } },
          { value: 3, itemStyle: { borderRadius: [7, 7, 7, 7] } },
          { value: 21, itemStyle: { borderRadius: [7, 0, 0, 7] } },
          { value: 16, itemStyle: { borderRadius: [7, 0, 0, 7] } },
        ],
        label: { show: true, position: "insideRight", distance: 4, fontSize: 13, fontWeight: 800 },
        labelLayout: { hideOverlap: false },
        emphasis: { disabled: true },
      },
      {
        name: "虚假问题件", type: "bar", stack: "issue", barWidth: 14,
        data: [
          { value: 8, itemStyle: { borderRadius: [0, 7, 7, 0] } },
          { value: 3, itemStyle: { borderRadius: [0, 7, 7, 0] } },
          { value: 0, label: { show: false } },
          { value: 10, itemStyle: { borderRadius: [0, 7, 7, 0] } },
          { value: 2, itemStyle: { borderRadius: [0, 7, 7, 0] } },
        ],
        label: { show: true, position: "insideRight", distance: 4, fontSize: 13, fontWeight: 800 },
        labelLayout: { hideOverlap: false },
        emphasis: { disabled: true },
      },
    ],
  }), [])

  useEffect(() => {
    let frame = 0

    function updatePinnedState() {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const overviewBounds = overviewRef.current?.getBoundingClientRect()
        const mainBounds = overviewRef.current?.closest("main")?.getBoundingClientRect()
        const alertBounds = alertRowRef.current?.getBoundingClientRect()
        const shouldPin = Boolean(
          overviewBounds &&
          alertBounds &&
          alertBounds.top <= 64 &&
          overviewBounds.bottom > 136 &&
          window.scrollY > 0
        )
        const nextBounds = shouldPin && mainBounds
          ? { left: Math.round(mainBounds.left), width: Math.round(mainBounds.width) }
          : null

        if (!nextBounds) setIsPinnedAlertCollapsed(false)
        setPinnedAlertBounds((current) => {
          if (!current && !nextBounds) return current
          if (current && nextBounds && current.left === nextBounds.left && current.width === nextBounds.width) return current
          return nextBounds
        })
      })
    }

    window.addEventListener("scroll", updatePinnedState, { passive: true })
    window.addEventListener("resize", updatePinnedState)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("scroll", updatePinnedState)
      window.removeEventListener("resize", updatePinnedState)
    }
  }, [])


  return (
    <div ref={overviewRef} className="grid min-w-0 gap-3 xl:grid-cols-12">
      <OverviewCards key={mode} mode={mode} onDetail={onDetail} />
      <div ref={alertRowRef} className="xl:col-span-7">
        <AlertActionPanel onDetail={onDetail} />
      </div>
      <div className="min-w-0 xl:col-span-5">
        <ExceptionDistribution option={exceptionOption} onDetail={onDetail} />
      </div>
      <div className="grid min-w-0 items-stretch gap-3 lg:grid-cols-[minmax(0,11fr)_minmax(0,9fr)] xl:col-span-12">
        <div className="min-w-0">
          <DriverMonitor selectedDriverId={selectedMapDriverId} onSelectDriver={setSelectedMapDriverId} onViewDriver={(driverId, alertType) => onDetail("司机监控地图", driverId, "current", alertType, "waybill")} onViewPickup={(driverId, period) => onDetail("领件详情", driverId, period)} />
        </div>
        <div className="min-w-0">
          <DriverMapPanel selectedDriverId={selectedMapDriverId} onSelectDriver={setSelectedMapDriverId} onDetail={onDetail} />
        </div>
      </div>
      {pinnedAlertBounds ? (
        <div
          role="navigation"
          aria-label="异常指标快捷导航"
          className={cn("fixed top-14 z-30", isPinnedAlertCollapsed && "pointer-events-none flex justify-end")}
          style={{ left: pinnedAlertBounds.left, width: pinnedAlertBounds.width }}
        >
          {isPinnedAlertCollapsed ? (
            <Button
              variant="outline"
              size="sm"
              className="pointer-events-auto rounded-t-none"
              aria-label="展开异常指标导航"
              aria-expanded="false"
              onClick={() => setIsPinnedAlertCollapsed(false)}
            >
              <ChevronDownIcon data-icon="inline-start" />
              展开异常指标
            </Button>
          ) : (
            <AlertActionPanel compact onCollapse={() => setIsPinnedAlertCollapsed(true)} onDetail={onDetail} />
          )}
        </div>
      ) : null}
    </div>
  )
}

const OverviewCards = memo(function OverviewCards({ mode, onDetail }: { mode: WorkMode; onDetail: OverviewDetailAction }) {
  const [expandedCard, setExpandedCard] = useState<OverviewCardId | null>(null)
  useEffect(() => {
    if (!expandedCard) return

    function closeExpandedCard(event: KeyboardEvent) {
      if (event.key === "Escape") setExpandedCard(null)
    }

    window.addEventListener("keydown", closeExpandedCard)
    return () => window.removeEventListener("keydown", closeExpandedCard)
  }, [expandedCard])

  return (
    <Card size="sm" className="xl:col-span-12">
      <CardContent className="flex flex-col gap-4">
        <div className={cn("grid items-stretch gap-3", mode === "next-day" ? "md:grid-cols-3 lg:grid-cols-[minmax(0,5fr)_minmax(0,8fr)_minmax(0,3fr)_minmax(0,8fr)]" : "md:grid-cols-12 xl:grid-cols-24")}>
          {overviewCardsByMode[mode].map((id, index) => {
            const props = {
              order: index + 1,
              compact: mode === "next-day",
              expanded: expandedCard === id,
              onToggle: () => setExpandedCard((current) => current === id ? null : id),
            }
            if (id === "allocation") return <CurrentAllocationCard key={id} {...props} className="md:col-span-4" onDetail={(title) => onDetail(title, undefined, "current")} />
            if (id === "delivery") return <DeliveryOperationCard key={id} {...props} className={mode === "next-day" ? "md:col-span-2 lg:col-span-1" : "md:col-span-8"} onDetail={onDetail} />
            if (id === "next-allocation") return <NextAllocationCard key={id} {...props} className={mode === "next-day" ? "md:col-span-1" : "md:col-span-4"} mode={mode} onDetail={(title) => onDetail(title, undefined, "next")} />
            const period = id === "next-handoff" ? "next" : "current"
            return <StationHandoffCard key={id} {...props} id={id} pickupOnly={id === "current-pickup"} period={period} className={mode === "same-day" ? "md:col-span-8" : cn(id === "current-pickup" ? "md:col-span-1" : "md:col-span-2", "lg:col-span-1")} onPickupDetail={() => onDetail("领件详情", undefined, period)} onReturnDetail={() => onDetail("应退回", undefined, period)} />
          })}
        </div>
        {expandedCard ? <OverviewDetailPanel card={expandedCard} mode={mode} onDetail={onDetail} /> : null}
      </CardContent>
    </Card>
  )
})

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value)
}

function createClearanceTooltip(data: { total: number; pending: number; delivered: number; exception: number; nonStandardReturn: number; clearanceRate: number }) {
  const rates = calculateDeliveryResultRates({
    pending: data.pending,
    delivered: data.delivered,
    exception: data.exception,
    nonstandard_return: data.nonStandardReturn,
  })
  const rows = [
    ["已签收", data.delivered, rates.delivered, "--delivery-delivered", ""],
    ["派送异常", data.exception, rates.exception, "--delivery-exception", ""],
    ["非标退回", data.nonStandardReturn, rates.nonstandard_return, "--delivery-nonstandard-return", "不计入日清"],
    ["待派件", data.pending, rates.pending, "--delivery-pending", ""],
  ] as const

  return <div className="delivery-clearance-tooltip">
    <strong>派件结果详情</strong>
    <div className="delivery-clearance-tooltip__row"><span>应派件</span><b>{formatCount(data.total)} 件</b></div>
    {rows.map(([label, value, rate, token, note]) => <div key={label} className="delivery-clearance-tooltip__row"><span><i style={{ background: `var(${token})` }} />{label}</span><b>{formatCount(value)} 件 · {rate.toFixed(2)}%{note && <small>{note}</small>}</b></div>)}
    <div className="delivery-clearance-tooltip__summary"><div className="delivery-clearance-tooltip__row"><span>日清率</span><b>{data.clearanceRate.toFixed(2)}%</b></div><p>（已签收 + 派送异常）÷ 应派件</p></div>
  </div>
}

function OverviewRateTooltip({ label, children, content }: { label: string; children: ReactNode; content: ReactNode }) {
  const [open, setOpen] = useState(false)
  return <TooltipProvider><Tooltip open={open} onOpenChange={setOpen}>
    <TooltipTrigger asChild>
      <div role="button" tabIndex={0} aria-label={`查看${label}详情`} aria-expanded={open}
        className="flex w-24 flex-col items-center rounded-lg outline-none focus-visible:ring-1 focus-visible:ring-ring"
        onClick={(event) => { event.preventDefault(); event.stopPropagation(); setOpen((current) => !current) }}
        onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); setOpen((current) => !current) } }}>
        {children}
      </div>
    </TooltipTrigger>
    <TooltipContent variant="complex" className="has-[.delivery-clearance-tooltip]:w-fit" onClick={(event) => event.stopPropagation()}>{content}</TooltipContent>
  </Tooltip></TooltipProvider>
}

function KpiCardTitle({ order, title }: { order: number; title: string }) {
  return (
    <CardTitle className="flex min-w-0 items-center gap-2 text-xs font-medium leading-5 text-foreground">
      <span data-slot="kpi-order" className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular-nums text-muted-foreground">
        {order}
      </span>
      <span>{title}</span>
    </CardTitle>
  )
}

function SummaryCard({ id, order, title, highlighted = false, compact = false, className, expanded, onToggle, children }: {
  id: OverviewCardId
  order: number
  title: string
  highlighted?: boolean
  compact?: boolean
  className?: string
  expanded: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <Card
      size="sm"
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      aria-controls={`overview-detail-${id}`}
      className={cn(
        "@container/summary relative h-48 min-w-0 cursor-pointer overflow-visible transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand/40",
        highlighted
          ? "overview-delivery-highlight border-border/80"
          : "border-border/80 bg-muted/20 hover:bg-brand-hover",
        expanded && "after:absolute after:-bottom-1.5 after:left-1/2 after:size-3 after:-translate-x-1/2 after:rotate-45 after:border-r after:border-b",
        expanded && (highlighted
          ? "border-brand after:border-brand after:bg-brand-selected"
          : "border-brand bg-brand-selected hover:bg-brand-selected after:border-brand after:bg-brand-selected"),
        compact && "h-auto min-h-48 gap-3 py-3",
        className
      )}
      onClick={onToggle}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          onToggle()
        }
      }}
    >
      {highlighted ? (
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
          <PackageCheckIcon
            strokeWidth={1.5}
            className="absolute top-0 right-8 size-20 text-brand opacity-[0.06]"
          />
        </span>
      ) : null}
      <CardHeader className={cn("relative z-10 block min-h-5 px-5 pr-12", compact && "px-3 pr-8")}>
        <KpiCardTitle order={order} title={title} />
        <CardAction className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground">
          {expanded
            ? <ChevronUpIcon aria-hidden="true" strokeWidth={1} />
            : <ChevronRightIcon aria-hidden="true" strokeWidth={1} />}
        </CardAction>
      </CardHeader>
      <CardContent className={cn("relative z-10 flex min-h-0 flex-1 flex-col gap-3 px-5", compact && "px-3 @min-[12rem]:px-5", id === "allocation" && "px-7")}>
        {children}
      </CardContent>
    </Card>
  )
}

function CurrentAllocationCard({ className, order, expanded, onToggle, onDetail }: { className?: string; order: number; expanded: boolean; onToggle: () => void; onDetail: (title: string) => void }) {
  const data = realtimeOverview.allocation
  return (
    <SummaryCard className={className} id="allocation" order={order} title="当期领件任务分配" expanded={expanded} onToggle={onToggle}>
      <div className="relative top-px flex flex-1 -translate-y-1.5 flex-col justify-center">
        <p className="text-kpi-label font-normal text-foreground">未分配件量</p>
        <button
          type="button"
          className="-ml-1 mt-3 flex w-fit cursor-pointer items-baseline rounded-md px-1 py-0.5 font-heading text-kpi-primary font-medium tabular-nums text-destructive outline-none transition-colors hover:bg-destructive/10 focus-visible:bg-destructive/10 focus-visible:ring-1 focus-visible:ring-ring"
          aria-label={`查看未分配件量明细，共 ${formatCount(data.unassigned)} 件`}
          onClick={(event) => {
            event.stopPropagation()
            onDetail("未分配件量明细")
          }}
        >
          {formatCount(data.unassigned)}
        </button>
      </div>
      <div className="flex -translate-y-2.5 items-center gap-3">
        <Progress
          value={data.completionRate}
          className="h-1.5 flex-1 bg-muted-foreground/20 [&_[data-slot=progress-indicator]]:bg-allocation-assigned"
          aria-label={`分配完成率 ${data.completionRate}%`}
        />
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{data.completionRate}%</span>
      </div>
    </SummaryCard>
  )
}

function StationHandoffCard({ className, id, order, period, compact = false, pickupOnly = false, expanded, onToggle, onPickupDetail, onReturnDetail }: {
  className?: string
  id: "handoff" | "current-pickup" | "next-handoff"
  order: number
  period: PickupPeriod
  compact?: boolean
  pickupOnly?: boolean
  expanded: boolean
  onToggle: () => void
  onPickupDetail: () => void
  onReturnDetail: () => void
}) {
  const data = period === "next" ? emptyHandoff : realtimeOverview.handoff
  const expectedPickup = period === "next" ? 0 : realtimeOverview.allocation.expected
  const pickupRate = expectedPickup > 0 ? data.currentPickup / expectedPickup * 100 : 0
  return (
    <SummaryCard className={className} compact={compact} id={id} order={order} title={overviewCardTitles[id]} expanded={expanded} onToggle={onToggle}>
      <div className={cn("grid flex-1 gap-2", !pickupOnly && (compact ? "grid-cols-[minmax(0,2fr)_minmax(0,1fr)]" : "grid-cols-[minmax(0,2fr)_minmax(6rem,1fr)]"))}>
        <section aria-label="站点领件" className={cn("grid min-w-0 grid-cols-2 items-start gap-4 py-2.5", pickupOnly ? "gap-2 @min-[12rem]:px-2" : "px-3", compact && !pickupOnly && "gap-2 px-2 @min-[12rem]:px-3")}>
          <div className="flex min-w-0 flex-col">
            <p className="text-kpi-label font-normal text-foreground">领件总量</p>
            <button
              type="button"
              className={cn("-ml-1 mt-3 w-fit cursor-pointer rounded-sm px-1 font-heading font-medium tabular-nums text-foreground outline-none transition-colors hover:bg-brand-hover focus-visible:ring-1 focus-visible:ring-ring", "text-[length:var(--text-kpi-primary)] leading-[var(--text-kpi-primary--line-height)]")}
              aria-label={`查看领件详情，共 ${formatCount(data.actualPickup)} 件`}
              onClick={(event) => {
                event.stopPropagation()
                onPickupDetail()
              }}
            >
              {formatCount(data.actualPickup)}
            </button>
          </div>
          <div className="flex min-w-0 flex-col">
            <p className="text-kpi-label font-normal text-foreground">未领件</p>
            <button
              type="button"
              className={cn("-ml-1 mt-3 w-fit cursor-pointer rounded-sm px-1 font-heading font-medium tabular-nums text-destructive outline-none transition-colors hover:bg-brand-hover focus-visible:ring-1 focus-visible:ring-ring", "text-[length:var(--text-kpi-primary)] leading-[var(--text-kpi-primary--line-height)]")}
              aria-label={`查看未领件司机明细，共 ${formatCount(data.uncollected)} 件`}
              onClick={(event) => {
                event.stopPropagation()
                onPickupDetail()
              }}
            >
              {formatCount(data.uncollected)}
            </button>
          </div>
          <div className="col-span-2 flex min-w-0 items-center gap-2 self-end text-xs text-muted-foreground">
            <Progress
              value={pickupRate}
              className="h-1.5 min-w-0 max-w-36 basis-2/5 bg-muted-foreground/20 [&_[data-slot=progress-indicator]]:bg-delivery-delivered"
              aria-label={`领件率 ${pickupRate.toFixed(2)}%，${period === "next" ? "下期" : "当期"}任务领件 ${formatCount(data.currentPickup)} / 应领件 ${formatCount(expectedPickup)}`}
            />
            <span className="shrink-0 whitespace-nowrap tabular-nums">领件率 {pickupRate.toFixed(2)}%</span>
          </div>
        </section>
        {!pickupOnly && <section aria-label="退回站点" className={cn("flex min-w-0 flex-col rounded-lg bg-muted/40 px-3 py-2.5", compact && "px-2", "pl-5")}>
          <p className="text-kpi-label font-normal text-foreground">待退回</p>
          <button
            type="button"
            className={cn("-ml-1 mt-3 w-fit cursor-pointer rounded-sm px-1 font-heading font-medium tabular-nums text-destructive outline-none transition-colors hover:bg-brand-hover focus-visible:ring-1 focus-visible:ring-ring", "text-[length:var(--text-kpi-primary)] leading-[var(--text-kpi-primary--line-height)]")}
            aria-label={`查看应退回详情，共 ${formatCount(data.pendingReturn)} 件`}
            onClick={(event) => {
              event.stopPropagation()
              onReturnDetail()
            }}
          >
            {formatCount(data.pendingReturn)}
          </button>
        </section>}
      </div>
    </SummaryCard>
  )
}

function DeliveryOperationCard({ className, order, compact = false, expanded, onToggle, onDetail }: { className?: string; order: number; compact?: boolean; expanded: boolean; onToggle: () => void; onDetail: (title: string) => void }) {
  const data = realtimeOverview.delivery
  // This fixture snapshot is before midnight: all current-scope deliveries count toward 2400.
  const delivered2400 = data.scopes.current.delivered
  const pod2400Rate = data.currentSource > 0 ? delivered2400 / data.currentSource * 100 : 0
  const deliveryRates = calculateDeliveryResultRates({
    pending: data.pending,
    delivered: data.delivered,
    exception: data.exception,
    nonstandard_return: data.nonStandardReturn,
  })
  const clearanceOption: EChartsOption = {
    animationDuration: 320,
    tooltip: { show: false },
    series: [
      {
        type: "pie",
        radius: ["70%", "90%"],
        center: ["50%", "50%"],
        startAngle: 90,
        clockwise: true,
        avoidLabelOverlap: true,
        label: { show: false },
        labelLine: { show: false },
        itemStyle: { borderRadius: 6 },
        emphasis: { scale: false },
        data: [
          { name: "已签收", value: deliveryRates.delivered },
          { name: "派送异常", value: deliveryRates.exception },
          { name: "非标退回", value: deliveryRates.nonstandard_return },
          { name: "待派件", value: deliveryRates.pending },
        ],
      },
    ],
  }

  const pod2400Option: EChartsOption = {
    tooltip: { show: false },
    series: [{
      type: "pie", radius: ["70%", "90%"], center: ["50%", "50%"],
      label: { show: false }, labelLine: { show: false },
      itemStyle: { borderRadius: 6 }, emphasis: { scale: false },
      data: [
        { name: "2400 内妥投", value: pod2400Rate },
        { name: "未妥投", value: 100 - pod2400Rate },
      ],
    }],
  }
  return (
    <SummaryCard className={cn(className, "@container/delivery h-auto min-h-48")} compact={compact} id="delivery" order={order} title="派件作业" highlighted expanded={expanded} onToggle={onToggle}>
      <div className="grid flex-1 grid-cols-2 items-start gap-x-3 gap-y-4 pt-2.5 @min-[26rem]/delivery:grid-cols-[minmax(7.25rem,1fr)_minmax(3.5rem,1fr)_minmax(6rem,1fr)_minmax(6rem,1fr)] @min-[26rem]/delivery:@max-[28rem]/delivery:-mx-2 @min-[26rem]/delivery:@max-[28rem]/delivery:gap-x-2">
        <div className="flex min-h-28 min-w-0 flex-col items-start pl-2">
          <p className="text-kpi-label font-normal text-foreground">应派件</p>
          <button
            type="button"
            className="-ml-1 mt-3 w-fit cursor-pointer rounded-sm px-1 font-heading text-kpi-primary font-medium tabular-nums text-foreground outline-none hover:bg-brand-hover focus-visible:ring-1 focus-visible:ring-ring"
            aria-label={`查看应派件司机明细，共 ${formatCount(data.total)} 件`}
            onClick={(event) => { event.stopPropagation(); onDetail(createDeliveryDetailKey("expected")) }}
          >
            {formatCount(data.total)}
          </button>
          <Badge variant="outline" className="relative mt-auto h-7 gap-2 overflow-visible border-border/70 bg-card/55 px-2.5 font-normal text-muted-foreground backdrop-blur-md backdrop-saturate-150 before:absolute before:-top-1 before:left-5 before:size-2 before:rotate-45 before:border-t before:border-l before:border-border/70 before:bg-card/70">
            <span className="relative">当期应派</span>
            <span aria-hidden="true" className="h-3 w-px bg-muted-foreground/20" />
            <span className="relative font-heading font-medium tabular-nums text-foreground">{formatCount(data.currentSource)}</span>
          </Badge>
        </div>
        <div className="flex min-h-28 min-w-0 flex-col items-center">
          <p className="text-kpi-label font-normal text-foreground">待派件</p>
          <button
            type="button"
            className="mt-3 w-fit cursor-pointer rounded-sm px-1 font-heading text-kpi-primary font-medium tabular-nums text-destructive outline-none hover:bg-brand-hover focus-visible:ring-1 focus-visible:ring-ring"
            aria-label={`查看待派件司机明细，共 ${formatCount(data.pending)} 件`}
            onClick={(event) => { event.stopPropagation(); onDetail(createDeliveryDetailKey("pending")) }}
          >
            {formatCount(data.pending)}
          </button>
        </div>
        {[
          { label: "日清率", value: data.clearanceRate, option: clearanceOption, colors: ["--delivery-delivered", "--delivery-exception", "--delivery-nonstandard-return", "--delivery-pending"], clearance: true },
          { label: "2400妥投率", value: pod2400Rate, option: pod2400Option, colors: ["--delivery-delivered", "--border"], clearance: false },
        ].map((metric) => (
          <div key={metric.label} className="flex min-h-28 min-w-0 -translate-y-3 flex-col items-center">
            <OverviewRateTooltip label={metric.label} content={metric.clearance ? createClearanceTooltip(data) : <>
              <p className="font-medium">2400妥投率</p>
              <dl className="grid grid-cols-[minmax(0,1fr)_max-content] items-start gap-x-3 gap-y-2">
                <dt className="text-muted-foreground">当期应派</dt><dd className="tabular-nums">{formatCount(data.currentSource)} 件</dd>
                <dt className="text-muted-foreground">当期应派中已签收</dt><dd className="tabular-nums">{formatCount(delivered2400)} 件</dd>
                <dt className="text-muted-foreground">2400妥投率＝当期应派中已签收／当期应派</dt><dd className="tabular-nums">{pod2400Rate.toFixed(2)}%</dd>
              </dl>
            </>}>
            <div className="pointer-events-none relative size-24 shrink-0">
              <EChartsChart
                option={metric.option}
                colors={metric.colors}
                className="size-24 min-h-0"
                ariaLabel={metric.clearance ? `日清率 ${data.clearanceRate.toFixed(2)}%；应派件 ${formatCount(data.total)} 件；已签收 ${formatCount(data.delivered)} 件，占 ${deliveryRates.delivered.toFixed(2)}%；派送异常 ${formatCount(data.exception)} 件，占 ${deliveryRates.exception.toFixed(2)}%；非标退回 ${formatCount(data.nonStandardReturn)} 件，占 ${deliveryRates.nonstandard_return.toFixed(2)}%，不计入日清；待派件 ${formatCount(data.pending)} 件，占 ${deliveryRates.pending.toFixed(2)}%` : `${metric.label} ${metric.value.toFixed(2)}%`}
              />
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="font-heading text-sm font-medium tabular-nums text-foreground">{metric.value.toFixed(2)}%</span>
              </span>
            </div>
            <span className="text-xs text-muted-foreground">{metric.label}</span>
            </OverviewRateTooltip>
          </div>
        ))}
      </div>
    </SummaryCard>
  )
}

function NextAllocationCard({ className, order, mode, compact = false, expanded, onToggle, onDetail }: {
  className?: string
  order: number
  mode: WorkMode
  compact?: boolean
  expanded: boolean
  onToggle: () => void
  onDetail: (title: string) => void
}) {
  const data = realtimeOverview.nextAllocation
  const pushAt = data.pushAtByMode[mode]
  const allocation = data.dataByMode[mode]
  return (
    <SummaryCard
      className={className}
      id="next-allocation"
      compact={compact}
      order={order}
      title={mode === "same-day" ? "下期领件任务" : overviewCardTitles["next-allocation"]}
      expanded={expanded}
      onToggle={onToggle}
    >
      {allocation ? (
        <div className="flex min-h-0 flex-1 flex-col justify-center gap-3 @min-[12rem]:px-2">
          <div className="flex flex-col gap-2">
            <p className="text-kpi-label font-normal text-foreground">未分配件量</p>
            <button
              type="button"
              className="-ml-1 w-fit cursor-pointer rounded-sm px-1 font-heading text-kpi-primary font-medium tabular-nums text-destructive outline-none transition-colors hover:bg-destructive/10 focus-visible:bg-destructive/10 focus-visible:ring-1 focus-visible:ring-ring"
              aria-label={`查看下期任务未分配件量明细，共 ${formatCount(allocation.unassigned)} 件`}
              onClick={(event) => {
                event.stopPropagation()
                onDetail("未分配件量明细")
              }}
            >
              {formatCount(allocation.unassigned)}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Progress
              value={allocation.completionRate}
              className="h-1.5 min-w-0 flex-1 bg-muted-foreground/20 [&_[data-slot=progress-indicator]]:bg-allocation-assigned"
              aria-label={`下期任务分配完成率 ${allocation.completionRate}%`}
            />
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{allocation.completionRate}%</span>
          </div>
        </div>
      ) : (
        <div className={cn("flex min-h-0 flex-1 flex-col justify-center gap-3", mode === "same-day" ? "pl-2" : "@min-[12rem]:pl-2")}>
          <div>
            <p className="text-xs text-muted-foreground">预计推送</p>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="font-heading text-xl font-medium tabular-nums">{formatTime(pushAt, { includeSeconds: true })}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{formatDate(pushAt)}</p>
        </div>
      )}
    </SummaryCard>
  )
}

function OverviewDetailPanel({ card, mode, onDetail }: {
  card: OverviewCardId
  mode: WorkMode
  onDetail: OverviewDetailAction
}) {
  const period = card === "next-handoff" || card === "next-allocation" ? "next" : "current"
  const openPeriodDetail = (title: string) => onDetail(title, undefined, period)
  return (
    <section key={card} id={`overview-detail-${card}`} className="overview-detail-panel overflow-hidden rounded-xl border border-brand bg-card" role="region" aria-label={overviewCardTitles[card]}>
      <div className={cn("px-5 pt-5", card === "handoff" || card === "current-pickup" || card === "next-handoff" ? "pb-3" : "pb-5")}>
        {card === "allocation" ? <AllocationDetail data={realtimeOverview.allocation} period="current" onDetail={openPeriodDetail} /> : null}
        {card === "handoff" || card === "current-pickup" || card === "next-handoff" ? <HandoffDetail period={period} pickupOnly={card === "current-pickup"} onDetail={openPeriodDetail} /> : null}
        {card === "delivery" ? <DeliveryDetail onDetail={onDetail} /> : null}
        {card === "next-allocation" ? <NextAllocationDetail mode={mode} onDetail={openPeriodDetail} /> : null}
      </div>
    </section>
  )
}

function NextAllocationDetail({ mode, onDetail }: { mode: WorkMode; onDetail: (title: string) => void }) {
  const data = realtimeOverview.nextAllocation
  const pushAt = data.pushAtByMode[mode]
  const allocation = data.dataByMode[mode]

  if (allocation) {
    return <AllocationDetail data={allocation} period="next" onDetail={onDetail} />
  }

  return (
    <div className="flex min-w-0 flex-col">
      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(18rem,1fr)]">
        <Empty className="min-h-52 border bg-muted/30">
          <EmptyHeader>
            <EmptyMedia variant="icon" className="text-muted-foreground">
              <ChartNoAxesColumnIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle className="text-muted-foreground">暂无下期领件任务数据</EmptyTitle>
            <EmptyDescription className="text-xs">
              今日8:00后站点推送,且派送日期不是当日的快递数量。
            </EmptyDescription>
          </EmptyHeader>
        </Empty>

        <section
          className="flex min-w-0 flex-col justify-center border-t pt-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6"
          aria-label="推送时间原始记录"
        >
          <p className="text-sm text-muted-foreground">预计推送时间</p>
          <div className="mt-3 flex items-baseline tabular-nums text-muted-foreground">
            <span className="font-heading text-3xl font-semibold">{formatTime(pushAt, { includeSeconds: true })}</span>
          </div>
          <p className="mt-2 text-sm tabular-nums text-muted-foreground">{formatDate(pushAt)}</p>
          <p className="mt-4 text-xs leading-5 text-muted-foreground">任务数据推送后，请及时完成分配安排司机领件</p>
        </section>
      </div>
      <Separator className="mt-5" />
    </div>
  )
}

const TASK_ASSIGNMENT_DETAIL_TITLE = "任务分配"

function AllocationDetail({ data, period, onDetail }: { data: AllocationData; period: PickupPeriod; onDetail: (title: string) => void }) {
  const unassignedRate = Number((100 - data.completionRate).toFixed(2))
  const expectedLabel = period === "next" ? "应领件（下期领件任务）" : "应领件"

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(22rem,1fr)]">
      <section className="flex min-w-0 flex-col justify-center gap-5 py-2" aria-label="领件任务分配进度图">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-baseline gap-3">
            <span className="text-xs text-muted-foreground">应领件</span>
            <button
              type="button"
              className="-mx-1 cursor-pointer rounded-sm px-1 font-heading text-2xl font-semibold tabular-nums text-foreground outline-none transition-colors hover:bg-brand-hover focus-visible:ring-1 focus-visible:ring-ring"
              aria-label={`查看任务分配列表，共 ${formatCount(data.expected)} 件`}
              onClick={() => onDetail(TASK_ASSIGNMENT_DETAIL_TITLE)}
            >
              {formatCount(data.expected)}
            </button>
            <span className="text-xs text-muted-foreground">件</span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-xs text-muted-foreground">任务数</span>
            <span className="font-heading text-base font-medium tabular-nums text-foreground">{formatCount(data.tasks)}</span>
          </div>
        </div>

        <div
          className="relative h-[18px] w-full overflow-hidden rounded-full bg-allocation-assigned"
          role="group"
          aria-label={`任务分配进度：已分配 ${formatCount(data.assigned)} 件，占 ${data.completionRate}%；未分配 ${formatCount(data.unassigned)} 件，占 ${unassignedRate}%`}
        >
          <button
            type="button"
            className="absolute inset-0 rounded-full bg-allocation-assigned outline-none transition-opacity hover:opacity-85 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring"
            aria-label={`查看已分配件量明细，共 ${formatCount(data.assigned)} 件`}
            onClick={() => onDetail("已分配件量明细")}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 rounded-full bg-allocation-unassigned-surface outline-none transition-opacity hover:opacity-85 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring"
            style={{ width: `${unassignedRate}%` }}
            aria-label={`查看未分配件量明细，共 ${formatCount(data.unassigned)} 件`}
            onClick={() => onDetail("未分配件量明细")}
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="flex min-w-0 flex-col items-start gap-2 text-left">
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <span aria-hidden="true" className="size-2 rounded-sm bg-allocation-assigned" />
              已分配
            </span>
            <span className="flex items-baseline gap-2">
              <button
                type="button"
                className="-mx-1 cursor-pointer rounded-sm px-1 font-heading text-2xl font-medium tabular-nums text-foreground outline-none transition-colors hover:bg-brand-hover focus-visible:ring-1 focus-visible:ring-ring"
                aria-label={`查看任务分配列表，已分配 ${formatCount(data.assigned)} 件`}
                onClick={() => onDetail("已分配件量明细")}
              >
                {formatCount(data.assigned)}
              </button>
              <span className="text-xs text-muted-foreground">件</span>
              <span className="text-xs tabular-nums text-muted-foreground">{data.completionRate}%</span>
            </span>
          </div>
          <div className="flex min-w-0 flex-col items-start gap-2 text-left">
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <span aria-hidden="true" className="size-2 rounded-sm bg-allocation-unassigned-surface" />
              未分配
            </span>
            <span className="flex items-baseline gap-2">
              <button
                type="button"
                className="-mx-1 cursor-pointer rounded-sm px-1 font-heading text-2xl font-medium tabular-nums text-allocation-unassigned outline-none transition-colors hover:bg-brand-hover focus-visible:ring-1 focus-visible:ring-ring"
                aria-label={`查看任务分配列表，未分配 ${formatCount(data.unassigned)} 件`}
                onClick={() => onDetail("未分配件量明细")}
              >
                {formatCount(data.unassigned)}
              </button>
              <span className="text-xs text-muted-foreground">件</span>
              <span className="text-xs tabular-nums text-muted-foreground">{unassignedRate}%</span>
            </span>
          </div>
        </div>
      </section>

      <aside className="flex flex-col gap-4 rounded-lg border bg-muted/40 p-5" aria-label="指标说明">
        <div className="flex flex-col gap-2">
          <h5 className="text-sm font-medium text-foreground">{expectedLabel}</h5>
          <p className="text-xs leading-5 text-muted-foreground">
            {period === "next" ? "今天8:00后站点推送且派送日期不为今日的包裹，不包括任务状态是已取消、已撤回" : "昨天 8:00 到今日 8:00 站点推送需要司机领件的件量（包括 8:00 后推送的需当日派送的包裹）"}
          </p>
        </div>
        <div className="flex flex-col gap-4 border-l pl-3">
          <div className="flex flex-col gap-1">
            <h5 className="text-sm font-medium text-foreground">未分配件量</h5>
            <p className="text-xs leading-5 text-muted-foreground">{expectedLabel}中还没有分配司机的件量</p>
          </div>
          <div className="flex flex-col gap-1">
            <h5 className="text-sm font-medium text-foreground">已分配件量</h5>
            <p className="text-xs leading-5 text-muted-foreground">{expectedLabel}中已经分配司机的件量</p>
          </div>
        </div>
      </aside>
    </div>
  )
}

function HandoffDetail({ onDetail, period = "current", pickupOnly = false }: { onDetail: (title: string) => void; period?: PickupPeriod; pickupOnly?: boolean }) {
  const isNextPeriod = period === "next"
  const data = isNextPeriod ? emptyHandoff : realtimeOverview.handoff
  const expectedPickup = isNextPeriod ? 0 : realtimeOverview.allocation.expected
  const taskLabel = isNextPeriod ? "下期任务领件" : "当期任务领件"
  const otherTaskLabel = `非${taskLabel}`
  const expectedPickupLabel = isNextPeriod ? "应领件（下期任务）" : "应领件"
  const pickupAfterUncollected = expectedPickup - data.uncollected
  const pickupCompositionOption: EChartsOption = {
    animationDuration: 320,
    grid: { left: 12, right: 12, top: 36, bottom: 42 },
    tooltip: {
      trigger: "item",
    },
    xAxis: {
      type: "category",
      data: ["应领件", "未领件", otherTaskLabel, "领件总量"],
      axisTick: { show: false },
      axisLine: { show: true },
      axisLabel: {
        interval: 0,
        hideOverlap: false,
        fontSize: 11,
        lineHeight: 14,
        margin: 8,
        formatter: (value: string) => value === otherTaskLabel ? `${period === "next" ? "非下期任务" : "非当期任务"}\n领件` : value,
      },
    },
    yAxis: { type: "value", show: false, max: 2200 },
    series: [
      {
        name: "瀑布基座",
        type: "bar",
        stack: "pickup-waterfall",
        barWidth: 52,
        silent: true,
        tooltip: { show: false },
        itemStyle: { color: "transparent" },
        emphasis: { disabled: true },
        data: [0, pickupAfterUncollected, pickupAfterUncollected, 0],
      },
      {
        name: "阶段连接 1",
        type: "line",
        symbol: "none",
        silent: true,
        tooltip: { show: false },
        lineStyle: { type: "dashed", width: 1.5, opacity: 0.85 },
        data: [expectedPickup, expectedPickup, null, null],
      },
      {
        name: "阶段连接 2",
        type: "line",
        symbol: "none",
        silent: true,
        tooltip: { show: false },
        lineStyle: { type: "dashed", width: 1.5, opacity: 0.85 },
        data: [null, pickupAfterUncollected, pickupAfterUncollected, null],
      },
      {
        name: "阶段连接 3",
        type: "line",
        symbol: "none",
        silent: true,
        tooltip: { show: false },
        lineStyle: { type: "dashed", width: 1.5, opacity: 0.85 },
        data: [null, null, data.actualPickup, data.actualPickup],
      },
      {
        name: "应领件",
        type: "bar",
        stack: "pickup-waterfall",
        barWidth: 52,
        data: [expectedPickup, null, null, null],
        tooltip: { valueFormatter: () => `${formatCount(expectedPickup)} 件` },
        label: {
          show: true,
          position: "top",
          formatter: `{value|${formatCount(expectedPickup)}}`,
          rich: { value: { fontSize: 16, lineHeight: 22, fontWeight: 600 } },
        },
        itemStyle: { borderRadius: [5, 5, 0, 0] },
      },
      {
        name: "未领件",
        type: "bar",
        stack: "pickup-waterfall",
        barWidth: 52,
        data: [null, data.uncollected, null, null],
        tooltip: { valueFormatter: () => `−${formatCount(data.uncollected)} 件` },
        label: {
          show: true,
          position: "top",
          formatter: `{value|−${formatCount(data.uncollected)}}`,
          rich: { value: { fontSize: 16, lineHeight: 22, fontWeight: 600 } },
        },
        itemStyle: { borderRadius: 5 },
      },
      {
        name: otherTaskLabel,
        type: "bar",
        stack: "pickup-waterfall",
        barWidth: 52,
        data: [null, null, data.nonCurrentPickup, null],
        tooltip: { valueFormatter: () => `+${formatCount(data.nonCurrentPickup)} 件` },
        label: {
          show: true,
          position: "top",
          formatter: `{value|+${formatCount(data.nonCurrentPickup)}}`,
          rich: { value: { fontSize: 16, lineHeight: 22, fontWeight: 600 } },
        },
        itemStyle: { borderRadius: 5 },
      },
      {
        name: "领件总量",
        type: "bar",
        stack: "pickup-waterfall",
        barWidth: 52,
        data: [null, null, null, data.actualPickup],
        tooltip: { valueFormatter: () => `${formatCount(data.actualPickup)} 件` },
        label: {
          show: true,
          position: "top",
          formatter: `{value|${formatCount(data.actualPickup)}}`,
          rich: { value: { fontSize: 16, lineHeight: 22, fontWeight: 600 } },
        },
        itemStyle: { borderRadius: [5, 5, 0, 0] },
      },
    ],
  }

  return (
    <div className={cn("grid min-w-0 gap-5", pickupOnly ? "lg:grid-cols-[minmax(0,1.55fr)_minmax(15rem,1fr)]" : "xl:grid-cols-[minmax(0,1.55fr)_minmax(20rem,1.08fr)_minmax(15rem,.8fr)]")}>
      <section className={cn("flex min-w-0 flex-col gap-4 border-b pb-5", pickupOnly ? "lg:border-r lg:border-b-0 lg:pr-5 lg:pb-0" : "xl:border-r xl:border-b-0 xl:pr-5 xl:pb-0")} aria-label="站点领件">
        <div className="flex items-center justify-between gap-4">
          <h4 className="font-heading text-sm font-semibold">站点领件</h4>
          <p className="text-xs text-muted-foreground">应领件 − 未领件 + {otherTaskLabel} = 领件总量</p>
        </div>
        <div className="rounded-lg bg-muted/50 px-3 pt-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">领件量构成</span>
            <span className="text-xs text-muted-foreground">单位：件</span>
          </div>
          <EChartsChart
            option={pickupCompositionOption}
            onChartClick={() => onDetail("领件详情")}
            colors={["--card", "--muted-foreground", "--muted-foreground", "--muted-foreground", "--chart-2", "--destructive", "--delivery-delivered", "--delivery-delivered"]}
            labelColors={["--foreground", "--foreground", "--foreground", "--foreground", "--chart-2", "--destructive", "--delivery-delivered", "--delivery-delivered"]}
            seriesColors={[null, "--muted-foreground", "--muted-foreground", "--muted-foreground", "--chart-2", "--destructive", "--delivery-delivered", "--delivery-delivered"]}
            className="h-40 min-h-0"
            ariaLabel={`站点领件构成：应领件 ${formatCount(expectedPickup)}，减未领件 ${formatCount(data.uncollected)}，加${otherTaskLabel} ${formatCount(data.nonCurrentPickup)}，等于领件总量 ${formatCount(data.actualPickup)}`}
          />
        </div>
        <div className="grid gap-y-6 sm:grid-cols-2 sm:gap-x-10">
          <HandoffMetricGroup
            label="领件总量"
            value={data.actualPickup}
            items={[
              { label: taskLabel, value: data.currentPickup },
              { label: otherTaskLabel, value: data.nonCurrentPickup },
            ]}
            onDetail={onDetail}
          />
          <HandoffMetricGroup
            label="未领件"
            value={data.uncollected}
            tone="destructive"
            items={[
              { label: "未分拣未领件", value: data.unsortedUncollected },
              { label: "已分拣未领件", value: data.sortedUncollected },
            ]}
            onDetail={onDetail}
          />
        </div>
      </section>

      {!pickupOnly && <section className="flex min-w-0 flex-col gap-4 border-b pb-5 xl:border-b-0 xl:pb-0" aria-label="退回站点">
        <div className="flex items-center justify-between gap-4">
          <h4 className="font-heading text-sm font-semibold">退回站点</h4>
          <span className="text-xs text-muted-foreground">单位：件</span>
        </div>
        <ReturnEquation
          title="派送异常退回"
          expected={data.failedDeliveryReturn}
          returned={data.failedDeliveryReturned}
          pending={data.failedDeliveryPending}
          onDetail={onDetail}
        />
        <ReturnEquation
          title="错分 / No Scan 退回"
          expected={data.noScanReturn}
          returned={data.noScanReturned}
          pending={data.noScanPending}
          onDetail={onDetail}
        />
      </section>}

      <div className={cn("relative h-56 min-w-0", pickupOnly ? "lg:h-auto lg:min-h-0" : "xl:h-auto xl:min-h-0")}>
        <aside className="absolute inset-0 flex min-w-0 flex-col gap-4 rounded-lg border bg-muted/40 p-4" aria-label="指标说明">
          <Tabs defaultValue="pickup" className="min-h-0 flex-1 gap-4">
          {!pickupOnly && <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pickup">站点领件</TabsTrigger>
            <TabsTrigger value="return">退回站点</TabsTrigger>
          </TabsList>}
          <TabsContent
            value="pickup"
            className="min-h-0 flex-1 overflow-y-auto pe-1"
          >
            <div className="flex flex-col gap-4">
              <p className="text-xs leading-5 text-muted-foreground">
                {isNextPeriod ? "监控今天8:00后站点推送且派送日期不为今日的包裹（不包括任务状态是已取消、已撤回）的领件情况。" : "监控昨天 8:00 到今天 8:00 站点推送的应领件（包括 8:00 后推送的需当日派送的包裹）的领件情况。"}
              </p>
              <dl className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <dt className="text-xs font-medium">{expectedPickupLabel}</dt>
                  <dd className="text-xs leading-5 text-muted-foreground">
                    {isNextPeriod ? "今天8:00后站点推送且派送日期不为今日的包裹，不包括任务状态是已取消、已撤回" : "昨天 8:00 到今日 8:00 站点推送需要司机领件的件量（包括 8:00 后推送的需当日派送的包裹）。"}
                  </dd>
                </div>
                <p className="text-xs font-medium">
                  {isNextPeriod ? "领件率=下期任务领件 ÷ 应领件 × 100%" : "领件率 = 当期任务领件 ÷ 应领件 × 100%"}
                </p>
                <div className="flex flex-col gap-3 border-l pl-3">
                  <div className="flex flex-col gap-1">
                    <dt className="text-xs font-medium">未分拣未领件</dt>
                    <dd className="text-xs leading-5 text-muted-foreground">
                      {isNextPeriod ? "应领件（下期任务）中还没有扫描分拣的快递" : "应领件中还没有扫描分拣的快递。"}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-1">
                    <dt className="text-xs font-medium">已分拣未领件</dt>
                    <dd className="text-xs leading-5 text-muted-foreground">
                      {isNextPeriod ? "应领件（下期任务）中已扫描分拣还没完成收件的快递" : "应领件中已扫描分拣还没完成收件的快递。"}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-1">
                    <dt className="text-xs font-medium">{isNextPeriod ? "当期任务领件" : taskLabel}</dt>
                    <dd className="text-xs leading-5 text-muted-foreground">
                      {isNextPeriod ? "应领件（下期任务）中已完成收件的快递" : "应领件中已完成收件的快递。"}
                    </dd>
                  </div>
                </div>
                {isNextPeriod && (
                  <p className="text-xs font-medium">
                    领件率=下期任务领件 ÷ 应领件（下期任务） × 100%
                  </p>
                )}
              </dl>
              <div className="flex flex-col gap-3 border-t pt-3">
                <p className="text-xs font-medium">
                  {isNextPeriod ? "领件总量=下期任务领件+非下期任务领件" : `领件总量 = ${taskLabel} + ${otherTaskLabel}`}
                </p>
                <dl className="border-l pl-3">
                  <div className="flex flex-col gap-1">
                    <dt className="text-xs font-medium">{otherTaskLabel}</dt>
                    <dd className="text-xs leading-5 text-muted-foreground">
                      {isNextPeriod ? "不属于应领件（下期任务）,但是司机完成收件的快递" : "不属于应领件，但是司机完成收件的快递。"}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </TabsContent>
          <TabsContent
            value="return"
            className="min-h-0 flex-1 overflow-y-auto pe-1"
          >
            <div className="flex flex-col gap-4">
              <p className="text-xs leading-5 text-muted-foreground">
                监控司机离开站点前，应该退回给站点的快递的退回情况。
              </p>
              <dl className="flex flex-col gap-3 border-l pl-3">
                <div className="flex flex-col gap-1">
                  <dt className="text-xs font-medium">派送异常应退回</dt>
                  <dd className="text-xs leading-5 text-muted-foreground">
                    司机前往站点领件前，操作派送异常后需要退回给站点的快递。
                  </dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-xs font-medium">错分 / No Scan 应退回</dt>
                  <dd className="text-xs leading-5 text-muted-foreground">
                    司机领件扫描过程中，提示非本人的包裹、未生成任务、非本路区的包裹，需要在签退时交还站点。
                  </dd>
                </div>
              </dl>
            </div>
          </TabsContent>
          </Tabs>
        </aside>
      </div>
    </div>
  )
}

function HandoffMetricGroup({ label, value, items, tone = "default", onDetail }: {
  label: string
  value: number
  items: Array<{ label: string; value: number }>
  tone?: "default" | "destructive"
  onDetail: (title: string) => void
}) {
  const relationLabel = `${items.map((item) => `${item.label} ${formatCount(item.value)}`).join(" 加 ")}，合计${label} ${formatCount(value)}`

  return (
    <div className="min-w-0" aria-label={relationLabel}>
      <div className="flex w-full items-center justify-between gap-3 border-b pb-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <button
          type="button"
          className={cn(
            "cursor-pointer rounded-sm px-1 font-heading text-xl font-semibold tabular-nums outline-none transition-colors hover:bg-brand-hover hover:text-brand focus-visible:bg-brand-hover focus-visible:ring-1 focus-visible:ring-ring",
            tone === "destructive" && "text-destructive"
          )}
          aria-label={`查看${label}司机明细，共 ${formatCount(value)} 件`}
          onClick={() => onDetail("领件详情")}
        >
          {formatCount(value)}
        </button>
      </div>
      <div className="mt-2 flex flex-col border-l pl-3">
        {items.map((item) => (
          <div key={item.label} className="flex w-full items-center justify-between gap-3 py-1.5">
            <span className="text-xs text-muted-foreground">{item.label}</span>
            <button
              type="button"
              className="cursor-pointer rounded-sm px-1 font-medium tabular-nums outline-none transition-colors hover:bg-brand-hover hover:text-brand focus-visible:bg-brand-hover focus-visible:ring-1 focus-visible:ring-ring"
              aria-label={`查看${item.label}司机明细，共 ${formatCount(item.value)} 件`}
              onClick={() => onDetail("领件详情")}
            >
              {formatCount(item.value)}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function ReturnEquation({ title, expected, returned, pending, onDetail }: {
  title: string
  expected: number
  returned: number
  pending: number
  onDetail: (title: string) => void
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border p-3">
      <h5 className="text-sm font-medium text-muted-foreground">{title}</h5>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
        <EquationMetric label="应退回" value={expected} onClick={() => onDetail("应退回")} />
        <span className="text-muted-foreground">−</span>
        <EquationMetric label="已退回" value={returned} onClick={() => onDetail("应退回")} />
        <span className="text-muted-foreground">=</span>
        <EquationMetric label="待退回" value={pending} tone="destructive" onClick={() => onDetail("应退回")} />
      </div>
    </div>
  )
}

function EquationMetric({ label, value, tone = "default", onClick }: {
  label: string
  value: number
  tone?: "default" | "destructive"
  onClick: () => void
}) {
  return (
    <button type="button" className="flex min-w-0 flex-col items-center gap-1 rounded-md bg-muted/50 px-2 py-3 text-center outline-none transition-colors hover:bg-brand-hover focus-visible:ring-1 focus-visible:ring-ring" onClick={onClick}>
      <span className="truncate text-xs text-muted-foreground">{label}</span>
      <span className={cn("font-heading text-xl font-semibold tabular-nums", tone === "destructive" && "text-destructive")}>{formatCount(value)}</span>
    </button>
  )
}

function DeliveryDetail({ onDetail }: { onDetail: (title: string) => void }) {
  const data = realtimeOverview.delivery
  const [scope, setScope] = useState<DeliveryDetailSource>("all")
  const scopeData = data.scopes[scope]
  const { pending, delivered, exception, nonStandardReturn } = scopeData
  const rates = calculateDeliveryResultRates({ pending, delivered, exception, nonstandard_return: nonStandardReturn })
  const scopeLabel = scope === "all" ? "全部应派件" : scope === "current" ? "当期应派" : "历史未派"
  const openDeliveryDetail = (metric: "expected" | "pending" | "delivered" | "exception") => onDetail(createDeliveryDetailKey(metric, scope))
  const openNonStandardReturnDetail = () => onDetail(createDeliveryDetailKey("expected", scope, { status: "nonstandard_return", view: "driver" }))

  return (
    <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(20rem,1fr)]">
      <section className="flex min-w-0 flex-col gap-4" aria-label="派件结果分布">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 basis-72 flex-col gap-1">
            <h3 className="text-sm font-semibold text-foreground">派件结果分布</h3>
            <span className="text-xs text-muted-foreground">{scope === "current" ? "当期应派：昨天12:00到今日12:00首次收件的快递" : scope === "history" ? "历史未派:8日前的12:00到昨天12:00已收件但未完成派送的快递" : scopeLabel}</span>
          </div>
          <Tabs className="min-w-0 max-w-full" value={scope} onValueChange={(value) => setScope(value as DeliveryDetailSource)}>
            <TabsList variant="line" className="grid w-full grid-cols-3">
              <TabsTrigger value="all">全部应派件</TabsTrigger>
              <TabsTrigger value="current">当期应派</TabsTrigger>
              <TabsTrigger value="history">历史未派</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="relative">
          <AnimatedSegmentedProgress
            value={100}
            className="h-[18px] w-full"
            ariaLabel={`${scopeLabel}派件结果：已签收 ${formatCount(delivered)} 件，占 ${rates.delivered.toFixed(2)}%；派送异常 ${formatCount(exception)} 件，占 ${rates.exception.toFixed(2)}%；非标退回 ${formatCount(nonStandardReturn)} 件，占 ${rates.nonstandard_return.toFixed(2)}%；待派件 ${formatCount(pending)} 件，占 ${rates.pending.toFixed(2)}%`}
            segments={[
              { className: "bg-delivery-delivered", value: rates.delivered },
              { className: "bg-delivery-exception", value: rates.exception },
              { className: "bg-delivery-nonstandard-return", value: rates.nonstandard_return },
              { className: "bg-delivery-pending", value: rates.pending },
            ]}
          />
          <div className="absolute inset-0 flex overflow-hidden rounded-full" aria-label="派件结果快捷下钻">
            {[
              { label: "已签收", rate: rates.delivered, onClick: () => openDeliveryDetail("delivered") },
              { label: "派送异常", rate: rates.exception, onClick: () => openDeliveryDetail("exception") },
              { label: "非标退回", rate: rates.nonstandard_return, onClick: openNonStandardReturnDetail },
              { label: "待派件", rate: rates.pending, onClick: () => openDeliveryDetail("pending") },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                className="h-full shrink-0 bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                style={{ width: `${item.rate}%` }}
                aria-label={`查看${item.label}明细，占 ${item.rate.toFixed(2)}%`}
                onClick={item.onClick}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <DeliveryResultMetric label="已签收" value={delivered} rate={rates.delivered} rateNote={scope === "current" ? "2400妥投率" : undefined} tone="delivered" onClick={() => openDeliveryDetail("delivered")} />
          <DeliveryResultMetric label="派送异常" value={exception} rate={rates.exception} tone="exception" onClick={() => openDeliveryDetail("exception")} />
          <DeliveryResultMetric label="非标退回" value={nonStandardReturn} rate={rates.nonstandard_return} tone="nonstandard" onClick={openNonStandardReturnDetail} />
          <DeliveryResultMetric label="待派件" value={pending} rate={rates.pending} tone="pending" onClick={() => openDeliveryDetail("pending")} />
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground" aria-label="应派件来源构成">
          {([
            { source: "all", label: "全部应派件", value: data.total },
            { source: "current", label: "当期应派", value: data.currentSource },
            { source: "history", label: "历史未派", value: data.historySource },
          ] as const).map((item, index) => <span key={item.source} className="inline-flex items-center gap-2">
            {index > 0 && <span aria-hidden="true">{index === 1 ? "=" : "+"}</span>}
            <span className="inline-flex items-center gap-1">{item.label}
              <button type="button" className={cn("rounded-sm px-1 font-heading text-lg tabular-nums outline-none hover:bg-brand-hover focus-visible:ring-1 focus-visible:ring-ring", scope === item.source ? "font-semibold text-warning" : "font-normal text-foreground")} aria-label={`查看${item.label}明细，共 ${formatCount(item.value)} 件${scope === item.source ? "，当前选中范围" : ""}`} onClick={() => onDetail(createDeliveryDetailKey("expected", item.source))}>{formatCount(item.value)}</button>
            </span>
          </span>)}
        </div>



      </section>

      <div className="relative h-56 min-w-0 xl:h-auto xl:min-h-0">
        <aside className="absolute inset-0 flex min-w-0 flex-col gap-4 overflow-hidden rounded-lg border bg-muted/40 p-5" aria-label="指标说明">
          <ScrollArea className="min-h-0 flex-1 pr-3">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1 text-xs font-medium leading-5 text-foreground">
                  <p>应派件 = 当期应派 + 历史未派</p>
                  <p>应派件 = 待派件 + 已签收 + 派送异常 + 非标退回</p>
                </div>
                <div className="flex flex-col gap-3 border-l pl-3">
                  <DeliveryDefinition title="当期应派">昨天12:00到今日12:00首次收件的快递。</DeliveryDefinition>
                  <DeliveryDefinition title="历史未派">8日前的12:00到昨天12:00已收件但未完成派送的快递。</DeliveryDefinition>
                </div>
              </div>
              <div className="flex flex-col gap-3 border-t pt-4">
                <div className="flex flex-col gap-1 text-xs font-medium leading-5 text-foreground">
                  <p>2400妥投率 = 当期应派中已签收的快递数量 ÷ 当期应派 × 100%</p>
                  <p>日清率 = （已签收 + 派送异常）÷ 应派件 × 100%</p>
                </div>
                <div className="flex flex-col gap-3 border-l pl-3">
                  <DeliveryDefinition title="待派件">应派件中还未尝试派送的快递。</DeliveryDefinition>
                  <DeliveryDefinition title="已签收">应派件中完成派送，已签收的快递。</DeliveryDefinition>
                  <DeliveryDefinition title="派送异常">应派件中尝试派送失败，登记派送异常的快递。</DeliveryDefinition>
                  <DeliveryDefinition title="非标退回">待派件未登记派送异常，直接退回站点的快递；不计入日清率。</DeliveryDefinition>
                </div>
              </div>
            </div>
          </ScrollArea>
        </aside>
      </div>
    </div>
  )
}

function DeliveryResultMetric({ label, value, rate, rateNote, tone, onClick }: {
  label: string
  value: number
  rate: number
  rateNote?: string
  tone: "delivered" | "pending" | "exception" | "nonstandard"
  onClick: () => void
}) {
  return (
    <button type="button" className="flex min-w-0 flex-col items-start gap-2 text-left outline-none hover:text-brand focus-visible:ring-1 focus-visible:ring-ring" onClick={onClick}>
      <span className="flex items-center gap-2 text-xs text-muted-foreground">
        <span aria-hidden="true" className={cn("size-2 rounded-sm", tone === "delivered" && "bg-delivery-delivered", tone === "pending" && "bg-delivery-pending", tone === "exception" && "bg-delivery-exception", tone === "nonstandard" && "bg-delivery-nonstandard-return")} />
        {label}
      </span>
      <strong className="font-heading text-2xl font-semibold tabular-nums text-foreground">{formatCount(value)}</strong>
      <span className="text-xs tabular-nums text-muted-foreground">{rate.toFixed(2)}{rateNote ? ` %（${rateNote}）` : "%"}</span>
    </button>
  )
}

function DeliveryDefinition({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-medium text-foreground">{title}</h4>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{children}</p>
    </div>
  )
}

const AlertActionPanel = memo(function AlertActionPanel({ compact = false, onCollapse, onDetail }: {
  compact?: boolean
  onCollapse?: () => void
  onDetail: (title: string) => void
}) {
  return (
    <TooltipProvider>
      <Card
        size="sm"
        className={cn(
          "h-full min-h-[17rem]",
          compact &&
            "alert-nav-glass min-h-0 flex-row items-center gap-3 rounded-t-none border-0 [--card-spacing:--spacing(2)]"
        )}
      >
        <CardContent className={compact ? "grid flex-1 grid-cols-[minmax(0,2fr)_minmax(0,5fr)] gap-3 px-3" : "grid flex-1 gap-3 pt-2 md:grid-cols-[minmax(10rem,.8fr)_minmax(0,2.4fr)]"}>
        {compact ? alertGroups.map((group, groupIndex) => {
          return (
            <section
              key={group.title}
              aria-label={group.title}
              className={cn(
                "grid min-w-0 grid-cols-[5rem_minmax(0,1fr)] gap-1",
                groupIndex > 0 && "border-l border-border/60 pl-3"
              )}
            >
              <div className="flex min-w-0 items-center justify-center px-2 text-center">
                <h3 className="whitespace-nowrap text-xs font-normal text-muted-foreground">{group.title}</h3>
              </div>
              <div className={cn("grid min-w-0 gap-1", group.items.length > 2 ? "grid-cols-4" : "grid-cols-2")}>
                {group.items.map((item) => <AlertActionButton key={item.label} compact item={item} onDetail={onDetail} />)}
              </div>
            </section>
          )
        }) : alertGroups.map((group) => {
          const hasSubAction = group.items.some((item) => item.bubble)

          return (
          <section key={group.title} aria-label={group.title} className="relative min-w-0 rounded-lg border px-3.5 pb-2 pt-4">
            <h3 className="absolute -top-2 left-2 bg-card px-2 font-heading text-sm font-medium text-foreground">
              {group.title}
            </h3>
            <div className={cn("grid h-full grid-rows-[repeat(2,5.5rem)] content-center gap-2.5", hasSubAction ? "grid-cols-3" : "grid-cols-1")}>
              {group.items.map((item) => <AlertActionButton key={item.label} item={item} onDetail={onDetail} />)}
            </div>
          </section>
          )
        })}
        </CardContent>
        {compact && onCollapse ? (
          <Button
            variant="ghost"
            size="icon-sm"
            className="mr-1 shrink-0"
            aria-label="收起异常指标导航"
            aria-expanded="true"
            onClick={onCollapse}
          >
            <ChevronUpIcon />
          </Button>
        ) : null}
      </Card>
    </TooltipProvider>
  )
})

function AlertActionButton({ compact = false, item, onDetail }: {
  compact?: boolean
  item: AlertActionItem
  onDetail: (title: string) => void
}) {
  const embedsBubble = Boolean(item.bubble)
  const metricButton = (
    <button
      type="button"
      className={cn(
        "flex min-h-16 flex-col items-center justify-center gap-1 rounded-md bg-muted/60 px-2 text-center transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50",
        !compact && "h-22",
        compact &&
          "min-h-10 border border-card bg-card px-1 py-1 transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50",
        embedsBubble && (compact
          ? "min-h-8 border-0 bg-transparent p-0 backdrop-blur-none hover:bg-card/50"
          : "h-full min-h-0 rounded-none bg-transparent p-0 hover:bg-brand-hover")
      )}
      onClick={() => onDetail(`${item.label}明细`)}
    >
      <span className={cn(
        "font-semibold tabular-nums",
        compact ? "text-sm" : "text-xl",
        item.urgent && "text-destructive",
        item.info && (compact ? "text-foreground" : "text-muted-foreground")
      )}>{item.value}</span>
      <span className="whitespace-nowrap text-xs font-semibold text-muted-foreground">{item.label}</span>
    </button>
  )
  const metricTooltip = (
    <Tooltip>
      <TooltipTrigger asChild>{metricButton}</TooltipTrigger>
      <TooltipContent>{item.description}</TooltipContent>
    </Tooltip>
  )

  if (embedsBubble && item.bubble) {
    return (
      <div className={cn(
        "col-span-2 grid min-h-16 min-w-0 grid-cols-2 items-stretch gap-2.5 rounded-md bg-muted/60",
        !compact && "h-22 pr-2.5",
        compact && "col-span-1 min-h-10 gap-1 rounded-md border border-card bg-card p-1"
      )}>
        {metricTooltip}
        <AlertSubActionButton compact={compact} embedded={compact} item={item.bubble} onDetail={onDetail} />
      </div>
    )
  }

  return (
    <>
      {metricTooltip}
      {item.bubble ? <AlertSubActionButton item={item.bubble} onDetail={onDetail} /> : null}
    </>
  )
}

function AlertSubActionButton({ compact = false, embedded = false, item, onDetail }: {
  compact?: boolean
  embedded?: boolean
  item: { label: string; value: string; description: string }
  onDetail: (title: string) => void
}) {
  const button = (
    <button
      type="button"
      className={cn(
        "group/sub relative flex min-h-16 flex-col items-center justify-center gap-1 rounded-md border border-brand/30 bg-brand-selected px-2 text-center text-brand-ink transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50",
        compact &&
          "min-h-10 border-card bg-card px-1 py-1 text-foreground hover:bg-brand-hover",
        embedded && "min-h-8 border-border bg-transparent py-0 backdrop-blur-none hover:bg-card/70",
        !compact && "h-17 self-center"
      )}
      aria-label={`${item.label} ${item.value}，属于待处理问题件，点击查看明细`}
      onClick={() => onDetail(`${item.label}明细`)}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute -left-1 top-1/2 size-2 -translate-y-1/2 rotate-45 border-b border-l border-brand/30 bg-brand-selected transition-colors group-hover/sub:bg-brand-hover",
          compact && "border-card bg-card group-hover/sub:bg-brand-hover",
          embedded && "border-border bg-card group-hover/sub:bg-card/70"
        )}
      />
      <span className={cn("font-semibold tabular-nums text-foreground", compact ? "text-sm" : "text-xl")}>{item.value}</span>
      <span className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
        {compact ? item.label : <>其中&nbsp;{item.label}</>}
      </span>
    </button>
  )

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent>{item.description}</TooltipContent>
    </Tooltip>
  )
}

const ExceptionDistribution = memo(function ExceptionDistribution({ option, onDetail }: { option: EChartsOption; onDetail: (title: string) => void }) {
  return (
    <TooltipProvider>
      <Card size="sm" className="h-full">
        <CardHeader>
          <CardTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="cursor-help rounded-sm outline-none focus-visible:ring-1 focus-visible:ring-ring/50" aria-label="查看派送异常原因分布说明">
                  派送异常原因分布
                </button>
              </TooltipTrigger>
              <TooltipContent>今日应派件中派送失败司机登记派送异常的问题件原因分布</TooltipContent>
            </Tooltip>
          </CardTitle>
          <CardAction><Button variant="link" size="xs" onClick={() => onDetail("派送异常分布详情")}>详情<ArrowRightIcon data-icon="inline-end" /></Button></CardAction>
        </CardHeader>
        <CardContent>
          <EChartsChart
            option={option}
            colors={exceptionChartColors}
            seriesColors={exceptionChartSeriesColors}
            seriesGradients={exceptionChartSeriesGradients}
            labelColors={exceptionChartLabelColors}
            className="h-50 min-h-0"
          />
        </CardContent>
      </Card>
    </TooltipProvider>
  )
})

function DriverMonitor({ selectedDriverId, onSelectDriver, onViewDriver, onViewPickup }: { selectedDriverId: string | null; onSelectDriver: (driverId: string | null) => void; onViewDriver: (driverId: string, alertType?: WaybillAlert) => void; onViewPickup: (driverId: string, period: PickupPeriod) => void }) {
  const [view, setView] = useState<MonitorView>("delivery")
  const filters = useDeliveryDriverFilters(driverRows)
  const { visibleDrivers } = filters

  useEffect(() => {
    if (!selectedDriverId) return
    document.getElementById(`monitor-driver-${selectedDriverId}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" })
  }, [selectedDriverId])

  return (
    <Card size="sm" className="h-full min-h-[55rem]">
      <CardHeader><CardTitle>司机监控</CardTitle></CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
        <Tabs value={view} onValueChange={(value) => setView(value as MonitorView)} className="gap-3">
          <TooltipProvider>
            <TabsList variant="line" className="grid w-full grid-cols-3">
              {driverMonitorTabs.map((tab) => (
                <Tooltip key={tab.value}>
                  {/* Keep Tooltip's data-state off the Tab's active-state element. */}
                  <TooltipTrigger asChild>
                    <div className="flex min-w-0 items-center justify-center">
                      <TabsTrigger value={tab.value} className="flex-none">
                        {tab.label}
                        <CircleHelpIcon aria-hidden="true" className="text-muted-foreground" />
                      </TabsTrigger>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>{tab.description}</TooltipContent>
                </Tooltip>
              ))}
            </TabsList>
          </TooltipProvider>
          <TabsContent value="delivery" className="flex flex-col gap-2 rounded-lg bg-muted/30 p-3">
            <DeliveryDriverFilters filters={filters} drivers={driverRows} idPrefix="driver" deliveryPph={realtimeOverview.delivery.deliveryPph} />
            <ScrollArea className="h-[40rem] rounded-lg">
              <div className="flex flex-col gap-2 pr-3">
                {visibleDrivers.map((driver) => (
                  <DeliveryDriverCard
                    key={driver.id}
                    driver={driver}
                    selected={driver.id === selectedDriverId}
                    onSelect={() => onSelectDriver(driver.id === selectedDriverId ? null : driver.id)}
                    onViewDetail={(alertType) => onViewDriver(driver.id, alertType)}
                  />
                ))}
                {visibleDrivers.length === 0 ? <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">暂无匹配司机</div> : null}
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="current-pickup"><CurrentPickupMonitor drivers={driverRows} onViewDetail={(driverId) => onViewPickup(driverId, "current")} /></TabsContent>
          <TabsContent value="next-pickup"><CurrentPickupMonitor drivers={driverRows} period="next" onViewDetail={(driverId) => onViewPickup(driverId, "next")} /></TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

function DriverMapPanel({ selectedDriverId, onSelectDriver, onDetail }: { selectedDriverId: string | null; onSelectDriver: (driverId: string | null) => void; onDetail: (title: string) => void }) {
  return (
    <Card size="sm" className="h-full">
      <CardHeader>
        <CardTitle>派件地图监控</CardTitle>
        <CardAction><Button variant="link" size="xs" onClick={() => onDetail("司机监控地图")}>详情<ArrowRightIcon data-icon="inline-end" /></Button></CardAction>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1">
        <div className="relative min-h-[40rem] min-w-0 flex-1 overflow-hidden rounded-lg border">
          <DriverLiveMap drivers={driverRows} selectedDriverId={selectedDriverId} onSelectDriver={onSelectDriver} />
        </div>
      </CardContent>
    </Card>
  )
}
