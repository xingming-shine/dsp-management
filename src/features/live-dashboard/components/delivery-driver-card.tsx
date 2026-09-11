"use client"

import { createContext, useContext, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction, type ReactNode, type PointerEvent as ReactPointerEvent } from "react"
import { ArrowUpRightIcon, CopyIcon } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { DriverDeliveryStatusBadge } from "./driver-delivery-status-badge"
import { AnimatedSegmentedProgress } from "./animated-segmented-progress"
import type { RouteDifficulty, DriverRouteAssignment, DashboardDriverSnapshot } from "../driver-rows"
import { monitorWaybills, summarizeWaybills, type WaybillAlert } from "../driver-monitor-data"
import { calculateDeliveryResultRates, type DeliveryResultRates } from "../delivery-result-metrics"
import { cn } from "@/lib/utils"

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

const routeDifficultyTextClassNames: Record<RouteDifficulty, string> = {
  S: "text-destructive",
  A: "text-destructive/80",
  B: "text-brand",
  C: "text-success",
  D: "text-success/70",
}

const DriverCardOverlayContext = createContext<{ active: string | null; setActive: Dispatch<SetStateAction<string | null>> } | null>(null)

export function DeliveryDriverCardGroup({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<string | null>(null)
  return <DriverCardOverlayContext.Provider value={{ active, setActive }}>{children}</DriverCardOverlayContext.Provider>
}

export function DeliveryDriverCard({ driver, selected, onSelect, onViewDetail, variant = "full" }: { driver: DashboardDriverSnapshot; selected: boolean; onSelect: () => void; onViewDetail: (alertType?: WaybillAlert) => void; variant?: "full" | "compact" }) {
  const groupOverlay = useContext(DriverCardOverlayContext)
  const [localOverlay, setLocalOverlay] = useState<string | null>(null)
  const activeOverlay = groupOverlay ? groupOverlay.active : localOverlay
  const setActiveOverlay = groupOverlay ? groupOverlay.setActive : setLocalOverlay
  const changeOverlay = (name: string, open: boolean) => {
    const key = `${driver.id}:${name}`
    setActiveOverlay((active) => open ? key : active === key ? null : active)
  }
  const contactOpen = activeOverlay === `${driver.id}:contact`
  const setContactOpen = (open: boolean) => changeOverlay("contact", open)
  const [draggingRoutes, setDraggingRoutes] = useState(false)
  const contactCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const routeDrag = useRef<{ pointerId: number; startX: number; scrollLeft: number; moved: boolean } | null>(null)
  const suppressRouteClick = useRef(false)
  const summary = useMemo(() => summarizeWaybills(monitorWaybills.filter((row) => row.driverId === driver.id)), [driver.id])
  const currentDue = summary.currentExpected
  const historyDue = summary.total - currentDue
  const pod2400Rate = summary.delivered2400Rate
  const completed = driver.delivered + driver.exception
  const driverRates = calculateDeliveryResultRates({ pending: driver.pending, delivered: driver.delivered, exception: driver.exception, nonstandard_return: driver.nonStandardReturn })
  const completion = driver.total ? (completed / driver.total) * 100 : 0
  const hasIssueTags = Boolean(driver.locationIssues || driver.podIssues || driver.fakeIssues)

  useEffect(() => () => {
    if (contactCloseTimer.current) clearTimeout(contactCloseTimer.current)
  }, [])

  const openContact = () => {
    if (contactCloseTimer.current) clearTimeout(contactCloseTimer.current)
    setContactOpen(true)
  }

  const scheduleContactClose = () => {
    if (contactCloseTimer.current) clearTimeout(contactCloseTimer.current)
    contactCloseTimer.current = setTimeout(() => setContactOpen(false), 150)
  }

  const copyPhone = async () => {
    try {
      await navigator.clipboard.writeText(driver.phone)
      toast.success(`${driver.name} 的手机号已复制`)
    } catch {
      toast.error("复制失败，请手动复制手机号")
    }
  }

  const startRouteDrag = (event: ReactPointerEvent<HTMLSpanElement>) => {
    if (event.pointerType === "touch" || event.button !== 0 || event.currentTarget.scrollWidth <= event.currentTarget.clientWidth) return
    routeDrag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      scrollLeft: event.currentTarget.scrollLeft,
      moved: false,
    }
    suppressRouteClick.current = false
    event.currentTarget.setPointerCapture(event.pointerId)
    setDraggingRoutes(true)
  }

  const moveRouteDrag = (event: ReactPointerEvent<HTMLSpanElement>) => {
    const drag = routeDrag.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const distance = event.clientX - drag.startX
    if (Math.abs(distance) > 3) drag.moved = true
    if (!drag.moved) return
    event.preventDefault()
    suppressRouteClick.current = true
    event.currentTarget.scrollLeft = drag.scrollLeft - distance
  }

  const finishRouteDrag = (event: ReactPointerEvent<HTMLSpanElement>) => {
    const drag = routeDrag.current
    if (!drag || drag.pointerId !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    routeDrag.current = null
    setDraggingRoutes(false)
  }

  const routeList = (
    <span
      className={cn("flex min-w-0 flex-1 touch-pan-x items-center gap-2 overflow-x-auto overscroll-x-contain select-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", variant === "compact" && "col-span-3 w-full", draggingRoutes ? "cursor-grabbing" : "cursor-grab")}
      aria-label={`${driver.name}路区列表`}
      title="按住并横向拖动查看更多路区"
      onPointerDown={startRouteDrag}
      onPointerMove={moveRouteDrag}
      onPointerUp={finishRouteDrag}
      onPointerCancel={finishRouteDrag}
      onLostPointerCapture={() => { routeDrag.current = null; setDraggingRoutes(false) }}
      onClick={(event) => {
        if (!suppressRouteClick.current) return
        event.preventDefault()
        event.stopPropagation()
        suppressRouteClick.current = false
      }}
    >
      <DriverRouteBadges routes={driver.routeAssignments} activeRoute={activeOverlay} overlayPrefix={`${driver.id}:route:`} onRouteOpenChange={(name, open) => changeOverlay(`route:${name}`, open)} />
    </span>
  )

  return (
    <Popover open={contactOpen} onOpenChange={setContactOpen}>
      <article
        id={`monitor-driver-${driver.id}`}
        aria-label={`${driver.name}派件监控`}
        data-variant={variant}
        className={cn(
          "@container/driver relative flex min-w-0 flex-col gap-3 rounded-md border bg-card p-4 text-left transition-colors hover:bg-brand-hover",
          selected && "border-brand/30 bg-brand-selected"
        )}
      >
      <button type="button" aria-pressed={selected} aria-current={selected ? "true" : undefined} className="flex w-full min-w-0 flex-col gap-3 rounded-md text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50" onFocus={openContact} onClick={() => { setContactOpen(false); onSelect() }}>
      <div className={cn("grid w-full min-w-0 items-center gap-3", variant === "compact" ? "grid-cols-[auto_minmax(0,1fr)_auto]" : "grid-cols-[auto_minmax(0,1fr)] @min-[600px]/driver:grid-cols-[auto_minmax(0,1fr)_auto] pr-10")}>
        <span className="flex h-7 w-[50px] min-w-[50px] items-center justify-center rounded-md bg-warning/15 px-2 font-heading [font-size:var(--button-font-size)] font-medium tabular-nums text-brand-ink">
          {driver.rating}★
        </span>
        <div className="flex min-w-0 items-center gap-2 overflow-hidden">
          <PopoverTrigger asChild>
            <span
              className="max-w-28 shrink-0 truncate font-heading text-base font-medium"
              onPointerEnter={openContact}
              onPointerLeave={scheduleContactClose}
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                openContact()
              }}
            >
              {driver.name}
            </span>
          </PopoverTrigger>
          {variant === "full" && routeList}
        </div>
        {driver.status !== "派送正常" ? (
          <DriverDeliveryStatusBadge
            status={driver.status}
            latestAction={driver.latestAction}
            latestActionAt={driver.latestActionAt}
            focusable={false}
            open={activeOverlay === `${driver.id}:status`}
            onOpenChange={(open) => changeOverlay("status", open)}
          />
        ) : null}
        {variant === "compact" && routeList}
      </div>

      <div className={cn("grid min-w-0 gap-y-4", variant === "full" && "@min-[600px]/driver:grid-cols-[max-content_auto_minmax(0,1fr)] @min-[600px]/driver:gap-x-3")}>
        {variant === "full" && <><div className="flex flex-wrap justify-between gap-3 @min-[600px]/driver:flex-col @min-[600px]/driver:justify-center">
          <DriverInlineStat label="PPH-派送" value={driver.efficiency} />
          <DriverInlineStat label="派件时长" value={driver.activeHours} />
        </div>
        <span aria-hidden="true" className="hidden h-full border-l border-dashed border-border @min-[600px]/driver:block" /></>}
        <div className="flex min-w-0 flex-col gap-2">
          {variant === "compact" ? <div className="min-w-0 overflow-x-auto" aria-label="应派件数量拆分与2400妥投率">
            <div className="grid w-max min-w-max grid-cols-[repeat(5,max-content)] items-end gap-2 text-xs">
              <DriverQuantityStat label="应派件" value={driver.total} />
              <span className="pb-1 text-sm text-muted-foreground">=</span>
              <div className="flex items-end gap-2">
                <DriverQuantityStat label="当期应派" value={currentDue} />
                <span className="relative ml-1 flex shrink-0 flex-col gap-1 rounded-sm border border-data-accent/40 bg-data-accent/10 px-2 py-1 before:absolute before:top-1/2 before:-left-1 before:size-2 before:-translate-y-1/2 before:rotate-45 before:border-b before:border-l before:border-data-accent/40 before:bg-data-accent/10" aria-label={`2400妥投率 ${pod2400Rate.toFixed(2)}%`}>
                  <span className="whitespace-nowrap text-muted-foreground">2400妥投率</span>
                  <strong className="text-sm font-semibold tabular-nums text-data-accent">{pod2400Rate.toFixed(2)}%</strong>
                </span>
              </div>
              <span className="pb-1 text-sm text-muted-foreground">+</span>
              <DriverQuantityStat label="历史未派" value={historyDue} />
            </div>
          </div> : <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1 text-xs">
            <span className="text-muted-foreground">应派件</span>
            <strong className="font-heading font-semibold tabular-nums">{driver.total}</strong>
            <span className="text-muted-foreground">=</span>
            <span className="text-muted-foreground">当期应派</span>
            <strong className="font-medium tabular-nums">{currentDue}</strong>
            <span
              className="relative ml-1 inline-flex h-7 shrink-0 items-center gap-1.5 rounded-sm border border-data-accent/40 bg-data-accent/10 px-2 font-medium text-foreground before:absolute before:top-1/2 before:-left-1 before:size-2 before:-translate-y-1/2 before:rotate-45 before:border-b before:border-l before:border-data-accent/40 before:bg-data-accent/10"
              aria-label={`2400妥投率 ${pod2400Rate.toFixed(2)}%`}
            >
              <span className="text-muted-foreground">2400妥投率</span>
              <span aria-hidden="true" className="h-3 w-px bg-data-accent/30" />
              <strong className="font-heading font-semibold tabular-nums text-data-accent">{pod2400Rate.toFixed(2)}%</strong>
            </span>
            <span className="text-muted-foreground">+</span>
            <span className="text-muted-foreground">历史未派</span>
            <strong className="font-medium tabular-nums">{historyDue}</strong>
            <span className="ml-auto text-xs tabular-nums text-muted-foreground">{completed}/{driver.total}</span>
          </div>}
          {variant === "full" && <div className="flex items-center gap-3">
            <AnimatedSegmentedProgress
              value={completion}
              ariaLabel={`${driver.name}日清进度 ${completion.toFixed(2)}%，非标退回 ${driver.nonStandardReturn} 件不计入日清`}
              className="h-2.5 min-w-0 flex-1"
              segments={[
                { className: "bg-delivery-delivered", value: driverRates.delivered },
                { className: "bg-delivery-exception", value: driverRates.exception },
                { className: "bg-delivery-nonstandard-return", value: driverRates.nonstandard_return },
              ]}
            />
            <span className="w-12 text-right text-xs tabular-nums text-muted-foreground">{completion.toFixed(2)}%</span>
          </div>}
          {variant === "full" && <div className="grid grid-cols-2 gap-3 @min-[600px]/driver:grid-cols-4">
            <DriverResultStat label="已签收" rate={driverRates.delivered} value={driver.delivered} tone="delivered" />
            <DriverResultStat label="派送异常" rate={driverRates.exception} value={driver.exception} tone="exception" />
            <DriverResultStat label="非标退回" rate={driverRates.nonstandard_return} value={driver.nonStandardReturn} tone="nonstandard" />
            <DriverResultStat label="待派件" rate={driverRates.pending} value={driver.pending} tone="muted" />
          </div>}
        </div>
      </div>

      </button>
      {variant === "compact" && <DriverClearanceTooltip driver={driver} completion={completion} rates={driverRates} open={activeOverlay === `${driver.id}:progress`} onOpenChange={(open) => changeOverlay("progress", open)} />}
      {hasIssueTags ? (
        <>
          <div aria-hidden="true" className="mx-4 border-t border-dashed border-border" />
          <div className="flex flex-wrap gap-2">
            {driver.locationIssues ? <Badge asChild variant="destructive"><button type="button" className="cursor-pointer hover:bg-destructive/20" onClick={() => onViewDetail("location")} aria-label={`查看${driver.name}的妥投位置异常运单`}>妥投位置异常 {driver.locationIssues}</button></Badge> : null}
            {driver.podIssues ? <Badge asChild variant="destructive"><button type="button" className="cursor-pointer hover:bg-destructive/20" onClick={() => onViewDetail("pod")} aria-label={`查看${driver.name}的POD不合规运单`}>POD 不合规 {driver.podIssues}</button></Badge> : null}
            {driver.fakeIssues ? <Badge asChild variant="destructive"><button type="button" className="cursor-pointer hover:bg-destructive/20" onClick={() => onViewDetail("fake")} aria-label={`查看${driver.name}的虚假问题件运单`}>虚假问题件 {driver.fakeIssues}</button></Badge> : null}
          </div>
        </>
      ) : null}
      {variant === "full" && <TooltipProvider><Tooltip><TooltipTrigger asChild><Button type="button" variant="ghost" size="icon-sm" className="absolute top-4 right-4 border-0 bg-transparent" aria-label={`查看${driver.name}的运单视图`} onClick={() => onViewDetail()}><ArrowUpRightIcon /></Button></TooltipTrigger><TooltipContent>查看运单视图</TooltipContent></Tooltip></TooltipProvider>}
      </article>
      <PopoverContent
        align="start"
        side="top"
        sideOffset={8}
        className="w-72 max-w-[calc(100vw-2rem)] gap-3 p-3"
        aria-label={`${driver.name}的联系方式`}
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => {
          if (activeOverlay && activeOverlay !== `${driver.id}:contact`) event.preventDefault()
        }}
        onPointerEnter={openContact}
        onPointerLeave={scheduleContactClose}
      >
        <PopoverHeader>
          <PopoverTitle>司机联系方式</PopoverTitle>
          <PopoverDescription>{driver.name}</PopoverDescription>
        </PopoverHeader>
        <div className="grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-2 text-xs">
          <span className="text-muted-foreground">手机号</span>
          <span className="truncate font-medium tabular-nums">{driver.phone || "暂无手机号"}</span>
          <Button type="button" variant="outline" size="sm" disabled={!driver.phone} onClick={copyPhone} aria-label={`复制${driver.name}的手机号`}>
            <CopyIcon data-icon="inline-start" />复制
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function DriverQuantityStat({ label, value }: { label: string; value: number }) {
  return <span className="flex shrink-0 flex-col gap-1 py-1"><span className="whitespace-nowrap text-muted-foreground">{label}</span><strong className="text-sm font-medium tabular-nums">{value}</strong></span>
}

function DriverClearanceTooltip({ driver, completion, rates, open, onOpenChange }: {
  driver: DashboardDriverSnapshot
  completion: number
  rates: DeliveryResultRates
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const completed = driver.delivered + driver.exception
  const results = [
    { label: "已签收", count: driver.delivered, rate: rates.delivered, color: "bg-delivery-delivered" },
    { label: "派送异常", count: driver.exception, rate: rates.exception, color: "bg-delivery-exception" },
    { label: "非标退回", count: driver.nonStandardReturn, rate: rates.nonstandard_return, color: "bg-delivery-nonstandard-return" },
    { label: "待派件", count: driver.pending, rate: rates.pending, color: "bg-chart-2" },
  ]
  return <TooltipProvider><Tooltip open={open} onOpenChange={onOpenChange}>
    <TooltipTrigger asChild>
      <button type="button" className="-mt-1 flex w-full items-center gap-3 rounded-sm text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50" aria-label={`查看${driver.name}的日清进度明细，${completion.toFixed(2)}%，${completed} / ${driver.total} 件`} onClick={(event) => { event.preventDefault(); event.stopPropagation(); onOpenChange(!open) }}>
        <AnimatedSegmentedProgress value={completion} ariaLabel={`${driver.name}日清进度 ${completion.toFixed(2)}%，非标退回 ${driver.nonStandardReturn} 件不计入日清`} className="h-2.5 min-w-0 flex-1" segments={[{ className: "bg-delivery-delivered", value: rates.delivered }, { className: "bg-delivery-exception", value: rates.exception }, { className: "bg-delivery-nonstandard-return", value: rates.nonstandard_return }]} />
        <span className="flex shrink-0 items-center gap-2 whitespace-nowrap text-xs tabular-nums text-muted-foreground"><span>{completed}/{driver.total}</span><span>{completion.toFixed(2)}%</span></span>
      </button>
    </TooltipTrigger>
    <TooltipContent variant="complex">
      <div className="flex flex-col gap-1">
        <span className="[font-size:var(--button-font-size)] font-medium">日清进度：{completion.toFixed(2)}%</span>
        <span className="text-muted-foreground">{driver.name} · <span className="tabular-nums">{completed} / {driver.total}</span> 件</span>
      </div>
      <Separator />
      <div className="grid grid-cols-[minmax(0,1fr)_max-content_max-content] gap-x-4 gap-y-1">
        <span className="text-muted-foreground">派件状态</span><span className="text-muted-foreground">件量</span><span className="text-muted-foreground">占应派件比例</span>
        {results.map((result) => <div key={result.label} className="contents"><span className="flex items-center gap-1.5"><i aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", result.color)} />{result.label}</span><span className="tabular-nums">{result.count}</span><span className="tabular-nums">{result.rate.toFixed(2)}%</span></div>)}
      </div>
      <Separator />
      <div className="flex flex-col gap-1 text-muted-foreground">
        <span>日清率 =（已签收 + 派送异常）÷ 应派件</span>
      </div>
    </TooltipContent>
  </Tooltip></TooltipProvider>
}

export function DriverRouteBadges({ routes, focusable = false, presentation = "badge", activeRoute, overlayPrefix, onRouteOpenChange }: { routes: DriverRouteAssignment[]; focusable?: boolean; presentation?: "badge" | "text"; activeRoute?: string | null; overlayPrefix?: string; onRouteOpenChange?: (name: string, open: boolean) => void }) {
  return (
    <TooltipProvider>
      {routes.map((route) => (
        <Tooltip key={route.name} open={onRouteOpenChange ? activeRoute === `${overlayPrefix}${route.name}` : undefined} onOpenChange={(open) => onRouteOpenChange?.(route.name, open)}>
          <TooltipTrigger asChild>
            {presentation === "text" ? <span tabIndex={focusable ? 0 : undefined} className="shrink-0 rounded-sm outline-none focus-visible:ring-1 focus-visible:ring-ring">{route.name}</span> : <Badge
              variant="outline"
              tabIndex={focusable ? 0 : undefined}
              className={cn(
                "shrink-0 rounded-sm bg-transparent font-medium",
                route.difficulty
                  ? routeDifficultyClassNames[route.difficulty]
                  : "border-border bg-muted text-muted-foreground"
              )}
            >
              {route.name}
              {route.difficulty ? ` · ${routeDifficultyLabels[route.difficulty]}` : null}
            </Badge>}
          </TooltipTrigger>
          <TooltipContent variant="complex" aria-label={`${route.name}路区信息`}>
            <div className="flex items-center gap-2 [font-size:var(--button-font-size)] font-medium">
              <span>路区信息</span>
              <span className="font-semibold">{route.name}</span>
            </div>
            <Separator />
            <dl className="grid grid-cols-[4.75rem_minmax(0,1fr)] gap-x-2.5 gap-y-1">
              <dt className="text-muted-foreground">难易度</dt><dd className={route.difficulty ? routeDifficultyTextClassNames[route.difficulty] : undefined}>{route.difficulty ? routeDifficultyLabels[route.difficulty] : "—"}</dd>
              <dt className="text-muted-foreground">安全度</dt><dd>{route.safety}</dd>
              <dt className="text-muted-foreground">派送异常率</dt><dd className="tabular-nums">{route.deliveryExceptionRate}</dd>
              <dt className="text-muted-foreground">DNR率</dt><dd className="tabular-nums">{route.dnrRate}</dd>
              <dt className="text-muted-foreground">PPH（派送）</dt><dd className="tabular-nums">{route.deliveryPph}</dd>
            </dl>
          </TooltipContent>
        </Tooltip>
      ))}
    </TooltipProvider>
  )
}

function DriverInlineStat({ label, value }: { label: string; value: string | number }) {
  return <span className="grid grid-cols-[4rem_max-content] items-baseline gap-1"><span className="whitespace-nowrap text-xs text-muted-foreground">{label}</span><strong className="whitespace-nowrap text-xs font-medium tabular-nums">{value}</strong></span>
}

function DriverResultStat({ label, rate, value, tone }: {
  label: string
  rate?: number
  value: number
  tone: "delivered" | "exception" | "nonstandard" | "muted"
}) {
  return (
    <span className="flex min-w-0 items-center gap-1 text-xs">
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          tone === "delivered" && "bg-delivery-delivered",
          tone === "exception" && "bg-delivery-exception",
          tone === "nonstandard" && "bg-delivery-nonstandard-return",
          tone === "muted" && "bg-muted-foreground/40"
        )}
      />
      <span className="truncate text-muted-foreground">{label}</span>
      {rate !== undefined && <span className="tabular-nums text-muted-foreground">{rate.toFixed(2)}%</span>}
      <strong className="font-medium tabular-nums">{value}</strong>
    </span>
  )
}
