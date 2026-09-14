"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ArrowDownUpIcon, ArrowLeftIcon, ListIcon, MapIcon, PackageSearchIcon } from "lucide-react"
import { toast } from "sonner"
import type { EChartsOption } from "echarts"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EChartsChart } from "@/features/data-cockpit/components/echarts-chart"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty"
import { DeliveryTaskMap } from "@/features/live-dashboard/components/delivery-task-map"
import { DriverDeliveryStatusBadge } from "@/features/live-dashboard/components/driver-delivery-status-badge"
import { StatusMultiSelect } from "@/features/live-dashboard/components/status-multi-select"
import { MonitorWaybillCard, MonitorWaybillOverlay } from "@/features/live-dashboard/components/monitor-waybill-card"
import { DeliveryDriverFilters, useDeliveryDriverFilters } from "./delivery-driver-filters"
import { DeliveryDriverCard, DeliveryDriverCardGroup } from "./delivery-driver-card"
import { WaybillPodMedia } from "./waybill-pod-media"
import { monitorDrivers, monitorWaybills, summarizeWaybills, statusLabels, alertLabels, emptyMonitorQuery, filterMonitorWaybills, waybillCoordinate, type DeliveryStatus, type MonitorQuery, type MonitorSort, type MonitorWaybill, type WaybillAlert } from "@/features/live-dashboard/driver-monitor-data"
import { cn } from "@/lib/utils"

const sortOptions = [
  ["sequence", "默认排序"], ["overdue-desc", "超期天数从高到低"], ["overdue-asc", "超期天数从低到高"], ["signed-asc", "妥投时间升序"], ["signed-desc", "妥投时间降序"],
]

const rateRingColors = [["--chart-1", "--muted"]]
const clearanceRingColors = [["--chart-2", "--muted"]]
const waybillBatchSize = 20
type MonitorViewMode = "waybill" | "map"

function MonitorRateRing({ value, label, isClearance = false }: { value: number; label: string; isClearance?: boolean }) {
  const rate = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0
  const option = useMemo<EChartsOption>(() => {
    return {
      animation: false,
      tooltip: { show: false },
      series: [{
        type: "pie", radius: ["82%", "96%"], startAngle: 90, clockwise: true,
        silent: true, label: { show: false }, labelLine: { show: false },
        emphasis: { disabled: true },
        data: [{ value: rate, name: "已完成" }, { value: 100 - rate, name: "剩余" }],
      }],
    }
  }, [rate])
  return <div className="flex w-20 shrink-0 flex-col items-center">
    <div className="relative size-14">
      <EChartsChart option={option} dataColors={isClearance ? clearanceRingColors : rateRingColors} className="size-full min-h-0" ariaLabel={`${label} ${rate.toFixed(2)}%`} />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
        <strong className="whitespace-nowrap text-xs font-medium tabular-nums">{rate.toFixed(2)}%</strong>
      </div>
    </div>
    <span className="whitespace-nowrap text-xs text-muted-foreground" aria-hidden="true">{label}</span>
  </div>
}

function MonitorSelect({ label, value, options, onChange, className }: { label: string; value: string; options: string[][]; onChange: (value: string) => void; className?: string }) {
  return <Select value={value} onValueChange={onChange}><SelectTrigger aria-label={label} className={cn("w-full", className)}><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{options.map(([id, text]) => <SelectItem key={id} value={id}>{text}</SelectItem>)}</SelectGroup></SelectContent></Select>
}

function MonitorAlertSelect({ value, onChange }: { value: WaybillAlert[]; onChange: (value: WaybillAlert[]) => void }) {
  const options = Object.keys(alertLabels) as WaybillAlert[]
  return <StatusMultiSelect
    id="monitor-alert-filter"
    ariaLabel="异常状态"
    options={options}
    value={value}
    getOptionLabel={(option) => alertLabels[option]}
    maxVisible={1}
    onValueChange={onChange}
  />
}

export function DriverMonitorDetailView({ onBack, initialDriverId, initialAlertType, initialDeliveryStatus, initialViewMode }: { onBack: () => void; initialDriverId?: string | null; initialAlertType?: WaybillAlert | null; initialDeliveryStatus?: DeliveryStatus | null; initialViewMode?: MonitorViewMode }) {
  const initialDriver = monitorDrivers.some((driver) => driver.id === initialDriverId) ? initialDriverId! : "all"
  const initialQuery: MonitorQuery = {
    ...emptyMonitorQuery,
    status: initialDeliveryStatus ?? (initialAlertType === "fake" ? "exception" : initialAlertType ? "delivered" : "all"),
    alerts: initialAlertType ? [initialAlertType] : [],
  }
  const [driverId, setDriverId] = useState(initialDriver)
  const [draft, setDraft] = useState<MonitorQuery>(initialQuery)
  const [query, setQuery] = useState<MonitorQuery>(initialQuery)
  const [addressMatches, setAddressMatches] = useState<string[] | null>(null)
  const [sort, setSort] = useState<MonitorSort>("sequence")
  const sortLabel = sortOptions.find(([value]) => value === sort)![1]
  const [visibleCount, setVisibleCount] = useState(waybillBatchSize)
  const [showWaybills, setShowWaybills] = useState(initialDriver !== "all")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [focusRequest, setFocusRequest] = useState<{ id: string; revision: number } | null>(null)
  const [mobileView, setMobileView] = useState("list")
  const startingViewMode = initialViewMode ?? (initialAlertType ? "waybill" : "map")
  const [viewMode, setViewMode] = useState<MonitorViewMode>(startingViewMode)
  const [mapMounted, setMapMounted] = useState(startingViewMode === "map")
  const driverFilters = useDeliveryDriverFilters(monitorDrivers)
  const driverScrollRef = useRef<HTMLDivElement>(null)
  const [dialog, setDialog] = useState<{ row: MonitorWaybill; tab: "details" | "pod"; photoId?: string } | null>(null)
  const [addresses, setAddresses] = useState<Record<string, string>>({})
  const [addressBusy, setAddressBusy] = useState<string[]>([])
  const [queryBusy, setQueryBusy] = useState(false)
  const addressRequests = useRef(new Map<string, AbortController>())
  const queryRequest = useRef<AbortController | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const markerSelection = useRef(false)
  const viewScroll = useRef<Partial<Record<MonitorViewMode, { top: number; selectedId: string | null }>>>({})
  const restoreViewScroll = useRef(false)

  const scopedDrivers = useMemo(() => driverId === "all" ? monitorDrivers : monitorDrivers.filter((driver) => driver.id === driverId), [driverId])
  const scopedRows = useMemo(() => driverId === "all" ? monitorWaybills : monitorWaybills.filter((row) => row.driverId === driverId), [driverId])
  const summary = useMemo(() => summarizeWaybills(scopedRows), [scopedRows])
  const filtered = useMemo(() => filterMonitorWaybills(scopedRows, query, addressMatches, sort), [scopedRows, query, addressMatches, sort])
  const visibleRows = filtered.slice(0, visibleCount)
  const selectedDriver = driverId === "all" ? null : scopedDrivers[0]
  const matchingDrivers = driverFilters.visibleDrivers

  useEffect(() => {
    if (!restoreViewScroll.current) return
    const frame = requestAnimationFrame(() => {
      const list = scrollRef.current
      if (!list) return
      const saved = viewScroll.current[viewMode]
      const card = selectedId ? document.getElementById(`map-waybill-${selectedId}`) : null
      list.scrollTop = card && saved?.selectedId !== selectedId
        ? list.scrollTop + card.getBoundingClientRect().top - list.getBoundingClientRect().top - 8
        : saved?.top ?? 0
      restoreViewScroll.current = false
    })
    return () => cancelAnimationFrame(frame)
  }, [viewMode, selectedId])

  function changeViewMode(nextMode: MonitorViewMode) {
    if (nextMode === viewMode) return
    viewScroll.current[viewMode] = { top: scrollRef.current?.scrollTop ?? 0, selectedId }
    restoreViewScroll.current = true
    if (nextMode === "map") {
      setMapMounted(true)
      if (selectedId && showWaybills && driverId !== "all" && viewScroll.current.map?.selectedId !== selectedId) {
        setFocusRequest((current) => ({ id: selectedId, revision: (current?.revision ?? 0) + 1 }))
      }
    }
    setViewMode(nextMode)
    setMobileView("list")
  }

  useEffect(() => {
    const root = scrollRef.current
    const sentinel = loadMoreRef.current
    if (!root || !sentinel || visibleCount >= filtered.length) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setVisibleCount((current) => Math.min(current + waybillBatchSize, filtered.length))
    }, { root, rootMargin: "0px 0px 240px 0px" })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [filtered.length, visibleCount, mobileView, viewMode])

  useEffect(() => {
    const requests = addressRequests.current
    return () => { requests.forEach((controller) => controller.abort()); queryRequest.current?.abort() }
  }, [])

  useEffect(() => {
    if (!markerSelection.current || !selectedId) return
    const frame = requestAnimationFrame(() => {
      const card = document.getElementById(`map-waybill-${selectedId}`)
      const list = scrollRef.current
      if (card && list) {
        list.scrollTo({ top: list.scrollTop + card.getBoundingClientRect().top - list.getBoundingClientRect().top - 8, behavior: "smooth" })
        card.focus({ preventScroll: true })
      }
      markerSelection.current = false
    })
    return () => cancelAnimationFrame(frame)
  }, [visibleCount, selectedId, mobileView])

  function clearSelection() { setSelectedId(null); setFocusRequest(null); markerSelection.current = false; viewScroll.current = {}; setVisibleCount(waybillBatchSize); scrollRef.current?.scrollTo({ top: 0 }) }

  function changeDriver(nextId: string) {
    if (nextId === driverId) { setMobileView("list"); return }
    const url = new URL(window.location.href)
    if (nextId === "all") url.searchParams.delete("driverId")
    else url.searchParams.set("driverId", nextId)
    window.history.replaceState({}, "", url)
    queryRequest.current?.abort()
    addressRequests.current.forEach((controller) => controller.abort())
    addressRequests.current.clear()
    setAddressBusy([]); setQueryBusy(false); setAddresses({})
    setDriverId(nextId); setShowWaybills(nextId !== "all"); setMobileView("list"); clearSelection()
  }

  function syncAlertType(alerts: WaybillAlert[]) {
    const url = new URL(window.location.href)
    if (alerts.length === 1) url.searchParams.set("alertType", alerts[0])
    else url.searchParams.delete("alertType")
    window.history.replaceState({}, "", url)
  }

  function syncDeliveryStatus(status: MonitorQuery["status"]) {
    const url = new URL(window.location.href)
    if (status === "all") url.searchParams.delete("deliveryStatus")
    else url.searchParams.set("deliveryStatus", status)
    window.history.replaceState({}, "", url)
  }

  function toggleWaybills(show: boolean) {
    if (show && driverId === "all") {
      toast.info("请先选择单个司机，再显示运单位置。", { id: "monitor-waybill-layer" })
      return
    }
    setShowWaybills(show)
    setFocusRequest(null)
  }

  async function submitQuery() {
    queryRequest.current?.abort()
    const controller = new AbortController()
    queryRequest.current = controller
    const submitted = { ...draft, alerts: [...draft.alerts], keyword: draft.keyword.trim() }
    setQueryBusy(true)
    try {
      let matches: string[] | null = null
      if (submitted.field === "address" && submitted.keyword) {
        const response = await fetch(`/api/live-dashboard/waybills/address-search?q=${encodeURIComponent(submitted.keyword)}`, { signal: controller.signal, cache: "no-store" })
        if (!response.ok) throw new Error("地址查询失败，请重试")
        matches = (await response.json()).ids
      }
      if (controller.signal.aborted) return
      setAddressMatches(matches); setQuery(submitted); syncAlertType(submitted.alerts); syncDeliveryStatus(submitted.status); clearSelection()
    } catch (error) {
      if (!controller.signal.aborted) toast.error(error instanceof Error ? error.message : "查询失败")
    } finally { if (!controller.signal.aborted) setQueryBusy(false) }
  }

  function resetQuery() {
    queryRequest.current?.abort(); setQueryBusy(false)
    setDraft(emptyMonitorQuery); setQuery(emptyMonitorQuery); setAddressMatches(null); setSort("sequence"); syncAlertType([]); syncDeliveryStatus("all"); clearSelection()
  }

  async function toggleAddress(id: string) {
    if (addresses[id]) { setAddresses((current) => { const next = { ...current }; delete next[id]; return next }); return }
    if (addressRequests.current.has(id)) return
    const controller = new AbortController()
    addressRequests.current.set(id, controller)
    setAddressBusy((current) => [...current, id])
    try {
      const response = await fetch(`/api/live-dashboard/waybills/${encodeURIComponent(id)}/address`, { signal: controller.signal, cache: "no-store" })
      if (!response.ok) throw new Error("地址解密失败，请重试")
      const result = await response.json()
      if (!controller.signal.aborted) setAddresses((current) => ({ ...current, [id]: result.address }))
    } catch (error) {
      if (!controller.signal.aborted) toast.error(error instanceof Error ? error.message : "地址解密失败")
    } finally {
      if (addressRequests.current.get(id) === controller) { addressRequests.current.delete(id); setAddressBusy((current) => current.filter((item) => item !== id)) }
    }
  }

  const selectMarker = useCallback((id: string) => {
    const index = filtered.findIndex((row) => row.id === id)
    if (index < 0) return
    markerSelection.current = true
    setSelectedId(id); setVisibleCount((current) => Math.max(current, Math.ceil((index + 1) / waybillBatchSize) * waybillBatchSize)); setMobileView("list")
    // Repeated clicks on the same marker still scroll the already-rendered card into view.
    requestAnimationFrame(() => { const card = document.getElementById(`map-waybill-${id}`); const list = scrollRef.current; if (card && list) list.scrollTo({ top: list.scrollTop + card.getBoundingClientRect().top - list.getBoundingClientRect().top - 8, behavior: "smooth" }) })
  }, [filtered])

  function selectCard(row: MonitorWaybill) {
    setSelectedId(row.id)
    if (viewMode === "map" && showWaybills && driverId !== "all") {
      if (!waybillCoordinate(row)) { toast.info("该运单暂无有效坐标"); return }
      setFocusRequest((current) => ({ id: row.id, revision: (current?.revision ?? 0) + 1 }))
    }
  }

  function viewDriverDetail(nextId: string, alertType?: WaybillAlert) {
    changeDriver(nextId)
    if (!alertType) { changeViewMode("map"); setMobileView("map"); return }
    const status: DeliveryStatus = alertType === "fake" ? "exception" : "delivered"
    const nextQuery: MonitorQuery = { ...emptyMonitorQuery, status, alerts: [alertType] }
    queryRequest.current?.abort()
    setQueryBusy(false)
    setDraft(nextQuery); setQuery(nextQuery); setAddressMatches(null); syncAlertType(nextQuery.alerts); syncDeliveryStatus(nextQuery.status); clearSelection()
    changeViewMode("waybill")
  }

  function applySummaryFilter(status: MonitorQuery["status"], alert?: WaybillAlert) {
    const nextQuery: MonitorQuery = { ...emptyMonitorQuery, status, alerts: alert ? [alert] : [] }
    queryRequest.current?.abort()
    setQueryBusy(false)
    setDraft(nextQuery)
    setQuery(nextQuery)
    setAddressMatches(null)
    syncAlertType(nextQuery.alerts)
    syncDeliveryStatus(nextQuery.status)
    clearSelection()
  }

  function summaryFilterActive(status: MonitorQuery["status"], alert?: WaybillAlert) {
    return query.keyword === "" && query.status === status && (alert ? query.alerts.length === 1 && query.alerts[0] === alert : query.alerts.length === 0)
  }

  return <div className="delivery-monitor-page flex min-w-0 flex-col gap-3" data-testid="driver-monitor-detail">
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3"><Button variant="outline" size="sm" onClick={onBack}><ArrowLeftIcon data-icon="inline-start" />返回</Button><h1 className="min-w-0 break-words text-xl font-semibold">司机监控{selectedDriver ? ` - ${selectedDriver.name}` : ""}</h1></div>
      <div className="flex flex-wrap items-center gap-2"><ToggleGroup type="single" variant="outline" value={viewMode} onValueChange={(value) => { if (value) changeViewMode(value as MonitorViewMode) }} aria-label="司机监控视图"><ToggleGroupItem value="waybill"><ListIcon />运单视图</ToggleGroupItem><ToggleGroupItem value="map"><MapIcon />地图视图</ToggleGroupItem></ToggleGroup>{viewMode === "map" && <Field orientation="horizontal" className="w-auto"><FieldLabel htmlFor="monitor-map-driver">司机</FieldLabel><Select value={driverId} onValueChange={changeDriver}><SelectTrigger id="monitor-map-driver" className="w-48 border-brand"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">全部司机（{monitorDrivers.length}）</SelectItem>{monitorDrivers.map((driver) => <SelectItem key={driver.id} value={driver.id}>{driver.name}</SelectItem>)}</SelectGroup></SelectContent></Select></Field>}{viewMode === "map" && selectedDriver && selectedDriver.status !== "派送正常" ? <DriverDeliveryStatusBadge status={selectedDriver.status} latestAction={selectedDriver.latestAction} latestActionAt={selectedDriver.latestActionAt} /> : null}</div>
    </div>
    <section className="min-w-0 shrink-0 overflow-x-auto rounded-lg border bg-card px-4 py-2 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none" aria-label="司机派送指标汇总" tabIndex={0}>
      <div className="flex w-full min-w-max items-center gap-4">
      <div className="flex h-24 min-w-28 shrink-0 items-center gap-3 py-3 pl-1">
        <Button type="button" variant="ghost" className={cn("h-auto flex-col items-start gap-1 px-2 py-1.5", summaryFilterActive("all") && "text-brand-ink")} aria-pressed={summaryFilterActive("all")} aria-label={`查看应派件运单，共 ${summary.total} 件`} onClick={() => applySummaryFilter("all")}>
          <span className={cn("text-xs", summaryFilterActive("all") ? "text-brand-ink" : "text-muted-foreground")}>应派件</span>
          <strong className="whitespace-nowrap text-2xl font-medium tabular-nums">{summary.total}</strong>
        </Button>
        <div className="flex min-h-10 items-center">
          <span className="monitor-current-source-bubble flex items-center gap-2 whitespace-nowrap px-3 py-1.5 text-xs" title="2400妥投率的分母为当期应派件量">
            <span className="text-muted-foreground">当期应派</span>
            <span className="font-medium tabular-nums">{summary.currentExpected.toLocaleString("en-US")}</span>
          </span>
        </div>
      </div>
      <div role="group" aria-label="派件结果" className="grid h-24 min-w-max flex-1 auto-cols-auto grid-flow-col items-center gap-6 rounded-md bg-muted/60 px-4 py-3">
        {[
          { status: "delivered", label: "已签收", value: summary.delivered, alerts: [{ type: "pod" as const, label: "POD 不合规", value: summary.pod }, { type: "location" as const, label: "妥投位置异常", value: summary.location }] },
          { status: "exception", label: "派送异常", value: summary.exception, alerts: [{ type: "fake" as const, label: "虚假问题件", value: summary.fake }] },
          { status: "nonstandard_return", label: "非标退回", value: summary.nonStandardReturn },
          { status: "pending", label: "待派件", value: summary.pending },
        ].map((item) => {
          const status = item.status as DeliveryStatus
          const active = summaryFilterActive(status)
          return <div key={status} className="flex min-w-20 items-center gap-3 text-left">
          <Button type="button" variant="ghost" className={cn("h-auto flex-col items-start gap-1 px-2 py-1.5", active && "text-brand-ink")} aria-pressed={active} aria-label={`查看${item.label}运单，共 ${item.value} 件`} onClick={() => applySummaryFilter(status)}>
            <span className={cn("relative flex items-center gap-1 whitespace-nowrap text-xs", active ? "text-brand-ink" : "text-muted-foreground")}>
              <i aria-hidden="true" className="delivery-status-dot absolute -left-3.5 top-1/2 -translate-y-1/2" data-status={status} />
              {item.label}
            </span>
            <strong className="shrink-0 whitespace-nowrap text-2xl font-medium tabular-nums">{item.value}</strong>
          </Button>
            {item.alerts?.some((alert) => alert.value > 0) && <div className="flex shrink-0 flex-col items-start text-xs leading-5">
              {item.alerts.filter((alert) => alert.value > 0).map((alert) => {
                return <Button key={alert.label} type="button" variant="ghost" size="xs" className={cn("h-5 px-1 text-destructive hover:bg-destructive/10 hover:text-destructive", summaryFilterActive(status, alert.type) && "bg-destructive/10")} aria-pressed={summaryFilterActive(status, alert.type)} aria-label={`查看${alert.label}运单，共 ${alert.value} 件`} onClick={() => applySummaryFilter(status, alert.type)}>{alert.label} {alert.value}</Button>
              })}
            </div>}
        </div>
        })}
      </div>
      <div className="flex shrink-0 items-center gap-4">
      {[
        { label: "2400妥投率", progress: summary.delivered2400Rate, tooltip: `当期已签收 ${summary.currentDelivered.toLocaleString("en-US")} 件 ÷ 当期应派 ${summary.currentExpected.toLocaleString("en-US")} 件（分母）` },
        { label: "妥投率", progress: summary.deliveredRate, tooltip: "已签收 ÷ 应派件" },
        { label: "日清率", progress: summary.clearanceRate, isClearance: true, tooltip: "（已签收 + 派送异常）÷ 应派件" },
      ].map((item) => <div key={item.label} className="shrink-0" title={item.tooltip}>
        <MonitorRateRing value={item.progress} label={item.label} isClearance={item.isClearance} />
      </div>)}
      </div>
      </div>
    </section>
    <ToggleGroup type="single" variant="outline" value={mobileView} onValueChange={(value) => { if (value) setMobileView(value) }} className="lg:hidden" aria-label="选择监控区域">
      {viewMode === "waybill" && <ToggleGroupItem value="drivers">司机列表</ToggleGroupItem>}
      <ToggleGroupItem value="list">运单列表</ToggleGroupItem>
      {viewMode === "map" && <ToggleGroupItem value="map">地图</ToggleGroupItem>}
    </ToggleGroup>
    <div className="grid min-h-0 min-w-0 flex-1 gap-3 lg:grid-cols-[28rem_minmax(0,1fr)]" data-view={viewMode}>
      <section className={cn("min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border bg-card", viewMode === "waybill" ? mobileView === "drivers" ? "flex" : "hidden lg:flex" : "hidden")} aria-label="司机列表">
        <div className="flex shrink-0 flex-col gap-3 border-b p-3">
          <DeliveryDriverFilters filters={driverFilters} drivers={monitorDrivers} idPrefix="monitor-driver" compact showQuickStatuses={false} onResultsChange={() => driverScrollRef.current?.scrollTo({ top: 0 })} />
        </div>
        <div ref={driverScrollRef} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 max-lg:max-h-[65dvh]">
          <DeliveryDriverCardGroup>{matchingDrivers.map((driver) => <DeliveryDriverCard key={driver.id} variant="compact" driver={driver} selected={driver.id === driverId} onSelect={() => changeDriver(driver.id)} onViewDetail={(alertType) => viewDriverDetail(driver.id, alertType)} />)}</DeliveryDriverCardGroup>
          {!matchingDrivers.length && <Empty><EmptyHeader><EmptyTitle>暂无匹配司机</EmptyTitle><EmptyDescription>请调整司机姓名或异常状态。</EmptyDescription></EmptyHeader><Button variant="outline" size="sm" onClick={driverFilters.resetFilters}>重置司机筛选</Button></Empty>}
        </div>
      </section>
      <section className={cn("min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border bg-card", mobileView === "list" ? "flex" : "hidden lg:flex")} aria-label="运单明细列表">
        <form className="@container/waybill-query flex shrink-0 flex-col gap-3 border-b p-3" onSubmit={(event) => { event.preventDefault(); void submitQuery() }}>
          <FieldGroup className="grid grid-cols-1 gap-2 @min-[360px]/waybill-query:grid-cols-2 @min-[600px]/waybill-query:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <Field className="@min-[360px]/waybill-query:col-span-2 @min-[600px]/waybill-query:col-span-1">
              <FieldLabel htmlFor="map-waybill-query" className="sr-only">查询内容</FieldLabel>
              <InputGroup>
                <InputGroupInput id="map-waybill-query" value={draft.keyword} maxLength={200} placeholder={{ id: "输入完整运单号", postalCode: "输入邮编", address: "输入地址关键词" }[draft.field]} onChange={(event) => setDraft((current) => ({ ...current, keyword: event.target.value }))} />
                <InputGroupAddon align="inline-start" className="self-stretch border-r p-0">
                  <MonitorSelect label="查询字段" value={draft.field} onChange={(value) => setDraft((current) => ({ ...current, field: value as MonitorQuery["field"] }))} options={[["id", "运单号"], ["postalCode", "邮编"], ["address", "收件地址"]]} className="w-28" />
                </InputGroupAddon>
              </InputGroup>
            </Field>
            <Field><FieldLabel className="sr-only">派件状态</FieldLabel><MonitorSelect label="派件状态" value={draft.status} onChange={(value) => setDraft((current) => ({ ...current, status: value as MonitorQuery["status"] }))} options={[["all", "全部派件状态"], ...Object.entries(statusLabels)]} /></Field>
            <Field><FieldLabel className="sr-only">异常状态</FieldLabel><MonitorAlertSelect value={draft.alerts} onChange={(alerts) => setDraft((current) => ({ ...current, alerts }))} /></Field>
          </FieldGroup>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="sm" aria-label={`运单排序：${sortLabel}`} title={sortLabel}>
                  <ArrowDownUpIcon data-icon="inline-start" className={cn(sort !== "sequence" && "text-brand")} />{sortLabel}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                <DropdownMenuGroup>
                  <DropdownMenuRadioGroup value={sort} onValueChange={(value) => { setSort(value as MonitorSort); clearSelection() }}>
                    {sortOptions.map(([value, label]) => <DropdownMenuRadioItem key={value} value={value}>{label}</DropdownMenuRadioItem>)}
                  </DropdownMenuRadioGroup>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            </div>
            <div className="flex items-center gap-2"><Button type="submit" disabled={queryBusy} aria-busy={queryBusy} aria-label={queryBusy ? "查询中" : "查询"}>查询</Button><Button type="button" variant="outline" onClick={resetQuery}>重置</Button></div>
          </div>
        </form>
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto p-3 max-lg:max-h-[65dvh]" aria-busy={queryBusy}>
          <div className="flex flex-col gap-3">{visibleRows.map((row) => <MonitorWaybillCard
            key={row.id} row={row} driver={monitorDrivers.find((driver) => driver.id === row.driverId)!}
            layout={viewMode === "waybill" ? "list" : "map"} selected={row.id === selectedId}
            address={addresses[row.id]} addressLoading={addressBusy.includes(row.id)}
            onAddress={() => void toggleAddress(row.id)} onSelect={() => selectCard(row)}
            onDetail={() => { setSelectedId(row.id); setDialog({ row, tab: "details" }) }}
            onPod={() => { setSelectedId(row.id); setDialog({ row, tab: "pod" }) }}
            selectable
            media={viewMode === "waybill" ? <WaybillPodMedia row={row} onOpen={(photoId) => { setSelectedId(row.id); setDialog({ row, tab: "pod", photoId }) }} /> : undefined}
          />)}</div>
          {visibleCount < filtered.length && <div ref={loadMoreRef} className="h-px" aria-hidden="true" />}
          {!filtered.length && <Empty><EmptyHeader><EmptyMedia variant="icon"><PackageSearchIcon /></EmptyMedia><EmptyTitle>暂无匹配运单</EmptyTitle><EmptyDescription>请调整查询内容或派件、异常状态组合。</EmptyDescription></EmptyHeader><Button variant="outline" size="sm" onClick={resetQuery}>重置查询</Button></Empty>}
        </div>
      </section>
      <div className={cn("min-h-0 min-w-0 max-lg:h-[65dvh]", viewMode === "waybill" ? "hidden" : mobileView === "list" ? "hidden lg:block" : "block")}>{mapMounted && <DeliveryTaskMap drivers={scopedDrivers} waybills={filtered} showWaybills={showWaybills} onShowWaybills={toggleWaybills} selectedId={selectedId} focusRequest={focusRequest} onSelect={selectMarker} />}</div>
    </div>
    <MonitorWaybillOverlay row={dialog?.row ?? null} driver={monitorDrivers.find((driver) => driver.id === dialog?.row.driverId)} initialTab={dialog?.tab ?? "details"} initialPhotoId={dialog?.photoId} address={dialog ? addresses[dialog.row.id] : undefined} onClose={() => setDialog(null)} />
  </div>
}
