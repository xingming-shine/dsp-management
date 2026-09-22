"use client"

import { useId, useRef, useState } from "react"
import { ChevronDownIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { formatDateTime } from "@/lib/date-time"
import { mockSession } from "@/mocks/session"
import { ConfirmAction, EmptyResults, InfoItem, Notice, Section, WorkflowPanel, type Confirmation } from "@/features/withdrawal-mode/components/withdrawal-parts"
import { AUDIT_LABELS, MODE_LABELS, PRICING_PLANS, TYPE_LABELS, maskName, validateReview, type AuditStatus, type DriverWithdrawal, type ModeStatus, type ReviewDraft } from "../model"

export const displayTime = (value: string) => formatDateTime(value, { timeZone: mockSession.preferences.timezone, includeSeconds: true })
export function DriverAuditBadge({ status }: { status: AuditStatus }) {
  return <Badge size="sm" variant={status === "approved" ? "success" : status === "rejected" ? "destructive" : "warning"}>{AUDIT_LABELS[status]}</Badge>
}
export function DriverModeBadge({ status }: { status: ModeStatus }) {
  return <Badge size="sm" variant={status === "opened" ? "success" : status === "closing_pending_effective" ? "warning" : "secondary"}>{MODE_LABELS[status]}</Badge>
}
function DriverInfo({ row }: { row: DriverWithdrawal }) {
  return <Section title="司机基础信息"><dl className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
    <InfoItem label="司机ID">{row.id}</InfoItem><InfoItem label="司机姓名">{row.name}</InfoItem>
    <InfoItem label="电话">{row.phone}</InfoItem><InfoItem label="所属车队">{row.fleet}</InfoItem>
  </dl></Section>
}
export function DriverOperationLogs({ row, standalone = false }: { row: DriverWithdrawal; standalone?: boolean }) {
  const logs = [...row.logs].sort((a, b) => Date.parse(b.time) - Date.parse(a.time))
  const content = logs.length ? <ol aria-label="操作日志时间线，最新记录在前" className="audit-timeline">{logs.map((log, index) => {
    const tone = log.action.includes("不通过") ? "destructive" : log.action.includes("通过") ? "success" : "neutral"
    return <li key={`${log.time}-${index}`} className="audit-timeline__item" data-latest={index === 0}>
      <div className="audit-timeline__track" aria-hidden="true"><span className="audit-timeline__node" data-tone={tone} /></div>
      <div className="audit-timeline__content">
        <div className="audit-timeline__heading"><h4>{log.action}</h4>{index === 0 && <Badge size="sm" variant="secondary">最新</Badge>}</div>
        <div className="audit-timeline__meta"><time dateTime={log.time}>{displayTime(log.time)}</time><span className="audit-timeline__operator"><span aria-hidden="true">·</span><span>操作人：{row.restricted ? maskName(log.operator) : log.operator || "—"}</span></span></div>
        {(log.note || log.reason) && <div className="audit-timeline__notes">
          {log.note && <p>{log.note}{log.effectiveTime ? `：${displayTime(log.effectiveTime)}` : ""}</p>}
          {log.reason && <p className="audit-timeline__reason" data-tone={tone}><span className="audit-timeline__reason-label">不通过原因</span>{log.reason}</p>}
        </div>}
      </div>
    </li>
  })}</ol> : <EmptyResults title="暂无操作日志" description="提交申请或审核后，记录将在这里展示。" />
  return standalone ? content : <Section title="操作日志">{content}</Section>
}
export function DriverDetailPanel({ row, onClose, onReview, onLogs }: { row: DriverWithdrawal; onClose: () => void; onReview: () => void; onLogs: () => void }) {
  return <WorkflowPanel title="提现模式详情" description={`${row.id} · ${row.name} · ${row.fleet}`} onClose={onClose} footer={() => <>
    <Button variant="outline" onClick={onLogs}>操作日志</Button>{row.auditStatus === "pending" && <Button onClick={onReview}>审核</Button>}
  </>}>
    <DriverInfo row={row} /><Separator />
    <Section title="提现模式信息"><dl className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
      <InfoItem label="提现模式开启时间">{displayTime(row.openTime)}</InfoItem><InfoItem label="报价方案">{row.plan}</InfoItem>
      <InfoItem label="提现模式关闭时间">{displayTime(row.closeTime)}</InfoItem><InfoItem label="提现模式状态"><DriverModeBadge status={row.modeStatus} /></InfoItem>
    </dl></Section>
    {(row.auditStatus === "pending" || row.auditStatus === "rejected") && <><Separator /><Section title="申请详情"><dl className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
      <InfoItem label="申请类型"><Badge size="sm" variant="outline">{TYPE_LABELS[row.type]}</Badge></InfoItem><InfoItem label="最新操作时间">{displayTime(row.latestOperationTime)}</InfoItem>
      <InfoItem label="审核状态"><DriverAuditBadge status={row.auditStatus} /></InfoItem>{row.auditStatus === "rejected" && <InfoItem label="不通过原因">{row.rejectReason}</InfoItem>}
    </dl></Section></>}
  </WorkflowPanel>
}
export function DriverLogsPanel({ row, onClose, onDetail, onReview }: { row: DriverWithdrawal; onClose: () => void; onDetail: () => void; onReview: () => void }) {
  return <WorkflowPanel title="操作日志" description={`${row.id} · ${row.restricted ? maskName(row.name) : row.name} · ${row.fleet}`} onClose={onClose} footer={() => <>
    <Button variant="outline" onClick={onDetail}>查看详情</Button>{row.auditStatus === "pending" && <Button onClick={onReview}>审核</Button>}
  </>}><DriverOperationLogs row={row} standalone /></WorkflowPanel>
}
function PricingTemplate({ planId }: { planId: string }) {
  const plan = PRICING_PLANS[planId]
  if (!plan) return null
  return <Collapsible defaultOpen className="flex min-w-0 flex-col gap-4">
    <CollapsibleTrigger asChild><Button variant="ghost" className="w-full justify-between px-0">计费模板详情<ChevronDownIcon data-icon="inline-end" className="transition-transform [[data-state=closed]_&]:-rotate-90" /></Button></CollapsibleTrigger>
    <CollapsibleContent className="flex min-w-0 flex-col gap-5">
      <dl className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2"><InfoItem label="报价编号">{plan.code}</InfoItem><InfoItem label="报价方案">{plan.name}</InfoItem><InfoItem label="费用项">{plan.feeType}</InfoItem><InfoItem label="币种">{plan.currency}</InfoItem><InfoItem label="税率">{plan.taxRate}</InfoItem></dl>
      <Table variant="grid" aria-label="计费模板明细"><TableHeader><TableRow><TableHead>序号</TableHead><TableHead>首/续票</TableHead><TableHead>单价</TableHead><TableHead>数量</TableHead></TableRow></TableHeader><TableBody>{plan.items.map((item, index) => <TableRow key={item[0]}><TableCell>{index + 1}</TableCell>{item.map((value, column) => <TableCell key={column}>{value}</TableCell>)}</TableRow>)}</TableBody></Table>
    </CollapsibleContent>
  </Collapsible>
}
export function DriverReviewPanel({ row, onClose, onSubmit }: { row: DriverWithdrawal; onClose: () => void; onSubmit: (draft: ReviewDraft) => void }) {
  const [draft, setDraft] = useState<ReviewDraft>({ result: "approve", planId: "", reason: "" })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const formId = useId()
  const formRef = useRef<HTMLFormElement>(null)
  const dirty = draft.result !== "approve" || Boolean(draft.planId || draft.reason)
  const isOpen = row.type === "open"
  const approvalHint = `审核通过后，将于明日00:00:00为该司机${isOpen ? "开启" : "关闭"}提现模式`
  function submit(event: React.FormEvent) {
    event.preventDefault()
    const nextErrors = validateReview(row, draft)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) {
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    if (!isOpen && draft.result === "approve") {
      setConfirmation({ title: "确认审核通过？", description: approvalHint, label: "确认通过", onConfirm: () => onSubmit(draft) })
    } else onSubmit(draft)
  }
  return <WorkflowPanel title={`司机提现模式${isOpen ? "开通" : "关闭"}申请审核`} description={`${row.id} · ${row.name} · ${row.fleet}`} dirty={dirty} onClose={onClose} footer={(cancel) => <><Button variant="outline" onClick={cancel}>取消</Button><Button type="submit" form={formId}>确认审核</Button></>}>
    <DriverInfo row={row} />
    <dl className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2"><InfoItem label="申请类型"><Badge size="sm" variant="outline">{TYPE_LABELS[row.type]}</Badge></InfoItem><InfoItem label="最新操作时间">{displayTime(row.latestOperationTime)}</InfoItem></dl>
    <Separator />
    <form id={formId} ref={formRef} onSubmit={submit} noValidate>
      <FieldGroup>
        <FieldSet><FieldLegend>审核结果</FieldLegend><RadioGroup value={draft.result} onValueChange={(result: ReviewDraft["result"]) => { setDraft((previous) => ({ ...previous, result })); setErrors({}) }} className="flex flex-wrap gap-6" aria-label="审核结果">
          <Field orientation="horizontal" className="w-auto"><RadioGroupItem id={`${formId}-approve`} value="approve" /><FieldLabel htmlFor={`${formId}-approve`}>审核通过</FieldLabel></Field>
          <Field orientation="horizontal" className="w-auto"><RadioGroupItem id={`${formId}-reject`} value="reject" /><FieldLabel htmlFor={`${formId}-reject`}>审核不通过</FieldLabel></Field>
        </RadioGroup></FieldSet>
        {draft.result === "approve" ? <>
          {isOpen && <><Field data-invalid={Boolean(errors.planId)}><FieldLabel htmlFor={`${formId}-plan`}>报价方案 <span className="text-destructive">*</span></FieldLabel><Select value={draft.planId} onValueChange={(planId) => { setDraft((previous) => ({ ...previous, planId })); setErrors({}) }}><SelectTrigger id={`${formId}-plan`} className="w-full" aria-invalid={Boolean(errors.planId)} aria-required="true" aria-describedby={errors.planId ? `${formId}-plan-error` : undefined}><SelectValue placeholder="请选择报价方案" /></SelectTrigger><SelectContent><SelectGroup>{Object.entries(PRICING_PLANS).map(([id, plan]) => <SelectItem key={id} value={id}>{plan.code} {plan.name}</SelectItem>)}</SelectGroup></SelectContent></Select>{errors.planId && <FieldError id={`${formId}-plan-error`}>{errors.planId}</FieldError>}</Field><PricingTemplate key={draft.planId} planId={draft.planId} /></>}
          <Notice>{approvalHint}</Notice>
        </> : <Field data-invalid={Boolean(errors.reason)}><FieldLabel htmlFor={`${formId}-reason`}>不通过原因 <span className="text-destructive">*</span></FieldLabel><Textarea id={`${formId}-reason`} placeholder="请填写不通过原因" value={draft.reason} maxLength={500} rows={4} aria-required="true" aria-invalid={Boolean(errors.reason)} aria-describedby={`${formId}-reason-help`} onChange={(event) => { setDraft((previous) => ({ ...previous, reason: event.target.value })); setErrors({}) }} /><FieldDescription id={`${formId}-reason-help`} className="text-right tabular-nums">{draft.reason.length} / 500</FieldDescription>{errors.reason && <FieldError>{errors.reason}</FieldError>}</Field>}
      </FieldGroup>
    </form>
    <ConfirmAction confirmation={confirmation} onClose={() => setConfirmation(null)} />
  </WorkflowPanel>
}
