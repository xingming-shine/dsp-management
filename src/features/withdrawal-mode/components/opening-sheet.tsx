"use client"

import { useRef, useState } from "react"
import { UploadIcon, XIcon } from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { formatDate } from "@/lib/date-time"
import { birthdayToISO, dateInZone, emptyAttachments, FILE_FIELDS, validateOpening, type Application, type Attachment, type OpeningDraft } from "../model"
import { AttachmentButton, WorkflowSheet } from "./withdrawal-parts"

function UploadField({ field, files, onChange, error }: {
  field: (typeof FILE_FIELDS)[number]; files: Attachment[]; onChange: (files: Attachment[]) => void; error?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const id = `attachment-${field.key}`
  return <Field data-invalid={Boolean(error)}>
    <FieldLabel htmlFor={id}>{field.label}{field.required ? " *" : "（选填）"}</FieldLabel>
    <Input ref={inputRef} id={id} type="file" multiple accept=".pdf,.jpg,.jpeg,.png" className="sr-only" tabIndex={-1} aria-invalid={Boolean(error)} aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`} onChange={(event) => {
      const selected = Array.from(event.target.files ?? [])
      const accepted = selected.filter((file) => /\.(pdf|jpe?g|png)$/i.test(file.name) && (!file.type || ["application/pdf", "image/jpeg", "image/png"].includes(file.type)))
      if (accepted.length !== selected.length) toast.error("仅支持 PDF、JPG、PNG 文件，其他格式未添加。")
      if (accepted.length) onChange([...files, ...accepted.map((file) => ({ id: crypto.randomUUID(), name: file.name, file }))])
      event.target.value = ""
    }} />
    <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} aria-label={`上传${field.label}`} aria-invalid={Boolean(error)} aria-describedby={`${id}-hint`}><UploadIcon data-icon="inline-start" />上传文件</Button>
    <FieldDescription id={`${id}-hint`}>{field.hint}</FieldDescription>
    {files.length > 0 && <ul className="flex min-w-0 flex-col gap-1">{files.map((file) => <li key={file.id} className="flex min-w-0 items-center justify-between gap-2"><AttachmentButton attachment={file} /><Button type="button" variant="ghost" size="icon-xs" aria-label={`移除${field.label}：${file.name}`} onClick={() => onChange(files.filter((item) => item.id !== file.id))}><XIcon /></Button></li>)}</ul>}
    {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
  </Field>
}

export function OpeningSheet({ row, onClose, onSubmit, restoreFocus }: {
  row?: Application; onClose: () => void; onSubmit: (draft: OpeningDraft) => void; restoreFocus: () => void
}) {
  const [draft, setDraft] = useState<OpeningDraft>(() => ({ dspName: row?.dspName ?? "", fleetName: row?.fleetName ?? "", businessType: row?.businessType ?? "", birthday: row?.birthday ?? "", position: row?.position ?? "", address: row?.address ?? "", attachments: row?.attachments ?? emptyAttachments(), agreed: Boolean(row) }))
  const [birthday, setBirthday] = useState(row ? formatDate(row.birthday) : "")
  const [dirty, setDirty] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const now = new Date().toISOString()
  function change<K extends keyof OpeningDraft>(key: K, value: OpeningDraft[K]) {
    setDirty(true)
    setDraft((previous) => ({ ...previous, [key]: value, ...(key === "dspName" ? { fleetName: "" } : {}) }))
    setErrors((previous) => ({ ...previous, [key]: "" }))
  }
  function submit(event: React.FormEvent) {
    event.preventDefault()
    const nextDraft = { ...draft, birthday: birthdayToISO(birthday) }
    const nextErrors = validateOpening(nextDraft, now)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) {
      toast.error("请完善必填资料后提交")
      requestAnimationFrame(() => document.querySelector<HTMLElement>('#withdrawal-opening-form [aria-invalid="true"]:not([type="file"])')?.focus())
      return
    }
    onSubmit(nextDraft)
  }
  function textField(key: "dspName" | "fleetName" | "position" | "address", label: string, placeholder: string, maxLength: number) {
    return <Field data-invalid={Boolean(errors[key])}><FieldLabel htmlFor={`apply-${key}`}>{label} *</FieldLabel><Input id={`apply-${key}`} value={draft[key]} maxLength={maxLength} placeholder={placeholder} aria-required aria-invalid={Boolean(errors[key])} aria-describedby={errors[key] ? `${key}-error` : undefined} onChange={(event) => change(key, event.target.value)} />{errors[key] && <FieldError id={`${key}-error`}>{errors[key]}</FieldError>}</Field>
  }
  const rejected = row?.logs.find((log) => log.reason)?.reason
  const resubmitting = row && row.modeStatus !== "closed"
  return <WorkflowSheet title={resubmitting ? "修改并重新提交" : "申请开启提现模式"} description="填写企业与个人资料，上传开户材料并确认付款协议。带 * 的项目为必填项。" dirty={dirty} onClose={onClose} restoreFocus={restoreFocus} footer={(requestClose) => <><Button type="button" variant="outline" onClick={requestClose}>取消</Button><Button type="submit" form="withdrawal-opening-form">{resubmitting ? "重新提交" : "提交申请"}</Button></>}>
    <form id="withdrawal-opening-form" noValidate onSubmit={submit} className="flex flex-col gap-6">
      {resubmitting && rejected && <Alert variant="destructive"><AlertTitle>上次驳回原因</AlertTitle><AlertDescription>{rejected}</AlertDescription></Alert>}
      <FieldSet><FieldLegend>基本信息</FieldLegend><FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {textField("dspName", "DSP名称", "请输入DSP名称", 100)}
        {textField("fleetName", "车队名称", "请输入车队名称或组织编码", 100)}
        <Field data-invalid={Boolean(errors.businessType)}><FieldLabel htmlFor="apply-business">企业类型 *</FieldLabel><Select value={draft.businessType} onValueChange={(value) => change("businessType", value)}><SelectTrigger id="apply-business" className="w-full" aria-required aria-invalid={Boolean(errors.businessType)} aria-describedby={errors.businessType ? "business-error" : undefined}><SelectValue placeholder="请选择企业类型" /></SelectTrigger><SelectContent><SelectGroup>{["LLC", "Corporation", "Sole Proprietorship", "Partnership", "其他"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectGroup></SelectContent></Select>{errors.businessType && <FieldError id="business-error">{errors.businessType}</FieldError>}</Field>
        <Field data-disabled><FieldLabel htmlFor="apply-date">申请日期</FieldLabel><Input id="apply-date" disabled value={formatDate(dateInZone(now))} className="tabular-nums" /></Field>
      </FieldGroup></FieldSet>
      <Separator />
      <FieldSet><FieldLegend>商业文件 / Business Documents</FieldLegend><FieldGroup className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">{FILE_FIELDS.slice(0, 4).map((field) => <UploadField key={field.key} field={field} files={draft.attachments[field.key]} error={errors[field.key]} onChange={(files) => { change("attachments", { ...draft.attachments, [field.key]: files }); setErrors((previous) => ({ ...previous, [field.key]: "" })) }} />)}</FieldGroup></FieldSet>
      <Separator />
      <FieldSet><FieldLegend>个人文件与信息</FieldLegend><FieldGroup className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
        {FILE_FIELDS.slice(4).map((field) => <UploadField key={field.key} field={field} files={draft.attachments[field.key]} error={errors[field.key]} onChange={(files) => { change("attachments", { ...draft.attachments, [field.key]: files }); setErrors((previous) => ({ ...previous, [field.key]: "" })) }} />)}
        <Field data-invalid={Boolean(errors.birthday)}><FieldLabel htmlFor="apply-birthday">出生日期 *</FieldLabel><Input id="apply-birthday" placeholder="MM/DD/YYYY" value={birthday} maxLength={10} inputMode="numeric" aria-required aria-invalid={Boolean(errors.birthday)} aria-describedby={errors.birthday ? "birthday-error" : "birthday-hint"} onChange={(event) => { setBirthday(event.target.value); setDirty(true); setErrors((value) => ({ ...value, birthday: "" })) }} /><FieldDescription id="birthday-hint">按月 / 日 / 年输入，例如 03/15/1985。</FieldDescription>{errors.birthday && <FieldError id="birthday-error">{errors.birthday}</FieldError>}</Field>
        {textField("position", "职务", "请输入在公司担任的职务", 100)}
        <div className="sm:col-span-2">{textField("address", "居住地址", "请输入详细居住地址", 200)}</div>
      </FieldGroup></FieldSet>
      <Separator />
      <FieldSet><FieldLegend>协议签署</FieldLegend>
        <div className="flex max-h-64 flex-col gap-3 overflow-y-auto rounded-lg border bg-muted/30 p-4 text-sm" tabIndex={0} role="region" aria-label="Amendment – Payment Terms 协议内容">
          <h4 className="font-medium">Amendment – Payment Terms</h4>
          <p className="font-medium">PAYMENT TERMS AMENDMENT</p>
          <p>This Amendment (&quot;Amendment&quot;) is entered into as of the date of last signature below (&quot;Effective Date&quot;), by and between the parties identified in the signature block below.</p>
          <p className="font-medium">1. DEFINITIONS</p><p>&quot;Payment Terms&quot; means the payment terms and conditions for services rendered under the Master Agreement.</p>
          <p className="font-medium">2. AMENDMENT TO PAYMENT TERMS</p><p>The parties agree to amend the Payment Terms as follows: [Terms to be specified]</p>
          <p className="font-medium">3. EFFECT OF AMENDMENT</p><p>Except as specifically modified by this Amendment, all other terms and conditions of the Master Agreement shall remain in full force and effect.</p>
          <p className="font-medium">4. GOVERNING LAW</p><p>This Amendment shall be governed by and construed in accordance with the laws of the State of Delaware.</p>
        </div>
        <FieldGroup><Field orientation="horizontal" data-invalid={Boolean(errors.agreed)}><Checkbox id="apply-agreed" checked={draft.agreed} onCheckedChange={(value) => change("agreed", value === true)} aria-required aria-invalid={Boolean(errors.agreed)} aria-describedby={errors.agreed ? "agreement-error" : undefined} /><FieldLabel htmlFor="apply-agreed">我已阅读并同意上述协议条款</FieldLabel></Field>{errors.agreed && <FieldError id="agreement-error">{errors.agreed}</FieldError>}</FieldGroup>
      </FieldSet>
    </form>
  </WorkflowSheet>
}
