"use client"

import { useMemo, useState, type ReactNode } from "react"
import { DownloadIcon, SearchIcon, RotateCcwIcon } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { DataPagination } from "@/components/ui/pagination"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { WorkflowPanel } from "@/features/withdrawal-mode/components/withdrawal-parts"
import { formatDate, formatDateRange, formatDateTime } from "@/lib/date-time"
import { useTimezone } from "@/features/preferences/timezone-store"
import { adjustmentDetails, claimDetails, deliveryDetails } from "../mock-data"
import { downloadBill } from "../export"
import { gross, integer, KIND_LABELS, type Bill } from "../model"
import { Amount, BillBadge, History, NoResults, unavailable } from "./bill-parts"

type Column<T> = { label: string; render: (row: T) => ReactNode }
function DetailTable<T extends { id: string }>({ rows, columns, searchable, summary, name }: { rows: T[]; columns: Column<T>[]; searchable?: boolean; summary: (rows: T[]) => ReactNode; name: string }) {
  const [draft, setDraft] = useState("")
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(10)
  const filtered = rows.filter((row) => row.id.toLowerCase().includes(query.toLowerCase()))
  const current = Math.min(page, Math.max(1, Math.ceil(filtered.length / size)))
  return <Table variant="grid" aria-label={name} viewportClassName="mx-4 mb-4 rounded-lg border" toolbar={<div className="flex flex-col gap-4">{searchable && <form onSubmit={(event) => { event.preventDefault(); setQuery(draft.trim()); setPage(1) }}><FieldGroup className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2"><Field><FieldLabel htmlFor={`search-${name}`}>运单号</FieldLabel><Input id={`search-${name}`} placeholder="输入运单号" value={draft} onChange={(event) => setDraft(event.target.value)} /></Field><div className="flex justify-end gap-2"><Button type="submit"><SearchIcon data-icon="inline-start" />查询</Button><Button type="button" variant="outline" onClick={() => { setDraft(""); setQuery(""); setPage(1) }}><RotateCcwIcon data-icon="inline-start" />重置</Button></div></FieldGroup></form>}<div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">{summary(filtered)}</div></div>} footer={<DataPagination page={current} pageSize={size} total={filtered.length} onPageChange={setPage} onPageSizeChange={(value) => { setSize(value); setPage(1) }} />}><TableHeader><TableRow>{columns.map((column) => <TableHead key={column.label}>{column.label}</TableHead>)}</TableRow></TableHeader><TableBody>{filtered.slice((current - 1) * size, current * size).map((row) => <TableRow key={row.id}>{columns.map((column) => <TableCell key={column.label} className="tabular-nums">{column.render(row)}</TableCell>)}</TableRow>)}{!filtered.length && <TableRow><TableCell colSpan={columns.length}><NoResults /></TableCell></TableRow>}</TableBody></Table>
}
function WaybillLink({ id }: { id: string }) { return <Button variant="link" size="xs" onClick={() => unavailable(`运单 ${id} 查询`)}>{id}</Button> }
export function BillDetail({ bill, logsOnly = false, onClose, onLog, onDetail }: { bill: Bill; logsOnly?: boolean; onClose: () => void; onLog: () => void; onDetail: () => void }) {
  const timezone = useTimezone()
  const [tab, setTab] = useState(bill.kind === "delivery" ? "delivery" : "claims")
  const deliveries = useMemo(() => deliveryDetails(bill), [bill])
  const claims = useMemo(() => claimDetails(bill), [bill])
  const adjustments = useMemo(() => adjustmentDetails(bill), [bill])
  const label = logsOnly ? "操作日志" : bill.kind === "delivery" ? "派费明细" : "理赔明细"
  return <WorkflowPanel title={`${label} · ${bill.id}`} description={`${bill.fleet} · ${bill.supplier} · ${formatDateRange(bill.start, bill.end)}`} onClose={onClose} footer={() => <><Button variant="outline" onClick={() => { downloadBill(bill, timezone); toast.success("模拟账单已下载") }}><DownloadIcon data-icon="inline-start" />下载账单</Button><Button variant={logsOnly ? "default" : "outline"} onClick={logsOnly ? onDetail : onLog}>{logsOnly ? "查看明细" : "操作日志"}</Button></>}>
    <div><BillBadge status={bill.status} /></div>
    {logsOnly ? <History logs={bill.logs} /> : <>
      <dl className="grid grid-cols-2 gap-4 xl:grid-cols-4">{[
        { label: "账单票数", value: integer(bill.count) }, { label: "账单金额_含税", value: <Amount cents={gross(bill)} /> },
        { label: bill.kind === "delivery" ? "派件费_未税" : "理赔金额_未税", value: <Amount cents={bill.kind === "delivery" ? bill.deliveryCents : bill.claimCents} /> },
        { label: "调总账金额_未税", value: <Amount cents={bill.adjustmentCents} /> },
      ].map((metric) => <div key={metric.label} className="flex flex-col gap-2"><dt className="text-xs text-muted-foreground">{metric.label}</dt><dd className="text-xl font-medium tabular-nums">{metric.value}</dd></div>)}</dl>
      <Tabs value={tab} onValueChange={setTab} className="min-w-0 gap-4"><div className="overflow-x-auto pb-1"><TabsList variant="line" aria-label="账单明细类型">{bill.kind === "delivery" && <TabsTrigger value="delivery">账单明细</TabsTrigger>}<TabsTrigger value="adjustments">调总账明细</TabsTrigger><TabsTrigger value="claims">理赔明细</TabsTrigger></TabsList></div>
        <TabsContent value="delivery" className="min-w-0"><p className="mb-3 text-xs text-muted-foreground">时间按 {timezone} 展示 · 运单查询入口暂未接入</p><DetailTable name="派费运单明细" rows={deliveries} searchable summary={(rows) => <><span>账单票数：{integer(rows.length)}</span><span>费用合计_未税：<Amount cents={rows.reduce((sum, row) => sum + row.cents, 0)} /> USD</span></>} columns={[
          { label: "运单号", render: (row) => <WaybillLink id={row.id} /> }, { label: "目的城市", render: (row) => row.city }, { label: "目的州", render: (row) => row.state }, { label: "收件邮编", render: (row) => row.zip }, { label: "转运中心", render: (row) => row.hub }, { label: "车队", render: (row) => row.fleet }, { label: "区域/路线", render: (row) => row.route }, { label: "签收类型", render: (row) => row.signType }, { label: "快递员", render: (row) => row.driver }, { label: "快递员ID", render: (row) => row.driverId }, { label: "车队签入时间", render: (row) => formatDateTime(row.checkIn, { timeZone: timezone }) }, { label: "待出库时间", render: (row) => formatDateTime(row.outbound, { timeZone: timezone }) }, { label: "签收时间", render: (row) => formatDateTime(row.signedAt, { timeZone: timezone }) }, { label: "同天同点数", render: (row) => row.samePoint >= 2 ? <Badge size="sm" variant="secondary">{row.samePoint} · 同点派送</Badge> : row.samePoint }, { label: "第一票单号", render: (row) => <WaybillLink id={row.firstId} /> }, { label: "结算重量(kg)", render: (row) => row.kg.toFixed(3) }, { label: "结算重量(lb)", render: (row) => (row.kg * 2.20462262).toFixed(4) }, { label: "费用合计_未税", render: (row) => <Amount cents={row.cents} decimals={4} /> },
        ]} /></TabsContent>
        <TabsContent value="claims" className="min-w-0"><DetailTable name="理赔明细" rows={claims} searchable summary={(rows) => <><span>账单票数：{rows.length}</span><span>费用合计_未税：<Amount cents={rows.reduce((sum, row) => sum + row.cents, 0)} /> USD</span></>} columns={[
          { label: "日期", render: (row) => formatDate(row.date) }, { label: "运单号", render: (row) => <WaybillLink id={row.id} /> }, { label: "快递员", render: (row) => row.driver }, { label: "邮编", render: (row) => row.zip }, { label: "理赔类型", render: (row) => <Badge size="sm" variant="outline">{row.type}</Badge> }, { label: "含税", render: () => "否" }, { label: "税率", render: () => `${bill.taxRate}%` }, { label: "申报货值(USD)", render: (row) => <Amount cents={row.declaredCents} /> }, { label: "结算重量(kg)", render: (row) => row.kg.toFixed(3) }, { label: "确认日期", render: (row) => formatDate(row.confirmedDate) }, { label: "费用合计_未税", render: (row) => <Amount cents={row.cents} /> },
        ]} /></TabsContent>
        <TabsContent value="adjustments" className="min-w-0"><DetailTable name="调总账明细" rows={adjustments} summary={(rows) => <><span>记录数：{rows.length}</span><span>调账金额_未税：<Amount cents={rows.reduce((sum, row) => sum + row.cents, 0)} /> USD</span></>} columns={[
          { label: "日期", render: (row) => formatDate(row.date) }, { label: "费用类型", render: (row) => row.type }, { label: "含税", render: () => "否" }, { label: "税率", render: () => `${bill.taxRate}%` }, { label: "调账金额_未税", render: (row) => <Amount cents={row.cents} /> }, { label: "调账说明", render: (row) => row.note }, { label: "快递员", render: (row) => row.driver }, { label: "快递员ID", render: (row) => row.driverId },
        ]} /></TabsContent>
      </Tabs><p className="text-xs text-muted-foreground">{KIND_LABELS[bill.kind]}模拟明细 · 下载文件包含完整明细及汇总。</p>
    </>}
  </WorkflowPanel>
}
