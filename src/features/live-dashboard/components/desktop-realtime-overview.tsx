"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { ReactNode } from "react"
import type { EChartsOption } from "echarts"
import {
  ArrowRightIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  ChartNoAxesColumnIcon,
  ClipboardListIcon,
  PackageCheckIcon,
  SearchIcon,
  XIcon,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { EChartsChart } from "@/features/data-cockpit/components/echarts-chart"
import { DriverLiveMap } from "@/features/live-dashboard/components/driver-live-map"
import { CurrentPickupMonitor } from "@/features/live-dashboard/components/current-pickup-monitor"
import {
  createDeliveryDetailKey,
  type DeliveryDetailSource,
} from "@/features/live-dashboard/components/delivery-detail-view"
import {
  drivers,
  exceptionReasons,
  realtimeOverview,
  type DriverSnapshot,
  type MonitorView,
  type WorkMode,
} from "@/features/live-dashboard/mock-data"
import { cn } from "@/lib/utils"
import { formatDate, formatTime } from "@/lib/date-time"

type RouteDifficulty = "S" | "A" | "B" | "C" | "D"
type DriverRouteAssignment = { name: string; difficulty?: RouteDifficulty }
type DashboardDriverSnapshot = DriverSnapshot & { routeAssignments: DriverRouteAssignment[] }

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

const driverRows: DashboardDriverSnapshot[] = [
  {
    ...drivers[0], id: "DRV-VIVIAN-01", name: "Vivian Ho", route: "SLE-VE-01",
    routeAssignments: [{ name: "SLE-VE-01", difficulty: "S" }],
    status: "未开始派送", delivered: 0, pending: 131, exception: 0, total: 131,
    locationIssues: 0, podIssues: 0, fakeIssues: 0,
    efficiency: "0 件/h", activeHours: "0h", position: { left: "46%", top: "66%" },
  },
  {
    ...drivers[1], id: "DRV-VIVIAN-02", name: "Vivian Ho1", route: "SLE-VE-02",
    routeAssignments: [{ name: "SLE-VE-02", difficulty: "A" }],
    status: "1h 未派送", delivered: 118, pending: 49, exception: 0, total: 167,
    efficiency: "11.5 件/h", activeHours: "5h", position: { left: "59%", top: "37%" },
  },
  {
    ...drivers[2], id: "DRV-VIVIAN-03", name: "Vivian Ho2", route: "SLE-VE-03",
    routeAssignments: [
      { name: "SLE-VE-03", difficulty: "B" },
      { name: "SLE-VE-04", difficulty: "C" },
    ],
    status: "2h 未派送", delivered: 180, pending: 0, exception: 20, total: 200,
    efficiency: "16 件/h", activeHours: "8h", position: { left: "72%", top: "29%" },
  },
  {
    ...drivers[0], id: "DRV-VIVIAN-04", name: "Vivian Ho3", route: "SLE-VE-05",
    routeAssignments: [{ name: "SLE-VE-05", difficulty: "D" }],
    status: "1h 未派送", delivered: 142, pending: 38, exception: 7, total: 187,
    efficiency: "13.2 件/h", activeHours: "6h", position: { left: "48%", top: "48%" }, coordinates: "40.70980, -74.00210",
  },
  {
    ...drivers[1], id: "DRV-VIVIAN-05", name: "Fanlin Wu", route: "SLE-WU-03",
    routeAssignments: [{ name: "SLE-WU-03", difficulty: "C" }],
    status: "派送正常", delivered: 156, pending: 22, exception: 4, total: 182,
    efficiency: "15.8 件/h", activeHours: "6.5h", position: { left: "50%", top: "18%" }, coordinates: "40.72150, -74.00400",
  },
  {
    ...drivers[2], id: "DRV-VIVIAN-06", name: "Fanlin Wu3", route: "SLE-WU-04",
    routeAssignments: [
      { name: "SLE-WU-04" },
      { name: "SLE-WU-05" },
      { name: "SLE-WU-06" },
      { name: "SLE-WU-07" },
      { name: "SLE-WU-08" },
    ],
    status: "30min 未派送", delivered: 133, pending: 31, exception: 9, total: 173,
    efficiency: "14.7 件/h", activeHours: "5.8h", position: { left: "70%", top: "45%" }, coordinates: "40.71600, -73.99350",
  },
  {
    ...drivers[0], id: "DRV-ALICE-01", name: "Alice Chen", route: "SLE-CH-01",
    routeAssignments: [{ name: "SLE-CH-01", difficulty: "B" }],
    status: "30min 未派送", delivered: 150, pending: 30, exception: 10, total: 190,
    locationIssues: 0, podIssues: 1, fakeIssues: 1,
    efficiency: "15.2 件/h", activeHours: "6.2h", position: { left: "41%", top: "24%" }, coordinates: "40.72610, -74.01020",
  },
  {
    ...drivers[1], id: "DRV-MIKE-01", name: "Mike Liu", route: "SLE-LI-02",
    routeAssignments: [{ name: "SLE-LI-02", difficulty: "D" }],
    status: "1h 未派送", delivered: 120, pending: 35, exception: 5, total: 160,
    locationIssues: 1, podIssues: 0, fakeIssues: 0,
    efficiency: "13.8 件/h", activeHours: "5.4h", position: { left: "62%", top: "54%" }, coordinates: "40.70320, -73.99740",
  },
  {
    ...drivers[2], id: "DRV-SOPHIA-01", name: "Sophia Zhang", route: "SLE-ZH-03",
    routeAssignments: [
      { name: "SLE-ZH-03", difficulty: "A" },
      { name: "SLE-ZH-04", difficulty: "B" },
    ],
    status: "2h 未派送", delivered: 190, pending: 10, exception: 10, total: 210,
    locationIssues: 0, podIssues: 2, fakeIssues: 0,
    efficiency: "16.4 件/h", activeHours: "7.5h", position: { left: "78%", top: "35%" }, coordinates: "40.71880, -73.98620",
  },
  {
    ...drivers[0], id: "DRV-LEO-01", name: "Leo Wang", route: "SLE-WA-01",
    routeAssignments: [
      { name: "SLE-WA-01" },
      { name: "SLE-WA-02" },
      { name: "SLE-WA-03" },
      { name: "SLE-WA-04" },
    ],
    status: "30min 未派送", delivered: 140, pending: 27, exception: 8, total: 175,
    locationIssues: 0, podIssues: 0, fakeIssues: 2,
    efficiency: "14.1 件/h", activeHours: "5.9h", position: { left: "33%", top: "43%" }, coordinates: "40.71120, -74.01710",
  },
]

type OverviewCardId = "allocation" | "handoff" | "delivery" | "next-allocation"

type AlertActionItem = {
  label: string
  value: string
  urgent?: boolean
  info?: boolean
  bubble?: { label: string; value: string }
}

const alertGroups: Array<{ title: string; items: AlertActionItem[] }> = [
  {
    title: "妥投异常",
    items: [
      { label: "POD 不合规", value: "7", urgent: true },
      { label: "妥投位置异常", value: "7", urgent: true },
    ],
  },
  {
    title: "问题件",
    items: [
      { label: "待处理", value: "7", urgent: true, bubble: { label: "疑似丢失", value: "3" } },
      { label: "进行中", value: "7" },
      { label: "虚假签收", value: "7", info: true },
      { label: "DSP 轨迹断更", value: "7", info: true },
    ],
  },
]

export function DesktopRealtimeOverview({ mode, onDetail }: { mode: WorkMode; onDetail: (title: string) => void }) {
  const overviewRef = useRef<HTMLDivElement>(null)
  const alertRowRef = useRef<HTMLDivElement>(null)
  const [pinnedAlertBounds, setPinnedAlertBounds] = useState<{ left: number; width: number } | null>(null)
  const [isPinnedAlertCollapsed, setIsPinnedAlertCollapsed] = useState(false)
  const [expandedCard, setExpandedCard] = useState<OverviewCardId | null>(null)
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

  useEffect(() => {
    if (!expandedCard) return

    function closeExpandedCard(event: KeyboardEvent) {
      if (event.key === "Escape") setExpandedCard(null)
    }

    window.addEventListener("keydown", closeExpandedCard)
    return () => window.removeEventListener("keydown", closeExpandedCard)
  }, [expandedCard])

  return (
    <div ref={overviewRef} className="grid min-w-0 gap-3 xl:grid-cols-12">
      <Card size="sm" className="xl:col-span-12">
        <CardContent className="flex flex-col gap-4">
          <div className="grid items-stretch gap-3 md:grid-cols-3 xl:grid-cols-6">
            <CurrentAllocationCard
              className="md:order-1 md:col-span-1"
              expanded={expandedCard === "allocation"}
              onToggle={() => setExpandedCard((current) => current === "allocation" ? null : "allocation")}
              onDetail={onDetail}
            />
            <StationHandoffCard
              className="md:order-2 md:col-span-2"
              expanded={expandedCard === "handoff"}
              onToggle={() => setExpandedCard((current) => current === "handoff" ? null : "handoff")}
              onPickupDetail={() => onDetail("领件详情")}
              onReturnDetail={() => onDetail("应退回")}
            />
            <DeliveryOperationCard
              className="md:order-3 md:col-span-2"
              expanded={expandedCard === "delivery"}
              onToggle={() => setExpandedCard((current) => current === "delivery" ? null : "delivery")}
              onDetail={onDetail}
            />
            <NextAllocationCard
              className="md:order-4 md:col-span-1"
              mode={mode}
              expanded={expandedCard === "next-allocation"}
              onToggle={() => setExpandedCard((current) => current === "next-allocation" ? null : "next-allocation")}
            />
          </div>
          {expandedCard ? (
            <OverviewDetailPanel card={expandedCard} mode={mode} onDetail={onDetail} />
          ) : null}
        </CardContent>
      </Card>
      <div ref={alertRowRef} className="xl:col-span-7">
        <AlertActionPanel onDetail={onDetail} />
      </div>
      <div className="min-w-0 xl:col-span-5">
        <ExceptionDistribution option={exceptionOption} onDetail={onDetail} />
      </div>
      <div className="grid min-w-0 items-stretch gap-3 lg:grid-cols-[minmax(0,11fr)_minmax(0,9fr)] xl:col-span-12">
        <div className="min-w-0">
          <DriverMonitor selectedDriverId={selectedMapDriverId} onSelectDriver={setSelectedMapDriverId} />
        </div>
        <div className="min-w-0">
          <DriverMapPanel selectedDriverId={selectedMapDriverId} onSelectDriver={setSelectedMapDriverId} />
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

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value)
}

function KpiCardTitle({ order, title }: { order: number; title: string }) {
  return (
    <CardTitle className="flex items-center gap-2 whitespace-nowrap text-xs font-medium leading-5 text-muted-foreground/70">
      <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular-nums text-muted-foreground">
        {order}
      </span>
      <span>{title}</span>
    </CardTitle>
  )
}

function SummaryCard({ id, order, title, highlighted = false, className, expanded, onToggle, children }: {
  id: OverviewCardId
  order: number
  title: string
  highlighted?: boolean
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
        "relative h-48 min-w-0 cursor-pointer overflow-visible transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand/40",
        highlighted
          ? cn(
              "bg-card hover:bg-card",
              expanded ? "border-brand" : "border-border/80"
            )
          : "border-border/80 bg-muted/20 hover:bg-brand-hover",
        expanded && "border-brand bg-brand-selected hover:bg-brand-selected after:absolute after:-bottom-1.5 after:left-1/2 after:size-3 after:-translate-x-1/2 after:rotate-45 after:border-r after:border-b after:border-brand after:bg-brand-selected",
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
      <CardHeader className="relative z-10 block min-h-5 px-5 pr-12">
        <KpiCardTitle order={order} title={title} />
        <CardAction className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground">
          {expanded
            ? <ChevronUpIcon aria-hidden="true" strokeWidth={1} />
            : <ChevronRightIcon aria-hidden="true" strokeWidth={1} />}
        </CardAction>
      </CardHeader>
      <CardContent className="relative z-10 flex min-h-0 flex-1 flex-col gap-3 px-5">
        {children}
      </CardContent>
    </Card>
  )
}

function CurrentAllocationCard({ className, expanded, onToggle, onDetail }: { className?: string; expanded: boolean; onToggle: () => void; onDetail: (title: string) => void }) {
  const data = realtimeOverview.allocation
  return (
    <SummaryCard className={className} id="allocation" order={1} title="当期领件任务分配" expanded={expanded} onToggle={onToggle}>
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
      <div className="flex items-center gap-3">
        <Progress
          value={data.completionRate}
          className="h-1.5 flex-1 [&_[data-slot=progress-indicator]]:bg-allocation-assigned"
          aria-label={`分配完成率 ${data.completionRate}%`}
        />
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{data.completionRate}%</span>
      </div>
    </SummaryCard>
  )
}

function StationHandoffCard({ className, expanded, onToggle, onPickupDetail, onReturnDetail }: {
  className?: string
  expanded: boolean
  onToggle: () => void
  onPickupDetail: () => void
  onReturnDetail: () => void
}) {
  const data = realtimeOverview.handoff
  return (
    <SummaryCard className={className} id="handoff" order={2} title="站点交取件" expanded={expanded} onToggle={onToggle}>
      <div className="grid flex-1 grid-cols-[minmax(0,2fr)_minmax(6rem,1fr)] gap-2">
        <section aria-label="站点领件" className="grid min-w-0 grid-cols-2 items-start gap-4 rounded-lg bg-muted/60 px-3 py-2.5">
          <div className="flex min-w-0 flex-col">
            <p className="truncate text-kpi-label font-normal text-foreground">领件总量</p>
            <button
              type="button"
              className="-ml-1 mt-3 w-fit cursor-pointer rounded-sm px-1 font-heading text-kpi-primary font-medium tabular-nums text-foreground outline-none transition-colors hover:bg-brand-hover focus-visible:ring-1 focus-visible:ring-ring"
              aria-label={`查看领件详情，共 ${formatCount(data.actualPickup)} 件`}
              onClick={(event) => {
                event.stopPropagation()
                onPickupDetail()
              }}
            >
              {formatCount(data.actualPickup)}
            </button>
            <p className="mt-3 truncate text-xs text-muted-foreground">站点领件</p>
          </div>
          <div className="flex min-w-0 flex-col">
            <p className="truncate text-kpi-label font-normal text-foreground">未领件</p>
            <button
              type="button"
              className="-ml-1 mt-3 w-fit cursor-pointer rounded-sm px-1 font-heading text-kpi-primary font-medium tabular-nums text-destructive outline-none transition-colors hover:bg-brand-hover focus-visible:ring-1 focus-visible:ring-ring"
              aria-label={`查看未领件司机明细，共 ${formatCount(data.uncollected)} 件`}
              onClick={(event) => {
                event.stopPropagation()
                onPickupDetail()
              }}
            >
              {formatCount(data.uncollected)}
            </button>
          </div>
        </section>
        <section aria-label="退回站点" className="flex min-w-0 flex-col rounded-lg bg-muted/40 px-3 py-2.5">
          <p className="truncate text-kpi-label font-normal text-foreground">待退件</p>
          <button
            type="button"
            className="-ml-1 mt-3 w-fit cursor-pointer rounded-sm px-1 font-heading text-kpi-primary font-medium tabular-nums text-destructive outline-none transition-colors hover:bg-brand-hover focus-visible:ring-1 focus-visible:ring-ring"
            aria-label={`查看应退回详情，共 ${formatCount(data.pendingReturn)} 件`}
            onClick={(event) => {
              event.stopPropagation()
              onReturnDetail()
            }}
          >
            {formatCount(data.pendingReturn)}
          </button>
          <p className="mt-3 truncate text-xs text-muted-foreground">退回站点</p>
        </section>
      </div>
    </SummaryCard>
  )
}

function DeliveryOperationCard({ className, expanded, onToggle, onDetail }: { className?: string; expanded: boolean; onToggle: () => void; onDetail: (title: string) => void }) {
  const data = realtimeOverview.delivery
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

  return (
    <SummaryCard className={className} id="delivery" order={3} title="派件作业" highlighted expanded={expanded} onToggle={onToggle}>
      <div className="relative grid flex-1 -translate-y-0.5 grid-cols-[minmax(4rem,0.65fr)_minmax(8.5rem,1fr)_6rem] items-start gap-3 pt-3">
        <div className="min-w-0">
          <p className="text-kpi-label font-normal text-foreground">应派件</p>
          <button
            type="button"
            className="-ml-1 mt-3 w-fit cursor-pointer rounded-sm px-1 font-heading text-kpi-primary font-medium tabular-nums text-foreground outline-none transition-colors hover:bg-brand-hover focus-visible:ring-1 focus-visible:ring-ring"
            aria-label={`查看应派件司机明细，共 ${formatCount(data.total)} 件`}
            onClick={(event) => { event.stopPropagation(); onDetail(createDeliveryDetailKey("expected")) }}
          >
            {formatCount(data.total)}
          </button>
        </div>
        <dl className="flex min-w-0 flex-col gap-2">
          <div className="grid grid-cols-[auto_4.5rem_auto] items-center justify-start gap-2">
            <span className="size-2.5 rounded-full bg-border" aria-hidden="true" />
            <dt className="truncate text-sm text-foreground">待派件</dt>
            <dd><button type="button" className="rounded-sm px-1 font-heading text-xl font-medium tabular-nums text-destructive outline-none hover:bg-brand-hover focus-visible:ring-1 focus-visible:ring-ring" onClick={(event) => { event.stopPropagation(); onDetail(createDeliveryDetailKey("pending")) }}>{formatCount(data.pending)}</button></dd>
          </div>
          <div className="grid grid-cols-[auto_4.5rem_auto] items-center justify-start gap-2">
            <span className="size-2.5 rounded-full bg-delivery-delivered" aria-hidden="true" />
            <dt className="truncate text-sm text-foreground">已签收</dt>
            <dd><button type="button" className="rounded-sm px-1 font-heading text-xl font-medium tabular-nums text-muted-foreground outline-none hover:bg-brand-hover focus-visible:ring-1 focus-visible:ring-ring" onClick={(event) => { event.stopPropagation(); onDetail(createDeliveryDetailKey("delivered")) }}>{formatCount(data.delivered)}</button></dd>
          </div>
          <div className="grid grid-cols-[auto_4.5rem_auto] items-center justify-start gap-2">
            <span className="size-2.5 rounded-full bg-delivery-exception" aria-hidden="true" />
            <dt className="truncate text-sm text-foreground">派送异常</dt>
            <dd><button type="button" className="rounded-sm px-1 font-heading text-xl font-medium tabular-nums text-muted-foreground outline-none hover:bg-brand-hover focus-visible:ring-1 focus-visible:ring-ring" onClick={(event) => { event.stopPropagation(); onDetail(createDeliveryDetailKey("exception")) }}>{formatCount(data.exception)}</button></dd>
          </div>
        </dl>
        <div className="flex min-w-0 -translate-x-2 flex-col items-center">
          <div className="relative size-24 shrink-0">
            <EChartsChart
              option={clearanceOption}
              colors={["--delivery-delivered", "--delivery-exception", "--border"]}
              className="size-24 min-h-0"
              ariaLabel={`日清率 ${data.clearanceRate}%`}
            />
            <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0.5">
              <span className="font-heading text-sm font-medium tabular-nums text-foreground">{data.clearanceRate}%</span>
              <span className="text-xs text-muted-foreground">日清率</span>
            </span>
          </div>
        </div>
      </div>
    </SummaryCard>
  )
}

function NextAllocationCard({ className, mode, expanded, onToggle }: {
  className?: string
  mode: WorkMode
  expanded: boolean
  onToggle: () => void
}) {
  const data = realtimeOverview.nextAllocation
  const pushAt = data.pushAtByMode[mode]
  return (
    <SummaryCard
      className={className}
      id="next-allocation"
      order={4}
      title="下期领件任务"
      expanded={expanded}
      onToggle={onToggle}
    >
      <div className="flex min-h-0 flex-1 flex-col justify-center gap-3">
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
  onDetail: (title: string) => void
}) {
  const titles = {
    allocation: "当期领件任务分配",
    handoff: "站点交取件",
    delivery: "派件作业",
    "next-allocation": "下期领件任务",
  } as const

  return (
    <section id={`overview-detail-${card}`} className="overflow-hidden rounded-xl border border-brand bg-card" role="region" aria-label={titles[card]}>
      <div className="p-5">
        {card === "allocation" ? <AllocationDetail onDetail={onDetail} /> : null}
        {card === "handoff" ? <HandoffDetail onDetail={onDetail} /> : null}
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
      <section className="flex min-w-0 flex-col gap-5 py-2" aria-label="领件任务分配进度图">
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

function HandoffDetail({ onDetail }: { onDetail: (title: string) => void }) {
  const data = realtimeOverview.handoff
  const expectedPickup = realtimeOverview.allocation.expected
  const pickupAfterUncollected = expectedPickup - data.uncollected
  const pickupCompositionOption: EChartsOption = {
    animationDuration: 320,
    grid: { left: 12, right: 12, top: 36, bottom: 42 },
    tooltip: {
      trigger: "item",
    },
    xAxis: {
      type: "category",
      data: ["应领件", "未领件", "非当期任务领件", "领件总量"],
      axisTick: { show: false },
      axisLine: { show: true },
      axisLabel: {
        interval: 0,
        hideOverlap: false,
        fontSize: 11,
        lineHeight: 14,
        margin: 8,
        formatter: (value: string) => value === "非当期任务领件" ? "非当期任务\n领件" : value,
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
        name: "非当期任务领件",
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
    <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(20rem,1.08fr)_minmax(15rem,.8fr)]">
      <section className="flex min-w-0 flex-col gap-4 border-b pb-5 lg:border-r lg:border-b-0 lg:pr-5 lg:pb-0" aria-label="站点领件">
        <div className="flex items-center justify-between gap-4">
          <h4 className="font-heading text-sm font-semibold">站点领件</h4>
          <p className="text-xs text-muted-foreground">应领件 − 未领件 + 非当期任务领件 = 领件总量</p>
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
            ariaLabel={`站点领件构成：应领件 ${formatCount(expectedPickup)}，减未领件 ${formatCount(data.uncollected)}，加非当期任务领件 ${formatCount(data.nonCurrentPickup)}，等于领件总量 ${formatCount(data.actualPickup)}`}
          />
        </div>
        <div className="grid gap-y-6 sm:grid-cols-2 sm:gap-x-10">
          <HandoffMetricGroup
            label="领件总量"
            value={data.actualPickup}
            items={[
              { label: "当期任务领件", value: data.currentPickup },
              { label: "非当期任务领件", value: data.nonCurrentPickup },
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

      <section className="flex min-w-0 flex-col gap-4 border-b pb-5 lg:border-b-0 lg:pb-0" aria-label="退回站点">
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
      </section>

      <aside className="flex min-w-0 flex-col gap-4 rounded-lg border bg-muted/40 p-4" aria-label="指标说明">
        <Tabs defaultValue="pickup" className="gap-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pickup">站点领件</TabsTrigger>
            <TabsTrigger value="return">退回站点</TabsTrigger>
          </TabsList>
          <TabsContent
            value="pickup"
            className="max-h-56 min-h-24 overflow-y-auto pe-1"
          >
            <div className="flex flex-col gap-4">
              <p className="text-xs leading-5 text-muted-foreground">
                监控昨天 8:00 到今天 8:00 站点推送的应领件（包括 8:00
                后推送的需当日派送的包裹）的领件情况。
              </p>
              <dl className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <dt className="text-xs font-medium">应领件</dt>
                  <dd className="text-xs leading-5 text-muted-foreground">
                    昨天 8:00 到今日 8:00
                    站点推送需要司机领件的件量（包括 8:00
                    后推送的需当日派送的包裹）。
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
                    <dt className="text-xs font-medium">当期任务领件</dt>
                    <dd className="text-xs leading-5 text-muted-foreground">
                      应领件中已完成收件的快递。
                    </dd>
                  </div>
                </div>
              </dl>
              <div className="flex flex-col gap-3 border-t pt-3">
                <p className="text-xs font-medium">
                  领件总量 = 当期任务领件 + 非当期任务领件
                </p>
                <dl className="border-l pl-3">
                  <div className="flex flex-col gap-1">
                    <dt className="text-xs font-medium">非当期任务领件</dt>
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
  const normalIssues = scope === "all" ? data.normalIssues : Math.round(exception * data.normalIssues / data.exception)
  const fakeIssues = exception - normalIssues
  const deliveredRate = Number((delivered / scopeTotal * 100).toFixed(2))
  const pendingRate = Number((pending / scopeTotal * 100).toFixed(2))
  const exceptionRate = Number((exception / scopeTotal * 100).toFixed(2))
  const scopeLabel = scope === "all" ? "全部应派件" : scope === "current" ? "当期未派" : "历史未派"
  const openDeliveryDetail = (metric: "expected" | "pending" | "delivered" | "exception") => onDetail(createDeliveryDetailKey(metric, scope))

  return (
    <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(18rem,.9fr)_minmax(20rem,1fr)]">
      <section className="flex min-w-0 flex-col gap-4" aria-label="派件结果分布">
        <div className="mb-2 flex h-11 flex-wrap items-center gap-3">
          <h3 className="text-sm font-semibold text-foreground">派件结果分布</h3>
          <span className="text-xs text-muted-foreground">{scopeLabel}</span>
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

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">{scopeLabel} <button type="button" className="rounded-sm px-1 font-heading text-lg font-semibold tabular-nums text-warning outline-none hover:bg-brand-hover focus-visible:ring-1 focus-visible:ring-ring" onClick={() => openDeliveryDetail("expected")}>{formatCount(scopeTotal)}</button></span>
          <span aria-hidden="true">=</span>
          <span>已签收 <strong className="font-semibold tabular-nums text-foreground">{formatCount(delivered)}</strong></span>
          <span aria-hidden="true">+</span>
          <span>派送异常 <strong className="font-semibold tabular-nums text-foreground">{formatCount(exception)}</strong></span>
          <span aria-hidden="true">+</span>
          <span>待派件 <strong className="font-semibold tabular-nums text-foreground">{formatCount(pending)}</strong></span>
        </div>
      </section>

      <section className="flex min-w-0 flex-col gap-4" aria-label="派送异常分布">
        <Tabs className="mb-2 -translate-y-1" value={scope} onValueChange={(value) => setScope(value as DeliveryDetailSource)}>
          <TabsList variant="line" className="grid w-full grid-cols-3">
            <TabsTrigger value="all">全部应派件</TabsTrigger>
            <TabsTrigger value="current">当期未派</TabsTrigger>
            <TabsTrigger value="history">历史未派</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-col gap-4 xl:border-l xl:pl-6">
          <button type="button" className="flex items-baseline justify-between gap-4 text-left outline-none hover:text-brand focus-visible:ring-1 focus-visible:ring-ring" onClick={() => openDeliveryDetail("exception")}>
            <span className="text-sm text-muted-foreground">派送异常</span>
            <span className="flex items-baseline gap-2">
              <strong className="font-heading text-2xl font-semibold tabular-nums text-foreground">{formatCount(exception)}</strong>
              <span className="text-xs text-muted-foreground">件</span>
            </span>
          </button>

          <div className="ml-1 flex flex-col gap-3 border-l pl-4">
            <button type="button" className="flex items-center justify-between gap-4 text-left outline-none hover:text-brand focus-visible:ring-1 focus-visible:ring-ring" onClick={() => openDeliveryDetail("exception")}>
              <span className="text-sm text-muted-foreground">正常问题件</span>
              <strong className="font-semibold tabular-nums text-foreground">{formatCount(normalIssues)}</strong>
            </button>
            <button type="button" className="flex items-center justify-between gap-4 text-left outline-none hover:text-brand focus-visible:ring-1 focus-visible:ring-ring" onClick={() => openDeliveryDetail("exception")}>
              <span className="text-sm text-muted-foreground">虚假问题件</span>
              <strong className="font-semibold tabular-nums text-chart-2">{formatCount(fakeIssues)}</strong>
            </button>
          </div>

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

function DriverMonitor({ selectedDriverId, onSelectDriver }: { selectedDriverId: string | null; onSelectDriver: (driverId: string | null) => void }) {
  const [view, setView] = useState<MonitorView>("delivery")
  const [query, setQuery] = useState("")
  const [statusFilters, setStatusFilters] = useState<DriverStatusFilter[]>([])
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
  })
  function toggleStatusFilter(filter: DriverStatusFilter, checked: boolean) {
    setStatusFilters((current) => checked
      ? [...current, filter]
      : current.filter((value) => value !== filter))
  }

  function resetFilters() { setQuery(""); setStatusFilters([]); toast.success("筛选条件已重置") }

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
            <DriverSummary />
            <div className="grid gap-2 lg:grid-cols-[minmax(8rem,1fr)_minmax(10rem,1fr)_auto_auto]">
              <Field>
                <FieldLabel htmlFor="driver-search" className="sr-only">司机姓名</FieldLabel>
                <div className="relative">
                  <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="driver-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="请输入司机的名字" className="pl-9" />
                </div>
              </Field>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div
                    role="combobox"
                    tabIndex={0}
                    aria-label="异常状态筛选"
                    aria-controls="driver-status-filter-menu"
                    aria-expanded={false}
                    className="flex h-9 min-h-9 w-full cursor-pointer items-center gap-2 rounded-md border border-input bg-transparent px-3 py-1 text-sm outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
                  >
                    <span className="flex min-w-0 flex-1 flex-nowrap gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {statusFilters.length === 0 ? (
                        <span>全部异常状态</span>
                      ) : statusFilters.map((filter) => {
                        const option = driverStatusFilterOptions.find((item) => item.value === filter)
                        if (!option) return null
                        return (
                          <Badge key={filter} variant="secondary" className="shrink-0 gap-1 rounded-sm pr-1 font-normal">
                            {option.label}
                            <button
                              type="button"
                              className="rounded-sm text-brand hover:text-brand/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                              aria-label={`移除${option.label}筛选`}
                              onPointerDown={(event) => {
                                event.stopPropagation()
                              }}
                              onClick={(event) => {
                                event.preventDefault()
                                event.stopPropagation()
                                toggleStatusFilter(filter, false)
                              }}
                            >
                              <XIcon className="size-3" aria-hidden="true" />
                            </button>
                          </Badge>
                        )
                      })}
                    </span>
                    <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent id="driver-status-filter-menu" align="start">
                  {driverStatusFilterOptions.map((option) => {
                    const checked = statusFilters.includes(option.value)
                    return (
                      <DropdownMenuCheckboxItem
                        key={option.value}
                        checked={checked}
                        onCheckedChange={(nextChecked) => toggleStatusFilter(option.value, nextChecked === true)}
                        onSelect={(event) => event.preventDefault()}
                      >
                        {option.label}
                      </DropdownMenuCheckboxItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button onClick={() => toast.success(`查询到 ${visibleDrivers.length} 名司机`)}>查询</Button>
              <Button variant="outline" onClick={resetFilters}>重置</Button>
            </div>
            <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground"><span>排序：异常标签数量 → 派件进度</span><span>共 {visibleDrivers.length} 名司机</span></div>
            <ScrollArea className="h-[40rem] rounded-lg">
              <div className="flex flex-col gap-2 pr-3">
                {visibleDrivers.map((driver) => (
                  <CompactDriverRow
                    key={driver.id}
                    driver={driver}
                    selected={driver.id === selectedDriverId}
                    onSelect={() => onSelectDriver(driver.id === selectedDriverId ? null : driver.id)}
                  />
                ))}
                {visibleDrivers.length === 0 ? <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">暂无匹配司机</div> : null}
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="current-pickup"><CurrentPickupMonitor drivers={driverRows} /></TabsContent>
          <TabsContent value="next-pickup"><MonitorPlaceholder title="下期领件任务监控" value="未分配 218 件" /></TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

function DriverSummary() {
  const items = [
    { label: "未开始派送", value: driverRows.filter((driver) => driver.status === "未开始派送").length },
    { label: "30min 未派送", value: driverRows.filter((driver) => driver.status.startsWith("30min")).length },
    { label: "1h 未派送", value: driverRows.filter((driver) => driver.status.startsWith("1h")).length },
    { label: "2h 未派送", value: driverRows.filter((driver) => driver.status.startsWith("2h")).length },
  ]
  return (
    <div className="grid grid-cols-4 rounded-lg border">
      {items.map((item) => <button key={item.label} type="button" className="flex items-center justify-center gap-3 border-r px-3 py-3 last:border-r-0"><span className="text-xs text-muted-foreground">{item.label}</span><span className="font-semibold tabular-nums text-destructive">{item.value}</span></button>)}
    </div>
  )
}

function CompactDriverRow({ driver, selected, onSelect }: { driver: DashboardDriverSnapshot; selected: boolean; onSelect: () => void }) {
  const historyDue = Math.min(17, driver.total)
  const currentDue = Math.max(driver.total - historyDue, 0)
  const completed = driver.delivered + driver.exception
  const deliveredRate = driver.total ? (driver.delivered / driver.total) * 100 : 0
  const exceptionRate = driver.total ? (driver.exception / driver.total) * 100 : 0
  const pendingRate = driver.total ? (driver.pending / driver.total) * 100 : 0
  const completion = driver.total ? Math.round((completed / driver.total) * 100) : 0
  const hasIssueTags = Boolean(driver.locationIssues || driver.podIssues || driver.fakeIssues)

  return (
    <button
      id={`monitor-driver-${driver.id}`}
      type="button"
      aria-pressed={selected}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "relative flex min-w-0 flex-col gap-3 rounded-md border bg-card p-4 text-left transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50",
        selected && "border-brand/30 bg-brand-selected"
      )}
      onClick={onSelect}
    >
      <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
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

function MonitorPlaceholder({ title, value }: { title: string; value: string }) {
  return <div className="flex h-72 flex-col items-center justify-center gap-3 rounded-lg border bg-muted/30"><ClipboardListIcon className="size-10 text-muted-foreground" /><span className="font-heading font-semibold">{title}</span><Badge variant="secondary">{value}</Badge></div>
}

function hasNoDeliveryReminder(driver: DashboardDriverSnapshot) {
  return /(?:\d+h|\d+min|小时).*未派送/.test(driver.status)
}

function DriverMapWorkspace({ drivers: mapDrivers, compact = false }: { drivers: DashboardDriverSnapshot[]; compact?: boolean }) {
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null)

  return (
    <div className={cn("grid min-h-0 gap-4", compact ? "lg:grid-cols-[16rem_minmax(0,1fr)]" : "lg:grid-cols-[17rem_minmax(0,1fr)]")}>
      <aside className="flex min-h-0 flex-col rounded-lg border bg-card" aria-label="地图司机列表">
        <div className="flex items-center justify-between border-b px-3 py-2.5">
          <span className="text-sm font-medium">司机列表</span>
          <span className="text-xs text-muted-foreground">共 {mapDrivers.length} 名</span>
        </div>
        <ScrollArea className={compact ? "h-[32rem]" : "h-[28rem]"}>
          <div className="flex flex-col gap-1 p-2">
            {mapDrivers.map((driver) => {
              const selected = driver.id === selectedDriverId
              const needsAttention = hasNoDeliveryReminder(driver)
              return (
                <button
                  key={driver.id}
                  type="button"
                  aria-pressed={selected}
                  className={cn(
                    "flex flex-col gap-2 rounded-lg border border-transparent px-3 py-2.5 text-left outline-none transition-colors hover:bg-brand-hover focus-visible:ring-1 focus-visible:ring-ring",
                    selected && "border-brand/30 bg-brand-selected"
                  )}
                  onClick={() => setSelectedDriverId(selected ? null : driver.id)}
                >
                  <span className="flex w-full items-center gap-2">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">{driver.rating}★</span>
                    <span className={cn("min-w-0 flex-1 truncate text-sm font-medium", needsAttention ? "text-destructive" : "text-foreground")}>{driver.name}</span>
                    {needsAttention ? <Badge variant="destructive">{driver.status}</Badge> : null}
                  </span>
                  <span className="flex w-full items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span className="truncate">{driver.route}</span>
                    <span className="shrink-0 tabular-nums">{formatTime(driver.updatedAt)}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </ScrollArea>
      </aside>

      <div className={cn("relative overflow-hidden rounded-lg border", compact ? "h-[32rem]" : "h-[28rem]")}>
        <DriverLiveMap drivers={mapDrivers} selectedDriverId={selectedDriverId} onSelectDriver={setSelectedDriverId} />
      </div>
    </div>
  )
}

function DriverMapPanel({ selectedDriverId, onSelectDriver }: { selectedDriverId: string | null; onSelectDriver: (driverId: string | null) => void }) {
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailDriverId, setDetailDriverId] = useState("all")
  const detailDrivers = detailDriverId === "all" ? driverRows : driverRows.filter((driver) => driver.id === detailDriverId)

  return (
    <>
      <Card size="sm" className="h-full">
        <CardHeader>
          <CardTitle>派件地图监控</CardTitle>
          <CardAction>
            <Button variant="link" size="xs" onClick={() => { setDetailDriverId("all"); setDetailOpen(true) }}>详情<ArrowRightIcon data-icon="inline-end" /></Button>
          </CardAction>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1">
          <div className="relative min-h-[40rem] min-w-0 flex-1 overflow-hidden rounded-lg border">
            <DriverLiveMap drivers={driverRows} selectedDriverId={selectedDriverId} onSelectDriver={onSelectDriver} />
          </div>
        </CardContent>
      </Card>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[calc(100vh-2rem)] max-w-[calc(100vw-2rem)] gap-4 overflow-auto sm:max-w-[min(90rem,calc(100vw-2rem))]">
          <div>
            <DialogTitle>司机监控地图</DialogTitle>
            <DialogDescription>展示司机当前最新位置；地图不展示运单。</DialogDescription>
          </div>
          <Field className="w-full sm:max-w-xs">
            <FieldLabel htmlFor="map-detail-driver">司机</FieldLabel>
            <Select value={detailDriverId} onValueChange={setDetailDriverId}>
              <SelectTrigger id="map-detail-driver" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent><SelectGroup><SelectItem value="all">全部</SelectItem>{driverRows.map((driver) => <SelectItem key={driver.id} value={driver.id}>{driver.name}</SelectItem>)}</SelectGroup></SelectContent>
            </Select>
          </Field>
          <div className="min-h-0">
            <DriverMapWorkspace key={detailDriverId} drivers={detailDrivers} compact />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
