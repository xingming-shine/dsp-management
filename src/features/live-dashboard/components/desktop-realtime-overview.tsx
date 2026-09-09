"use client"

import { alertMetricGroups } from "../alert-metric-config"
import { overviewCardsByMode, overviewCardTitles, type OverviewCardId, type OverviewDetailAction, type PickupPeriod } from "../overview-card-config"

import { useEffect, useMemo, useRef, useState } from "react"
import type { ReactNode } from "react"
import type { EChartsOption } from "echarts"
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  ArrowDownUpIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  ChartNoAxesColumnIcon,
  PackageCheckIcon,
  SearchIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
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
import { CurrentPickupMonitor } from "@/features/live-dashboard/components/current-pickup-monitor"
import { StatusMultiSelect } from "@/features/live-dashboard/components/status-multi-select"
import {
  createDeliveryDetailKey,
  type DeliveryDetailSource,
} from "@/features/live-dashboard/components/delivery-detail-view"
import {
  assessmentMetrics,
  exceptionReasons,
  realtimeOverview,
  type MonitorView,
  type WorkMode,
} from "@/features/live-dashboard/mock-data"
import { cn } from "@/lib/utils"
import { formatDate, formatTime } from "@/lib/date-time"

import { driverRows, type RouteDifficulty, type DriverRouteAssignment, type DashboardDriverSnapshot } from "@/features/live-dashboard/driver-rows"

const routeDifficultyLabels: Record<RouteDifficulty, string> = {
  S: "S级 极难",
  A: "A级 难",
  B: "B级 中",
  C: "C级 易",
  D: "D级 极易",
}

const routeDifficultyClassNames: Record<RouteDifficulty, string> = {
  S: "border-destructive text-destructive",
  A: "border-destructive/70 text-destructive/80",
  B: "border-brand text-brand",
  C: "border-success text-success",
  D: "border-success/60 text-success/70",
}

const driverStatusFilterOptions = [
  { value: "not-started", label: "未开始派送" },
  { value: "30min", label: "30min 未派送" },
  { value: "1h", label: "1h 未派送" },
  { value: "2h", label: "2h 未派送" },
  { value: "pod", label: "POD 不合规" },
  { value: "location", label: "妥投位置异常" },
  { value: "fake", label: "虚假问题件" },
] as const

type DriverStatusFilter = (typeof driverStatusFilterOptions)[number]["value"]

const driverSortOptions = [
  { value: "default", label: "默认排序" },
  { value: "pending-desc", label: "待派件量 从高到低" },
  { value: "pending-asc", label: "待派件量 从低到高" },
  { value: "clearance-desc", label: "日清率 从高到低" },
  { value: "clearance-asc", label: "日清率 从低到高" },
] as const
type DriverSort = (typeof driverSortOptions)[number]["value"]

type HandoffData = { [K in keyof typeof realtimeOverview.handoff]: number }
const emptyHandoff = Object.fromEntries(Object.keys(realtimeOverview.handoff).map((key) => [key, 0])) as HandoffData

type AlertActionItem = {
  label: string
  value: string
  urgent?: boolean
  info?: boolean
  bubble?: { label: string; value: string }
}

const alertGroups: Array<{ title: string; items: AlertActionItem[] }> = alertMetricGroups.map((group) => ({
  title: group.title,
  items: group.items.filter((item) => !item.nested).map((item) => {
    const nested = item.key === "pending" ? group.items.find((entry) => entry.nested) : undefined
    return {
      label: item.label,
      value: String(item.value),
      urgent: ["pod", "delivery-location", "pending"].includes(item.key),
      info: ["fake-delivery", "dsp-tracking"].includes(item.key),
      ...(nested ? { bubble: { label: nested.label, value: String(nested.value) } } : {}),
    }
  }),
}))

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
          <DriverMonitor selectedDriverId={selectedMapDriverId} onSelectDriver={setSelectedMapDriverId} onViewDriver={(driverId) => onDetail("司机监控地图", driverId)} />
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

function OverviewCards({ mode, onDetail }: { mode: WorkMode; onDetail: OverviewDetailAction }) {
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
            if (id === "next-allocation") return <NextAllocationCard key={id} {...props} className={mode === "next-day" ? "md:col-span-1" : "md:col-span-4"} mode={mode} />
            const period = id === "next-handoff" ? "next" : "current"
            return <StationHandoffCard key={id} {...props} id={id} pickupOnly={id === "current-pickup"} period={period} className={mode === "same-day" ? "md:col-span-8" : cn(id === "current-pickup" ? "md:col-span-1" : "md:col-span-2", "lg:col-span-1")} onPickupDetail={() => onDetail("领件详情", undefined, period)} onReturnDetail={() => onDetail("应退回", undefined, period)} />
          })}
        </div>
        {expandedCard ? <OverviewDetailPanel card={expandedCard} mode={mode} onDetail={onDetail} /> : null}
      </CardContent>
    </Card>
  )
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value)
}

function KpiCardTitle({ order, title }: { order: number; title: string }) {
  return (
    <CardTitle className="flex min-w-0 items-center gap-2 text-xs font-medium leading-5 text-muted-foreground/70">
      <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular-nums text-muted-foreground">
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
          ? cn(
              "bg-card hover:bg-card",
              expanded ? "border-brand" : "border-border/80"
            )
          : "border-border/80 bg-muted/20 hover:bg-brand-hover",
        expanded && "border-brand bg-brand-selected hover:bg-brand-selected after:absolute after:-bottom-1.5 after:left-1/2 after:size-3 after:-translate-x-1/2 after:rotate-45 after:border-r after:border-b after:border-brand after:bg-brand-selected",
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
            className="absolute -top-5 -left-5 size-36 text-brand opacity-10"
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
  const pod2400 = assessmentMetrics.find((metric) => metric.label === "2400 妥投率")
  const clearanceOption: EChartsOption = {
    animationDuration: 320,
    tooltip: {
      trigger: "item",
      valueFormatter: (value) => `${formatCount(Number(value))} 件`,
    },
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
          { name: "已签收", value: data.delivered },
          { name: "派送异常", value: data.exception },
          { name: "待派件", value: data.pending },
        ],
      },
    ],
  }

  const pod2400Option: EChartsOption = {
    series: [{
      type: "pie", radius: ["70%", "90%"], center: ["50%", "50%"],
      label: { show: false }, labelLine: { show: false },
      itemStyle: { borderRadius: 6 }, emphasis: { scale: false },
      data: [
        { name: "2400 内妥投", value: pod2400?.value ?? 0 },
        { name: "未妥投", value: 100 - (pod2400?.value ?? 0) },
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
          { label: "日清率", value: data.clearanceRate, option: clearanceOption, colors: ["--delivery-delivered", "--delivery-exception", "--border"] },
          ...(pod2400 ? [{ label: "2400妥投率", value: pod2400.value, option: pod2400Option, colors: ["--chart-2", "--border"] }] : []),
        ].map((metric) => (
          <div key={metric.label} className="flex min-h-28 min-w-0 -translate-y-3 flex-col items-center">
            <div className="relative size-24 shrink-0">
              <EChartsChart option={metric.option} colors={metric.colors} className="size-24 min-h-0" ariaLabel={`${metric.label} ${metric.value.toFixed(2)}%`} />
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="font-heading text-sm font-medium tabular-nums text-foreground">{metric.value.toFixed(2)}%</span>
              </span>
            </div>
            <span className="text-xs text-muted-foreground">{metric.label}</span>
          </div>
        ))}
      </div>
    </SummaryCard>
  )
}

function NextAllocationCard({ className, order, mode, compact = false, expanded, onToggle }: {
  className?: string
  order: number
  mode: WorkMode
  compact?: boolean
  expanded: boolean
  onToggle: () => void
}) {
  const data = realtimeOverview.nextAllocation
  const pushAt = data.pushAtByMode[mode]
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
      <div className={cn("flex min-h-0 flex-1 flex-col justify-center gap-3", mode === "same-day" ? "pl-2" : "@min-[12rem]:pl-2")}>
        <div>
          <p className="text-xs text-muted-foreground">预计推送</p>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="font-heading text-xl font-medium tabular-nums">{formatTime(pushAt, { includeSeconds: true })}</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{formatDate(pushAt)}</p>
      </div>
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
    <section id={`overview-detail-${card}`} className="overflow-hidden rounded-xl border border-brand bg-card" role="region" aria-label={overviewCardTitles[card]}>
      <div className="p-5">
        {card === "allocation" ? <AllocationDetail onDetail={openPeriodDetail} /> : null}
        {card === "handoff" || card === "current-pickup" || card === "next-handoff" ? <HandoffDetail period={period} pickupOnly={card === "current-pickup"} onDetail={openPeriodDetail} /> : null}
        {card === "delivery" ? <DeliveryDetail onDetail={onDetail} /> : null}
        {card === "next-allocation" ? <NextAllocationDetail mode={mode} /> : null}
      </div>
    </section>
  )
}

function NextAllocationDetail({ mode }: { mode: WorkMode }) {
  const pushAt = realtimeOverview.nextAllocation.pushAtByMode[mode]

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

function AllocationDetail({ onDetail }: { onDetail: (title: string) => void }) {
  const data = realtimeOverview.allocation
  const unassignedRate = Number((100 - data.completionRate).toFixed(2))

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
          <h5 className="text-sm font-medium text-muted-foreground">应领件</h5>
          <p className="text-xs leading-5 text-muted-foreground">昨天 8:00 到今日 8:00 站点推送需要司机领件的件量（包括 8:00 后推送的需当日派送的包裹）</p>
        </div>
        <div className="flex flex-col gap-4 border-l pl-3">
          <div className="flex flex-col gap-1">
            <h5 className="text-sm font-medium text-muted-foreground">未分配件量</h5>
            <p className="text-xs leading-5 text-muted-foreground">应领件中还没有分配司机的件量</p>
          </div>
          <div className="flex flex-col gap-1">
            <h5 className="text-sm font-medium text-muted-foreground">已分配件量</h5>
            <p className="text-xs leading-5 text-muted-foreground">应领件中已经分配司机的件量</p>
          </div>
        </div>
      </aside>
    </div>
  )
}

function HandoffDetail({ onDetail, period = "current", pickupOnly = false }: { onDetail: (title: string) => void; period?: PickupPeriod; pickupOnly?: boolean }) {
  const data = period === "next" ? emptyHandoff : realtimeOverview.handoff
  const expectedPickup = period === "next" ? 0 : realtimeOverview.allocation.expected
  const taskLabel = period === "next" ? "下期任务领件" : "当期任务领件"
  const otherTaskLabel = `非${taskLabel}`
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

      <aside className="flex min-w-0 flex-col gap-4 rounded-lg border bg-muted/40 p-4" aria-label="指标说明">
        <Tabs defaultValue="pickup" className="gap-4">
          <TabsList className={cn("grid w-full", pickupOnly ? "grid-cols-1" : "grid-cols-2")}>
            <TabsTrigger value="pickup">站点领件</TabsTrigger>
            {!pickupOnly && <TabsTrigger value="return">退回站点</TabsTrigger>}
          </TabsList>
          <TabsContent
            value="pickup"
            className="max-h-56 min-h-24 overflow-y-auto pe-1"
          >
            <div className="flex flex-col gap-4">
              <p className="text-xs leading-5 text-muted-foreground">
                {period === "next" ? "监控下期领件任务的交取件情况。下期任务尚未生成，当前暂无数据。" : "监控昨天 8:00 到今天 8:00 站点推送的应领件（包括 8:00 后推送的需当日派送的包裹）的领件情况。"}
              </p>
              <dl className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <dt className="text-xs font-medium">应领件</dt>
                  <dd className="text-xs leading-5 text-muted-foreground">
                    {period === "next" ? "站点推送的下期领件任务中需要司机领取的件量。" : "昨天 8:00 到今日 8:00 站点推送需要司机领件的件量（包括 8:00 后推送的需当日派送的包裹）。"}
                  </dd>
                </div>
                <div className="flex flex-col gap-3 border-l pl-3">
                  <div className="flex flex-col gap-1">
                    <dt className="text-xs font-medium">未分拣未领件</dt>
                    <dd className="text-xs leading-5 text-muted-foreground">
                      应领件中还没有扫描分拣的快递。
                    </dd>
                  </div>
                  <div className="flex flex-col gap-1">
                    <dt className="text-xs font-medium">已分拣未领件</dt>
                    <dd className="text-xs leading-5 text-muted-foreground">
                      应领件中已扫描分拣还没完成收件的快递。
                    </dd>
                  </div>
                  <div className="flex flex-col gap-1">
                    <dt className="text-xs font-medium">{taskLabel}</dt>
                    <dd className="text-xs leading-5 text-muted-foreground">
                      应领件中已完成收件的快递。
                    </dd>
                  </div>
                </div>
              </dl>
              <div className="flex flex-col gap-3 border-t pt-3">
                <p className="text-xs font-medium">
                  领件总量 = {taskLabel} + {otherTaskLabel}
                </p>
                <dl className="border-l pl-3">
                  <div className="flex flex-col gap-1">
                    <dt className="text-xs font-medium">{otherTaskLabel}</dt>
                    <dd className="text-xs leading-5 text-muted-foreground">
                      不属于应领件，但是司机完成收件的快递。
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </TabsContent>
          <TabsContent
            value="return"
            className="max-h-56 min-h-24 overflow-y-auto pe-1"
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
  const scopeTotal = scope === "all" ? data.total : scope === "current" ? data.currentSource : data.historySource
  const exception = scope === "all" ? data.exception : Math.round(scopeTotal * data.exceptionRate / 100)
  const pending = scope === "all" ? data.pending : Math.round(scopeTotal * data.pendingRate / 100)
  const delivered = scopeTotal - pending - exception
  const deliveredRate = Number((delivered / scopeTotal * 100).toFixed(2))
  const pendingRate = Number((pending / scopeTotal * 100).toFixed(2))
  const exceptionRate = Number((exception / scopeTotal * 100).toFixed(2))
  const scopeLabel = scope === "all" ? "全部应派件" : scope === "current" ? "当期应派" : "历史未派"
  const openDeliveryDetail = (metric: "expected" | "pending" | "delivered" | "exception") => onDetail(createDeliveryDetailKey(metric, scope))

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

        <div className="relative h-[18px] w-full overflow-hidden rounded-full bg-delivery-delivered" role="group" aria-label={`${scopeLabel}派件结果：已签收 ${formatCount(delivered)} 件，派送异常 ${formatCount(exception)} 件，待派件 ${formatCount(pending)} 件`}>
          <button
            type="button"
            className="absolute inset-0 rounded-full bg-delivery-delivered outline-none transition-opacity hover:opacity-85 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring"
            aria-label={`查看已签收明细，共 ${formatCount(delivered)} 件`}
            onClick={() => openDeliveryDetail("delivered")}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 rounded-full bg-delivery-exception outline-none transition-opacity hover:opacity-85 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring"
            style={{ width: `${pendingRate + exceptionRate}%` }}
            aria-label={`查看派送异常明细，共 ${formatCount(exception)} 件`}
            onClick={() => openDeliveryDetail("exception")}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 rounded-full bg-border outline-none transition-opacity hover:opacity-85 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring"
            style={{ width: `${pendingRate}%` }}
            aria-label={`查看待派件明细，共 ${formatCount(pending)} 件`}
            onClick={() => openDeliveryDetail("pending")}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <DeliveryResultMetric label="已签收" value={delivered} rate={deliveredRate} tone="delivered" onClick={() => openDeliveryDetail("delivered")} />
          <DeliveryResultMetric label="派送异常" value={exception} rate={exceptionRate} tone="exception" onClick={() => openDeliveryDetail("exception")} />
          <DeliveryResultMetric label="待派件" value={pending} rate={pendingRate} tone="pending" onClick={() => openDeliveryDetail("pending")} />
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

      <aside className="flex h-56 min-w-0 flex-col gap-4 overflow-hidden rounded-lg border bg-muted/40 p-5" aria-label="指标说明">
        <h3 className="text-sm font-semibold text-muted-foreground">指标说明</h3>
        <ScrollArea className="min-h-0 flex-1 pr-3">
          <div className="flex flex-col gap-4">
            <DeliveryDefinition title="全部应派件">当期应派与历史未派件的合计。</DeliveryDefinition>
            <DeliveryDefinition title="当期应派">本原型对应当期实际领件量。</DeliveryDefinition>
            <DeliveryDefinition title="历史未派">沿用原图“历史未清件量”；具体结转口径待确认。</DeliveryDefinition>
            <DeliveryDefinition title="派件结果分布">已签收、待派件、派送异常之和等于所选范围的应派件量。占比以当前选中范围为分母。</DeliveryDefinition>
          </div>
        </ScrollArea>
      </aside>
    </div>
  )
}

function DeliveryResultMetric({ label, value, rate, tone, onClick }: {
  label: string
  value: number
  rate: number
  tone: "delivered" | "pending" | "exception"
  onClick: () => void
}) {
  return (
    <button type="button" className="flex min-w-0 flex-col items-start gap-2 text-left outline-none hover:text-brand focus-visible:ring-1 focus-visible:ring-ring" onClick={onClick}>
      <span className="flex items-center gap-2 text-xs text-muted-foreground">
        <span aria-hidden="true" className={cn("size-2 rounded-sm", tone === "delivered" && "bg-delivery-delivered", tone === "pending" && "bg-border", tone === "exception" && "bg-delivery-exception")} />
        {label}
      </span>
      <strong className="font-heading text-2xl font-semibold tabular-nums text-foreground">{formatCount(value)}</strong>
      <span className="text-xs tabular-nums text-muted-foreground">{rate.toFixed(2)}%</span>
    </button>
  )
}

function DeliveryDefinition({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{children}</p>
    </div>
  )
}

function AlertActionPanel({ compact = false, onCollapse, onDetail }: {
  compact?: boolean
  onCollapse?: () => void
  onDetail: (title: string) => void
}) {
  return (
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
            <h3 className="absolute -top-2 left-2 bg-card px-2 font-heading text-sm font-medium text-muted-foreground">
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
  )
}

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

  if (embedsBubble && item.bubble) {
    return (
      <div className={cn(
        "col-span-2 grid min-h-16 min-w-0 grid-cols-2 items-stretch gap-2.5 rounded-md bg-muted/60",
        !compact && "h-22 pr-2.5",
        compact && "col-span-1 min-h-10 gap-1 rounded-md border border-card bg-card p-1"
      )}>
        {metricButton}
        <AlertSubActionButton compact={compact} embedded={compact} item={item.bubble} onDetail={onDetail} />
      </div>
    )
  }

  return (
    <>
      {metricButton}
      {item.bubble ? <AlertSubActionButton item={item.bubble} onDetail={onDetail} /> : null}
    </>
  )
}

function AlertSubActionButton({ compact = false, embedded = false, item, onDetail }: {
  compact?: boolean
  embedded?: boolean
  item: { label: string; value: string }
  onDetail: (title: string) => void
}) {
  return (
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
}

function ExceptionDistribution({ option, onDetail }: { option: EChartsOption; onDetail: (title: string) => void }) {
  return (
    <Card size="sm" className="h-full">
      <CardHeader>
        <CardTitle>派送异常原因分布</CardTitle>
        <CardAction><Button variant="link" size="xs" onClick={() => onDetail("派送异常分布详情")}>详情<ArrowRightIcon data-icon="inline-end" /></Button></CardAction>
      </CardHeader>
      <CardContent>
        <EChartsChart
          option={option}
          colors={["--exception-overview-normal", "--exception-overview-fake"]}
          seriesColors={[null, "--exception-overview-fake"]}
          seriesGradients={[
            ["--exception-overview-normal-start", "--exception-overview-normal"],
            null,
          ]}
          labelColors={["--brand-foreground", "--brand-foreground"]}
          className="h-50 min-h-0"
          onChartClick={(event) => onDetail(`${String(event.name)}异常明细`)}
        />
      </CardContent>
    </Card>
  )
}

function DriverMonitor({ selectedDriverId, onSelectDriver, onViewDriver }: { selectedDriverId: string | null; onSelectDriver: (driverId: string | null) => void; onViewDriver: (driverId: string) => void }) {
  const [view, setView] = useState<MonitorView>("delivery")
  const [query, setQuery] = useState("")
  const [statusFilters, setStatusFilters] = useState<DriverStatusFilter[]>([])
  const [sort, setSort] = useState<DriverSort>("default")
  const sortLabel = driverSortOptions.find((option) => option.value === sort)!.label
  const visibleDrivers = driverRows.filter((driver) => {
    const matchesQuery = driver.name.toLowerCase().includes(query.trim().toLowerCase())
    const matchesStatus = statusFilters.length === 0 || statusFilters.some((filter) => {
      if (filter === "not-started") return driver.status === "未开始派送"
      if (filter === "30min" || filter === "1h" || filter === "2h") return driver.status.startsWith(filter)
      if (filter === "pod") return Boolean(driver.podIssues)
      if (filter === "location") return Boolean(driver.locationIssues)
      return Boolean(driver.fakeIssues)
    })
    return matchesQuery && matchesStatus
  }).sort((a, b) => {
    if (sort === "default") return 0
    const value = (driver: DashboardDriverSnapshot) => sort.startsWith("pending")
      ? driver.pending
      : driver.total > 0 ? (driver.delivered + driver.exception) / driver.total : 0
    return sort.endsWith("asc") ? value(a) - value(b) : value(b) - value(a)
  })
  function resetFilters() { setQuery(""); setStatusFilters([]); setSort("default"); toast.success("筛选条件已重置") }

  useEffect(() => {
    if (!selectedDriverId) return
    document.getElementById(`monitor-driver-${selectedDriverId}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" })
  }, [selectedDriverId])

  return (
    <Card size="sm" className="h-full min-h-[55rem]">
      <CardHeader><CardTitle>司机监控</CardTitle></CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
        <Tabs value={view} onValueChange={(value) => setView(value as MonitorView)} className="gap-3">
          <TabsList variant="line" className="grid w-full grid-cols-3">
            <TabsTrigger value="current-pickup">当期领件任务监控</TabsTrigger>
            <TabsTrigger value="delivery">派件监控</TabsTrigger>
            <TabsTrigger value="next-pickup">下期领件任务监控</TabsTrigger>
          </TabsList>
          <TabsContent value="delivery" className="flex flex-col gap-3 rounded-lg bg-muted/30 p-3">
            <DriverSummary onQueryStatus={(status) => setStatusFilters([status])} />
            <div className="grid gap-2 lg:grid-cols-[minmax(8rem,1fr)_minmax(10rem,1fr)_auto_auto]">
              <Field>
                <FieldLabel htmlFor="driver-search" className="sr-only">司机姓名</FieldLabel>
                <div className="relative">
                  <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="driver-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="请输入司机的名字" className="pl-9" />
                </div>
              </Field>
              <Field>
                <FieldLabel htmlFor="driver-status-filter" className="sr-only">异常状态筛选</FieldLabel>
                <StatusMultiSelect
                  id="driver-status-filter"
                  ariaLabel="异常状态筛选"
                  options={driverStatusFilterOptions.map((option) => option.value)}
                  value={statusFilters}
                  getOptionLabel={(value) => driverStatusFilterOptions.find((option) => option.value === value)?.label ?? value}
                  maxVisible={1}
                  emptyLabel="全部异常状态"
                  onValueChange={setStatusFilters}
                />
              </Field>
              <Button onClick={() => toast.success(`查询到 ${visibleDrivers.length} 名司机`)}>查询</Button>
              <Button variant="outline" onClick={resetFilters}>重置</Button>
            </div>
            <div className="-my-1 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="ghost" size="xs" aria-label={`司机排序：${sortLabel}`} title={sortLabel}>
                    <ArrowDownUpIcon data-icon="inline-start" className={cn(sort !== "default" && "text-brand")} />{sortLabel}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-52">
                  <DropdownMenuGroup>
                    <DropdownMenuRadioGroup value={sort} onValueChange={(value) => setSort(value as DriverSort)}>
                      {driverSortOptions.map((option) => <DropdownMenuRadioItem key={option.value} value={option.value}>{option.label}</DropdownMenuRadioItem>)}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              <span>共 {visibleDrivers.length} 名司机</span>
            </div>
            <ScrollArea className="h-[40rem] rounded-lg">
              <div className="flex flex-col gap-2 pr-3">
                {visibleDrivers.map((driver) => (
                  <CompactDriverRow
                    key={driver.id}
                    driver={driver}
                    selected={driver.id === selectedDriverId}
                    onSelect={() => onSelectDriver(driver.id === selectedDriverId ? null : driver.id)}
                    onViewDetail={() => onViewDriver(driver.id)}
                  />
                ))}
                {visibleDrivers.length === 0 ? <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">暂无匹配司机</div> : null}
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="current-pickup"><CurrentPickupMonitor drivers={driverRows} /></TabsContent>
          <TabsContent value="next-pickup"><CurrentPickupMonitor drivers={driverRows} period="next" /></TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

function DriverSummary({ onQueryStatus }: { onQueryStatus: (status: DriverStatusFilter) => void }) {
  const items = [
    { label: "未开始派送", status: "not-started", value: driverRows.filter((driver) => driver.status === "未开始派送").length },
    { label: "30min 未派送", status: "30min", value: driverRows.filter((driver) => driver.status.startsWith("30min")).length },
    { label: "1h 未派送", status: "1h", value: driverRows.filter((driver) => driver.status.startsWith("1h")).length },
    { label: "2h 未派送", status: "2h", value: driverRows.filter((driver) => driver.status.startsWith("2h")).length },
  ] as const
  return (
    <div className="grid grid-cols-4 overflow-hidden rounded-lg border">
      {items.map((item) => <Button key={item.label} type="button" variant="ghost" className="h-auto min-w-0 cursor-pointer gap-3 rounded-none border-0 border-r border-border px-3 py-3 whitespace-normal last:border-r-0 hover:bg-brand-hover focus-visible:bg-brand-hover" aria-label={`查询${item.label}司机 ${item.value} 名`} onClick={() => onQueryStatus(item.status)}><span className="text-xs text-muted-foreground">{item.label}</span><span className="text-sm font-semibold tabular-nums text-destructive">{item.value}</span></Button>)}
    </div>
  )
}

function CompactDriverRow({ driver, selected, onSelect, onViewDetail }: { driver: DashboardDriverSnapshot; selected: boolean; onSelect: () => void; onViewDetail: () => void }) {
  const historyDue = Math.min(17, driver.total)
  const currentDue = Math.max(driver.total - historyDue, 0)
  const completed = driver.delivered + driver.exception
  const deliveredRate = driver.total ? (driver.delivered / driver.total) * 100 : 0
  const exceptionRate = driver.total ? (driver.exception / driver.total) * 100 : 0
  const pendingRate = driver.total ? (driver.pending / driver.total) * 100 : 0
  const completion = driver.total ? Math.round((completed / driver.total) * 100) : 0
  const hasIssueTags = Boolean(driver.locationIssues || driver.podIssues || driver.fakeIssues)

  return (
    <article
      id={`monitor-driver-${driver.id}`}
      aria-label={`${driver.name}派件监控`}
      className={cn(
        "relative flex min-w-0 flex-col gap-3 rounded-md border bg-card p-4 text-left transition-colors hover:bg-brand-hover",
        selected && "border-brand/30 bg-brand-selected"
      )}
    >
      <button type="button" aria-pressed={selected} aria-current={selected ? "true" : undefined} className="flex w-full min-w-0 flex-col gap-3 rounded-md text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50" onClick={onSelect}>
      <div className="grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 pr-10">
        <span className="flex h-7 w-[50px] min-w-[50px] items-center justify-center rounded-md bg-warning/15 px-2 font-heading [font-size:var(--button-font-size)] font-medium tabular-nums text-brand-ink">
          {driver.rating}★
        </span>
        <div className="flex min-w-0 items-center gap-2 overflow-hidden">
          <span className="max-w-28 shrink-0 truncate font-heading text-base font-medium">{driver.name}</span>
          <span
            className="flex min-w-0 flex-1 touch-pan-x items-center gap-2 overflow-x-auto overscroll-x-contain scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label={`${driver.name}路区列表`}
            title="横向滑动查看更多路区"
          >
            <DriverRouteBadges routes={driver.routeAssignments} />
          </span>
        </div>
        {driver.status !== "派送正常" ? (
          <Badge variant="destructive" className="h-[26px] rounded-[2.8px]">
            {driver.status}
            <ChevronRightIcon data-icon="inline-end" aria-hidden="true" />
          </Badge>
        ) : null}
      </div>

      <div className="grid min-w-0 gap-4 md:grid-cols-[8rem_auto_minmax(0,1fr)]">
        <div className="flex flex-col justify-center gap-3">
          <DriverInlineStat label="PPH-派送" value={driver.efficiency} />
          <DriverInlineStat label="派件时长" value={driver.activeHours} />
        </div>
        <span aria-hidden="true" className="h-full border-l border-dashed border-border" />
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1 text-xs">
            <span className="text-muted-foreground">应派件</span>
            <strong className="font-heading font-semibold tabular-nums">{driver.total}</strong>
            <span className="text-muted-foreground">=</span>
            <span className="text-muted-foreground">当期应派</span>
            <strong className="font-medium tabular-nums">{currentDue}</strong>
            <span className="text-muted-foreground">+</span>
            <span className="text-muted-foreground">历史未派</span>
            <strong className="font-medium tabular-nums">{historyDue}</strong>
            <span className="ml-auto text-xs tabular-nums text-muted-foreground">{completed}/{driver.total}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${driver.name}派件进度 ${completion}%`}>
              <span className="h-full bg-delivery-delivered" style={{ width: `${deliveredRate}%` }} />
              <span className="h-full bg-delivery-exception" style={{ width: `${exceptionRate}%` }} />
            </div>
            <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">{completion}%</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <DriverResultStat label="已签收" rate={deliveredRate} value={driver.delivered} tone="delivered" />
            <DriverResultStat label="派送异常" rate={exceptionRate} value={driver.exception} tone="exception" />
            <DriverResultStat label="待派件" rate={pendingRate} value={driver.pending} tone="muted" />
          </div>
        </div>
      </div>

      {hasIssueTags ? (
        <>
          <div aria-hidden="true" className="mx-4 border-t border-dashed border-border" />
          <div className="flex flex-wrap gap-2">
            {driver.locationIssues ? <Badge variant="destructive">妥投位置异常 {driver.locationIssues}</Badge> : null}
            {driver.podIssues ? <Badge variant="destructive">POD 不合规 {driver.podIssues}</Badge> : null}
            {driver.fakeIssues ? <Badge variant="destructive">虚假问题件 {driver.fakeIssues}</Badge> : null}
          </div>
        </>
      ) : null}
      </button>
      <TooltipProvider><Tooltip><TooltipTrigger asChild><Button type="button" variant="ghost" size="icon-sm" className="absolute top-4 right-4 border-0 bg-transparent" aria-label={`查看${driver.name}的派件地图详情`} onClick={onViewDetail}><ArrowUpRightIcon /></Button></TooltipTrigger><TooltipContent>查看派件地图详情</TooltipContent></Tooltip></TooltipProvider>
    </article>
  )
}

function DriverRouteBadges({ routes }: { routes: DriverRouteAssignment[] }) {
  return routes.map((route) => (
    <Badge
      key={route.name}
      variant="outline"
      className={cn(
        "shrink-0 rounded-sm bg-transparent font-medium",
        route.difficulty
          ? routeDifficultyClassNames[route.difficulty]
          : "border-border bg-muted text-muted-foreground"
      )}
    >
      {route.name}
      {route.difficulty ? ` · ${routeDifficultyLabels[route.difficulty]}` : null}
    </Badge>
  ))
}

function DriverInlineStat({ label, value }: { label: string; value: string | number }) {
  return <span className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-baseline gap-2"><span className="whitespace-nowrap text-xs text-muted-foreground">{label}</span><strong className="whitespace-nowrap text-xs font-medium tabular-nums">{value}</strong></span>
}

function DriverResultStat({ label, rate, value, tone }: {
  label: string
  rate: number
  value: number
  tone: "delivered" | "exception" | "muted"
}) {
  return (
    <span className="flex min-w-0 items-center gap-1 text-xs">
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          tone === "delivered" && "bg-delivery-delivered",
          tone === "exception" && "bg-delivery-exception",
          tone === "muted" && "bg-muted-foreground/40"
        )}
      />
      <span className="truncate text-muted-foreground">{label}</span>
      <span className="tabular-nums text-muted-foreground">{Math.round(rate)}%</span>
      <strong className="font-medium tabular-nums">{value}</strong>
    </span>
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
