"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ArrowDownUpIcon, ArrowLeftIcon, ListIcon, MapIcon, PackageSearchIcon, SearchIcon } from "lucide-react"
import { toast } from "sonner"
import type { EChartsOption } from "echarts"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EChartsChart } from "@/features/data-cockpit/components/echarts-chart"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty"
import { DeliveryTaskMap } from "@/features/live-dashboard/components/delivery-task-map"
import { StatusMultiSelect } from "@/features/live-dashboard/components/status-multi-select"
import { MonitorWaybillCard, MonitorWaybillOverlay } from "@/features/live-dashboard/components/monitor-waybill-card"
import { monitorDrivers, monitorWaybills, summarizeWaybills, statusLabels, alertLabels, emptyMonitorQuery, filterMonitorWaybills, waybillCoordinate, type MonitorQuery, type MonitorSort, type MonitorWaybill, type WaybillAlert } from "@/features/live-dashboard/driver-monitor-data"
import { cn } from "@/lib/utils"

const sortOptions = [
  ["sequence", "默认排序"], ["overdue-desc", "超期天数从高到低"], ["overdue-asc", "超期天数从低到高"], ["signed-asc", "妥投时间升序"], ["signed-desc", "妥投时间降序"],
]

const rateRingColors = [["--chart-1", "--muted"]]
const waybillBatchSize = 20

function MonitorRateRing({ value, label }: { value: number; label: string }) {
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
  return <div className="relative size-20 shrink-0">
    <EChartsChart option={option} dataColors={rateRingColors} className="size-full min-h-0" ariaLabel={`${label} ${rate.toFixed(2)}%`} />
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0.5" aria-hidden="true">
      <strong className="whitespace-nowrap text-sm font-medium tabular-nums">{rate.toFixed(2)}%</strong>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
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

export function DriverMonitorDetailView({ onBack, initialDriverId }: { onBack: () => void; initialDriverId?: string | null }) {
  const initialDriver = monitorDrivers.some((driver) => driver.id === initialDriverId) ? initialDriverId! : "all"
  const [driverId, setDriverId] = useState(initialDriver)
  const [draft, setDraft] = useState<MonitorQuery>(emptyMonitorQuery)
  const [query, setQuery] = useState<MonitorQuery>(emptyMonitorQuery)
  const [addressMatches, setAddressMatches] = useState<string[] | null>(null)
  const [sort, setSort] = useState<MonitorSort>("sequence")
  const sortLabel = sortOptions.find(([value]) => value === sort)![1]
  const [visibleCount, setVisibleCount] = useState(waybillBatchSize)
  const [showWaybills, setShowWaybills] = useState(initialDriver !== "all")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [focusRequest, setFocusRequest] = useState<{ id: string; revision: number } | null>(null)
  const [mobileView, setMobileView] = useState("list")
  const [dialog, setDialog] = useState<{ row: MonitorWaybill; tab: "details" | "pod" } | null>(null)
  const [addresses, setAddresses] = useState<Record<string, string>>({})
  const [addressBusy, setAddressBusy] = useState<string[]>([])
  const [queryBusy, setQueryBusy] = useState(false)
  const addressRequests = useRef(new Map<string, AbortController>())
  const queryRequest = useRef<AbortController | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const markerSelection = useRef(false)

  const scopedDrivers = useMemo(() => driverId === "all" ? monitorDrivers : monitorDrivers.filter((driver) => driver.id === driverId), [driverId])
  const scopedRows = useMemo(() => driverId === "all" ? monitorWaybills : monitorWaybills.filter((row) => row.driverId === driverId), [driverId])
  const summary = useMemo(() => summarizeWaybills(scopedRows), [scopedRows])
  const filtered = useMemo(() => filterMonitorWaybills(scopedRows, query, addressMatches, sort), [scopedRows, query, addressMatches, sort])
  const visibleRows = filtered.slice(0, visibleCount)
  const selectedDriver = driverId === "all" ? null : scopedDrivers[0]
  const selectedDriverReminder = selectedDriver && /(?:\d+h|\d+min|小时).*未派送/.test(selectedDriver.status) ? selectedDriver.status : null

  useEffect(() => {
    const root = scrollRef.current
    const sentinel = loadMoreRef.current
    if (!root || !sentinel || visibleCount >= filtered.length) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setVisibleCount((current) => Math.min(current + waybillBatchSize, filtered.length))
    }, { root, rootMargin: "0px 0px 240px 0px" })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [filtered.length, visibleCount, mobileView])

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

  function clearSelection() { setSelectedId(null); setFocusRequest(null); markerSelection.current = false; setVisibleCount(waybillBatchSize); scrollRef.current?.scrollTo({ top: 0 }) }

  function changeDriver(nextId: string) {
    const url = new URL(window.location.href)
    if (nextId === "all") url.searchParams.delete("driverId")
    else url.searchParams.set("driverId", nextId)
    window.history.replaceState({}, "", url)
    queryRequest.current?.abort()
    addressRequests.current.forEach((controller) => controller.abort())
    addressRequests.current.clear()
    setAddressBusy([]); setQueryBusy(false); setAddresses({})
    setDriverId(nextId); setShowWaybills(nextId !== "all"); clearSelection()
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
      setAddressMatches(matches); setQuery(submitted); clearSelection()
    } catch (error) {
      if (!controller.signal.aborted) toast.error(error instanceof Error ? error.message : "查询失败")
    } finally { if (!controller.signal.aborted) setQueryBusy(false) }
  }

  function resetQuery() {
    queryRequest.current?.abort(); setQueryBusy(false)
    setDraft(emptyMonitorQuery); setQuery(emptyMonitorQuery); setAddressMatches(null); setSort("sequence"); clearSelection()
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
    if (showWaybills && driverId !== "all") {
      if (!waybillCoordinate(row)) { toast.info("该运单暂无有效坐标"); return }
      setFocusRequest((current) => ({ id: row.id, revision: (current?.revision ?? 0) + 1 }))
    }
  }

  return <div className="delivery-monitor-page flex min-w-0 flex-col gap-3" data-testid="driver-monitor-detail">
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3"><Button variant="outline" size="sm" onClick={onBack}><ArrowLeftIcon data-icon="inline-start" />返回</Button><h1 className="min-w-0 break-words text-xl font-semibold">司机监控地图{selectedDriver ? ` - ${selectedDriver.name}` : ""}</h1></div>
      <div className="flex flex-wrap items-center gap-2"><Field orientation="horizontal" className="w-auto"><FieldLabel htmlFor="monitor-map-driver">司机</FieldLabel><Select value={driverId} onValueChange={changeDriver}><SelectTrigger id="monitor-map-driver" className="w-48 border-brand"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">全部司机（{monitorDrivers.length}）</SelectItem>{monitorDrivers.map((driver) => <SelectItem key={driver.id} value={driver.id}>{driver.name}</SelectItem>)}</SelectGroup></SelectContent></Select></Field>{selectedDriverReminder && <Badge variant="destructive">{selectedDriverReminder}</Badge>}</div>
    </div>
    <section className="grid min-w-0 shrink-0 auto-cols-max grid-flow-col justify-between gap-3 overflow-x-auto rounded-lg border bg-card p-4 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none" aria-label="司机派送指标汇总" tabIndex={0}>
      {[
        { label: "应派件", value: summary.total },
        { label: "已签收", value: summary.delivered, alerts: [{ label: "POD 不合规", value: summary.pod }, { label: "妥投位置异常", value: summary.location }] },
        { label: "派送异常", value: summary.exception, alerts: [{ label: "虚假问题件", value: summary.fake }] },
        { label: "待派件", value: summary.pending },
        { label: "妥投率", value: `${summary.deliveredRate.toFixed(2)}%`, progress: summary.deliveredRate, tooltip: "已签收 ÷ 应派件" },
        { label: "日清率", value: `${summary.clearanceRate.toFixed(2)}%`, progress: summary.clearanceRate, tooltip: "（已签收 + 派送异常）÷ 应派件" },
      ].map((item) => <div key={item.label} className="flex min-w-0 flex-col justify-center gap-1 px-2" title={item.tooltip}>
        {item.progress !== undefined ? <MonitorRateRing value={item.progress} label={item.label} /> : <>
        <span className="text-xs text-muted-foreground">{item.label}</span>
        <div className="flex min-h-10 min-w-0 items-center gap-3">
          <strong className="shrink-0 whitespace-nowrap text-2xl font-medium tabular-nums">{item.value}</strong>
          {item.alerts?.some((alert) => alert.value > 0) && <div className="flex shrink-0 flex-col items-start text-xs leading-5">
            {item.alerts.filter((alert) => alert.value > 0).map((alert) => <span key={alert.label} className="shrink-0 whitespace-nowrap text-destructive">{alert.label} {alert.value}</span>)}
          </div>}
        </div>
        </>}
      </div>)}
    </section>
    <ToggleGroup type="single" variant="outline" value={mobileView} onValueChange={(value) => { if (value) setMobileView(value) }} className="lg:hidden" aria-label="切换运单列表与地图"><ToggleGroupItem value="list"><ListIcon className="size-4" />运单列表</ToggleGroupItem><ToggleGroupItem value="map"><MapIcon className="size-4" />地图</ToggleGroupItem></ToggleGroup>
    <div className="grid min-h-0 min-w-0 flex-1 gap-3 lg:grid-cols-[28rem_minmax(0,1fr)]">
      <section className={cn("flex min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border bg-card", mobileView === "map" && "hidden lg:flex")} aria-label="运单明细列表">
        <form className="flex shrink-0 flex-col gap-3 border-b p-3" onSubmit={(event) => { event.preventDefault(); void submitQuery() }}>
          <FieldGroup className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_8rem]">
            <Field>
              <FieldLabel htmlFor="map-waybill-query" className="sr-only">查询内容</FieldLabel>
              <InputGroup>
                <InputGroupInput id="map-waybill-query" value={draft.keyword} maxLength={200} placeholder={{ id: "输入完整运单号", postalCode: "输入邮编", address: "输入地址关键词" }[draft.field]} onChange={(event) => setDraft((current) => ({ ...current, keyword: event.target.value }))} />
                <InputGroupAddon align="inline-start" className="self-stretch border-r p-0">
                  <MonitorSelect label="查询字段" value={draft.field} onChange={(value) => setDraft((current) => ({ ...current, field: value as MonitorQuery["field"] }))} options={[["id", "运单号"], ["postalCode", "邮编"], ["address", "收件地址"]]} className="w-28" />
                </InputGroupAddon>
              </InputGroup>
            </Field>
            <Field><FieldLabel className="sr-only">派件状态</FieldLabel><MonitorSelect label="派件状态" value={draft.status} onChange={(value) => setDraft((current) => ({ ...current, status: value }))} options={[["all", "全部派件状态"], ...Object.entries(statusLabels)]} /></Field>
            <Field className="sm:col-span-2 sm:w-[calc(50%-0.25rem)]"><FieldLabel className="sr-only">异常状态</FieldLabel><MonitorAlertSelect value={draft.alerts} onChange={(alerts) => setDraft((current) => ({ ...current, alerts }))} /></Field>
          </FieldGroup>
          <div className="flex flex-wrap items-center justify-between gap-2">
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
            <div className="flex items-center gap-2"><Button type="submit" size="sm" disabled={queryBusy}><SearchIcon data-icon="inline-start" />{queryBusy ? "查询中…" : "查询"}</Button><Button type="button" size="sm" variant="outline" onClick={resetQuery}>重置</Button></div>
          </div>
        </form>
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto p-3 max-lg:max-h-[65dvh]" aria-busy={queryBusy}>
          <div className="flex flex-col gap-2">{visibleRows.map((row) => <MonitorWaybillCard key={row.id} row={row} driver={monitorDrivers.find((driver) => driver.id === row.driverId)!} selected={row.id === selectedId} address={addresses[row.id]} addressLoading={addressBusy.includes(row.id)} onAddress={() => void toggleAddress(row.id)} onSelect={() => selectCard(row)} onDetail={() => setDialog({ row, tab: "details" })} onPod={() => setDialog({ row, tab: "pod" })} />)}</div>
          {visibleCount < filtered.length && <div ref={loadMoreRef} className="h-px" aria-hidden="true" />}
          {!filtered.length && <Empty><EmptyHeader><EmptyMedia variant="icon"><PackageSearchIcon /></EmptyMedia><EmptyTitle>暂无匹配运单</EmptyTitle><EmptyDescription>请调整查询内容或派件、异常状态组合。</EmptyDescription></EmptyHeader><Button variant="outline" size="sm" onClick={resetQuery}>重置查询</Button></Empty>}
        </div>
      </section>
      <div className={cn("min-h-0 min-w-0 max-lg:h-[65dvh]", mobileView === "list" && "hidden lg:block")}><DeliveryTaskMap drivers={scopedDrivers} waybills={filtered} showWaybills={showWaybills} onShowWaybills={toggleWaybills} selectedId={selectedId} focusRequest={focusRequest} onSelect={selectMarker} /></div>
    </div>
    <MonitorWaybillOverlay row={dialog?.row ?? null} driver={monitorDrivers.find((driver) => driver.id === dialog?.row.driverId)} initialTab={dialog?.tab ?? "details"} address={dialog ? addresses[dialog.row.id] : undefined} onClose={() => setDialog(null)} />
  </div>
}
