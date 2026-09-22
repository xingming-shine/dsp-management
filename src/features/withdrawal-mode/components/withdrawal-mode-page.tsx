"use client"

import { useLayoutEffect, useRef, useState } from "react"
import { ChevronDownIcon, PlusIcon, RotateCcwIcon, SearchIcon } from "lucide-react"
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
import { OpeningPanel } from "./opening-panel"
import { AuditPanel, ClosingPanel, DetailPanel } from "./review-panels"
import { AuditBadge, ConfirmAction, EmptyResults, ModeBadge, type Confirmation } from "./withdrawal-parts"
import { enterWithdrawalWorkspace, useWithdrawalNavigation, WithdrawalWorkspace, withdrawalTransitionName, type WithdrawalPanel as Panel } from "./withdrawal-workspace"

type Filters = { dsp: string; fleet: string; applicationType: string; auditStatus: string; modeStatus: string; from: string; to: string }
const EMPTY_FILTERS: Filters = { dsp: "all", fleet: "all", applicationType: "all", auditStatus: "all", modeStatus: "all", from: "", to: "" }

function FilterSelect({ id, label, value, options, onChange }: { id: string; label: string; value: string; options: [string, string][]; onChange: (value: string) => void }) {
  return <Field className="min-w-0"><FieldLabel htmlFor={id}>{label}</FieldLabel><Select value={value} onValueChange={onChange}><SelectTrigger id={id} className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">全部</SelectItem>{options.map(([key, text]) => <SelectItem key={key} value={key}>{text}</SelectItem>)}</SelectGroup></SelectContent></Select></Field>
}

function availableOperations(row: Application) {
  const allowed = rowActions(row)
  const buttons: { type: Exclude<Panel["type"], "create">; label: string; visible: boolean }[] = [
    { type: "detail", label: "详情", visible: true },
    { type: "business", label: "业务审核", visible: allowed.business },
    { type: "financial", label: "财务审核", visible: allowed.financial },
    { type: "reapply", label: "重新提交", visible: allowed.reapply },
    { type: "close", label: "申请关闭", visible: allowed.close },
    { type: "reapply", label: "申请开启提现模式", visible: allowed.reopen },
  ]
  return buttons.filter((button) => button.visible)
}
function RowActions({ row, onOpen, onDelete }: { row: Application; onOpen: (panel: Panel, trigger: HTMLElement) => void; onDelete: (trigger: HTMLElement) => void }) {
  const allowed = rowActions(row)
  const menuTrigger = useRef<HTMLButtonElement>(null)
  const buttons = availableOperations(row).filter((button) => button.type !== "business" && button.type !== "financial")
  return <><div className="mx-auto hidden w-48 max-w-full items-center justify-start gap-1 sm:flex">
    {buttons.map((button) => <Button key={button.label} type="button" variant="link" size="xs" onClick={(event) => onOpen({ type: button.type, id: row.id }, event.currentTarget)}>{button.label}</Button>)}
    {allowed.remove && <Button type="button" variant="link" size="xs" onClick={(event) => onDelete(event.currentTarget)}>删除</Button>}
  </div><div className="sm:hidden"><DropdownMenu><DropdownMenuTrigger asChild><Button ref={menuTrigger} type="button" variant="link" size="xs" aria-label={`${row.dspName}的操作`}>操作<ChevronDownIcon data-icon="inline-end" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuGroup>
    {buttons.map((button) => <DropdownMenuItem key={button.label} onSelect={() => { if (menuTrigger.current) onOpen({ type: button.type, id: row.id }, menuTrigger.current) }}>{button.label}</DropdownMenuItem>)}
    {allowed.remove && <DropdownMenuItem onSelect={() => { if (menuTrigger.current) onDelete(menuTrigger.current) }}>删除</DropdownMenuItem>}
  </DropdownMenuGroup></DropdownMenuContent></DropdownMenu></div></>
}

export function WithdrawalModePage() {
  const rows = useWithdrawalApplications()
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS)
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [filterError, setFilterError] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [panel, setPanel] = useState<Panel | null>(null)
  const [returnedId, setReturnedId] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const tableRef = useRef<HTMLDivElement>(null)
  const originalScroll = useRef(0)
  const returning = useRef(false)
  const confirmationCommitted = useRef(false)
  const today = dateInZone(new Date().toISOString())
  const filtered = rows.filter((row) => (filters.dsp === "all" || row.dspName === filters.dsp) && (filters.fleet === "all" || row.fleetName === filters.fleet) && (filters.applicationType === "all" || row.applicationType === filters.applicationType) && (filters.auditStatus === "all" || row.auditStatus === filters.auditStatus) && (filters.modeStatus === "all" || row.modeStatus === filters.modeStatus) && (!filters.from || row.latestOperationDate >= filters.from) && (!filters.to || row.latestOperationDate <= filters.to))
    .sort((a, b) => b.latestOperationDate.localeCompare(a.latestOperationDate) || b.id.localeCompare(a.id))
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / pageSize)))
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const selected = panel && panel.type !== "create" ? rows.find((row) => row.id === panel.id) : undefined
  // Keep a just-updated application visible until the user leaves it, even if its new status is filtered out.
  const workspaceRows = selected && !filtered.some((row) => row.id === selected.id) ? [selected, ...filtered] : filtered

  useLayoutEffect(() => {
    if (panel || !returning.current) return
    returning.current = false
    window.scrollTo({ top: originalScroll.current, behavior: "instant" })
    const row = Array.from(tableRef.current?.querySelectorAll<HTMLTableRowElement>("[data-application-id]") ?? []).find((item) => item.dataset.applicationId === returnedId)
    const target = Array.from(row?.querySelectorAll<HTMLButtonElement>("button") ?? []).find((button) => button.getClientRects().length)
    if (target) { target.focus({ preventScroll: true }); target.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" }) }
    else if (triggerRef.current?.isConnected && triggerRef.current.getClientRects().length) triggerRef.current.focus({ preventScroll: true })
    else document.getElementById("withdrawal-title")?.focus({ preventScroll: true })
  }, [panel, returnedId])
  function changeFilter(key: keyof Filters, value: string) { setDraft((previous) => ({ ...previous, [key]: value })); setFilterError("") }
  function query(event: React.FormEvent) {
    event.preventDefault()
    if (draft.from && draft.to && draft.from > draft.to) { setFilterError("开始日期不能晚于结束日期"); return }
    setFilters(draft); setPage(1)
  }
  function reset() { setDraft(EMPTY_FILTERS); setFilters(EMPTY_FILTERS); setPage(1); setFilterError("") }
  function open(next: Panel, trigger: HTMLElement) {
    triggerRef.current = trigger
    originalScroll.current = window.scrollY
    tableRef.current?.querySelectorAll<HTMLTableRowElement>("[data-application-id]").forEach((row) => {
      const rect = row.getBoundingClientRect()
      row.style.viewTransitionName = row.dataset.applicationId && rect.top >= 56 && rect.bottom <= window.innerHeight ? withdrawalTransitionName(row.dataset.applicationId) : "none"
    })
    enterWithdrawalWorkspace(() => { setReturnedId(null); setPanel(next) })
  }
  function returnToList() {
    const id = panel && panel.type !== "create" ? panel.id : null
    const index = filtered.findIndex((row) => row.id === id)
    if (index >= 0) setPage(Math.floor(index / pageSize) + 1)
    returning.current = true
    setReturnedId(id)
    setPanel(null)
  }
  function restoreFocus() {
    const trigger = triggerRef.current
    if (trigger?.isConnected) trigger.focus()
    else document.getElementById("withdrawal-title")?.focus()
  }
  function commit(action: WorkflowAction, message: string) {
    try {
      dispatchWithdrawal(action, mockSession.user.name)
      if (action.type === "delete") {
        confirmationCommitted.current = true
        if (panel) {
          const index = workspaceRows.findIndex((row) => row.id === action.id)
          const next = workspaceRows[index + 1] ?? workspaceRows[index - 1]
          if (next) setPanel({ type: "detail", id: next.id })
          else returnToList()
        }
      } else setPanel({ type: "detail", id: action.id })
      setConfirmation(null)
      toast.success(message)
    } catch (error) { toast.error(error instanceof Error ? error.message : "操作失败，请重试") }
  }
  function confirmDelete(row: Application) {
    setConfirmation({ title: "删除该申请？", description: `将删除 ${row.dspName} · ${row.fleetName} 的申请及全部附件，删除后无法恢复。`, label: "确认删除", destructive: true, onConfirm: () => commit({ type: "delete", id: row.id }, "申请及附件已删除") })
  }
  const selector = (key: keyof Filters, label: string, options: [string, string][]) => <FilterSelect id={`filter-${key}`} label={label} value={draft[key]} options={options} onChange={(value) => changeFilter(key, value)} />
  const namedOptions = (key: "dspName" | "fleetName"): [string, string][] => Array.from(new Set(rows.map((row) => row[key]))).map((name) => [name, name])

  return <div className="min-w-0">
    <div hidden={Boolean(panel)}><div className="flex min-w-0 flex-col gap-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div className="flex flex-col gap-2"><h1 id="withdrawal-title" tabIndex={-1} className="text-2xl font-medium outline-none">DSP提现模式管理</h1><p className="text-sm text-muted-foreground">管理车队提现模式的开启、审核与关闭申请。</p></div></div>
    <div ref={tableRef} className="min-w-0" style={{ viewTransitionName: "withdrawal-list" }}>
      <Table variant="grid" aria-label="DSP提现模式申请列表" className="sm:min-w-[1080px]" viewportClassName="mx-4 mb-4 rounded-lg border" toolbar={
        <form onSubmit={query} className="flex flex-col gap-4">
          <FieldGroup className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {selector("dsp", "DSP名称", namedOptions("dspName"))}
            {selector("fleet", "车队名称", namedOptions("fleetName"))}
            {selector("applicationType", "申请类型", [["open", "开启申请"], ["close", "关闭申请"]])}
            {selector("auditStatus", "审核状态", Object.entries(AUDIT_LABELS))}
            {selector("modeStatus", "提现模式开通状态", Object.entries(MODE_LABELS))}
            <PeriodPicker label="最新操作日期" selection={{ mode: "day", value: draft.to || today, range: { start: draft.from || today, end: draft.to || today } }} onChange={(value) => {
              setDraft((previous) => ({ ...previous, from: value.range?.start || value.value, to: value.range?.end || value.value }))
              setFilterError("")
            }} rangeOnly modes={["day"]} showGranularity={false} placeholder={draft.from ? undefined : "请选择日期范围"} />
          </FieldGroup>
          {filterError && <FieldError>{filterError}</FieldError>}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button type="button" variant="outline" onClick={(event) => open({ type: "create" }, event.currentTarget)}><PlusIcon data-icon="inline-start" />申请开启提现模式</Button>
            <div className="ml-auto flex items-center gap-2"><Button type="submit"><SearchIcon data-icon="inline-start" />查询</Button><Button type="button" variant="outline" onClick={reset}><RotateCcwIcon data-icon="inline-start" />重置</Button></div>
          </div>
        </form>
      } footer={<DataPagination page={currentPage} pageSize={pageSize} total={filtered.length} pageSizeOptions={[10, 20, 50, 100]} onPageChange={(value) => { setPage(value); tableRef.current?.scrollIntoView({ block: "start" }) }} onPageSizeChange={(value) => { setPageSize(value); setPage(1) }} />}>
        <TableHeader><TableRow><TableHead className="hidden w-16 sm:table-cell">序号</TableHead><TableHead>DSP名称</TableHead><TableHead className="hidden sm:table-cell">车队名称</TableHead><TableHead className="hidden sm:table-cell">申请类型</TableHead><TableHead className="hidden sm:table-cell">最新操作日期</TableHead><TableHead>审核状态</TableHead><TableHead className="hidden sm:table-cell">提现模式开通状态</TableHead><TableHead sticky="right" className="w-20 text-center sm:w-64">操作</TableHead></TableRow></TableHeader>
        <TableBody>{visible.map((row, index) => <TableRow key={row.id} data-application-id={row.id} data-state={returnedId === row.id ? "selected" : undefined}>
          <TableCell className="hidden tabular-nums sm:table-cell">{(currentPage - 1) * pageSize + index + 1}</TableCell><TableCell><div className="flex flex-col gap-1 py-2"><span className="whitespace-normal sm:whitespace-nowrap">{row.dspName}</span><span className="text-muted-foreground sm:hidden">{row.fleetName}</span></div></TableCell><TableCell className="hidden sm:table-cell">{row.fleetName}</TableCell>
          <TableCell className="hidden sm:table-cell"><Badge size="sm" variant="outline">{row.applicationType === "open" ? "开启申请" : "关闭申请"}</Badge></TableCell>
          <TableCell className="hidden tabular-nums sm:table-cell">{formatDate(row.latestOperationDate)}</TableCell><TableCell><AuditBadge status={row.auditStatus} /></TableCell><TableCell className="hidden sm:table-cell"><ModeBadge status={row.modeStatus} /></TableCell>
          <TableCell sticky="right" className="w-20 text-center sm:w-64"><RowActions row={row} onOpen={open} onDelete={(trigger) => {
            triggerRef.current = trigger
            confirmDelete(row)
          }} /></TableCell>
        </TableRow>)}{!visible.length && <TableRow><TableCell colSpan={8}><EmptyResults /></TableCell></TableRow>}</TableBody>
      </Table>
    </div>
    </div></div>
    {panel && <WithdrawalWorkspace panel={panel} rows={workspaceRows} onNavigate={setPanel} onReturn={returnToList}>
      <WithdrawalContent panel={panel} selected={selected} commit={commit} confirmDelete={confirmDelete} />
    </WithdrawalWorkspace>}
    <ConfirmAction confirmation={confirmation} onClose={() => setConfirmation(null)} onCloseAutoFocus={(event) => {
      if (!confirmationCommitted.current) return
      confirmationCommitted.current = false
      event.preventDefault()
      if (panel) document.querySelector<HTMLElement>(".withdrawal-workspace article h2")?.focus({ preventScroll: true })
      else restoreFocus()
    }} />
  </div>
}

function WithdrawalContent({ panel, selected, commit, confirmDelete }: {
  panel: Panel; selected?: Application; commit: (action: WorkflowAction, message: string) => void; confirmDelete: (row: Application) => void
}) {
  const { onCancel, onNavigate } = useWithdrawalNavigation()
  return <>
        {panel.type === "create" && <OpeningPanel key="create" onClose={onCancel} onSubmit={(value) => commit({ type: "open", id: crypto.randomUUID(), draft: value }, "开启申请已提交，等待业务审核")} />}
        {panel.type === "reapply" && selected && <OpeningPanel key={`reapply-${selected.id}`} row={selected} onClose={onCancel} onSubmit={(value) => commit({ type: "open", id: selected.id, existingId: selected.id, draft: value }, "申请已重新提交，等待业务审核")} />}
        {panel.type === "detail" && selected && <DetailPanel key={`detail-${selected.id}`} row={selected} onClose={onCancel} actions={<>
          {rowActions(selected).remove && <Button variant="link" onClick={() => confirmDelete(selected)}>删除</Button>}
          {availableOperations(selected).filter((operation) => operation.type !== "detail").map((operation, index) => <Button key={operation.label} variant={index === 0 ? "default" : "outline"} onClick={() => onNavigate({ type: operation.type, id: selected.id })}>{operation.label}</Button>)}
        </>} />}
        {panel.type === "close" && selected && <ClosingPanel key={`close-${selected.id}`} row={selected} onClose={onCancel} onSubmit={(reason) => commit({ type: "close", id: selected.id, reason }, "关闭申请已提交，等待业务审核")} />}
        {(panel.type === "business" || panel.type === "financial") && selected && <AuditPanel key={`${panel.type}-${selected.id}`} row={selected} stage={panel.type} onClose={onCancel} onSubmit={(result, reason) => commit({ type: "audit", id: selected.id, stage: panel.type as "business" | "financial", result, reason }, result === "reject" ? "申请已驳回" : "审核已提交")} />}
  </>
}
