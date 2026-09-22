export type AuditStatus = "pending_business" | "pending_financial" | "pass" | "business_reject" | "financial_reject"
export type ModeStatus = "unopened" | "opened" | "closed"
export type FileGroup = "tax" | "reg" | "benefit" | "support" | "personal" | "ssn"
export type Attachment = { id: string; name: string; file?: File }
export type Attachments = Record<FileGroup, Attachment[]>
export type AuditLog = { time: string; status: string; operator: string; action: string; reason?: string }
export type Driver = { id: string; name: string; phone: string; fullName: string; fullPhone: string; fleet: string; openDate: string }
export type Application = {
  id: string; dspName: string; fleetName: string; businessType: string
  applicationType: "open" | "close"; latestOperationDate: string; firstOpenApplyDate: string
  auditStatus: AuditStatus; modeStatus: ModeStatus; position: string; address: string; birthday: string
  closeReason: string; expectedCloseTime: string; affectedDriverCount: number
  everOpened: boolean; firstOpenRejected: boolean
  attachments: Attachments; logs: AuditLog[]; drivers: Driver[]
}

export const AUDIT_LABELS: Record<AuditStatus, string> = {
  pending_business: "业务审核中", pending_financial: "财务审核中", pass: "审核通过", business_reject: "业务驳回", financial_reject: "财务驳回",
}
export const MODE_LABELS: Record<ModeStatus, string> = { unopened: "未开通", opened: "已开通", closed: "已关闭" }
export const FILE_FIELDS: { key: FileGroup; label: string; required: boolean; hint: string }[] = [
  { key: "tax", label: "税号支持文件", required: true, hint: "支持 PDF、JPG、PNG，可上传多个文件。" },
  { key: "reg", label: "公司注册证明", required: true, hint: "LLC 提供 Certificate of Formation；Corporation 提供 Certificate of Incorporation。" },
  { key: "benefit", label: "受益所有权证明", required: false, hint: "建议提供完整股权结构图或声明。" },
  { key: "support", label: "支持性商业文件", required: false, hint: "新公司可提供最近 90 天内的发票、商业计划书、银行对账单等。" },
  { key: "personal", label: "政府签发身份证件", required: true, hint: "护照、身份证或驾照正反面。" },
  { key: "ssn", label: "SSN / 社保文件", required: false, hint: "如为美国个人，可提供 SSN 文件扫描件。" },
]
export function emptyAttachments(): Attachments {
  return { tax: [], reg: [], benefit: [], support: [], personal: [], ssn: [] }
}

export type OpeningDraft = Pick<Application, "dspName" | "fleetName" | "businessType" | "birthday" | "position" | "address" | "attachments"> & { agreed: boolean }
export function birthdayToISO(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
  if (!match) return ""
  const iso = `${match[3]}-${match[1]}-${match[2]}`
  const date = new Date(`${iso}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === iso ? iso : ""
}
export function dateInZone(now: string, timeZone = "America/New_York") {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(now))
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}
export function nextMidnight(now: string, timeZone = "America/New_York") {
  const target = new Date(`${dateInZone(now, timeZone)}T00:00:00Z`).getTime() + 86400000
  let guess = target
  for (let index = 0; index < 4; index++) {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date(guess))
    const p = Object.fromEntries(parts.map((part) => [part.type, part.value]))
    const wall = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute), Number(p.second))
    guess += target - wall
  }
  return new Date(guess).toISOString()
}
export function validateOpening(draft: OpeningDraft, now: string) {
  const errors: Record<string, string> = {}
  for (const [key, label] of Object.entries({ dspName: "DSP名称", fleetName: "车队名称", businessType: "企业类型", position: "职务", address: "居住地址" })) {
    if (!String(draft[key as keyof OpeningDraft]).trim()) errors[key] = `请填写${label}`
  }
  const date = new Date(`${draft.birthday}T00:00:00Z`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.birthday) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== draft.birthday || draft.birthday > dateInZone(now)) errors.birthday = "请输入有效出生日期（MM/DD/YYYY），不能晚于今天"
  for (const field of FILE_FIELDS) if (field.required && !draft.attachments[field.key].length) errors[field.key] = `请上传${field.label}`
  if (!draft.agreed) errors.agreed = "请阅读并同意协议条款"
  return errors
}

export function rowActions(row: Application) {
  const rejected = ["business_reject", "financial_reject"].includes(row.auditStatus)
  return {
    business: row.auditStatus === "pending_business",
    financial: row.applicationType === "open" && row.auditStatus === "pending_financial",
    reapply: row.applicationType === "open" && rejected,
    remove: row.applicationType === "open" && rejected && row.firstOpenRejected && !row.everOpened,
    close: row.modeStatus === "opened" && !(row.applicationType === "close" && row.auditStatus === "pending_business"),
    reopen: row.modeStatus === "closed" && row.auditStatus === "pass",
  }
}
export type WorkflowAction =
  | { type: "open"; id: string; draft: OpeningDraft; existingId?: string }
  | { type: "close"; id: string; reason: string }
  | { type: "audit"; id: string; stage: "business" | "financial"; result: "pass" | "reject"; reason: string }
  | { type: "delete"; id: string }

// Pure state transitions shared by the preview UI and workflow checks.
export function transition(rows: Application[], action: WorkflowAction, now: string, operator: string): Application[] {
  const date = dateInZone(now)
  if (action.type === "open") {
    if (Object.keys(validateOpening(action.draft, now)).length) throw new Error("申请资料不完整，请检查必填项")
    const old = action.existingId ? rows.find((row) => row.id === action.existingId) : undefined
    if (action.existingId && (!old || !(rowActions(old).reapply || rowActions(old).reopen))) throw new Error("当前申请不能重新提交")
    const { agreed: _agreed, ...values } = action.draft
    void _agreed
    const row: Application = {
      ...values, dspName: values.dspName.trim(), fleetName: values.fleetName.trim(), position: values.position.trim(), address: values.address.trim(),
      id: old?.id ?? action.id, applicationType: "open", latestOperationDate: date,
      firstOpenApplyDate: old?.firstOpenApplyDate || date, auditStatus: "pending_business", modeStatus: old?.everOpened ? "closed" : "unopened",
      closeReason: "", expectedCloseTime: "", affectedDriverCount: 0, everOpened: old?.everOpened ?? false, firstOpenRejected: false,
      drivers: old?.drivers ?? [], logs: [{ time: now, status: AUDIT_LABELS.pending_business, operator, action: old ? "重新提交" : "发起申请" }, ...(old?.logs ?? [])],
    }
    return old ? rows.map((item) => item.id === old.id ? row : item) : [row, ...rows]
  }
  const current = rows.find((row) => row.id === action.id)
  if (!current) throw new Error("申请不存在，请刷新列表")
  const actions = rowActions(current)
  if (action.type === "delete") {
    if (!actions.remove) throw new Error("仅首次开启被驳回且从未开通过的申请可删除")
    return rows.filter((row) => row.id !== action.id)
  }
  const row = { ...current, latestOperationDate: date }
  let logAction: string
  let reason = ""
  if (action.type === "close") {
    if (!actions.close) throw new Error("当前申请不能申请关闭")
    if (action.reason.length > 500) throw new Error("关闭原因最多 500 字")
    Object.assign(row, { applicationType: "close", auditStatus: "pending_business", modeStatus: "opened", closeReason: action.reason.trim(), affectedDriverCount: row.drivers.length, expectedCloseTime: "", everOpened: true })
    logAction = "申请关闭"
  } else {
    if (!actions[action.stage]) throw new Error("审核状态已变化，请重新打开申请")
    if (action.result === "reject" && (!action.reason.trim() || action.reason.length > 200)) throw new Error("请输入驳回原因，最多 200 字")
    logAction = `${action.stage === "business" ? "业务" : "财务"}审核${action.result === "pass" ? "通过" : "驳回"}`
    if (action.result === "reject") {
      row.auditStatus = action.stage === "business" ? "business_reject" : "financial_reject"
      row.firstOpenRejected = row.applicationType === "open" && !row.everOpened
      reason = action.reason.trim()
    } else if (row.applicationType === "close") {
      row.auditStatus = "pass"
      row.modeStatus = "closed"
      row.expectedCloseTime = row.affectedDriverCount ? nextMidnight(now) : now
    } else if (action.stage === "business") {
      row.auditStatus = "pending_financial"
    } else {
      row.auditStatus = "pass"
      row.modeStatus = "opened"
      row.everOpened = true
      row.firstOpenRejected = false
    }
  }
  row.logs = [{ time: now, status: AUDIT_LABELS[row.auditStatus], operator, action: logAction, reason }, ...row.logs]
  return rows.map((item) => item.id === row.id ? row : item)
}
