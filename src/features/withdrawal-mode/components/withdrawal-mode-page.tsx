"use client"

import { useRef, useState } from "react"
import { ChevronDownIcon, ChevronUpIcon, PlusIcon, RotateCcwIcon, SearchIcon } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { DataPagination } from "@/components/ui/pagination"
import { PeriodPicker } from "@/components/ui/period-picker"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDate } from "@/lib/date-time"
import { mockSession } from "@/mocks/session"
import { AUDIT_LABELS, MODE_LABELS, dateInZone, rowActions, type Application, type WorkflowAction } from "../model"
import { dispatchWithdrawal, useWithdrawalApplications } from "../store"
import { OpeningSheet } from "./opening-sheet"
import { AuditSheet, ClosingSheet, DetailSheet } from "./review-sheets"
import { AuditBadge, ConfirmAction, EmptyResults, ModeBadge, type Confirmation } from "./withdrawal-parts"

type Filters = { dsp: string; fleet: string; applicationType: string; auditStatus: string; modeStatus: string; from: string; to: string }
const EMPTY_FILTERS: Filters = { dsp: "all", fleet: "all", applicationType: "all", auditStatus: "all", modeStatus: "all", from: "", to: "" }
type Panel = { type: "create" } | { type: "detail" | "reapply" | "close" | "business" | "financial"; id: string }

function FilterSelect({ id, label, value, options, onChange }: { id: string; label: string; value: string; options: [string, string][]; onChange: (value: string) => void }) {
  return <Field className="min-w-0"><FieldLabel htmlFor={id}>{label}</FieldLabel><Select value={value} onValueChange={onChange}><SelectTrigger id={id} className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">全部</SelectItem>{options.map(([key, text]) => <SelectItem key={key} value={key}>{text}</SelectItem>)}</SelectGroup></SelectContent></Select></Field>
}

function RowActions({ row, onOpen, onDelete }: { row: Application; onOpen: (panel: Panel, trigger: HTMLElement) => void; onDelete: (trigger: HTMLElement) => void }) {
  const allowed = rowActions(row)
  const menuTrigger = useRef<HTMLButtonElement>(null)
  const buttons: { type: Exclude<Panel["type"], "create">; label: string; visible: boolean }[] = [
    { type: "detail", label: "详情", visible: true },
    { type: "business", label: "业务审核", visible: allowed.business },
    { type: "financial", label: "财务审核", visible: allowed.financial },
    { type: "reapply", label: "重新提交", visible: allowed.reapply },
    { type: "close", label: "申请关闭", visible: allowed.close },
    { type: "reapply", label: "申请开启提现模式", visible: allowed.reopen },
  ]
  return <><div className="hidden items-center justify-center gap-1 sm:flex">
    {buttons.filter((button) => button.visible).map((button) => <Button key={button.label} type="button" variant="link" size="xs" onClick={(event) => onOpen({ type: button.type, id: row.id }, event.currentTarget)}>{button.label}</Button>)}
    {allowed.remove && <Button type="button" variant="link" size="xs" onClick={(event) => onDelete(event.currentTarget)}>删除</Button>}
  </div><div className="sm:hidden"><DropdownMenu><DropdownMenuTrigger asChild><Button ref={menuTrigger} type="button" variant="link" size="xs" aria-label={`${row.dspName}的操作`}>操作<ChevronDownIcon data-icon="inline-end" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuGroup>
    {buttons.filter((button) => button.visible).map((button) => <DropdownMenuItem key={button.label} onSelect={() => { if (menuTrigger.current) onOpen({ type: button.type, id: row.id }, menuTrigger.current) }}>{button.label}</DropdownMenuItem>)}
    {allowed.remove && <DropdownMenuItem onSelect={() => { if (menuTrigger.current) onDelete(menuTrigger.current) }}>删除</DropdownMenuItem>}
  </DropdownMenuGroup></DropdownMenuContent></DropdownMenu></div></>
}

export function WithdrawalModePage() {
  const rows = useWithdrawalApplications()
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS)
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [expanded, setExpanded] = useState(false)
  const [filterError, setFilterError] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [panel, setPanel] = useState<Panel | null>(null)
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const tableRef = useRef<HTMLDivElement>(null)
  const today = dateInZone(new Date().toISOString())
  const filtered = rows.filter((row) => (filters.dsp === "all" || row.dspName === filters.dsp) && (filters.fleet === "all" || row.fleetName === filters.fleet) && (filters.applicationType === "all" || row.applicationType === filters.applicationType) && (filters.auditStatus === "all" || row.auditStatus === filters.auditStatus) && (filters.modeStatus === "all" || row.modeStatus === filters.modeStatus) && (!filters.from || row.latestOperationDate >= filters.from) && (!filters.to || row.latestOperationDate <= filters.to))
    .sort((a, b) => b.latestOperationDate.localeCompare(a.latestOperationDate) || b.id.localeCompare(a.id))
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / pageSize)))
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const selected = panel && panel.type !== "create" ? rows.find((row) => row.id === panel.id) : undefined
  function changeFilter(key: keyof Filters, value: string) { setDraft((previous) => ({ ...previous, [key]: value })); setFilterError("") }
  function query(event: React.FormEvent) {
    event.preventDefault()
    if (draft.from && draft.to && draft.from > draft.to) { setFilterError("开始日期不能晚于结束日期"); return }
    setFilters(draft); setPage(1)
  }
  function reset() { setDraft(EMPTY_FILTERS); setFilters(EMPTY_FILTERS); setExpanded(false); setPage(1); setFilterError("") }
  function open(next: Panel, trigger: HTMLElement) { triggerRef.current = trigger; setPanel(next) }
  function restoreFocus() {
    const trigger = triggerRef.current
    if (trigger?.isConnected) trigger.focus()
    else document.getElementById("withdrawal-title")?.focus()
  }
  function commit(action: WorkflowAction, message: string) {
    try {
      dispatchWithdrawal(action, mockSession.user.name)
      setPanel(null); setConfirmation(null); setPage(1)
      toast.success(message)
    } catch (error) { toast.error(error instanceof Error ? error.message : "操作失败，请重试") }
  }
  const selector = (key: keyof Filters, label: string, options: [string, string][]) => <FilterSelect id={`filter-${key}`} label={label} value={draft[key]} options={options} onChange={(value) => changeFilter(key, value)} />
  const namedOptions = (key: "dspName" | "fleetName"): [string, string][] => Array.from(new Set(rows.map((row) => row[key]))).map((name) => [name, name])

  return <div className="flex min-w-0 flex-col gap-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div className="flex flex-col gap-2"><h1 id="withdrawal-title" tabIndex={-1} className="text-2xl font-medium outline-none">DSP提现模式管理</h1><p className="text-sm text-muted-foreground">管理车队提现模式的开启、审核与关闭申请。</p></div></div>
    <div ref={tableRef} className="min-w-0">
      <Table aria-label="DSP提现模式申请列表" className="sm:min-w-[1080px]" toolbar={
        <form onSubmit={query} className="flex flex-col gap-4">
          <FieldGroup className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {selector("dsp", "DSP名称", namedOptions("dspName"))}
            {selector("fleet", "车队名称", namedOptions("fleetName"))}
            {selector("applicationType", "申请类型", [["open", "开启申请"], ["close", "关闭申请"]])}
            {selector("auditStatus", "审核状态", Object.entries(AUDIT_LABELS))}
            {expanded && <>
              {selector("modeStatus", "提现模式开通状态", Object.entries(MODE_LABELS))}
              <PeriodPicker label="最新操作日期" selection={{ mode: "day", value: draft.to || today, range: { start: draft.from || today, end: draft.to || today } }} onChange={(value) => {
                setDraft((previous) => ({ ...previous, from: value.range?.start || value.value, to: value.range?.end || value.value }))
                setFilterError("")
              }} rangeOnly modes={["day"]} showGranularity={false} placeholder={draft.from ? undefined : "请选择日期范围"} />
            </>}
          </FieldGroup>
          {filterError && <FieldError>{filterError}</FieldError>}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2"><Button type="button" variant="outline" onClick={(event) => open({ type: "create" }, event.currentTarget)}><PlusIcon data-icon="inline-start" />申请开启提现模式</Button><Button type="button" variant="ghost" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? "收起条件" : "更多条件"}{expanded ? <ChevronUpIcon data-icon="inline-end" /> : <ChevronDownIcon data-icon="inline-end" />}</Button></div>
            <div className="ml-auto flex items-center gap-2"><Button type="submit"><SearchIcon data-icon="inline-start" />查询</Button><Button type="button" variant="outline" onClick={reset}><RotateCcwIcon data-icon="inline-start" />重置</Button></div>
          </div>
        </form>
      } footer={<DataPagination page={currentPage} pageSize={pageSize} total={filtered.length} pageSizeOptions={[10, 20, 50, 100]} onPageChange={(value) => { setPage(value); tableRef.current?.scrollIntoView({ block: "start" }) }} onPageSizeChange={(value) => { setPageSize(value); setPage(1) }} />}>
        <TableHeader><TableRow><TableHead className="hidden w-16 sm:table-cell">序号</TableHead><TableHead>DSP名称</TableHead><TableHead className="hidden sm:table-cell">车队名称</TableHead><TableHead className="hidden sm:table-cell">申请类型</TableHead><TableHead className="hidden sm:table-cell">最新操作日期</TableHead><TableHead>审核状态</TableHead><TableHead className="hidden sm:table-cell">提现模式开通状态</TableHead><TableHead sticky="right" className="w-20 text-center sm:w-64">操作</TableHead></TableRow></TableHeader>
        <TableBody>{visible.map((row, index) => <TableRow key={row.id}>
          <TableCell className="hidden tabular-nums sm:table-cell">{(currentPage - 1) * pageSize + index + 1}</TableCell><TableCell><div className="flex flex-col gap-1 py-2"><span className="whitespace-normal sm:whitespace-nowrap">{row.dspName}</span><span className="text-muted-foreground sm:hidden">{row.fleetName}</span></div></TableCell><TableCell className="hidden sm:table-cell">{row.fleetName}</TableCell>
          <TableCell className="hidden sm:table-cell"><Badge size="sm" variant="outline">{row.applicationType === "open" ? "开启申请" : "关闭申请"}</Badge></TableCell>
          <TableCell className="hidden tabular-nums sm:table-cell">{formatDate(row.latestOperationDate)}</TableCell><TableCell><AuditBadge status={row.auditStatus} /></TableCell><TableCell className="hidden sm:table-cell"><ModeBadge status={row.modeStatus} /></TableCell>
          <TableCell sticky="right" className="w-20 text-center sm:w-64"><RowActions row={row} onOpen={open} onDelete={(trigger) => {
            triggerRef.current = trigger
            setConfirmation({ title: "删除该申请？", description: `将删除 ${row.dspName} · ${row.fleetName} 的申请及全部附件，删除后无法恢复。`, label: "确认删除", destructive: true, onConfirm: () => commit({ type: "delete", id: row.id }, "申请及附件已删除") })
          }} /></TableCell>
        </TableRow>)}{!visible.length && <TableRow><TableCell colSpan={8}><EmptyResults /></TableCell></TableRow>}</TableBody>
      </Table>
    </div>
    {panel?.type === "create" && <OpeningSheet onClose={() => setPanel(null)} restoreFocus={restoreFocus} onSubmit={(value) => commit({ type: "open", id: crypto.randomUUID(), draft: value }, "开启申请已提交，等待业务审核")} />}
    {panel?.type === "reapply" && selected && <OpeningSheet row={selected} onClose={() => setPanel(null)} restoreFocus={restoreFocus} onSubmit={(value) => commit({ type: "open", id: selected.id, existingId: selected.id, draft: value }, "申请已重新提交，等待业务审核")} />}
    {panel?.type === "detail" && selected && <DetailSheet row={selected} onClose={() => setPanel(null)} restoreFocus={restoreFocus} />}
    {panel?.type === "close" && selected && <ClosingSheet row={selected} onClose={() => setPanel(null)} restoreFocus={restoreFocus} onSubmit={(reason) => commit({ type: "close", id: selected.id, reason }, "关闭申请已提交，等待业务审核")} />}
    {(panel?.type === "business" || panel?.type === "financial") && selected && <AuditSheet row={selected} stage={panel.type} onClose={() => setPanel(null)} restoreFocus={restoreFocus} onSubmit={(result, reason) => commit({ type: "audit", id: selected.id, stage: panel.type as "business" | "financial", result, reason }, result === "reject" ? "申请已驳回" : "审核已提交")} />}
    <ConfirmAction confirmation={confirmation} onClose={() => { setConfirmation(null); restoreFocus() }} />
  </div>
}
