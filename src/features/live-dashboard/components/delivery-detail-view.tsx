"use client"

import { useMemo, useRef, useState } from "react"
import {
  ArrowLeftIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CircleHelpIcon,
  CopyIcon,
  DownloadIcon,
  SearchIcon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { DataPagination } from "@/components/ui/pagination"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { StatusMultiSelect } from "@/features/live-dashboard/components/status-multi-select"
import { WaybillDetailSheet } from "@/features/live-dashboard/components/waybill-detail-sheet"
import { QueryFilterLayout } from "@/features/live-dashboard/components/query-filter-layout"
import { formatDate, formatTime } from "@/lib/date-time"
import { cn } from "@/lib/utils"

export type DeliveryDetailMetric = "expected" | "pending" | "delivered" | "exception"
export type DeliveryDetailSource = "all" | "current" | "history"

type DeliveryStatus = "待派件" | "已签收" | "派送异常"
type OverdueDays = "未超期" | "超1天" | "超2天" | "超3天" | "超4天"
type WaybillType = "普件" | "货代" | "Locker" | "PUDO"
type DeliveryIssue = "无" | "POD不合规" | "妥投位置异常"
type ProblemType = "商业地址关门" | "地址错误/不详" | "无法投递" | "收件人拒收" | "无法进入"
type SortDirection = "asc" | "desc"

const detailTitleByMetric: Record<DeliveryDetailMetric, string> = {
  expected: "应派件",
  pending: "待派件",
  delivered: "已签收",
  exception: "派送异常",
}

export function createDeliveryDetailKey(metric: DeliveryDetailMetric, source: DeliveryDetailSource = "all") {
  return `派件作业:${metric}:${source}`
}

export function parseDeliveryDetailKey(value: string) {
  const [prefix, metric, source] = value.split(":")
  if (prefix !== "派件作业" || !["expected", "pending", "delivered", "exception"].includes(metric) || !["all", "current", "history"].includes(source)) return null
  return { metric: metric as DeliveryDetailMetric, source: source as DeliveryDetailSource }
}

export function getDeliveryDetailTitle(value: string) {
  const parsed = parseDeliveryDetailKey(value)
  return parsed ? detailTitleByMetric[parsed.metric] : value
}

type DeliveryDriver = {
  id: string
  name: string
  phone: string
  route: string
  postalCode: string
  total: number
  history: number
  pending: number
  exception: number
}

type DeliveryWaybill = {
  trackingNumber: string
  status: DeliveryStatus
  pickupAt: string
  deliveredAt: string | null
  source: Exclude<DeliveryDetailSource, "all">
  receivedTransfer: boolean
  deliveryAttempts: number
  driverId: string
  driver: string
  route: string
  postalCode: string
  courierRoute: string
  overdueDays: OverdueDays
  waybillType: WaybillType
  deliveryIssue: DeliveryIssue
  problemType: ProblemType | null
  fakeProblem: boolean
  issueInstruction: string
  latestAction: string
  actionAt: string
  operator: string
}

const deliveryDrivers: DeliveryDriver[] = [
  { id: "DRV-FANLIN-WU", name: "Fanlin Wu", phone: "+1 (415) 555-0126", route: "ABQ01-003", postalCode: "94101", total: 187, history: 10, pending: 40, exception: 10 },
  { id: "DRV-MARIA-GARCIA", name: "Maria Garcia", phone: "+1 (415) 555-0148", route: "ABQ01-004", postalCode: "94102", total: 209, history: 12, pending: 35, exception: 12 },
  { id: "DRV-JAMES-WILSON", name: "James Wilson", phone: "+1 (415) 555-0182", route: "ABQ01-005", postalCode: "94103", total: 167, history: 8, pending: 30, exception: 9 },
  { id: "DRV-VIVIAN-HO", name: "Vivian Ho", phone: "+1 (415) 555-0165", route: "ABQ01-006", postalCode: "94104", total: 190, history: 16, pending: 36, exception: 11 },
  { id: "DRV-AXX", name: "Axx", phone: "+1 (415) 555-0171", route: "ABQ01-001-A", postalCode: "94105", total: 321, history: 20, pending: 55, exception: 18 },
  { id: "DRV-ALICE-CHEN", name: "Alice Chen", phone: "+1 (415) 555-0134", route: "SLE-CH-01", postalCode: "94106", total: 234, history: 18, pending: 42, exception: 14 },
  { id: "DRV-MIKE-LIU", name: "Mike Liu", phone: "+1 (415) 555-0193", route: "SLE-LI-02", postalCode: "94107", total: 211, history: 16, pending: 28, exception: 12 },
  { id: "DRV-SOPHIA-ZHANG", name: "Sophia Zhang", phone: "+1 (415) 555-0119", route: "SLE-ZH-03", postalCode: "94108", total: 262, history: 24, pending: 35, exception: 16 },
]

function shuffledStatuses(driver: DeliveryDriver, seed: number) {
  const statuses: DeliveryStatus[] = [
    ...Array.from({ length: driver.pending }, () => "待派件" as const),
    ...Array.from({ length: driver.exception }, () => "派送异常" as const),
    ...Array.from({ length: driver.total - driver.pending - driver.exception }, () => "已签收" as const),
  ]
  let state = seed
  for (let index = statuses.length - 1; index > 0; index -= 1) {
    state = (state * 9301 + 49297) % 233280
    const target = Math.floor((state / 233280) * (index + 1))
    ;[statuses[index], statuses[target]] = [statuses[target], statuses[index]]
  }
  return statuses
}

function createDeliveryWaybills() {
  const rows: DeliveryWaybill[] = []
  let sequence = 500000
  let exceptionSequence = 0
  const issues: ProblemType[] = ["商业地址关门", "地址错误/不详", "无法投递", "收件人拒收", "无法进入"]
  const types: WaybillType[] = ["普件", "货代", "Locker", "PUDO"]
  const overdueOptions: OverdueDays[] = ["未超期", "超1天", "超2天", "超3天", "超4天"]

  deliveryDrivers.forEach((driver, driverIndex) => {
    const statuses = shuffledStatuses(driver, driverIndex + 11)
    statuses.forEach((status, index) => {
      sequence += 1
      const source: DeliveryWaybill["source"] = index < driver.history ? "history" : "current"
      const problemType = status === "派送异常" ? issues[(exceptionSequence + driverIndex) % issues.length] : null
      if (status === "派送异常") exceptionSequence += 1
      const deliveryIssue: DeliveryIssue = status === "已签收" && index % 23 === 0
        ? "POD不合规"
        : status === "已签收" && index % 29 === 0
          ? "妥投位置异常"
          : "无"
      const pickupAt = `2026-08-21T0${6 + (driverIndex % 3)}:${String(10 + (index % 45)).padStart(2, "0")}:00-04:00`
      const actionAt = `2026-08-21T${String(9 + (index % 8)).padStart(2, "0")}:${String(index % 60).padStart(2, "0")}:00-04:00`
      rows.push({
        trackingNumber: `GL20260821${String(sequence).padStart(8, "0")}`,
        status,
        pickupAt,
        deliveredAt: status === "已签收" ? actionAt : null,
        source,
        receivedTransfer: source === "history" && index % 3 === 0,
        deliveryAttempts: 1 + (index % 3),
        driverId: driver.id,
        driver: driver.name,
        route: driver.route,
        postalCode: driver.postalCode,
        courierRoute: driver.route,
        overdueDays: status === "待派件" ? overdueOptions[index % overdueOptions.length] : "未超期",
        waybillType: types[index % types.length],
        deliveryIssue,
        problemType,
        fakeProblem: status === "派送异常" && exceptionSequence % 4 === 0,
        issueInstruction: problemType ? `按${problemType}流程处理并回传凭证` : "—",
        latestAction: status === "已签收" ? "完成签收" : status === "派送异常" ? "上报问题件" : "快递员取件",
        actionAt,
        operator: driver.name,
      })
    })
  })
  return rows
}

const deliveryWaybills = createDeliveryWaybills()

type DriverSummary = {
  id: string
  name: string
  phone: string
  expected: number
  current: number
  history: number
  transfer: number
  pending: number
  delivered: number
  exception: number
  deliveryRate: number
  clearanceRate: number
  notOverdue: number
  overdue1: number
  overdue2: number
  overdue3: number
  overdue4: number
  pod: number
  location: number
  fake: number
  businessClosed: number
  badAddress: number
  cannotDeliver: number
  rejected: number
  cannotEnter: number
  latestAction: string
  actionAt: string
}

type DriverSortKey = Exclude<keyof DriverSummary, "id" | "name" | "phone" | "latestAction" | "actionAt">

function summarizeDriver(driver: DeliveryDriver, rows: DeliveryWaybill[]): DriverSummary {
  const count = (predicate: (row: DeliveryWaybill) => boolean) => rows.filter(predicate).length
  const expected = rows.length
  const delivered = count((row) => row.status === "已签收")
  const exception = count((row) => row.status === "派送异常")
  const pending = count((row) => row.status === "待派件")
  return {
    id: driver.id,
    name: driver.name,
    phone: driver.phone,
    expected,
    current: count((row) => row.source === "current"),
    history: count((row) => row.source === "history"),
    transfer: count((row) => row.receivedTransfer),
    pending,
    delivered,
    exception,
    deliveryRate: delivered + exception === 0 ? 0 : delivered / (delivered + exception) * 100,
    clearanceRate: expected === 0 ? 0 : (delivered + exception) / expected * 100,
    notOverdue: count((row) => row.status === "待派件" && row.overdueDays === "未超期"),
    overdue1: count((row) => row.status === "待派件" && row.overdueDays === "超1天"),
    overdue2: count((row) => row.status === "待派件" && row.overdueDays === "超2天"),
    overdue3: count((row) => row.status === "待派件" && row.overdueDays === "超3天"),
    overdue4: count((row) => row.status === "待派件" && row.overdueDays === "超4天"),
    pod: count((row) => row.deliveryIssue === "POD不合规"),
    location: count((row) => row.deliveryIssue === "妥投位置异常"),
    fake: count((row) => row.fakeProblem),
    businessClosed: count((row) => row.problemType === "商业地址关门"),
    badAddress: count((row) => row.problemType === "地址错误/不详"),
    cannotDeliver: count((row) => row.problemType === "无法投递"),
    rejected: count((row) => row.problemType === "收件人拒收"),
    cannotEnter: count((row) => row.problemType === "无法进入"),
    latestAction: rows[0]?.latestAction ?? "—",
    actionAt: rows[0]?.actionAt ?? "",
  }
}

type WaybillFilters = {
  driverId: string
  query: string
  statuses: DeliveryStatus[]
  source: DeliveryDetailSource
  overdue: "all" | OverdueDays
  waybillType: "all" | WaybillType
  transfer: "all" | "yes" | "no"
  deliveryIssue: "all" | DeliveryIssue
  problemType: "all" | ProblemType
  fake: "all" | "yes" | "no"
}

function createWaybillFilters(source: DeliveryDetailSource): WaybillFilters {
  return { driverId: "all", query: "", statuses: [], source, overdue: "all", waybillType: "all", transfer: "all", deliveryIssue: "all", problemType: "all", fake: "all" }
}

export function DeliveryDetailView({ detailKey, onBack }: { detailKey: string; onBack: () => void }) {
  const config = parseDeliveryDetailKey(detailKey) ?? { metric: "expected" as const, source: "all" as const }
  const [view, setView] = useState("driver")
  const [sourceTab, setSourceTab] = useState<DeliveryDetailSource>(config.source)
  const [driverFilter, setDriverFilter] = useState("all")
  const [driverSource, setDriverSource] = useState<DeliveryDetailSource>(config.source)
  const [appliedDriverFilter, setAppliedDriverFilter] = useState("all")
  const [appliedDriverSource, setAppliedDriverSource] = useState<DeliveryDetailSource>(config.source)
  const [driverSortKey, setDriverSortKey] = useState<DriverSortKey | null>(null)
  const [driverSortDirection, setDriverSortDirection] = useState<SortDirection>("asc")
  const [driverPage, setDriverPage] = useState(1)
  const [driverPageSize, setDriverPageSize] = useState(10)
  const [waybillFilters, setWaybillFilters] = useState(() => createWaybillFilters(config.source))
  const [appliedWaybillFilters, setAppliedWaybillFilters] = useState(() => createWaybillFilters(config.source))
  const [waybillSortKey, setWaybillSortKey] = useState<"pickupAt" | "overdueDays" | null>(null)
  const [waybillSortDirection, setWaybillSortDirection] = useState<SortDirection>("desc")
  const [waybillPage, setWaybillPage] = useState(1)
  const [waybillPageSize, setWaybillPageSize] = useState(10)
  const [contactDriver, setContactDriver] = useState<DriverSummary | null>(null)
  const [selectedWaybill, setSelectedWaybill] = useState<DeliveryWaybill | null>(null)
  const copyPhoneRef = useRef<HTMLButtonElement>(null)
  const title = detailTitleByMetric[config.metric]
  const effectiveSource = config.metric === "expected" ? sourceTab : appliedDriverSource

  const driverSummaries = useMemo(() => {
    const summaries = deliveryDrivers
      .filter((driver) => appliedDriverFilter === "all" || driver.id === appliedDriverFilter)
      .map((driver) => {
        const rows = deliveryWaybills.filter((row) => row.driverId === driver.id && (effectiveSource === "all" || row.source === effectiveSource))
        return summarizeDriver(driver, rows)
      })
      .sort((left, right) => left.name.localeCompare(right.name, "en"))
    if (!driverSortKey) return summaries
    return [...summaries].sort((left, right) => driverSortDirection === "asc" ? left[driverSortKey] - right[driverSortKey] : right[driverSortKey] - left[driverSortKey])
  }, [appliedDriverFilter, driverSortDirection, driverSortKey, effectiveSource])

  const filteredWaybills = useMemo(() => {
    const rows = deliveryWaybills.filter((row) => {
      const metricMatches = config.metric === "expected" || row.status === (config.metric === "pending" ? "待派件" : config.metric === "delivered" ? "已签收" : "派送异常")
      return metricMatches
        && (appliedWaybillFilters.driverId === "all" || row.driverId === appliedWaybillFilters.driverId)
        && (!appliedWaybillFilters.query || row.trackingNumber === appliedWaybillFilters.query)
        && (appliedWaybillFilters.statuses.length === 0 || appliedWaybillFilters.statuses.includes(row.status))
        && (appliedWaybillFilters.source === "all" || row.source === appliedWaybillFilters.source)
        && (appliedWaybillFilters.overdue === "all" || row.overdueDays === appliedWaybillFilters.overdue)
        && (appliedWaybillFilters.waybillType === "all" || row.waybillType === appliedWaybillFilters.waybillType)
        && (appliedWaybillFilters.transfer === "all" || row.receivedTransfer === (appliedWaybillFilters.transfer === "yes"))
        && (appliedWaybillFilters.deliveryIssue === "all" || row.deliveryIssue === appliedWaybillFilters.deliveryIssue)
        && (appliedWaybillFilters.problemType === "all" || row.problemType === appliedWaybillFilters.problemType)
        && (appliedWaybillFilters.fake === "all" || row.fakeProblem === (appliedWaybillFilters.fake === "yes"))
    })
    return [...rows].sort((left, right) => {
      if (!waybillSortKey) return Date.parse(right.actionAt) - Date.parse(left.actionAt)
      const leftValue = waybillSortKey === "pickupAt"
        ? Date.parse(config.metric === "delivered" ? left.deliveredAt ?? "" : left.pickupAt)
        : overdueRank(left.overdueDays)
      const rightValue = waybillSortKey === "pickupAt"
        ? Date.parse(config.metric === "delivered" ? right.deliveredAt ?? "" : right.pickupAt)
        : overdueRank(right.overdueDays)
      return waybillSortDirection === "asc" ? leftValue - rightValue : rightValue - leftValue
    })
  }, [appliedWaybillFilters, config.metric, waybillSortDirection, waybillSortKey])

  const currentDriverPage = Math.min(driverPage, Math.max(1, Math.ceil(driverSummaries.length / driverPageSize)))
  const visibleDrivers = driverSummaries.slice((currentDriverPage - 1) * driverPageSize, currentDriverPage * driverPageSize)
  const currentWaybillPage = Math.min(waybillPage, Math.max(1, Math.ceil(filteredWaybills.length / waybillPageSize)))
  const visibleWaybills = filteredWaybills.slice((currentWaybillPage - 1) * waybillPageSize, currentWaybillPage * waybillPageSize)

  const sortDrivers = (key: DriverSortKey) => {
    if (driverSortKey === key) setDriverSortDirection((current) => current === "asc" ? "desc" : "asc")
    else { setDriverSortKey(key); setDriverSortDirection("asc") }
    setDriverPage(1)
  }

  const sortWaybills = (key: "pickupAt" | "overdueDays") => {
    if (waybillSortKey === key) setWaybillSortDirection((current) => current === "asc" ? "desc" : "asc")
    else { setWaybillSortKey(key); setWaybillSortDirection("asc") }
    setWaybillPage(1)
  }

  const openDriverWaybills = (summary: DriverSummary, filters: Partial<WaybillFilters> = {}) => {
    const next = { ...createWaybillFilters(effectiveSource), driverId: summary.id, ...filters }
    setWaybillFilters(next)
    setAppliedWaybillFilters(next)
    setWaybillPage(1)
    setView("waybill")
  }

  const driverToolbar = <div className="flex flex-col gap-4">
    {config.metric === "expected" ? <Tabs value={sourceTab} onValueChange={(value) => { setSourceTab(value as DeliveryDetailSource); setDriverPage(1) }}><TabsList><TabsTrigger value="all">全部应派件</TabsTrigger><TabsTrigger value="current">当期未派</TabsTrigger><TabsTrigger value="history">历史未派</TabsTrigger></TabsList></Tabs> : null}
    <QueryFilterLayout
      fieldCount={config.metric === "expected" ? 1 : 2}
      fields={<>
        <FilterSelect id="delivery-driver-filter" label="司机" value={driverFilter} onChange={setDriverFilter} options={deliveryDrivers.map((driver) => [driver.id, driver.name])} />
        {config.metric !== "expected" ? <FilterSelect id="delivery-driver-source" label="派件来源" value={driverSource} onChange={(value) => setDriverSource(value as DeliveryDetailSource)} options={[["current", "当期未派"], ["history", "历史未派"]]} /> : null}
      </>}
      actions={<><Button onClick={() => { setAppliedDriverFilter(driverFilter); setAppliedDriverSource(driverSource); setDriverPage(1); toast.success("查询条件已应用") }}><SearchIcon data-icon="inline-start" />查询</Button><Button variant="outline" onClick={() => { setDriverFilter("all"); setDriverSource(config.source); setAppliedDriverFilter("all"); setAppliedDriverSource(config.source); setSourceTab(config.source); setDriverPage(1); toast.success("筛选条件已重置") }}>重置</Button></>}
    />
  </div>

  const waybillFieldCount = config.metric === "expected" ? 7 : config.metric === "exception" ? 5 : 4
  const waybillToolbar = <QueryFilterLayout
    fieldCount={waybillFieldCount}
    fields={<>
      <FilterSelect id="delivery-waybill-driver" label="司机" value={waybillFilters.driverId} onChange={(value) => setWaybillFilters((current) => ({ ...current, driverId: value }))} options={deliveryDrivers.map((driver) => [driver.id, driver.name])} />
      <Field><FieldLabel htmlFor="delivery-waybill-query" className="text-xs font-normal">运单编号</FieldLabel><Input id="delivery-waybill-query" value={waybillFilters.query} onChange={(event) => setWaybillFilters((current) => ({ ...current, query: event.target.value }))} placeholder="请输入完整运单编号" /></Field>
      {config.metric === "expected" ? <Field><FieldLabel htmlFor="delivery-status-filter" className="text-xs font-normal">派件状态</FieldLabel><StatusMultiSelect id="delivery-status-filter" ariaLabel="选择派件状态，可多选" options={["待派件", "已签收", "派送异常"] as const} value={waybillFilters.statuses} onValueChange={(statuses) => setWaybillFilters((current) => ({ ...current, statuses }))} /></Field> : null}
      <FilterSelect id="delivery-waybill-source" label="派件来源" value={waybillFilters.source} onChange={(value) => setWaybillFilters((current) => ({ ...current, source: value as DeliveryDetailSource }))} options={[["current", "当期未派"], ["history", "历史未派"]]} />
      {(config.metric === "expected" || config.metric === "pending") ? <FilterSelect id="delivery-overdue" label="超期天数" value={waybillFilters.overdue} onChange={(value) => setWaybillFilters((current) => ({ ...current, overdue: value as WaybillFilters["overdue"] }))} options={[["未超期", config.metric === "expected" ? "超0天" : "未超期"], ["超1天", "超1天"], ["超2天", "超2天"], ["超3天", "超3天"], ["超4天", "超4天"]]} /> : null}
      {config.metric === "expected" ? <FilterSelect id="delivery-waybill-type" label="运单类型" value={waybillFilters.waybillType} onChange={(value) => setWaybillFilters((current) => ({ ...current, waybillType: value as WaybillFilters["waybillType"] }))} options={[["普件", "普件"], ["货代", "货代"], ["Locker", "Locker"], ["PUDO", "PUDO"]]} /> : null}
      {config.metric === "expected" ? <FilterSelect id="delivery-transfer" label="是否接收转派" value={waybillFilters.transfer} onChange={(value) => setWaybillFilters((current) => ({ ...current, transfer: value as WaybillFilters["transfer"] }))} options={[["yes", "是"], ["no", "否"]]} /> : null}
      {config.metric === "delivered" ? <FilterSelect id="delivery-issue" label="妥投异常" value={waybillFilters.deliveryIssue} onChange={(value) => setWaybillFilters((current) => ({ ...current, deliveryIssue: value as WaybillFilters["deliveryIssue"] }))} options={[["无", "无"], ["POD不合规", "POD不合规"], ["妥投位置异常", "妥投位置异常"]]} /> : null}
      {config.metric === "exception" ? <FilterSelect id="delivery-problem-type" label="问题件类型" value={waybillFilters.problemType} onChange={(value) => setWaybillFilters((current) => ({ ...current, problemType: value as WaybillFilters["problemType"] }))} options={[["商业地址关门", "商业地址关门"], ["地址错误/不详", "地址错误/不详"], ["无法投递", "无法投递"], ["收件人拒收", "收件人拒收"], ["无法进入", "无法进入"]]} /> : null}
      {config.metric === "exception" ? <FilterSelect id="delivery-fake" label="是否虚假问题件" value={waybillFilters.fake} onChange={(value) => setWaybillFilters((current) => ({ ...current, fake: value as WaybillFilters["fake"] }))} options={[["yes", "是"], ["no", "否"]]} /> : null}
    </>}
    secondaryActions={<Button variant="outline" onClick={() => exportDeliveryWaybills(title, filteredWaybills)}><DownloadIcon data-icon="inline-start" />导出</Button>}
    actions={<><Button onClick={() => { const next = { ...waybillFilters, query: waybillFilters.query.trim() }; setWaybillFilters(next); setAppliedWaybillFilters(next); setWaybillPage(1); toast.success("查询条件已应用") }}><SearchIcon data-icon="inline-start" />查询</Button><Button variant="outline" onClick={() => { const next = createWaybillFilters(config.source); setWaybillFilters(next); setAppliedWaybillFilters(next); setWaybillPage(1); toast.success("筛选条件已重置") }}>重置</Button></>}
  />

  return <>
    <section className="animate-in fade-in slide-in-from-right-4 flex min-w-0 flex-col gap-3 rounded-xl bg-card p-5 duration-200" aria-label={`${title}详情下钻`}>
      <div className="flex items-start gap-3"><Button variant="outline" size="sm" onClick={onBack}><ArrowLeftIcon data-icon="inline-start" />返回</Button><h2 className="font-heading text-xl font-semibold text-foreground">{title}</h2></div>
      <Tabs value={view} onValueChange={setView} className="min-w-0 gap-3">
        <TabsList variant="line"><TabsTrigger value="driver">司机视图</TabsTrigger><TabsTrigger value="waybill">运单视图</TabsTrigger></TabsList>
        <TabsContent value="driver" className="flex min-w-0 flex-col gap-4">
          {driverToolbar}
          <Table variant="grid" className={config.metric === "exception" ? "min-w-[90rem]" : config.metric === "pending" ? "min-w-[76rem]" : "min-w-[68rem]"}>
            <DriverTableHeader metric={config.metric} source={effectiveSource} sortKey={driverSortKey} direction={driverSortDirection} onSort={sortDrivers} />
            <TableBody>{visibleDrivers.map((row) => <DriverTableRow key={row.id} row={row} metric={config.metric} source={effectiveSource} onMetric={(filters) => openDriverWaybills(row, filters)} onContact={() => setContactDriver(row)} />)}{visibleDrivers.length === 0 ? <TableRow><TableCell colSpan={12} className="h-28 text-center text-muted-foreground">暂无符合条件的司机</TableCell></TableRow> : null}</TableBody>
          </Table>
          <DataPagination className="border-t-0 px-0" page={currentDriverPage} pageSize={driverPageSize} total={driverSummaries.length} onPageChange={setDriverPage} onPageSizeChange={setDriverPageSize} showJumper={false} />
        </TabsContent>
        <TabsContent value="waybill" className="flex min-w-0 flex-col gap-4">
          {waybillToolbar}
          <Table variant="grid" className="min-w-[128rem]">
            <WaybillTableHeader metric={config.metric} sortKey={waybillSortKey} direction={waybillSortDirection} onSort={sortWaybills} />
            <TableBody>{visibleWaybills.map((row) => <WaybillTableRow key={row.trackingNumber} row={row} metric={config.metric} onSelect={() => setSelectedWaybill(row)} />)}{visibleWaybills.length === 0 ? <TableRow><TableCell colSpan={15} className="h-28 text-center text-muted-foreground">暂无符合条件的运单</TableCell></TableRow> : null}</TableBody>
          </Table>
          <DataPagination className="border-t-0 px-0" page={currentWaybillPage} pageSize={waybillPageSize} total={filteredWaybills.length} onPageChange={setWaybillPage} onPageSizeChange={setWaybillPageSize} showJumper={false} />
        </TabsContent>
      </Tabs>
    </section>
    <ContactDialog row={contactDriver} copyButtonRef={copyPhoneRef} onOpenChange={(open) => { if (!open) setContactDriver(null) }} />
    <WaybillDetailSheet row={selectedWaybill ? { trackingNumber: selectedWaybill.trackingNumber, pushedAt: selectedWaybill.pickupAt, pickupCourier: selectedWaybill.driver, pickupStatus: selectedWaybill.status, actionAt: selectedWaybill.actionAt, route: selectedWaybill.route, postalCode: selectedWaybill.postalCode } : null} onOpenChange={(open) => { if (!open) setSelectedWaybill(null) }} />
  </>
}

function DriverTableHeader({ metric, source, sortKey, direction, onSort }: { metric: DeliveryDetailMetric; source: DeliveryDetailSource; sortKey: DriverSortKey | null; direction: SortDirection; onSort: (key: DriverSortKey) => void }) {
  return <TableHeader><TableRow><TableHead>司机</TableHead>{metric === "expected" ? <><SortableHead label={source === "all" ? "应派件" : source === "current" ? "当期未派" : "历史未派"} sortKey={source === "all" ? "expected" : source} activeSortKey={sortKey} direction={direction} onSort={onSort} />{source === "history" ? <TableHead className="text-end"><span className="inline-flex items-center justify-end gap-1">接收转派<TransferHelp /></span></TableHead> : null}<SortableHead label="待派件" sortKey="pending" activeSortKey={sortKey} direction={direction} onSort={onSort} /><SortableHead label="已签收" sortKey="delivered" activeSortKey={sortKey} direction={direction} onSort={onSort} /><SortableHead label="派送异常" sortKey="exception" activeSortKey={sortKey} direction={direction} onSort={onSort} /><SortableHead label="妥投率" sortKey="deliveryRate" activeSortKey={sortKey} direction={direction} onSort={onSort} /><SortableHead label="日清率" sortKey="clearanceRate" activeSortKey={sortKey} direction={direction} onSort={onSort} /></> : null}{metric === "pending" ? <><SortableHead label="待派件" sortKey="pending" activeSortKey={sortKey} direction={direction} onSort={onSort} /><SortableHead label="未超期" sortKey="notOverdue" activeSortKey={sortKey} direction={direction} onSort={onSort} /><SortableHead label="超1天" sortKey="overdue1" activeSortKey={sortKey} direction={direction} onSort={onSort} /><SortableHead label="超2天" sortKey="overdue2" activeSortKey={sortKey} direction={direction} onSort={onSort} /><SortableHead label="超3天" sortKey="overdue3" activeSortKey={sortKey} direction={direction} onSort={onSort} /><SortableHead label="超4天" sortKey="overdue4" activeSortKey={sortKey} direction={direction} onSort={onSort} /><TableHead>司机最新操作</TableHead><TableHead>最新操作时间</TableHead></> : null}{metric === "delivered" ? <><SortableHead label="已签收" sortKey="delivered" activeSortKey={sortKey} direction={direction} onSort={onSort} /><SortableHead label="POD不合规" sortKey="pod" activeSortKey={sortKey} direction={direction} onSort={onSort} /><SortableHead label="妥投位置异常" sortKey="location" activeSortKey={sortKey} direction={direction} onSort={onSort} /></> : null}{metric === "exception" ? <><SortableHead label="派送异常总数" sortKey="exception" activeSortKey={sortKey} direction={direction} onSort={onSort} /><SortableHead label="虚假问题件" sortKey="fake" activeSortKey={sortKey} direction={direction} onSort={onSort} /><TableHead className="text-end">商业地址关门</TableHead><TableHead className="text-end">地址错误/不详</TableHead><TableHead className="text-end">无法投递</TableHead><TableHead className="text-end">收件人拒收</TableHead><TableHead className="text-end">无法进入</TableHead></> : null}<TableHead className="text-center">操作</TableHead></TableRow></TableHeader>
}

function DriverTableRow({ row, metric, source, onMetric, onContact }: { row: DriverSummary; metric: DeliveryDetailMetric; source: DeliveryDetailSource; onMetric: (filters?: Partial<WaybillFilters>) => void; onContact: () => void }) {
  return <TableRow><TableCell>{row.name}</TableCell>{metric === "expected" ? <><MetricCell value={source === "all" ? row.expected : source === "current" ? row.current : row.history} onClick={() => onMetric()} />{source === "history" ? <MetricCell value={row.transfer} onClick={() => onMetric({ transfer: "yes" })} /> : null}<MetricCell value={row.pending} onClick={() => onMetric({ statuses: ["待派件"] })} /><MetricCell value={row.delivered} onClick={() => onMetric({ statuses: ["已签收"] })} /><MetricCell value={row.exception} onClick={() => onMetric({ statuses: ["派送异常"] })} /><RateCell value={row.deliveryRate} /><RateCell value={row.clearanceRate} /></> : null}{metric === "pending" ? <><MetricCell value={row.pending} onClick={() => onMetric()} /><MetricCell value={row.notOverdue} onClick={() => onMetric({ overdue: "未超期" })} /><MetricCell value={row.overdue1} onClick={() => onMetric({ overdue: "超1天" })} /><MetricCell value={row.overdue2} onClick={() => onMetric({ overdue: "超2天" })} /><MetricCell value={row.overdue3} onClick={() => onMetric({ overdue: "超3天" })} /><MetricCell value={row.overdue4} onClick={() => onMetric({ overdue: "超4天" })} /><TableCell>{row.latestAction}</TableCell><TableCell className="tabular-nums">{formatDateTime(row.actionAt)}</TableCell></> : null}{metric === "delivered" ? <><MetricCell value={row.delivered} onClick={() => onMetric()} /><MetricCell value={row.pod} onClick={() => onMetric({ deliveryIssue: "POD不合规" })} /><MetricCell value={row.location} onClick={() => onMetric({ deliveryIssue: "妥投位置异常" })} /></> : null}{metric === "exception" ? <><MetricCell value={row.exception} onClick={() => onMetric()} /><MetricCell value={row.fake} onClick={() => onMetric({ fake: "yes" })} /><MetricCell value={row.businessClosed} onClick={() => onMetric({ problemType: "商业地址关门" })} /><MetricCell value={row.badAddress} onClick={() => onMetric({ problemType: "地址错误/不详" })} /><MetricCell value={row.cannotDeliver} onClick={() => onMetric({ problemType: "无法投递" })} /><MetricCell value={row.rejected} onClick={() => onMetric({ problemType: "收件人拒收" })} /><MetricCell value={row.cannotEnter} onClick={() => onMetric({ problemType: "无法进入" })} /></> : null}<TableCell className="text-center"><Button variant="link" size="xs" className="px-0" onClick={onContact}>联系司机</Button></TableCell></TableRow>
}

function WaybillTableHeader({ metric, sortKey, direction, onSort }: { metric: DeliveryDetailMetric; sortKey: "pickupAt" | "overdueDays" | null; direction: SortDirection; onSort: (key: "pickupAt" | "overdueDays") => void }) {
  return <TableHeader><TableRow><TableHead>运单编号</TableHead><TableHead>运单状态</TableHead>{metric === "pending" ? <SortableHead label="超期天数" sortKey="overdueDays" activeSortKey={sortKey} direction={direction} onSort={onSort} /> : null}<SortableHead label={metric === "delivered" ? "签收时间" : "领件时间"} sortKey="pickupAt" activeSortKey={sortKey} direction={direction} onSort={onSort} /><TableHead>派件来源</TableHead>{metric !== "delivered" && metric !== "exception" ? <TableHead>接收转派</TableHead> : null}{metric === "pending" ? <TableHead>派送次数</TableHead> : null}<TableHead>司机</TableHead><TableHead>路区</TableHead><TableHead>邮编</TableHead><TableHead>快递员路线</TableHead>{metric === "expected" ? <><TableHead>超期天数</TableHead><TableHead>运单类型</TableHead></> : null}{metric === "pending" ? <TableHead>问题件类型</TableHead> : null}{metric === "delivered" ? <TableHead>妥投异常</TableHead> : null}{metric === "exception" ? <><TableHead>问题件类型</TableHead><TableHead>是否虚假问题件</TableHead><TableHead>问题件指令</TableHead></> : null}<TableHead>最新操作</TableHead><TableHead>操作时间</TableHead><TableHead>操作人</TableHead></TableRow></TableHeader>
}

function WaybillTableRow({ row, metric, onSelect }: { row: DeliveryWaybill; metric: DeliveryDetailMetric; onSelect: () => void }) {
  return <TableRow><TableCell><Button variant="link" size="xs" className="px-0" onClick={onSelect}>{row.trackingNumber}</Button></TableCell><TableCell>{row.status}</TableCell>{metric === "pending" ? <TableCell className="text-end tabular-nums">{row.overdueDays}</TableCell> : null}<TableCell className="text-end tabular-nums">{formatDateTime(metric === "delivered" ? row.deliveredAt : row.pickupAt)}</TableCell><TableCell>{sourceLabel(row.source)}</TableCell>{metric !== "delivered" && metric !== "exception" ? <TableCell>{row.receivedTransfer ? "是" : "否"}</TableCell> : null}{metric === "pending" ? <TableCell className="text-end tabular-nums">{row.deliveryAttempts}</TableCell> : null}<TableCell>{row.driver}</TableCell><TableCell>{row.route}</TableCell><TableCell>{row.postalCode}</TableCell><TableCell>{row.courierRoute}</TableCell>{metric === "expected" ? <><TableCell>{row.overdueDays}</TableCell><TableCell>{row.waybillType}</TableCell></> : null}{metric === "pending" ? <TableCell>{row.problemType ?? "—"}</TableCell> : null}{metric === "delivered" ? <TableCell>{row.deliveryIssue}</TableCell> : null}{metric === "exception" ? <><TableCell>{row.problemType ?? "—"}</TableCell><TableCell>{row.fakeProblem ? "是" : "否"}</TableCell><TableCell>{row.issueInstruction}</TableCell></> : null}<TableCell>{row.latestAction}</TableCell><TableCell className="text-end tabular-nums">{formatDateTime(row.actionAt)}</TableCell><TableCell>{row.operator}</TableCell></TableRow>
}

function SortableHead<T extends string>({ label, sortKey, activeSortKey, direction, onSort }: { label: string; sortKey: T; activeSortKey: T | null; direction: SortDirection; onSort: (key: T) => void }) {
  const active = sortKey === activeSortKey
  return <TableHead className="text-end"><Button variant="ghost" size="xs" className="ms-auto px-1 text-xs font-medium" onClick={() => onSort(sortKey)} aria-label={`${label}，${active ? `当前${direction === "asc" ? "升序" : "降序"}` : "未排序"}，点击排序`}>{label}<span data-icon="inline-end" className="flex flex-col"><ChevronUpIcon className={cn("size-3", active && direction === "asc" ? "text-brand" : "text-muted-foreground/40")} /><ChevronDownIcon className={cn("-mt-1 size-3", active && direction === "desc" ? "text-brand" : "text-muted-foreground/40")} /></span></Button></TableHead>
}

function MetricCell({ value, onClick }: { value: number; onClick: () => void }) {
  return <TableCell className="text-end"><Button variant="link" size="xs" className="ms-auto px-0 tabular-nums" onClick={onClick}>{value}</Button></TableCell>
}

function RateCell({ value }: { value: number }) {
  return <TableCell className="text-end tabular-nums">{value.toFixed(1)}%</TableCell>
}

function FilterSelect({ id, label, value, onChange, options }: { id: string; label: string; value: string; onChange: (value: string) => void; options: string[][] }) {
  return <Field><FieldLabel htmlFor={id} className="text-xs font-normal">{label}</FieldLabel><Select value={value} onValueChange={onChange}><SelectTrigger id={id} className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">全部</SelectItem>{options.map(([optionValue, optionLabel]) => <SelectItem key={optionValue} value={optionValue}>{optionLabel}</SelectItem>)}</SelectGroup></SelectContent></Select></Field>
}

function ContactDialog({ row, copyButtonRef, onOpenChange }: { row: DriverSummary | null; copyButtonRef: React.RefObject<HTMLButtonElement | null>; onOpenChange: (open: boolean) => void }) {
  return <Dialog open={Boolean(row)} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-sm" showCloseButton={false} onOpenAutoFocus={(event) => { event.preventDefault(); copyButtonRef.current?.focus() }}><DialogClose asChild><Button variant="ghost" size="icon-sm" className="absolute top-2 right-2 border-transparent bg-transparent shadow-none" aria-label="关闭联系司机弹窗"><XIcon /></Button></DialogClose><DialogTitle>联系司机</DialogTitle><DialogDescription>{row?.name} 的联系信息</DialogDescription>{row ? <div className="flex items-center justify-between gap-4 rounded-lg border bg-card p-3"><div className="flex min-w-0 flex-col gap-1"><span className="text-xs text-muted-foreground">{row.name}</span><span className="text-base font-medium tabular-nums">{row.phone}</span></div><Button ref={copyButtonRef} onClick={async () => { try { await navigator.clipboard.writeText(row.phone); toast.success("手机号已复制") } catch { toast.error("复制失败，请手动复制手机号") } }}><CopyIcon data-icon="inline-start" />复制手机号</Button></div> : null}</DialogContent></Dialog>
}

function TransferHelp() {
  return <TooltipProvider><Tooltip><TooltipTrigger asChild><button type="button" className="rounded-sm text-muted-foreground outline-none hover:text-brand focus-visible:ring-1 focus-visible:ring-ring" aria-label="查看接收转派说明"><CircleHelpIcon className="size-3.5" /></button></TooltipTrigger><TooltipContent>该司机接收其他司机转派的历史未派运单数量。</TooltipContent></Tooltip></TooltipProvider>
}

function overdueRank(value: OverdueDays) {
  return ["未超期", "超1天", "超2天", "超3天", "超4天"].indexOf(value)
}

function sourceLabel(source: DeliveryWaybill["source"]) {
  return source === "current" ? "当期未派" : "历史未派"
}

function formatDateTime(value: string | null) {
  return value ? `${formatDate(value)} ${formatTime(value)}` : "—"
}

function exportDeliveryWaybills(title: string, rows: DeliveryWaybill[]) {
  const values = [["运单编号", "运单状态", "领件时间", "派件来源", "司机", "路区", "邮编", "最新操作", "操作时间", "操作人"], ...rows.map((row) => [row.trackingNumber, row.status, formatDateTime(row.pickupAt), sourceLabel(row.source), row.driver, row.route, row.postalCode, row.latestAction, formatDateTime(row.actionAt), row.operator])]
  const csv = values.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n")
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }))
  const link = document.createElement("a")
  link.href = url
  link.download = `${title}运单明细.csv`
  link.click()
  URL.revokeObjectURL(url)
  toast.success("导出成功")
}
