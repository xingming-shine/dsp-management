"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon, ListIcon, InfoIcon, FileTextIcon } from "lucide-react"
import { toast } from "sonner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Field, FieldLabel } from "@/components/ui/field"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Separator } from "@/components/ui/separator"
import { ConfirmAction, type Confirmation, WorkflowDirtyContext } from "@/features/withdrawal-mode/components/withdrawal-parts"
import { formatDateTime, formatDateRange } from "@/lib/date-time"
import { cn } from "@/lib/utils"
import { useTimezone } from "@/features/preferences/timezone-store"
import { BILL_LABELS, BILLING_LABELS, INVOICE_LABELS, money, type Attachment, type AuditLog, type BillStatus, type BillingStatus, type InvoiceStatus } from "../model"

export const unavailable = (name: string) => toast.info(`${name}暂未接入`, { description: "当前版本提供账单管理模拟流程，该入口将在对应模块完成后开放。" })
export function BillBadge({ status }: { status: BillStatus }) { return <Badge size="sm" variant={status === "confirmed" ? "success" : status === "rejected" ? "destructive" : "secondary"}>{BILL_LABELS[status]}</Badge> }
export function BillingBadge({ status }: { status: BillingStatus }) { return <Badge size="sm" variant={status === "billed" ? "success" : status === "processing" ? "warning" : "outline"}>{BILLING_LABELS[status]}</Badge> }
export function InvoiceBadge({ status }: { status: InvoiceStatus }) { return <Badge size="sm" variant={status === "approved" ? "success" : status === "rejected" ? "destructive" : status === "pending" || status === "reversing" ? "warning" : "secondary"}>{INVOICE_LABELS[status]}</Badge> }
export function Amount({ cents, decimals = 2 }: { cents: number; decimals?: number }) { return <span className={cn("tabular-nums", cents < 0 && "text-destructive")}>{money(cents, decimals)}</span> }
export function NoResults({ title = "暂无符合条件的记录", description = "请调整查询条件后重试。" }: { title?: string; description?: string }) { return <Empty><EmptyHeader><EmptyTitle>{title}</EmptyTitle><EmptyDescription>{description}</EmptyDescription></EmptyHeader></Empty> }
export function Notice({ children }: { children: ReactNode }) { return <Alert><InfoIcon /><AlertDescription>{children}</AlertDescription></Alert> }
export function Section({ title, children }: { title: string; children: ReactNode }) { return <section className="flex min-w-0 flex-col gap-4"><h3 className="text-base font-medium">{title}</h3>{children}</section> }
export function Info({ label, children }: { label: string; children: ReactNode }) { return <div className="flex min-w-0 flex-col gap-1.5"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="break-words text-sm tabular-nums">{children ?? "—"}</dd></div> }
export function FilterSelect({ id, label, value, options, onChange, all = true }: { id: string; label: string; value: string; options: Record<string, string>; onChange: (value: string) => void; all?: boolean }) {
  return <Field className="min-w-0"><FieldLabel htmlFor={id}>{label}</FieldLabel><Select value={value} onValueChange={onChange}><SelectTrigger id={id} className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{all && <SelectItem value="all">全部</SelectItem>}{Object.entries(options).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectGroup></SelectContent></Select></Field>
}
export function StatusFilter({ label, value, options, counts, onChange }: { label: string; value: string; options: Record<string, string>; counts: Record<string, number>; onChange: (value: string) => void }) {
  return <div className="flex min-w-0 flex-col gap-2"><span className="text-xs text-muted-foreground">{label}</span><div className="min-w-0 overflow-x-auto pb-1"><ToggleGroup type="single" variant="outline" size="sm" spacing={1} value={value} onValueChange={(v) => { if (v) onChange(v) }} aria-label={label} className="w-max justify-start">{Object.entries({ all: "全部", ...options }).map(([key, label]) => <ToggleGroupItem key={key} value={key} aria-label={`${label} ${counts[key] ?? 0}`}><span>{label}</span><span className="tabular-nums">{counts[key] ?? 0}</span></ToggleGroupItem>)}</ToggleGroup></div></div>
}
export function AttachedFile({ attachment }: { attachment: Attachment }) {
  return <Button type="button" variant="link" size="sm" className="max-w-full justify-start" onClick={() => {
    const url = URL.createObjectURL(attachment.file)
    const link = document.createElement("a"); link.href = url; link.download = attachment.name; link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }}><FileTextIcon data-icon="inline-start" /><span className="truncate">{attachment.name}</span></Button>
}
export function History({ logs }: { logs: AuditLog[] }) {
  const zone = useTimezone()
  return <Section title="操作记录">{logs.length ? <ol className="audit-timeline" aria-label="账单操作记录">{[...logs].sort((a, b) => b.time.localeCompare(a.time)).map((log, index) => {
    const tone = /驳回|作废/.test(log.action) ? "destructive" : /通过|确认/.test(log.action) ? "success" : "neutral"
    return <li key={log.id} className="audit-timeline__item" data-latest={index === 0}><div className="audit-timeline__track" aria-hidden="true"><span className="audit-timeline__node" data-tone={tone} /></div><div className="audit-timeline__content"><div className="audit-timeline__heading"><h4>{log.action}</h4>{index === 0 && <Badge size="sm" variant="secondary">最新</Badge>}</div><div className="audit-timeline__meta"><time dateTime={log.time} title={zone}>{formatDateTime(log.time, { timeZone: zone })}</time><span className="audit-timeline__operator">· 操作人：{log.operator || "—"}</span></div>{log.note && <div className="audit-timeline__notes"><p className="audit-timeline__reason" data-tone={tone}>{log.action.includes("驳回") && <span className="audit-timeline__reason-label">驳回原因</span>}{log.note}</p></div>}{log.attachments?.map((attachment) => <AttachedFile key={attachment.id} attachment={attachment} />)}</div></li>
  })}</ol> : <NoResults title="暂无操作记录" description="操作完成后将在这里展示。" />}</Section>
}
export type WorkspaceRecord = { id: string; status: ReactNode; amount: number; start?: string; end?: string; description?: string; disabled?: boolean }
export function BillsWorkspace({ title, returnLabel = "返回列表", records, activeId, onNavigate, onReturn, selected, onSelection, children }: {
  title: string; returnLabel?: string; records: WorkspaceRecord[]; activeId?: string; onNavigate: (id: string) => void; onReturn: () => void
  selected?: string[]; onSelection?: (ids: string[]) => void; children: (requestReturn: () => void) => ReactNode
}) {
  const [mobileList, setMobileList] = useState(false)
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const dirty = useRef(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const rail = useRef<HTMLDivElement>(null)
  const index = records.findIndex((row) => row.id === activeId)
  const multi = selected !== undefined
  useEffect(() => { heading.current?.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: "instant" }) }, [])
  useEffect(() => { rail.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: "nearest" }) }, [activeId])
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => { if (dirty.current) event.preventDefault() }
    window.addEventListener("beforeunload", beforeUnload)
    return () => window.removeEventListener("beforeunload", beforeUnload)
  }, [])
  function request(action: () => void) {
    if (!dirty.current) { action(); return }
    setConfirmation({ title: "放弃未提交的内容？", description: "当前填写的内容尚未提交，离开后会丢失。", label: "放弃修改", destructive: true, onConfirm: () => { dirty.current = false; action(); setConfirmation(null) } })
  }
  function navigate(id: string) { request(() => { onNavigate(id); setMobileList(false) }) }
  return <WorkflowDirtyContext.Provider value={dirty}><section className="bills-workspace flex min-w-0 flex-col gap-4" aria-label={title} onKeyDown={(event) => {
    if (event.key === "Escape" && !event.defaultPrevented && !(event.target as HTMLElement).closest('[role="dialog"], [role="alertdialog"], [data-radix-popper-content-wrapper]')) { event.preventDefault(); request(onReturn) }
  }}><header className="flex flex-wrap items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><Button variant="outline" size="sm" onClick={() => request(onReturn)}><ArrowLeftIcon data-icon="inline-start" />{returnLabel}</Button><h1 ref={heading} tabIndex={-1} className="text-base font-medium outline-none">{title}</h1></div><div className="flex items-center gap-2">{!multi && <><span className="text-xs text-muted-foreground tabular-nums">{index + 1} / {records.length}</span><Button variant="outline" size="icon-sm" aria-label="上一条记录" disabled={index <= 0} onClick={() => navigate(records[index - 1].id)}><ChevronLeftIcon /></Button><Button variant="outline" size="icon-sm" aria-label="下一条记录" disabled={index < 0 || index >= records.length - 1} onClick={() => navigate(records[index + 1].id)}><ChevronRightIcon /></Button></>}<Button variant="outline" size="sm" className="lg:hidden" onClick={() => setMobileList(!mobileList)} aria-expanded={mobileList} aria-controls="bill-record-list"><ListIcon data-icon="inline-start" />{mobileList ? "查看内容" : multi ? "选择账单" : "切换记录"}</Button></div></header>
    <div className="grid min-h-0 min-w-0 flex-1 gap-4 lg:grid-cols-[minmax(240px,1fr)_minmax(0,3fr)]"><aside id="bill-record-list" className={cn("min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border bg-card lg:flex", mobileList ? "flex" : "hidden")} aria-label="账单记录列表"><div className="flex flex-col gap-2 p-4"><div className="flex items-center justify-between gap-3"><span className="text-sm font-medium">{multi ? "选择账单" : "记录清单"}</span>{!multi && <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{records.length} 条</span>}</div>{multi && <p className="text-xs text-muted-foreground">仅当前页记录 · 已选 {selected.length} 张</p>}</div><Separator /><div ref={rail} className="min-h-0 overflow-y-auto overscroll-contain p-3"><ul className="flex flex-col gap-2">{records.map((record, recordIndex) => {
      const content = <><span className="flex flex-wrap items-center justify-between gap-2"><span>{record.id}</span>{record.status}</span><span className="text-xs text-muted-foreground">{record.start && record.end ? formatDateRange(record.start, record.end) : record.description}</span><span className="text-sm tabular-nums">{money(record.amount)} USD</span></>
      return <li key={record.id}>{multi ? <label className={cn("flex items-start gap-3 rounded-md border p-3", selected.includes(record.id) && "bg-brand-selected", record.disabled && "opacity-50")}><Checkbox aria-label={`选择账单 ${record.id}`} disabled={record.disabled} checked={selected.includes(record.id)} onCheckedChange={(checked) => onSelection?.(checked ? [...selected, record.id] : selected.filter((id) => id !== record.id))} /><span className="flex min-w-0 flex-1 flex-col gap-2">{content}</span></label> : <Button variant="outline" className="bills-record-card h-auto w-full flex-col items-stretch gap-2 px-3 py-3 text-left" aria-current={record.id === activeId ? "true" : undefined} aria-label={`查看记录 ${record.id}`} onClick={() => navigate(record.id)} onKeyDown={(event) => {
        const next = event.key === "ArrowDown" ? recordIndex + 1 : event.key === "ArrowUp" ? recordIndex - 1 : event.key === "Home" ? 0 : event.key === "End" ? records.length - 1 : null
        if (next !== null && records[next]) { event.preventDefault(); navigate(records[next].id) }
      }}>{content}</Button>}</li>
    })}</ul>{!records.length && <NoResults title="暂无可选账单" description="返回列表调整查询条件。" />}</div></aside><div className={cn("min-h-0 min-w-0 overflow-hidden rounded-xl border bg-card lg:block", mobileList && "hidden")}><WorkspaceBody onReturn={() => request(onReturn)}>{children}</WorkspaceBody></div></div>
  </section><ConfirmAction confirmation={confirmation} onClose={() => setConfirmation(null)} /></WorkflowDirtyContext.Provider>
}

function WorkspaceBody({ onReturn, children }: { onReturn: () => void; children: (onReturn: () => void) => ReactNode }) { return children(onReturn) }
