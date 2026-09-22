"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import type { Application } from "../model"
import { AffectedDrivers, ApplicationInfo, ApplicationMaterials, AuditHistory, ConfirmAction, InfoItem, Notice, Section, WorkflowSheet, type Confirmation } from "./withdrawal-parts"

type SheetBaseProps = { row: Application; onClose: () => void; restoreFocus: () => void }

export function DetailSheet({ row, ...props }: SheetBaseProps) {
  return <WorkflowSheet {...props} title="提现模式申请详情" description={`${row.dspName} · ${row.fleetName}`}><ApplicationInfo row={row} /><Separator /><ApplicationMaterials row={row} /><Separator /><AuditHistory row={row} /></WorkflowSheet>
}

export function ClosingSheet({ row, onSubmit, ...props }: SheetBaseProps & { onSubmit: (reason: string) => void }) {
  const [reason, setReason] = useState(row.auditStatus === "business_reject" ? "" : row.closeReason)
  const [dirty, setDirty] = useState(false)
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  return <>
    <WorkflowSheet {...props} title="申请关闭提现模式" description={`${row.dspName} · ${row.fleetName}`} dirty={dirty} footer={(requestClose) => <><Button variant="outline" onClick={requestClose}>取消</Button><Button onClick={() => setConfirmation({ title: "确认提交关闭申请？", description: "关闭申请审核通过后，将于审核通过次日 00:00（America/New_York）正式关闭车队所有司机的提现模式；无已开通司机时直接关闭车队提现模式。", label: "确认提交", onConfirm: () => onSubmit(reason) })}>提交申请</Button></>}>
      <Notice>关闭申请只需业务审核。审核通过后，将于次日 00:00（America/New_York）关闭车队所有司机的提现模式；无已开通司机时直接关闭。</Notice>
      <Section title="基础信息"><dl className="grid grid-cols-1 gap-4 sm:grid-cols-2"><InfoItem label="DSP名称">{row.dspName}</InfoItem><InfoItem label="车队名称">{row.fleetName}</InfoItem></dl></Section>
      <Separator /><AffectedDrivers drivers={row.drivers} /><Separator />
      <FieldGroup><Field><FieldLabel htmlFor="close-reason">关闭原因（选填）</FieldLabel><Textarea id="close-reason" value={reason} maxLength={500} placeholder="请输入关闭原因，最多500字" onChange={(event) => { setReason(event.target.value); setDirty(true) }} /><FieldDescription>{reason.length}/500</FieldDescription></Field></FieldGroup>
    </WorkflowSheet>
    <ConfirmAction confirmation={confirmation} onClose={() => setConfirmation(null)} />
  </>
}

export function AuditSheet({ row, stage, onSubmit, ...props }: SheetBaseProps & { stage: "business" | "financial"; onSubmit: (result: "pass" | "reject", reason: string) => void }) {
  const [result, setResult] = useState<"pass" | "reject">("pass")
  const [reason, setReason] = useState("")
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState("")
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  function submit() {
    if (result === "reject" && !reason.trim()) { setError("审核驳回时请输入原因"); document.getElementById("audit-reason")?.focus(); return }
    if (row.applicationType === "close" && result === "pass") {
      setConfirmation({ title: "确认审核通过？", description: row.affectedDriverCount > 0 ? `审核通过后，将于次日 00:00（America/New_York）正式关闭车队 ${row.affectedDriverCount} 名司机的提现模式。` : "该车队暂无已开通司机，审核通过后车队提现模式将直接关闭。", label: "确认通过", onConfirm: () => onSubmit(result, reason) })
    } else onSubmit(result, reason)
  }
  return <>
    <WorkflowSheet {...props} title={stage === "business" ? "业务审核" : "财务审核"} description={`${row.dspName} · ${row.fleetName}`} dirty={dirty} footer={(requestClose) => <><Button variant="outline" onClick={requestClose}>取消</Button><Button onClick={submit}>提交审核</Button></>}>
      <ApplicationInfo row={row} compact />
      {row.applicationType === "open" && <><Separator /><ApplicationMaterials row={row} /></>}
      <Separator />
      <FieldSet><FieldLegend>审核操作</FieldLegend><FieldGroup>
        <RadioGroup value={result} onValueChange={(value) => { setResult(value as "pass" | "reject"); setDirty(true); setError("") }} className="flex flex-wrap gap-6" aria-label="审核结果">
          <Field orientation="horizontal" className="w-auto"><RadioGroupItem id="audit-pass" value="pass" /><FieldLabel htmlFor="audit-pass">审核通过</FieldLabel></Field>
          <Field orientation="horizontal" className="w-auto"><RadioGroupItem id="audit-reject" value="reject" /><FieldLabel htmlFor="audit-reject">审核驳回</FieldLabel></Field>
        </RadioGroup>
        {result === "reject" ? <Field data-invalid={Boolean(error)}><FieldLabel htmlFor="audit-reason">驳回原因 *</FieldLabel><Textarea id="audit-reason" value={reason} maxLength={200} aria-required aria-invalid={Boolean(error)} aria-describedby={error ? "audit-error" : "audit-hint"} placeholder="请输入驳回原因，最多200字" onChange={(event) => { setReason(event.target.value); setDirty(true); setError("") }} /><FieldDescription id="audit-hint">{reason.length}/200</FieldDescription>{error && <FieldError id="audit-error">{error}</FieldError>}</Field> : <Notice>{row.applicationType === "close" ? "通过后关闭车队提现模式，无需财务审核。" : stage === "business" ? "业务审核通过后，将进入财务审核。" : "财务审核通过后，将开通车队提现模式。"}</Notice>}
      </FieldGroup></FieldSet>
      <Separator /><AuditHistory row={row} />
    </WorkflowSheet>
    <ConfirmAction confirmation={confirmation} onClose={() => setConfirmation(null)} />
  </>
}
