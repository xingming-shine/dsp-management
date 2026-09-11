"use client"

import { useMemo, useRef, useState } from "react"
import { ArrowLeftIcon, ChevronDownIcon, ChevronUpIcon, CopyIcon, DownloadIcon, SearchIcon, XIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
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
import { StatusMultiSelect } from "@/features/live-dashboard/components/status-multi-select"
import { WaybillWorkspace, useWaybillSelection } from "@/features/live-dashboard/components/waybill-workspace"
import { QueryFilterLayout } from "@/features/live-dashboard/components/query-filter-layout"
import { formatDate, formatTime } from "@/lib/date-time"
import { cn } from "@/lib/utils"

type ReturnType = "派送异常" | "错分/No Scan"
type ReturnStatus = "待退回" | "已退回"
type ReturnSortKey = "exceptionExpected" | "exceptionPending" | "noScanExpected" | "noScanPending" | "totalPending"
type SortDirection = "asc" | "desc"

type ReturnDriverRow = {
  driverId: string
  driver: string
  phone: string
  signedInAt: string | null
  signedOutAt: string | null
  exceptionExpected: number
  exceptionReturned: number
  noScanExpected: number
  noScanReturned: number
}

type ReturnWaybillRow = {
  trackingNumber: string
  driverId: string
  driver: string
  route: string
  postalCode: string
  courierRoute: string
  returnType: ReturnType
  returnStatus: ReturnStatus
  waybillStatus: string
  reportedAt: string
  returnedAt: string | null
  exceptionReason: string
  latestAction: string
  actionAt: string
  operator: string
}

const driverRows: ReturnDriverRow[] = [
  { driverId: "DRV-FANLIN-WU", driver: "Fanlin Wu", phone: "+1 (415) 555-0126", signedInAt: "2026-08-21T05:30:29-04:00", signedOutAt: "2026-08-21T08:18:12-04:00", exceptionExpected: 5, exceptionReturned: 3, noScanExpected: 2, noScanReturned: 1 },
  { driverId: "DRV-MARIA-GARCIA", driver: "Maria Garcia", phone: "+1 (415) 555-0148", signedInAt: "2026-08-21T05:34:06-04:00", signedOutAt: "2026-08-21T08:24:51-04:00", exceptionExpected: 4, exceptionReturned: 3, noScanExpected: 2, noScanReturned: 1 },
  { driverId: "DRV-JAMES-WILSON", driver: "James Wilson", phone: "+1 (415) 555-0182", signedInAt: "2026-08-21T05:38:44-04:00", signedOutAt: null, exceptionExpected: 3, exceptionReturned: 3, noScanExpected: 2, noScanReturned: 1 },
  { driverId: "DRV-VIVIAN-HO", driver: "Vivian Ho", phone: "+1 (415) 555-0165", signedInAt: "2026-08-21T05:42:19-04:00", signedOutAt: "2026-08-21T08:31:09-04:00", exceptionExpected: 4, exceptionReturned: 3, noScanExpected: 2, noScanReturned: 2 },
  { driverId: "DRV-AXX", driver: "Axx", phone: "+1 (415) 555-0171", signedInAt: "2026-08-21T05:46:37-04:00", signedOutAt: null, exceptionExpected: 3, exceptionReturned: 2, noScanExpected: 2, noScanReturned: 2 },
  { driverId: "DRV-ALICE-CHEN", driver: "Alice Chen", phone: "+1 (415) 555-0134", signedInAt: "2026-08-21T05:51:03-04:00", signedOutAt: "2026-08-21T08:37:25-04:00", exceptionExpected: 4, exceptionReturned: 4, noScanExpected: 3, noScanReturned: 2 },
  { driverId: "DRV-MIKE-LIU", driver: "Mike Liu", phone: "+1 (415) 555-0193", signedInAt: "2026-08-21T05:55:18-04:00", signedOutAt: null, exceptionExpected: 4, exceptionReturned: 4, noScanExpected: 3, noScanReturned: 2 },
  { driverId: "DRV-SOPHIA-ZHANG", driver: "Sophia Zhang", phone: "+1 (415) 555-0119", signedInAt: null, signedOutAt: null, exceptionExpected: 3, exceptionReturned: 3, noScanExpected: 4, noScanReturned: 4 },
]

function pending(row: ReturnDriverRow, type: ReturnType) {
  return type === "派送异常"
    ? row.exceptionExpected - row.exceptionReturned
    : row.noScanExpected - row.noScanReturned
}

function totalPending(row: ReturnDriverRow) {
  return pending(row, "派送异常") + pending(row, "错分/No Scan")
}

function formatDateTime(value: string | null, empty: string) {
  return value ? `${formatDate(value)} ${formatTime(value)}` : empty
}

function createWaybillRows() {
  const rows: ReturnWaybillRow[] = []
  let sequence = 300000

  driverRows.forEach((driver, driverIndex) => {
    const groups: Array<[ReturnType, number, number]> = [
      ["派送异常", driver.exceptionExpected, driver.exceptionReturned],
      ["错分/No Scan", driver.noScanExpected, driver.noScanReturned],
    ]
    groups.forEach(([returnType, expected, returned]) => {
      for (let index = 0; index < expected; index += 1) {
        sequence += 1
        const isReturned = index < returned
        rows.push({
          trackingNumber: `GL20260821${String(sequence).padStart(8, "0")}`,
          driverId: driver.driverId,
          driver: driver.driver,
          route: `ABQ01-${String(driverIndex + 1).padStart(3, "0")}`,
          postalCode: String(94101 + driverIndex),
          courierRoute: `ABQ01-${String(driverIndex + 1).padStart(3, "0")}`,
          returnType,
          returnStatus: isReturned ? "已退回" : "待退回",
          waybillStatus: isReturned ? "已退回站点" : "退回中",
          reportedAt: "2026-08-21T07:56:20-04:00",
          returnedAt: isReturned ? "2026-08-21T08:42:18-04:00" : null,
          exceptionReason: returnType === "派送异常" ? ["包裹破损", "收件人拒收", "无法投递"][sequence % 3] : "—",
          latestAction: isReturned ? "站点退回扫描" : "生成退回任务",
          actionAt: isReturned ? "2026-08-21T08:42:18-04:00" : "2026-08-21T07:56:20-04:00",
          operator: isReturned ? "站点操作员" : "系统",
        })
      }
    })
  })
  return rows
}

const waybillRows = createWaybillRows()

export function ReturnDetailView({ onBack, period = "current" }: { onBack: () => void; period?: "current" | "next" }) {
  const [view, setView] = useState("driver")
  const [driverFilter, setDriverFilter] = useState("all")
  const [signInFilter, setSignInFilter] = useState("all")
  const [signOutFilter, setSignOutFilter] = useState("all")
  const [appliedDriverFilters, setAppliedDriverFilters] = useState(["all", "all", "all"])
  const [waybillDriver, setWaybillDriver] = useState("all")
  const [waybillQuery, setWaybillQuery] = useState("")
  const [returnReasons, setReturnReasons] = useState<ReturnType[]>([])
  const [returnStatus, setReturnStatus] = useState("all")
  const [appliedWaybillFilters, setAppliedWaybillFilters] = useState<{ driver: string; query: string; reasons: ReturnType[]; status: string }>({ driver: "all", query: "", reasons: [], status: "all" })
  const [driverPage, setDriverPage] = useState(1)
  const [driverPageSize, setDriverPageSize] = useState(10)
  const [waybillPage, setWaybillPage] = useState(1)
  const [waybillPageSize, setWaybillPageSize] = useState(10)
  const [selectedWaybill, setSelectedWaybill] = useWaybillSelection<ReturnWaybillRow>()
  const [contactDriver, setContactDriver] = useState<ReturnDriverRow | null>(null)
  const [sortKey, setSortKey] = useState<ReturnSortKey | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const copyPhoneButtonRef = useRef<HTMLButtonElement>(null)

  const filteredDrivers = useMemo(() => {
    const [driver, signIn, signOut] = appliedDriverFilters
    const rows = driverRows.filter((row) => period !== "next" && (driver === "all" || row.driverId === driver)
      && (signIn === "all" || (signIn === "yes" ? Boolean(row.signedInAt) : !row.signedInAt))
      && (signOut === "all" || (signOut === "yes" ? Boolean(row.signedOutAt) : !row.signedOutAt)))
    if (!sortKey) return rows
    const getValue = (row: ReturnDriverRow) => {
      if (sortKey === "exceptionPending") return pending(row, "派送异常")
      if (sortKey === "noScanPending") return pending(row, "错分/No Scan")
      if (sortKey === "totalPending") return totalPending(row)
      return row[sortKey]
    }
    return [...rows].sort((left, right) => sortDirection === "asc" ? getValue(left) - getValue(right) : getValue(right) - getValue(left))
  }, [period, appliedDriverFilters, sortDirection, sortKey])

  const filteredWaybills = useMemo(() => waybillRows.filter((row) => {
    if (period === "next") return false
    return (appliedWaybillFilters.driver === "all" || row.driverId === appliedWaybillFilters.driver)
      && (!appliedWaybillFilters.query || row.trackingNumber === appliedWaybillFilters.query)
      && (appliedWaybillFilters.reasons.length === 0 || appliedWaybillFilters.reasons.includes(row.returnType))
      && (appliedWaybillFilters.status === "all" || row.returnStatus === appliedWaybillFilters.status)
  }), [period, appliedWaybillFilters])

  const shownDrivers = filteredDrivers.slice((driverPage - 1) * driverPageSize, driverPage * driverPageSize)
  const shownWaybills = filteredWaybills.slice((waybillPage - 1) * waybillPageSize, waybillPage * waybillPageSize)

  const drillToWaybills = (row: ReturnDriverRow, type?: ReturnType, status: "all" | "pending" = "pending") => {
    setWaybillDriver(row.driverId)
    setReturnReasons(type ? [type] : [])
    setReturnStatus(status)
    setAppliedWaybillFilters({ driver: row.driverId, query: "", reasons: type ? [type] : [], status: status === "pending" ? "待退回" : "all" })
    setWaybillPage(1)
    setView("waybill")
  }

  const applyDriverFilters = () => {
    setAppliedDriverFilters([driverFilter, signInFilter, signOutFilter])
    setDriverPage(1)
    toast.success("查询条件已应用")
  }

  const sortDrivers = (nextSortKey: ReturnSortKey) => {
    if (sortKey === nextSortKey) setSortDirection((current) => current === "asc" ? "desc" : "asc")
    else { setSortKey(nextSortKey); setSortDirection("asc") }
    setDriverPage(1)
  }

  const applyWaybillFilters = () => {
    const query = waybillQuery.trim()
    setWaybillQuery(query)
    setAppliedWaybillFilters({ driver: waybillDriver, query, reasons: [...returnReasons], status: returnStatus === "pending" ? "待退回" : returnStatus === "returned" ? "已退回" : "all" })
    setWaybillPage(1)
    toast.success("查询条件已应用")
  }

  return (
    <>
      <WaybillWorkspace rows={filteredWaybills} selected={selectedWaybill} onSelect={setSelectedWaybill} pageSize={waybillPageSize} onPageChange={setWaybillPage} scene="return" title="退回运单">
      <section className="animate-in fade-in slide-in-from-right-4 flex min-w-0 flex-col gap-3 rounded-xl bg-card p-5 duration-200" aria-label="应退回详情下钻">
        <div className="flex items-start gap-3">
          <Button variant="outline" size="sm" onClick={onBack}><ArrowLeftIcon data-icon="inline-start" />返回</Button>
          <h2 className="font-heading text-xl font-semibold text-foreground">应退回</h2>
        </div>

        <Tabs value={view} onValueChange={setView} className="min-w-0 gap-3">
          <TabsList variant="line">
            <TabsTrigger value="driver">司机视图</TabsTrigger>
            <TabsTrigger value="waybill">运单视图</TabsTrigger>
          </TabsList>

          <TabsContent value="driver" className="flex min-h-0 flex-1 flex-col gap-4">
            <QueryFilterLayout
              fieldCount={3}
              fields={<>
                <FilterSelect id="return-driver" label="司机" value={driverFilter} onChange={setDriverFilter} options={driverRows.map((row) => [row.driverId, row.driver])} />
                <FilterSelect id="return-sign-in" label="签到状态" value={signInFilter} onChange={setSignInFilter} options={[["yes", "已签到"], ["no", "未签到"]]} />
                <FilterSelect id="return-sign-out" label="签退状态" value={signOutFilter} onChange={setSignOutFilter} options={[["yes", "已签退"], ["no", "未签退"]]} />
              </>}
              actions={<>
                <Button onClick={applyDriverFilters}><SearchIcon data-icon="inline-start" />查询</Button>
                <Button variant="outline" onClick={() => { setDriverFilter("all"); setSignInFilter("all"); setSignOutFilter("all"); setAppliedDriverFilters(["all", "all", "all"]); setDriverPage(1) }}>重置</Button>
              </>}
            />

            <Table variant="grid" className="min-w-[97rem] table-fixed">
              <colgroup>
                <col className="w-36" />
                <col className="w-40" />
                <col className="w-40" />
                <col className="w-44" />
                <col className="w-44" />
                <col className="w-56" />
                <col className="w-56" />
                <col className="w-40" />
                <col className="w-24" />
              </colgroup>
              <TableHeader><TableRow>
                <TableHead>司机</TableHead><TableHead>签到时间</TableHead><TableHead>签退时间</TableHead>
                <SortableReturnHead label="派送异常应退回" sortKey="exceptionExpected" activeSortKey={sortKey} direction={sortDirection} onSort={sortDrivers} />
                <SortableReturnHead label="派送异常待退回" sortKey="exceptionPending" activeSortKey={sortKey} direction={sortDirection} onSort={sortDrivers} />
                <SortableReturnHead label="错分 + No Scan 应退回" sortKey="noScanExpected" activeSortKey={sortKey} direction={sortDirection} onSort={sortDrivers} />
                <SortableReturnHead label="错分 + No Scan 待退回" sortKey="noScanPending" activeSortKey={sortKey} direction={sortDirection} onSort={sortDrivers} />
                <SortableReturnHead label="待退回合计" sortKey="totalPending" activeSortKey={sortKey} direction={sortDirection} onSort={sortDrivers} />
                <TableHead sticky="right" className="w-24 min-w-24 text-center">操作</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {shownDrivers.map((row) => <TableRow key={row.driverId}>
                  <TableCell>{row.driver}</TableCell>
                  <TableCell className="tabular-nums">{formatDateTime(row.signedInAt, "未签到")}</TableCell>
                  <TableCell className="tabular-nums">{formatDateTime(row.signedOutAt, "未签退")}</TableCell>
                  <MetricCell value={row.exceptionExpected} onClick={() => drillToWaybills(row, "派送异常", "all")} label={`${row.driver} 的派送异常应退回`} />
                  <MetricCell value={pending(row, "派送异常")} onClick={() => drillToWaybills(row, "派送异常")} label={`${row.driver} 的派送异常待退回`} />
                  <MetricCell value={row.noScanExpected} onClick={() => drillToWaybills(row, "错分/No Scan", "all")} label={`${row.driver} 的错分应退回`} />
                  <MetricCell value={pending(row, "错分/No Scan")} onClick={() => drillToWaybills(row, "错分/No Scan")} label={`${row.driver} 的错分待退回`} />
                  <MetricCell value={totalPending(row)} onClick={() => drillToWaybills(row)} label={`${row.driver} 的待退回合计`} />
                  <TableCell sticky="right" className="w-24 min-w-24 text-center"><Button variant="link" size="xs" className="px-0" onClick={() => setContactDriver(row)}>联系司机</Button></TableCell>
                </TableRow>)}
                {shownDrivers.length === 0 ? <TableRow><TableCell colSpan={9} className="h-28 text-center text-muted-foreground">{period === "next" ? "暂无信息" : "暂无符合条件的司机"}</TableCell></TableRow> : null}
              </TableBody>
            </Table>
            <DataPagination className="border-t-0" page={driverPage} pageSize={driverPageSize} total={filteredDrivers.length} onPageChange={setDriverPage} onPageSizeChange={setDriverPageSize} showJumper={false} />
          </TabsContent>

          <TabsContent value="waybill" className="flex min-h-0 flex-1 flex-col gap-4">
            <QueryFilterLayout
              fieldCount={4}
              fields={<>
                <FilterSelect id="return-waybill-driver" label="司机" value={waybillDriver} onChange={setWaybillDriver} options={driverRows.map((row) => [row.driverId, row.driver])} />
                <Field><FieldLabel htmlFor="return-waybill-query" className="text-xs font-normal">运单编号</FieldLabel><Input id="return-waybill-query" value={waybillQuery} onChange={(event) => setWaybillQuery(event.target.value)} placeholder="请输入完整运单编号" onKeyDown={(event) => { if (event.key === "Enter") applyWaybillFilters() }} /></Field>
                <FilterSelect id="return-status" label="退回状态" value={returnStatus} onChange={setReturnStatus} options={[["pending", "待退回"], ["returned", "已退回"]]} />
                <Field><FieldLabel htmlFor="return-reason" className="text-xs font-normal">退回原因</FieldLabel><StatusMultiSelect id="return-reason" ariaLabel="选择退回原因，可多选" options={["派送异常", "错分/No Scan"]} value={returnReasons} onValueChange={setReturnReasons} /></Field>
              </>}
              secondaryActions={
                <Button variant="outline" onClick={() => toast.success("导出成功")}><DownloadIcon data-icon="inline-start" />导出</Button>
              }
              actions={<><Button onClick={applyWaybillFilters}><SearchIcon data-icon="inline-start" />查询</Button><Button variant="outline" onClick={() => { setWaybillDriver("all"); setWaybillQuery(""); setReturnReasons([]); setReturnStatus("all"); setAppliedWaybillFilters({ driver: "all", query: "", reasons: [], status: "all" }); setWaybillPage(1) }}>重置</Button></>}
            />

            <Table variant="grid" className="min-w-[145rem] table-fixed">
              <colgroup>
                <col className="w-48" />
                <col className="w-36" />
                <col className="w-36" />
                <col className="w-36" />
                <col className="w-32" />
                <col className="w-40" />
                <col className="w-48" />
                <col className="w-36" />
                <col className="w-48" />
                <col className="w-48" />
                <col className="w-48" />
                <col className="w-40" />
                <col className="w-48" />
                <col className="w-36" />
              </colgroup>
              <TableHeader><TableRow><TableHead>运单编号</TableHead><TableHead>运单状态</TableHead><TableHead>快递员</TableHead><TableHead>路区</TableHead><TableHead>邮编</TableHead><TableHead>快递员路线</TableHead><TableHead>退回原因</TableHead><TableHead>退回状态</TableHead><TableHead>问题件上报时间</TableHead><TableHead>退回时间</TableHead><TableHead>派送异常原因</TableHead><TableHead>最新操作</TableHead><TableHead>操作时间</TableHead><TableHead>操作人</TableHead></TableRow></TableHeader>
              <TableBody>
                {shownWaybills.map((row) => <TableRow key={row.trackingNumber}>
                  <TableCell><Button variant="link" size="xs" className="px-0" onClick={() => setSelectedWaybill(row)}>{row.trackingNumber}</Button></TableCell>
                  <TableCell>{row.waybillStatus}</TableCell><TableCell>{row.driver}</TableCell><TableCell>{row.route}</TableCell><TableCell>{row.postalCode}</TableCell><TableCell>{row.courierRoute}</TableCell><TableCell>{row.returnType}</TableCell><TableCell>{row.returnStatus}</TableCell>
                  <TableCell className="tabular-nums">{formatDateTime(row.reportedAt, "—")}</TableCell><TableCell className="tabular-nums">{formatDateTime(row.returnedAt, "—")}</TableCell><TableCell>{row.exceptionReason}</TableCell><TableCell>{row.latestAction}</TableCell><TableCell className="tabular-nums">{formatDateTime(row.actionAt, "—")}</TableCell><TableCell>{row.operator}</TableCell>
                </TableRow>)}
                {shownWaybills.length === 0 ? <TableRow><TableCell colSpan={14} className="h-28 text-center text-muted-foreground">暂无符合条件的运单</TableCell></TableRow> : null}
              </TableBody>
            </Table>
            <DataPagination className="border-t-0" page={waybillPage} pageSize={waybillPageSize} total={filteredWaybills.length} onPageChange={setWaybillPage} onPageSizeChange={setWaybillPageSize} showJumper={false} />
          </TabsContent>
        </Tabs>
      </section>

      </WaybillWorkspace>
      <Dialog open={Boolean(contactDriver)} onOpenChange={(open) => { if (!open) setContactDriver(null) }}>
        <DialogContent className="sm:max-w-sm" showCloseButton={false} onOpenAutoFocus={(event) => { event.preventDefault(); copyPhoneButtonRef.current?.focus() }}>
          <DialogClose asChild><Button variant="ghost" size="icon-sm" className="absolute top-2 right-2 border-transparent bg-transparent shadow-none" aria-label="关闭联系司机弹窗"><XIcon /></Button></DialogClose>
          <DialogTitle>联系司机</DialogTitle>
          <DialogDescription>{contactDriver?.driver} 的联系信息</DialogDescription>
          {contactDriver ? <div className="flex items-center justify-between gap-4 rounded-lg border bg-card p-3"><div className="flex min-w-0 flex-col gap-1"><span className="text-xs text-muted-foreground">{contactDriver.driver}</span><span className="text-base font-medium tabular-nums">{contactDriver.phone}</span></div><Button ref={copyPhoneButtonRef} onClick={async () => { try { await navigator.clipboard.writeText(contactDriver.phone); toast.success("手机号已复制") } catch { toast.error("复制失败，请手动复制手机号") } }}><CopyIcon data-icon="inline-start" />复制手机号</Button></div> : null}
        </DialogContent>
      </Dialog>
    </>
  )
}

function FilterSelect({ id, label, value, onChange, options }: { id: string; label: string; value: string; onChange: (value: string) => void; options: string[][] }) {
  return <Field><FieldLabel htmlFor={id} className="text-xs font-normal">{label}</FieldLabel><Select value={value} onValueChange={onChange}><SelectTrigger id={id} className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">全部</SelectItem>{options.map(([optionValue, optionLabel]) => <SelectItem key={optionValue} value={optionValue}>{optionLabel}</SelectItem>)}</SelectGroup></SelectContent></Select></Field>
}

function MetricCell({ value, onClick, label }: { value: number; onClick: () => void; label: string }) {
  return <TableCell><Button type="button" variant="link" size="xs" className="px-0 tabular-nums" onClick={onClick} aria-label={`查看${label}，共 ${value} 件`}>{value}</Button></TableCell>
}

function SortableReturnHead({ label, sortKey, activeSortKey, direction, onSort }: { label: string; sortKey: ReturnSortKey; activeSortKey: ReturnSortKey | null; direction: SortDirection; onSort: (key: ReturnSortKey) => void }) {
  const active = sortKey === activeSortKey
  return <TableHead><Button type="button" variant="ghost" size="xs" className="px-1 text-xs font-medium" onClick={() => onSort(sortKey)} aria-label={`${label}，${active ? `当前${direction === "asc" ? "升序" : "降序"}` : "未排序"}，点击排序`}>{label}<span data-icon="inline-end" className="flex flex-col"><ChevronUpIcon className={cn("size-3", active && direction === "asc" ? "text-brand" : "text-muted-foreground/40")} /><ChevronDownIcon className={cn("-mt-1 size-3", active && direction === "desc" ? "text-brand" : "text-muted-foreground/40")} /></span></Button></TableHead>
}
