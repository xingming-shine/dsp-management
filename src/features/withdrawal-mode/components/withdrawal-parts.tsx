"use client"

import { createContext, useContext, useId, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react"
import { EyeIcon, EyeOffIcon, FileTextIcon, InfoIcon } from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDate, formatDateTime } from "@/lib/date-time"
import { cn } from "@/lib/utils"
import { mockSession } from "@/mocks/session"
import { AUDIT_LABELS, FILE_FIELDS, MODE_LABELS, type Application, type Attachment, type AuditStatus, type Driver, type ModeStatus } from "../model"

export const displayTime = (value: string) => formatDateTime(value, { timeZone: mockSession.preferences.timezone })

export function AuditBadge({ status }: { status: AuditStatus }) {
  return <Badge size="sm" variant={status === "pass" ? "success" : status.includes("reject") ? "destructive" : "warning"}>{AUDIT_LABELS[status]}</Badge>
}
export function ModeBadge({ status }: { status: ModeStatus }) {
  return <Badge size="sm" variant={status === "opened" ? "success" : "secondary"}>{MODE_LABELS[status]}</Badge>
}
export function EmptyResults({ title = "暂无符合条件的申请", description = "请调整查询条件后重试。" }: { title?: string; description?: string }) {
  return <Empty><EmptyHeader><EmptyTitle>{title}</EmptyTitle><EmptyDescription>{description}</EmptyDescription></EmptyHeader></Empty>
}
export function Notice({ children }: { children: ReactNode }) {
  return <Alert><InfoIcon /><AlertDescription>{children}</AlertDescription></Alert>
}
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="flex min-w-0 flex-col gap-4"><h3 className="text-base font-medium">{title}</h3>{children}</section>
}
export function InfoItem({ label, children }: { label: string; children: ReactNode }) {
  return <div className="flex min-w-0 flex-col gap-1.5"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="break-words text-sm tabular-nums">{children || "—"}</dd></div>
}
export function AttachmentButton({ attachment }: { attachment: Attachment }) {
  function preview() {
    if (!attachment.file) {
      toast.info("参考示例未提供该历史文件的原件，可在重新提交时上传替换。")
      return
    }
    const url = URL.createObjectURL(attachment.file)
    window.open(url, "_blank", "noopener,noreferrer")
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }
  return <Button type="button" variant="link" size="sm" className="min-w-0 max-w-full justify-start px-0" onClick={preview} title={attachment.name}><FileTextIcon data-icon="inline-start" /><span className="truncate">{attachment.name}</span></Button>
}
export function ApplicationInfo({ row, compact = false }: { row: Application; compact?: boolean }) {
  return <Section title={compact ? "申请信息" : "基础资料"}>
    <dl className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
      <InfoItem label="DSP名称">{row.dspName}</InfoItem><InfoItem label="车队名称">{row.fleetName}</InfoItem>
      {!compact || row.applicationType === "open" ? <>
        <InfoItem label="企业类型">{row.businessType}</InfoItem><InfoItem label="职务">{row.position}</InfoItem>
        <InfoItem label="出生日期">{formatDate(row.birthday)}</InfoItem><InfoItem label="居住地址">{row.address}</InfoItem>
      </> : null}
      <InfoItem label="申请类型"><Badge size="sm" variant="outline">{row.applicationType === "open" ? "开启申请" : "关闭申请"}</Badge></InfoItem>
      <InfoItem label="提现模式开通状态"><ModeBadge status={row.modeStatus} /></InfoItem>
      <InfoItem label="审核状态"><AuditBadge status={row.auditStatus} /></InfoItem>
      <InfoItem label="最新操作日期">{formatDate(row.latestOperationDate)}</InfoItem>
      {row.applicationType === "close" ? <>
        <InfoItem label="关闭原因">{row.closeReason}</InfoItem><InfoItem label="受影响司机数量">{row.affectedDriverCount} 人</InfoItem>
        {row.expectedCloseTime && <InfoItem label={`关闭生效时间（${mockSession.preferences.timezone}）`}>{displayTime(row.expectedCloseTime)}</InfoItem>}
      </> : null}
    </dl>
  </Section>
}
export function ApplicationMaterials({ row }: { row: Application }) {
  return <Section title="开户材料"><dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">{FILE_FIELDS.map((field) => <InfoItem key={field.key} label={field.label}><div className="flex min-w-0 flex-col items-start gap-1">{row.attachments[field.key].length ? row.attachments[field.key].map((file) => <AttachmentButton key={file.id} attachment={file} />) : "—"}</div></InfoItem>)}</dl></Section>
}
export function AuditHistory({ row }: { row: Application }) {
  const logs = [...row.logs].sort((a, b) => Date.parse(b.time) - Date.parse(a.time))
  return <Section title="审核记录">
    <p className="text-xs text-muted-foreground">时间按 {mockSession.preferences.timezone} 展示，最新记录在前。</p>
    <ol aria-label="审核记录时间线" className="flex flex-col">{logs.map((log, index) => <li key={`${log.time}-${index}`} className="relative flex flex-col gap-1.5 pb-6 pl-7 last:pb-0">
      {index < logs.length - 1 && <Separator orientation="vertical" className="absolute top-5 bottom-0 left-1.5 data-[orientation=vertical]:h-auto" />}
      <span aria-hidden className={cn("absolute top-1 left-0 size-3 rounded-full", log.status.includes("驳回") ? "bg-destructive" : log.status === "审核通过" ? "bg-success" : "bg-warning")} />
      <time dateTime={log.time} className="text-xs text-muted-foreground tabular-nums">{displayTime(log.time)}</time>
      <span className="text-sm font-medium">{log.status}</span>
      <span className="text-xs text-muted-foreground">操作人：{log.operator}</span>
      <p className="text-sm">{log.action}</p>
      {log.reason && <p className="break-words text-sm">驳回原因：{log.reason}</p>}
    </li>)}</ol>
  </Section>
}
export type Confirmation = { title: string; description: string; label: string; destructive?: boolean; onConfirm: () => void }
export function ConfirmAction({ confirmation, onClose, onCloseAutoFocus }: { confirmation: Confirmation | null; onClose: () => void; onCloseAutoFocus?: (event: Event) => void }) {
  return <AlertDialog open={Boolean(confirmation)} onOpenChange={(open) => { if (!open) onClose() }}>
    <AlertDialogContent onCloseAutoFocus={onCloseAutoFocus}><AlertDialogHeader><AlertDialogTitle>{confirmation?.title}</AlertDialogTitle><AlertDialogDescription>{confirmation?.description}</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction variant={confirmation?.destructive ? "destructive" : "default"} onClick={() => confirmation?.onConfirm()}>{confirmation?.label ?? "确认"}</AlertDialogAction></AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
}
export const WorkflowDirtyContext = createContext<RefObject<boolean> | null>(null)

/** Inline detail/form surface; the workspace guards every way of leaving a draft. */
export function WorkflowPanel({ title, description, children, footer, dirty = false, onClose }: {
  title: string; description: string; children: ReactNode; footer?: (requestClose: () => void) => ReactNode; dirty?: boolean; onClose: () => void
}) {
  const dirtyRef = useContext(WorkflowDirtyContext)
  const titleId = useId()
  const headingRef = useRef<HTMLHeadingElement>(null)
  useLayoutEffect(() => {
    if (!dirtyRef) return
    dirtyRef.current = dirty
    return () => { dirtyRef.current = false }
  }, [dirty, dirtyRef])
  useLayoutEffect(() => { headingRef.current?.focus({ preventScroll: true }) }, [])
  return <article aria-labelledby={titleId} className="withdrawal-information flex h-full min-h-0 min-w-0 flex-col">
    <header className="flex shrink-0 flex-col gap-2 px-[30px] pt-[30px] pb-6"><h2 id={titleId} ref={headingRef} tabIndex={-1} className="text-base font-medium outline-none">{title}</h2><p className="text-sm text-muted-foreground">{description}</p></header>
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overscroll-contain px-[30px] pb-[30px]">{children}</div>
    {footer && <><Separator /><footer className="flex shrink-0 flex-wrap justify-end gap-2 px-[30px] py-[18px]">{footer(onClose)}</footer></>}
  </article>
}

export function AffectedDrivers({ drivers }: { drivers: Driver[] }) {
  const [restricted, setRestricted] = useState(false)
  const [revealed, setRevealed] = useState<Record<string, boolean>>({})
  function sensitive(driver: Driver, field: "name" | "phone") {
    if (restricted) return "/"
    const key = `${driver.id}-${field}`
    return <div className="flex items-center gap-2"><span>{revealed[key] ? (field === "name" ? driver.fullName : driver.fullPhone) : driver[field]}</span><Button type="button" variant="ghost" size="icon-xs" aria-label={`${revealed[key] ? "隐藏" : "查看"}${driver.id}的${field === "name" ? "姓名" : "电话"}`} onClick={() => setRevealed((value) => ({ ...value, [key]: !value[key] }))}>{revealed[key] ? <EyeOffIcon /> : <EyeIcon />}</Button></div>
  }
  return <Section title="当前开通提现模式的司机">
    <div className="flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-muted-foreground">共 {drivers.length} 人 · {restricted ? "受限用户不可查看姓名和电话" : "姓名和电话默认脱敏"}</span><Button type="button" variant="outline" size="sm" onClick={() => { setRestricted(!restricted); setRevealed({}) }}>{restricted ? "切换为非受限用户" : "切换为受限用户"}</Button></div>
    <Table><TableHeader><TableRow><TableHead>司机ID</TableHead><TableHead>司机姓名</TableHead><TableHead>电话</TableHead><TableHead>所属车队</TableHead><TableHead>提现模式开启日期</TableHead></TableRow></TableHeader><TableBody>{drivers.map((driver) => <TableRow key={driver.id}><TableCell>{driver.id}</TableCell><TableCell>{sensitive(driver, "name")}</TableCell><TableCell>{sensitive(driver, "phone")}</TableCell><TableCell>{driver.fleet}</TableCell><TableCell className="tabular-nums">{formatDate(driver.openDate)}</TableCell></TableRow>)}{!drivers.length && <TableRow><TableCell colSpan={5}><EmptyResults title="暂无已开通提现模式的司机" description="审核通过后，车队提现模式将直接关闭。" /></TableCell></TableRow>}</TableBody></Table>
  </Section>
}
