"use client"

import { useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import type { Application } from "../model"
import { AffectedDrivers, ApplicationInfo, ApplicationMaterials, AuditHistory, ConfirmAction, InfoItem, Notice, Section, WorkflowPanel, type Confirmation } from "./withdrawal-parts"
import { AgreementSigning } from "./payment-agreement"

type PanelBaseProps = { row: Application; onClose: () => void }

export function DetailPanel({ row, actions, ...props }: PanelBaseProps & { actions?: ReactNode }) {
  return <WorkflowPanel {...props} title="提现模式详情" description={`${row.dspName} · ${row.fleetName}`} footer={actions ? () => actions : undefined}><ApplicationInfo row={row} /><Separator /><ApplicationMaterials row={row} /><Separator /><AgreementSigning /><Separator /><AuditHistory row={row} /></WorkflowPanel>
}

export function ClosingPanel({ row, onSubmit, ...props }: PanelBaseProps & { onSubmit: (reason: string) => void }) {
  const [reason, setReason] = useState(row.auditStatus === "business_reject" ? "" : row.closeReason)
  const [dirty, setDirty] = useState(false)
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  return <>
    <WorkflowPanel {...props} title="申请关闭提现模式" description={`${row.dspName} · ${row.fleetName}`} dirty={dirty} footer={(requestClose) => <><Button variant="outline" onClick={requestClose}>取消</Button><Button onClick={() => setConfirmation({ title: "确认提交关闭申请？", description: "关闭申请审核通过后，将于审核通过次日 00:00正式关闭车队所有司机的提现模式；无已开通司机时直接关闭车队提现模式。", label: "确认提交", onConfirm: () => onSubmit(reason) })}>提交申请</Button></>}>
      <Notice>关闭申请只需业务审核。审核通过后，将于次日 00:00关闭车队所有司机的提现模式；无已开通司机时直接关闭。</Notice>
      <Section title="基础信息"><dl className="grid grid-cols-1 gap-4 sm:grid-cols-2"><InfoItem label="DSP名称">{row.dspName}</InfoItem><InfoItem label="车队名称">{row.fleetName}</InfoItem></dl></Section>
      <Separator /><AffectedDrivers drivers={row.drivers} /><Separator />
      <FieldGroup><Field><FieldLabel htmlFor="close-reason">关闭原因（选填）</FieldLabel><Textarea id="close-reason" value={reason} maxLength={500} placeholder="请输入关闭原因，最多500字" onChange={(event) => { setReason(event.target.value); setDirty(true) }} /><FieldDescription>{reason.length}/500</FieldDescription></Field></FieldGroup>
    </WorkflowPanel>
    <ConfirmAction confirmation={confirmation} onClose={() => setConfirmation(null)} />
  </>
}
