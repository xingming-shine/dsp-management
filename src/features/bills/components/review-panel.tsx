"use client"

import { useRef, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ConfirmAction, WorkflowPanel, type Confirmation } from "@/features/withdrawal-mode/components/withdrawal-parts"
import { mockSession } from "@/mocks/session"
import { gross, money, reviewBills, validateAttachments, type Attachment, type Bill } from "../model"
import { updateBills } from "../store"
import { Amount, AttachedFile, Notice } from "./bill-parts"

export function ReviewPanel({ bills, onClose, onComplete }: { bills: Bill[]; onClose: () => void; onComplete: () => void }) {
  const [result, setResult] = useState<"confirmed" | "rejected">("confirmed")
  const [note, setNote] = useState("")
  const [files, setFiles] = useState<Attachment[]>([])
  const [error, setError] = useState("")
  const [fileError, setFileError] = useState("")
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const textarea = useRef<HTMLTextAreaElement>(null)
  const total = bills.reduce((sum, bill) => sum + gross(bill), 0)
  function submit() {
    if (!bills.length) { setError("请在左侧选择至少一张待确认账单"); return }
    if (result === "rejected" && note.trim().length < 10) { setError("驳回原因至少填写 10 字"); textarea.current?.focus(); return }
    setError("")
    setConfirmation({ title: result === "confirmed" ? "确认所选账单？" : "驳回所选账单？", description: `共 ${bills.length} 张账单，合计 ${money(total)} USD。本次处理结果将应用到所有已选账单并写入操作记录。`, label: result === "confirmed" ? "确认账单" : "驳回账单", destructive: result === "rejected", onConfirm: () => {
      try {
        updateBills((state) => reviewBills(state, bills.map((bill) => bill.id), result, note, files, mockSession.user.name, new Date().toISOString()))
        setConfirmation(null); toast.success(result === "confirmed" ? "账单已确认" : "账单已驳回"); onComplete()
      } catch (error) { setConfirmation(null); setError(error instanceof Error ? error.message : "操作失败，请重试") }
    } })
  }
  return <><WorkflowPanel title="账单确认或驳回" description={`已选 ${bills.length} 张 · 合计 ${money(total)} USD`} dirty={Boolean(note || files.length || result === "rejected")} onClose={onClose} footer={(close) => <><Button variant="outline" onClick={close}>取消</Button><Button variant={result === "rejected" ? "destructive" : "default"} disabled={!bills.length} onClick={submit}>{result === "confirmed" ? "确认账单" : "驳回账单"}</Button></>}>
    <Notice>只可处理当前页中待DSP确认的账单。确认后流转至财务付款流程；驳回后由财务变更账单。本页面为模拟操作。</Notice>
    <FieldGroup><Field><FieldLabel>确认结果</FieldLabel><RadioGroup value={result} onValueChange={(value) => { setResult(value as typeof result); setError("") }} className="flex flex-wrap gap-6" aria-label="确认结果"><Field orientation="horizontal"><RadioGroupItem id="bill-confirm" value="confirmed" /><FieldLabel htmlFor="bill-confirm">同意，确认账单</FieldLabel></Field><Field orientation="horizontal"><RadioGroupItem id="bill-reject" value="rejected" /><FieldLabel htmlFor="bill-reject">驳回账单</FieldLabel></Field></RadioGroup></Field>
      <Field data-invalid={Boolean(error)}><FieldLabel htmlFor="review-note">{result === "rejected" ? "驳回原因（必填）" : "备注（选填）"}</FieldLabel><Textarea ref={textarea} id="review-note" rows={5} maxLength={500} value={note} aria-invalid={Boolean(error)} aria-describedby="review-note-hint" onChange={(event) => { setNote(event.target.value); setError("") }} placeholder={result === "rejected" ? "请写明驳回原因，至少10字，财务据此重新变更账单" : "如有说明可填写"} /><FieldDescription id="review-note-hint">{note.length}/500{result === "rejected" ? " · 驳回原因至少10字" : ""}</FieldDescription>{error && <FieldError>{error}</FieldError>}</Field>
      <Field data-invalid={Boolean(fileError)}><FieldLabel htmlFor="bill-attachments">附件（选填，最多3个）</FieldLabel><Input id="bill-attachments" type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.xls,.xlsx,.csv" aria-invalid={Boolean(fileError)} aria-describedby="bill-attachment-hint" onChange={(event) => {
        const added = Array.from(event.target.files ?? []).map((file) => ({ id: crypto.randomUUID(), name: file.name, size: file.size, file }))
        try { validateAttachments([...files, ...added]); setFiles([...files, ...added]); setFileError("") } catch (error) { setFileError(error instanceof Error ? error.message : "附件无效") }
        event.target.value = ""
      }} /><FieldDescription id="bill-attachment-hint">支持 PDF、图片、Excel、CSV；单个不超过10 MB。附件仅保留在本次浏览器会话。</FieldDescription>{fileError && <FieldError>{fileError}</FieldError>}<div className="flex flex-col gap-2">{files.map((file) => <div key={file.id} className="flex min-w-0 items-center justify-between gap-2"><AttachedFile attachment={file} /><Button variant="outline" size="sm" aria-label={`移除附件 ${file.name}`} onClick={() => { setFiles(files.filter((item) => item.id !== file.id)); setFileError("") }}>移除</Button></div>)}</div></Field>
    </FieldGroup><p className="text-sm">所选账单合计：<Amount cents={total} /> USD</p>
  </WorkflowPanel><ConfirmAction confirmation={confirmation} onClose={() => setConfirmation(null)} /></>
}
