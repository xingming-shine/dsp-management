"use client"

import { useLayoutEffect, useRef, useState } from "react"
import { ChevronDownIcon, RotateCcwIcon, SearchIcon } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { DataPagination } from "@/components/ui/pagination"
import { PeriodPicker } from "@/components/ui/period-picker"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { formatDate } from "@/lib/date-time"
import { mockSession } from "@/mocks/session"
import { useOrganization } from "@/features/organizations/organization-context"
import { dateInZone } from "@/features/withdrawal-mode/model"
import { EmptyResults } from "@/features/withdrawal-mode/components/withdrawal-parts"
import { enterWithdrawalWorkspace, WithdrawalRecordWorkspace, withdrawalTransitionName, type RecordNavigation } from "@/features/withdrawal-mode/components/withdrawal-workspace"
import { AUDIT_LABELS, EMPTY_FILTERS, MODE_LABELS, TYPE_LABELS, filterDrivers, maskName, maskPhone, type DriverWithdrawal, type Filters, type ReviewDraft } from "../model"
import { submitDriverReview, useDriverWithdrawals } from "../store"
import { displayTime, DriverAuditBadge, DriverDetailPanel, DriverLogsPanel, DriverModeBadge, DriverReviewPanel } from "./driver-panels"

type Panel = { type: "detail" | "audit" | "logs"; id: string }
function FilterSelect({ name, label, value, options, onChange }: { name: string; label: string; value: string; options: [string, string][]; onChange: (value: string) => void }) {
  return <Field><FieldLabel htmlFor={`driver-filter-${name}`}>{label}</FieldLabel><Select value={value} onValueChange={onChange}><SelectTrigger id={`driver-filter-${name}`} className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">全部</SelectItem>{options.map(([id, text]) => <SelectItem key={id} value={id}>{text}</SelectItem>)}</SelectGroup></SelectContent></Select></Field>
}
function RowActions({ row, onOpen }: { row: DriverWithdrawal; onOpen: (panel: Panel, trigger: HTMLElement) => void }) {
  const trigger = useRef<HTMLButtonElement>(null)
  const operations: { type: Panel["type"]; label: string }[] = [{ type: "detail", label: "详情" }, { type: "logs", label: "操作日志" }, ...(row.auditStatus === "pending" ? [{ type: "audit" as const, label: "审核" }] : [])]
  return <>
    <div className="mx-auto hidden w-44 max-w-full items-center justify-start gap-1 sm:flex">{operations.map((operation) => <Button key={operation.type} variant="link" size="xs" onClick={(event) => onOpen({ type: operation.type, id: row.id }, event.currentTarget)}>{operation.label}</Button>)}</div>
    <div className="sm:hidden"><DropdownMenu><DropdownMenuTrigger asChild><Button ref={trigger} variant="link" size="xs" aria-label={`${row.id}的操作`}>操作<ChevronDownIcon data-icon="inline-end" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuGroup>{operations.map((operation) => <DropdownMenuItem key={operation.type} onSelect={() => { if (trigger.current) onOpen({ type: operation.type, id: row.id }, trigger.current) }}>{operation.label}</DropdownMenuItem>)}</DropdownMenuGroup></DropdownMenuContent></DropdownMenu></div>
  </>
}
export function DriverWithdrawalModePage() {
  const records = useDriverWithdrawals()
  const { organization } = useOrganization()
  // Preview records use the same active fleet as the application header on every surface.
  const rows = records.map((row) => ({ ...row, fleet: organization.name }))
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS)
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [filterError, setFilterError] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [panel, setPanel] = useState<Panel | null>(null)
  const [returnedId, setReturnedId] = useState<string | null>(null)
  const tableRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const originalScroll = useRef(0)
  const returning = useRef(false)
  const timeZone = mockSession.preferences.timezone
  const today = dateInZone(new Date().toISOString(), timeZone)
  const filtered = filterDrivers(rows, filters, timeZone)
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / pageSize)))
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const selected = panel ? rows.find((row) => row.id === panel.id) : undefined
  // Keep the reviewed record in view when its new status no longer matches the list filter.
  const workspaceRows = selected && !filtered.some((row) => row.id === selected.id) ? [selected, ...filtered] : filtered

  useLayoutEffect(() => {
    if (panel || !returning.current) return
    returning.current = false
    window.scrollTo({ top: originalScroll.current, behavior: "instant" })
    const row = Array.from(tableRef.current?.querySelectorAll<HTMLTableRowElement>("[data-driver-id]") ?? []).find((item) => item.dataset.driverId === returnedId)
    const target = Array.from(row?.querySelectorAll<HTMLButtonElement>("button") ?? []).find((button) => button.getClientRects().length)
    if (target) { target.focus({ preventScroll: true }); target.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" }) }
    else if (triggerRef.current?.isConnected && triggerRef.current.getClientRects().length) triggerRef.current.focus({ preventScroll: true })
    else document.getElementById("driver-withdrawal-title")?.focus({ preventScroll: true })
  }, [panel, returnedId])
  function allowed(next: Panel) {
    const row = rows.find((item) => item.id === next.id)
    if (!row) { toast.error("申请不存在，请刷新列表"); return false }
    if (row.restricted && next.type !== "logs") { toast.error("无法查看"); return false }
    if (next.type === "audit" && row.auditStatus !== "pending") { toast.error("该申请已完成审核"); return false }
    return true
  }
  function navigate(next: Panel) { if (allowed(next)) setPanel(next) }
  function open(next: Panel, trigger: HTMLElement) {
    if (!allowed(next)) return
    triggerRef.current = trigger
    originalScroll.current = window.scrollY
    tableRef.current?.querySelectorAll<HTMLTableRowElement>("[data-driver-id]").forEach((row) => {
      const rect = row.getBoundingClientRect()
      row.style.viewTransitionName = row.dataset.driverId && rect.top >= 56 && rect.bottom <= window.innerHeight ? withdrawalTransitionName(row.dataset.driverId) : "none"
    })
    enterWithdrawalWorkspace(() => { setReturnedId(null); setPanel(next) })
  }
  function returnToList() {
    const id = panel?.id ?? null
    const index = filtered.findIndex((row) => row.id === id)
    if (index >= 0) setPage(Math.floor(index / pageSize) + 1)
    returning.current = true
    setReturnedId(id)
    setPanel(null)
  }
  function commit(row: DriverWithdrawal, value: ReviewDraft) {
    try {
      submitDriverReview(row.id, value, mockSession.user.name)
      setPanel({ type: "detail", id: row.id })
      toast.success(value.result === "reject" ? "审核不通过已提交" : row.type === "open" ? "审核通过，提现模式将于次日 00:00 开通" : "审核通过，提现模式将于次日 00:00 关闭")
    } catch (error) { toast.error(error instanceof Error ? error.message : "操作失败，请重试") }
  }
  function changeFilter(key: keyof Filters, value: string) { setDraft((previous) => ({ ...previous, [key]: value })); setFilterError("") }
  function query(event: React.FormEvent) {
    event.preventDefault()
    if (draft.from && draft.to && draft.from > draft.to) { setFilterError("开始日期不能晚于结束日期"); return }
    setFilters(draft); setPage(1)
  }
  function reset() { setDraft(EMPTY_FILTERS); setFilters(EMPTY_FILTERS); setPage(1); setFilterError("") }
  const selector = (key: keyof Filters, label: string, options: [string, string][]) => <FilterSelect name={key} label={label} value={draft[key]} options={options} onChange={(value) => changeFilter(key, value)} />

  return <div className="min-w-0">
    <div hidden={Boolean(panel)}><div className="flex min-w-0 flex-col gap-6">
      <header className="flex flex-col gap-2"><h1 id="driver-withdrawal-title" tabIndex={-1} className="text-2xl font-medium outline-none">司机提现模式管理</h1><p className="text-sm text-muted-foreground">管理司机提现模式的开通、关闭申请与审核记录。</p></header>
      <div ref={tableRef} className="min-w-0" style={{ viewTransitionName: "withdrawal-list" }}>
        <Table variant="grid" aria-label="司机提现模式申请列表" className="sm:min-w-[1160px]" viewportClassName="mx-4 mb-4 rounded-lg border" toolbar={
          <form onSubmit={query} className="flex flex-col gap-4">
            <FieldGroup className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {selector("driver", "司机", rows.map((row) => [row.id, `${row.id} ${maskName(row.name)}`]))}
              {selector("type", "申请类型", Object.entries(TYPE_LABELS))}
              {selector("modeStatus", "提现模式状态", Object.entries(MODE_LABELS))}
              {selector("auditStatus", "审核状态", Object.entries(AUDIT_LABELS))}
              <PeriodPicker label="最新操作日期" selection={{ mode: "day", value: draft.to || today, range: { start: draft.from || today, end: draft.to || today } }} onChange={(value) => { setDraft((previous) => ({ ...previous, from: value.range?.start || value.value, to: value.range?.end || value.value })); setFilterError("") }} rangeOnly modes={["day"]} showGranularity={false} placeholder={draft.from ? undefined : "请选择日期范围"} />
            </FieldGroup>
            {filterError && <FieldError>{filterError}</FieldError>}
            <div className="flex flex-wrap items-center justify-between gap-3"><span className="text-sm text-muted-foreground" aria-live="polite">待审核 <span className="font-medium text-foreground tabular-nums">{filtered.filter((row) => row.auditStatus === "pending").length}</span> 条数据</span><div className="ml-auto flex items-center gap-2"><Button type="submit"><SearchIcon data-icon="inline-start" />查询</Button><Button type="button" variant="outline" onClick={reset}><RotateCcwIcon data-icon="inline-start" />重置</Button></div></div>
          </form>
        } footer={<DataPagination page={currentPage} pageSize={pageSize} total={filtered.length} pageSizeOptions={[10, 20, 50, 100]} onPageChange={(value) => { setPage(value); tableRef.current?.scrollIntoView({ block: "start" }) }} onPageSizeChange={(value) => { setPageSize(value); setPage(1) }} />}>
          <TableHeader><TableRow><TableHead>司机ID</TableHead><TableHead className="hidden sm:table-cell">姓名</TableHead><TableHead className="hidden sm:table-cell">电话</TableHead><TableHead className="hidden sm:table-cell">所属车队</TableHead><TableHead className="hidden sm:table-cell">申请类型</TableHead><TableHead className="hidden sm:table-cell">最新操作时间</TableHead><TableHead>审核状态</TableHead><TableHead className="hidden sm:table-cell">提现模式状态</TableHead><TableHead sticky="right" className="w-20 text-center sm:w-52">操作</TableHead></TableRow></TableHeader>
          <TableBody>{visible.map((row) => <TableRow key={row.id} data-driver-id={row.id} data-state={returnedId === row.id ? "selected" : undefined}>
            <TableCell><div className="flex flex-col gap-1 py-2"><span>{row.id}</span><span className="text-muted-foreground sm:hidden">{maskName(row.name)} · {row.fleet}</span></div></TableCell><TableCell className="hidden sm:table-cell">{maskName(row.name)}</TableCell><TableCell className="hidden tabular-nums sm:table-cell">{maskPhone(row.phone)}</TableCell><TableCell className="hidden sm:table-cell">{row.fleet}</TableCell>
            <TableCell className="hidden sm:table-cell"><Badge size="sm" variant="outline">{TYPE_LABELS[row.type]}</Badge></TableCell><TableCell className="hidden tabular-nums sm:table-cell"><time dateTime={row.latestOperationTime}>{displayTime(row.latestOperationTime)}</time></TableCell><TableCell><DriverAuditBadge status={row.auditStatus} /></TableCell><TableCell className="hidden sm:table-cell"><DriverModeBadge status={row.modeStatus} /></TableCell>
            <TableCell sticky="right" className="w-20 text-center sm:w-52"><RowActions row={row} onOpen={open} /></TableCell>
          </TableRow>)}{!visible.length && <TableRow><TableCell colSpan={9}><EmptyResults /></TableCell></TableRow>}</TableBody>
        </Table>
      </div>
    </div></div>
    {panel && selected && <WithdrawalRecordWorkspace<Panel> panel={panel} title="司机提现模式管理" cards={workspaceRows.map((row) => ({
      id: row.id,
      label: `查看 ${row.id} · ${maskName(row.name)}，${AUDIT_LABELS[row.auditStatus]}，${TYPE_LABELS[row.type]}，${MODE_LABELS[row.modeStatus]}`,
      content: <>
        <span className="flex min-w-0 items-center justify-between gap-2"><span className="min-w-0 truncate">{row.id} · {maskName(row.name)}</span><DriverAuditBadge status={row.auditStatus} /></span>
        <span className="flex min-w-0 items-center justify-between gap-2 text-xs text-muted-foreground"><span className="truncate">{row.fleet}</span><Badge size="sm" variant="outline">{TYPE_LABELS[row.type]}</Badge></span>
        <span className="flex min-w-0 items-center justify-between gap-2 text-xs text-muted-foreground"><Tooltip><TooltipTrigger asChild><span className="flex min-w-0 flex-wrap"><span>最新操作日期：</span><time dateTime={row.latestOperationTime} className="tabular-nums">{formatDate(row.latestOperationTime, { timeZone })}</time></span></TooltipTrigger><TooltipContent>{displayTime(row.latestOperationTime)}</TooltipContent></Tooltip><DriverModeBadge status={row.modeStatus} /></span>
      </>,
    }))} detailPanel={(id) => ({ type: "detail", id })} onNavigate={navigate} onReturn={returnToList}>
      {(navigation) => <DriverContent key={`${panel.type}-${selected.id}`} panel={panel} row={selected} navigation={navigation} onSubmit={(draft) => commit(selected, draft)} />}
    </WithdrawalRecordWorkspace>}
  </div>
}
function DriverContent({ panel, row, navigation, onSubmit }: { panel: Panel; row: DriverWithdrawal; navigation: RecordNavigation<Panel>; onSubmit: (draft: ReviewDraft) => void }) {
  const { onCancel, onNavigate } = navigation
  if (panel.type === "audit") return <DriverReviewPanel row={row} onClose={onCancel} onSubmit={onSubmit} />
  if (panel.type === "logs") return <DriverLogsPanel row={row} onClose={onCancel} onDetail={() => onNavigate({ type: "detail", id: row.id })} onReview={() => onNavigate({ type: "audit", id: row.id })} />
  return <DriverDetailPanel row={row} onClose={onCancel} onLogs={() => onNavigate({ type: "logs", id: row.id })} onReview={() => onNavigate({ type: "audit", id: row.id })} />
}
