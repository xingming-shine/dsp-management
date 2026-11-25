"use client"

import { useRef, useState, type ReactNode } from "react"
import { DownloadIcon, MoreHorizontalIcon, FileCheck2Icon, PlusIcon, RotateCcwIcon, SearchIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { DataPagination } from "@/components/ui/pagination"
import { PeriodPicker } from "@/components/ui/period-picker"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { formatDate, formatDateRange, formatDateTime } from "@/lib/date-time"
import { useTimezone } from "@/features/preferences/timezone-store"
import { useBills } from "../store"
import { downloadBill, downloadInvoice } from "../export"
import { BILL_LABELS, BILLING_LABELS, CYCLE_LABELS, INVOICE_LABELS, KIND_LABELS, gross, integer, invoiceBalance, parseBillNumbers, todayISO, type Bill, type BillKind, type BillStatus, type BillingStatus, type Invoice, type InvoiceStatus } from "../model"
import { Amount, BillBadge, BillingBadge, BillsWorkspace, FilterSelect, InvoiceBadge, NoResults, StatusFilter } from "./bill-parts"
import { BillDetail } from "./bill-detail"
import { InvoiceDetail, InvoiceForm } from "./invoice-panels"
import { ReviewPanel } from "./review-panel"

type Tab = BillKind | "invoices"
type Filters = { numbers: string; status: BillStatus | "all"; cycle: string; from: string; to: string }
const EMPTY_FILTERS: Filters = { numbers: "", status: "all", cycle: "all", from: "", to: "" }
type Panel = { type: "bill" | "log" | "invoice" | "review" | "create"; id?: string; kind: BillKind; ids: string[]; selection?: string[] }
type Column = { label: string; cell: (bill: Bill) => ReactNode }
function counts<T>(rows: T[], key: (row: T) => string) {
  return rows.reduce<Record<string, number>>((result, row) => { const value = key(row); result[value] = (result[value] ?? 0) + 1; return result }, { all: rows.length })
}
export function BillsPage() {
  const state = useBills()
  const timezone = useTimezone()
  const [tab, setTab] = useState<Tab>("delivery")
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS)
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [billingStatus, setBillingStatus] = useState<BillingStatus | "all">("all")
  const [invoiceStatus, setInvoiceStatus] = useState<InvoiceStatus | "all">("all")
  const [filterError, setFilterError] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selected, setSelected] = useState<string[]>([])
  const [panel, setPanel] = useState<Panel | null>(null)
  const [previousPanel, setPreviousPanel] = useState<Panel | null>(null)
  const [returnedId, setReturnedId] = useState<string | null>(null)
  const tableRef = useRef<HTMLDivElement>(null)
  const originScroll = useRef(0)
  const originTrigger = useRef<HTMLElement | null>(null)
  const bills = state.bills.filter((bill) => bill.kind === (tab === "invoices" ? "delivery" : tab))
  const numbers = parseBillNumbers(filters.numbers)
  const base = bills.filter((bill) => (!numbers.length || numbers.includes(bill.id)) && (filters.cycle === "all" || filters.cycle === bill.cycle) && (!filters.from || bill.end >= filters.from) && (!filters.to || bill.start <= filters.to))
  const filtered = base.filter((bill) => (filters.status === "all" || bill.status === filters.status) && (billingStatus === "all" || invoiceBalance(bill, state.invoices).status === billingStatus))
  const invoices = state.invoices.filter((invoice) => invoiceStatus === "all" || invoice.status === invoiceStatus)
  const total = tab === "invoices" ? invoices.length : filtered.length
  const currentPage = Math.min(page, Math.max(1, Math.ceil(total / pageSize)))
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const visibleInvoices = invoices.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const currentSelection = selected.filter((id) => visible.some((bill) => bill.id === id))
  const selectedRows = visible.filter((bill) => currentSelection.includes(bill.id))
  const eligible = selectedRows.filter((bill) => bill.status === "pending")
  const canInvoice = selectedRows.filter((bill) => invoiceBalance(bill, state.invoices).status === "unbilled")

  function reset() { setDraft(EMPTY_FILTERS); setFilters(EMPTY_FILTERS); setBillingStatus("all"); setPage(1); setSelected([]); setFilterError("") }
  function changeTab(value: string) { setTab(value as Tab); reset(); setInvoiceStatus("all") }
  function changeFilter(key: keyof Filters, value: string) { setDraft((previous) => ({ ...previous, [key]: value })); setFilterError("") }
  function query(event: React.FormEvent) {
    event.preventDefault()
    try { parseBillNumbers(draft.numbers); if (draft.from && draft.to && draft.from > draft.to) throw new Error("开始日期不能晚于结束日期"); setFilters(draft); setPage(1); setSelected([]); setFilterError("") } catch (error) { setFilterError(error instanceof Error ? error.message : "查询条件无效") }
  }
  function changePage(value: number) { setPage(value); setSelected([]); tableRef.current?.scrollIntoView({ block: "start", behavior: "instant" }) }
  function open(next: Panel) {
    if (!panel) { originScroll.current = window.scrollY; originTrigger.current = document.activeElement as HTMLElement; setPreviousPanel(null) }
    setPanel(next); setReturnedId(null)
  }
  function returnToList() {
    if (previousPanel) { setPanel(previousPanel); setPreviousPanel(null); return }
    const id = panel?.id
    setReturnedId(id ?? null); setPanel(null); setSelected([])
    requestAnimationFrame(() => {
      window.scrollTo({ top: originScroll.current, behavior: "instant" })
      const row = Array.from(tableRef.current?.querySelectorAll<HTMLElement>("[data-bill-id]") ?? []).find((element) => element.dataset.billId === id)
      const target = row?.querySelector<HTMLButtonElement>("button")
      if (target) target.focus({ preventScroll: true })
      else if (originTrigger.current?.isConnected) originTrigger.current.focus({ preventScroll: true })
      else document.getElementById("bills-tabs")?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')?.focus({ preventScroll: true })
    })
  }
  function openBill(id: string, type: "bill" | "log" = "bill") {
    const bill = state.bills.find((row) => row.id === id)
    if (!bill) { toast.error("账单不存在"); return }
    if (panel?.type === "invoice") setPreviousPanel(panel)
    open({ type, id, kind: bill.kind, ids: tab === bill.kind ? filtered.map((row) => row.id) : state.bills.filter((row) => row.kind === bill.kind).map((row) => row.id) })
  }
  function openInvoice(id: string) {
    const invoice = state.invoices.find((row) => row.id === id)
    if (!invoice) { toast.error("申请单不存在"); return }
    open({ type: "invoice", id, kind: invoice.kind, ids: Array.from(new Set([id, ...invoices.map((row) => row.id)])) })
  }
  function startCreate(kind: BillKind, fromInvoices = false) {
    const candidates = fromInvoices ? state.bills.filter((row) => row.kind === kind && invoiceBalance(row, state.invoices).status === "unbilled").slice(0, pageSize) : visible
    const invoiceSelection = candidates.filter((row) => invoiceBalance(row, state.invoices).status === "unbilled" && (fromInvoices || currentSelection.includes(row.id))).map((row) => row.id)
    if (!invoiceSelection.length) { toast.info("当前页没有可开票账单", { description: "请切换账单页或调整查询条件。" }); return }
    open({ type: "create", kind, ids: candidates.map((row) => row.id), selection: invoiceSelection })
  }
  function review() { open({ type: "review", kind: tab as BillKind, ids: visible.map((row) => row.id), selection: eligible.map((row) => row.id) }) }
  const billColumns: Column[] = [
    { label: "账单编号", cell: (bill) => <Button variant="link" size="xs" onClick={() => openBill(bill.id)}>{bill.id}</Button> },
    { label: "账单金额_未税", cell: (bill) => <Amount cents={bill.netCents} /> }, { label: "账单金额_税额", cell: (bill) => <Amount cents={bill.taxCents} /> }, { label: "账单金额_含税", cell: (bill) => <Amount cents={gross(bill)} /> },
    { label: "所属供应商", cell: (bill) => bill.supplier }, { label: "车队", cell: (bill) => bill.fleet }, { label: "结算周期", cell: (bill) => CYCLE_LABELS[bill.cycle] },
    { label: "账期", cell: (bill) => `W${bill.week} · ${formatDateRange(bill.start, bill.end)}` }, { label: "账期范围", cell: (bill) => formatDateRange(bill.start, bill.end) }, { label: "结算币种", cell: (bill) => bill.currency },
    { label: "账单票数", cell: (bill) => integer(bill.count) }, { label: "税率", cell: (bill) => `${bill.taxRate}%` },
    ...(tab === "delivery" ? [{ label: "派件费_未税", cell: (bill: Bill) => <Amount cents={bill.deliveryCents} /> }, { label: "理赔明细金额_未税", cell: (bill: Bill) => <Amount cents={bill.claimCents} /> }] : [{ label: "理赔金额_未税", cell: (bill: Bill) => <Amount cents={bill.claimCents} /> }, { label: "调账明细金额_未税", cell: (bill: Bill) => <Amount cents={bill.detailAdjustmentCents} /> }]),
    { label: "调总账金额_未税", cell: (bill) => <Amount cents={bill.adjustmentCents} /> }, ...(tab === "delivery" ? [{ label: "合并账单", cell: (bill: Bill) => bill.merged ? "是" : "否" }] : []),
    { label: "账单状态", cell: (bill) => <BillBadge status={bill.status} /> }, { label: "待开票金额", cell: (bill) => <Amount cents={invoiceBalance(bill, state.invoices).remaining} /> }, { label: "开票状态", cell: (bill) => <BillingBadge status={invoiceBalance(bill, state.invoices).status} /> },
  ]
  const pagination = <DataPagination page={currentPage} pageSize={pageSize} total={total} onPageChange={changePage} onPageSizeChange={(value) => { setPageSize(value); setPage(1); setSelected([]) }} />
  const filterToolbar = <div className="flex flex-col gap-4">
    <div className="flex flex-col gap-4 lg:flex-row lg:gap-8"><StatusFilter label="账单状态" value={filters.status} options={BILL_LABELS} counts={counts(base, (bill) => bill.status)} onChange={(value) => { setFilters({ ...filters, status: value as Filters["status"] }); setDraft({ ...draft, status: value as Filters["status"] }); setPage(1); setSelected([]) }} /><StatusFilter label="开票状态" value={billingStatus} options={BILLING_LABELS} counts={counts(base, (bill) => invoiceBalance(bill, state.invoices).status)} onChange={(value) => { setBillingStatus(value as BillingStatus | "all"); setPage(1); setSelected([]) }} /></div><Separator />
    <form onSubmit={query} className="flex flex-col gap-4"><FieldGroup className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 xl:grid-cols-4"><Field data-invalid={Boolean(filterError)}><FieldLabel htmlFor="bill-numbers">账单编号</FieldLabel><Textarea id="bill-numbers" rows={1} className="min-h-9 resize-y" aria-invalid={Boolean(filterError)} value={draft.numbers} onChange={(event) => changeFilter("numbers", event.target.value)} placeholder="批量输入，最多1000个" /></Field><FilterSelect id="bill-status" label="账单状态" value={draft.status} options={BILL_LABELS} onChange={(value) => changeFilter("status", value)} /><FilterSelect id="bill-cycle" label="结算周期" value={draft.cycle} options={CYCLE_LABELS} onChange={(value) => changeFilter("cycle", value)} /><PeriodPicker triggerClassName="max-w-none" label="账期" modes={["day"]} showGranularity={false} allowRange selection={{ mode: "day", value: draft.from || todayISO(timezone), ...(draft.from && draft.to && draft.from !== draft.to ? { range: { start: draft.from, end: draft.to } } : {}) }} placeholder={draft.from ? undefined : "选择账期内的日期或范围"} onChange={(selection) => setDraft({ ...draft, from: selection.range?.start ?? selection.value, to: selection.range?.end ?? selection.value })} /></FieldGroup>
      {filterError && <FieldError>{filterError}</FieldError>}<div className="flex flex-wrap items-center justify-between gap-3"><div className="ml-auto flex gap-2"><Button type="submit"><SearchIcon data-icon="inline-start" />查询</Button><Button type="button" variant="outline" onClick={reset}><RotateCcwIcon data-icon="inline-start" />重置</Button></div></div>
    </form><Separator /><div className="flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-muted-foreground" aria-live="polite">{currentSelection.length ? `已选 ${currentSelection.length} 张 · 可确认/驳回 ${eligible.length} 张 · 可开票 ${canInvoice.length} 张` : "勾选当前页账单后操作；仅待DSP确认账单可确认/驳回，仅未开票账单可申请开票"}</span><div className="flex flex-wrap gap-2">{currentSelection.length > 0 && <Button variant="ghost" size="sm" onClick={() => setSelected([])}>清空选择</Button>}<Button variant="outline" size="sm" disabled={!eligible.length} onClick={review}><FileCheck2Icon data-icon="inline-start" />账单确认或驳回{eligible.length > 0 && ` (${eligible.length})`}</Button><Button variant="outline" size="sm" disabled={!canInvoice.length} onClick={() => startCreate(tab as BillKind)}><PlusIcon data-icon="inline-start" />申请开票{canInvoice.length > 0 && ` (${canInvoice.length})`}</Button></div></div>
  </div>
  const activeBill = panel ? state.bills.find((bill) => bill.id === panel.id) : undefined
  const activeInvoice = panel ? state.invoices.find((invoice) => invoice.id === panel.id) : undefined
  const workspaceBills = panel ? panel.ids.flatMap((id) => { const row = state.bills.find((bill) => bill.id === id); return row ? [row] : [] }) : []
  const workspaceInvoices = panel ? panel.ids.flatMap((id) => { const row = state.invoices.find((invoice) => invoice.id === id); return row ? [row] : [] }) : []
  const records = panel?.type === "invoice" ? workspaceInvoices.map((invoice) => ({ id: invoice.id, status: <InvoiceBadge status={invoice.status} />, amount: gross(invoice), description: formatDate(invoice.date) })) : workspaceBills.map((bill) => ({ id: bill.id, status: panel?.type === "create" ? <BillingBadge status={invoiceBalance(bill, state.invoices).status} /> : <BillBadge status={bill.status} />, amount: panel?.type === "create" ? invoiceBalance(bill, state.invoices).remaining : gross(bill), start: bill.start, end: bill.end, disabled: panel?.type === "create" ? invoiceBalance(bill, state.invoices).status !== "unbilled" : panel?.type === "review" ? bill.status !== "pending" : false }))
  const selectedBills = workspaceBills.filter((bill) => panel?.selection?.includes(bill.id))

  return <div className="min-w-0"><div hidden={Boolean(panel)}><div className="-mt-2 flex min-w-0 flex-col gap-6">
    <Tabs value={tab} onValueChange={changeTab} className="min-w-0 gap-3"><div className="min-w-0 overflow-x-auto pb-1"><TabsList id="bills-tabs" variant="line" aria-label="账单管理模块"><TabsTrigger value="delivery">派费账单 <span className="tabular-nums">{state.bills.filter((bill) => bill.kind === "delivery").length}</span></TabsTrigger><TabsTrigger value="claim">理赔账单 <span className="tabular-nums">{state.bills.filter((bill) => bill.kind === "claim").length}</span></TabsTrigger><TabsTrigger value="invoices">开票申请单 <span className="tabular-nums">{state.invoices.length}</span></TabsTrigger></TabsList></div><TabsContent value={tab} className="min-w-0">
    <div ref={tableRef} className="min-w-0" style={{ scrollMarginTop: "5rem" }}>{tab !== "invoices" ? <Table variant="grid" aria-label={KIND_LABELS[tab]} viewportClassName="mx-4 mb-4 rounded-lg border" toolbar={filterToolbar} footer={pagination}><TableHeader><TableRow><TableHead className="w-12 min-w-12 text-center [&:has([role=checkbox])]:pe-3"><Checkbox className="mx-auto" aria-label="全选当前页记录" disabled={!visible.length} checked={visible.length > 0 && currentSelection.length === visible.length ? true : currentSelection.length > 0 ? "indeterminate" : false} onCheckedChange={(checked) => setSelected(checked === true ? visible.map((bill) => bill.id) : [])} /></TableHead>{billColumns.map((column) => <TableHead key={column.label} className={column.label === "合并账单" ? "text-center" : undefined}>{column.label}</TableHead>)}<TableHead sticky="right" className="w-16 text-center sm:w-48">操作</TableHead></TableRow></TableHeader><TableBody>{visible.map((bill) => <TableRow key={bill.id} data-bill-id={bill.id} data-state={selected.includes(bill.id) || returnedId === bill.id ? "selected" : undefined}><TableCell className="text-center [&:has([role=checkbox])]:pe-3"><Checkbox className="mx-auto" aria-label={`选择账单 ${bill.id}`} checked={currentSelection.includes(bill.id)} onCheckedChange={(checked) => setSelected(checked === true ? [...currentSelection, bill.id] : currentSelection.filter((id) => id !== bill.id))} /></TableCell>{billColumns.map((column) => <TableCell key={column.label} className={column.label === "合并账单" ? "text-center" : "tabular-nums"}>{column.cell(bill)}</TableCell>)}<TableCell sticky="right" className="text-center"><RowActions name={bill.id} actions={[{ label: "明细", run: () => openBill(bill.id) }, { label: "日志", run: () => openBill(bill.id, "log") }, { label: "下载账单", run: () => { downloadBill(bill, timezone); toast.success("模拟账单已下载") } }]} /></TableCell></TableRow>)}{!visible.length && <TableRow><TableCell colSpan={billColumns.length + 2}><NoResults /></TableCell></TableRow>}</TableBody></Table> : <InvoiceList rows={visibleInvoices} timezone={timezone} onOpen={openInvoice} onBill={openBill} footer={pagination} toolbar={<div className="flex flex-col gap-4"><StatusFilter label="审核状态" value={invoiceStatus} options={INVOICE_LABELS} counts={counts(state.invoices, (invoice) => invoice.status)} onChange={(value) => { setInvoiceStatus(value as InvoiceStatus | "all"); setPage(1) }} /><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted-foreground">审核由财务处理 · 驳回后需作废重开 · 冲销只读跟踪</p><DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline"><PlusIcon data-icon="inline-start" />申请开票</Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuGroup><DropdownMenuItem onSelect={() => startCreate("delivery", true)}>申请派费发票</DropdownMenuItem><DropdownMenuItem onSelect={() => startCreate("claim", true)}>申请理赔发票</DropdownMenuItem></DropdownMenuGroup></DropdownMenuContent></DropdownMenu></div></div>} />}</div>
  </TabsContent></Tabs></div></div>
  {panel && <BillsWorkspace key={`${panel.type}-${panel.kind}`} returnLabel={previousPanel ? "返回申请单" : "返回列表"} title={panel.type === "invoice" ? "开票申请单" : panel.type === "review" ? "账单确认或驳回" : panel.type === "create" ? "申请开票" : KIND_LABELS[panel.kind]} records={records} activeId={panel.id} selected={panel.selection} onSelection={(selection) => setPanel({ ...panel, selection })} onNavigate={(id) => setPanel({ ...panel, id })} onReturn={returnToList}>{(close) => <>
    {(panel.type === "bill" || panel.type === "log") && activeBill && <BillDetail key={`${panel.type}-${activeBill.id}`} bill={activeBill} logsOnly={panel.type === "log"} onClose={close} onLog={() => setPanel({ ...panel, type: "log" })} onDetail={() => setPanel({ ...panel, type: "bill" })} />}
    {panel.type === "review" && <ReviewPanel bills={selectedBills} onClose={close} onComplete={returnToList} />}
    {panel.type === "create" && <InvoiceForm bills={selectedBills} kind={panel.kind} onRemove={(id) => setPanel({ ...panel, selection: panel.selection?.filter((value) => value !== id) })} onClose={close} onCreated={(id) => { setTab("invoices"); setInvoiceStatus("all"); setPage(1); setPreviousPanel(null); setPanel({ type: "invoice", id, kind: panel.kind, ids: [id, ...state.invoices.map((invoice) => invoice.id)] }) }} />}
    {panel.type === "invoice" && activeInvoice && <InvoiceDetail key={activeInvoice.id} invoice={activeInvoice} onClose={close} onBill={openBill} onRelated={(id) => setPanel({ ...panel, id, ids: Array.from(new Set([...panel.ids, id])) })} onDeleted={returnToList} />}
  </>}</BillsWorkspace>}
  </div>
}

function InvoiceList({ rows, toolbar, footer, onOpen, onBill, timezone }: { rows: Invoice[]; toolbar: ReactNode; footer: ReactNode; onOpen: (id: string) => void; onBill: (id: string) => void; timezone: string }) {
  return <Table variant="grid" aria-label="开票申请单列表" viewportClassName="mx-4 mb-4 rounded-lg border" toolbar={toolbar} footer={footer}><TableHeader><TableRow>{["流水号", "供应商发票号", "开票日期", "发票金额", "税额", "未税金额", "税率", "币种", "审核状态", "关联账单", "发票类型", `创建时间 (${timezone})`, "创建人"].map((label) => <TableHead key={label}>{label}</TableHead>)}<TableHead sticky="right" className="w-16 text-center sm:w-48">操作</TableHead></TableRow></TableHeader><TableBody>{rows.map((invoice) => <TableRow key={invoice.id} data-bill-id={invoice.id}><TableCell><Button variant="link" size="xs" onClick={() => onOpen(invoice.id)}>{invoice.id}</Button></TableCell><TableCell>{invoice.number}</TableCell><TableCell className="tabular-nums">{formatDate(invoice.date)}</TableCell><TableCell><Amount cents={gross(invoice)} /></TableCell><TableCell><Amount cents={invoice.taxCents} /></TableCell><TableCell><Amount cents={invoice.netCents} /></TableCell><TableCell className="tabular-nums">{invoice.taxRate}%</TableCell><TableCell>{invoice.currency}</TableCell><TableCell><div className="flex flex-col items-start gap-1 py-2"><InvoiceBadge status={invoice.status} />{invoice.reason && <p className="max-w-52 whitespace-normal text-xs text-destructive">{invoice.reason}</p>}{invoice.originalId && <span className="text-xs text-muted-foreground">冲销原票 {invoice.originalId}</span>}</div></TableCell><TableCell><div className="flex flex-col items-start gap-1">{invoice.lines.map((line) => <Button key={line.billId} variant="link" size="xs" onClick={() => onBill(line.billId)}>{line.billId}</Button>)}</div></TableCell><TableCell>{invoice.kind === "delivery" ? "派费发票" : "理赔发票"}{invoice.originalId ? "（冲销）" : ""}</TableCell><TableCell className="tabular-nums">{formatDateTime(invoice.createdAt, { timeZone: timezone })}</TableCell><TableCell>{invoice.createdBy}</TableCell><TableCell sticky="right" className="text-center"><RowActions name={invoice.id} actions={[{ label: invoice.status === "draft" ? "提交 / 删除" : invoice.status === "rejected" ? "查看 / 作废" : "查看", run: () => onOpen(invoice.id) }, ...(invoice.status === "approved" ? [{ label: "下载发票", icon: <DownloadIcon data-icon="inline-start" />, run: () => { downloadInvoice(invoice); toast.success("模拟发票PDF已下载") } }] : [])]} /></TableCell></TableRow>)}{!rows.length && <TableRow><TableCell colSpan={14}><NoResults /></TableCell></TableRow>}</TableBody></Table>
}

function RowActions({ name, actions }: { name: string; actions: { label: string; run: () => void; icon?: ReactNode }[] }) {
  return <><div className="mx-auto hidden w-44 items-center justify-start gap-1 sm:flex">{actions.map((action) => <Button key={action.label} variant="link" size="xs" onClick={action.run}>{action.icon}{action.label}</Button>)}</div><div className="sm:hidden"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" aria-label={`${name} 操作`}><MoreHorizontalIcon /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuGroup>{actions.map((action) => <DropdownMenuItem key={action.label} onSelect={action.run}>{action.icon}{action.label}</DropdownMenuItem>)}</DropdownMenuGroup></DropdownMenuContent></DropdownMenu></div></>
}
