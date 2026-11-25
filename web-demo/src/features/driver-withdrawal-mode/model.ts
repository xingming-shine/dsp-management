import { dateInZone, nextMidnight } from "../withdrawal-mode/model"

export type AuditStatus = "pending" | "approved" | "rejected"
export type ModeStatus = "unopened" | "opening_pending_effective" | "opened" | "closing_pending_effective" | "closed"
export type OperationLog = { time: string; operator: string; action: string; note?: string; reason?: string; effectiveTime?: string }
export type DriverWithdrawal = {
  id: string; name: string; phone: string; fleet: string; type: "open" | "close"
  applyTime: string; auditTime: string; latestOperationTime: string; auditStatus: AuditStatus
  modeStatus: ModeStatus; openTime: string; closeTime: string; plan: string; rejectReason: string
  restricted?: boolean; organizationId?: string; logs: OperationLog[]
}
export type PricingPlan = { code: string; name: string; feeType: string; currency: string; taxRate: string; items: string[][] }
export const AUDIT_LABELS: Record<AuditStatus, string> = { pending: "待审核", approved: "已通过", rejected: "不通过" }
export const MODE_LABELS: Record<ModeStatus, string> = { unopened: "未开通", opening_pending_effective: "开通待生效", opened: "已开通", closing_pending_effective: "关闭待生效", closed: "已关闭" }
export const TYPE_LABELS = { open: "开通申请", close: "关闭申请" }
export const PRICING_PLANS: Record<string, PricingPlan> = {
  plan1: { code: "STD-LAX-001", name: "洛杉矶标准报价", feeType: "单票服务费", currency: "USD", taxRate: "8.75%", items: [["首票", "$2.20", "1票"], ["续票", "$1.60", "每票"]] },
  plan2: { code: "STD-SFO-002", name: "旧金山快递报价", feeType: "快递服务费", currency: "USD", taxRate: "8.63%", items: [["首票", "$2.50", "1票"], ["续票", "$1.80", "每票"]] },
  plan3: { code: "STD-SEA-003", name: "西雅图经济报价", feeType: "经济服务费", currency: "USD", taxRate: "10.10%", items: [["首票", "$2.00", "1票"], ["续票", "$1.45", "每票"]] },
}
export const maskName = (name: string) => name.length > 1 ? `${name[0]}**` : name || "—"
export const maskPhone = (phone: string) => phone ? `${phone.slice(0, 3)}****${phone.slice(-4)}` : "—"
export type ReviewDraft = { result: "approve" | "reject"; planId: string; reason: string }
export function validateReview(row: DriverWithdrawal, draft: ReviewDraft) {
  const errors: Record<string, string> = {}
  if (draft.result === "reject" && !draft.reason.trim()) errors.reason = "请填写不通过原因"
  else if (draft.result === "reject" && draft.reason.length > 500) errors.reason = "不通过原因最多 500 字"
  if (draft.result === "approve" && row.type === "open" && !PRICING_PLANS[draft.planId]) errors.planId = "请选择报价方案"
  return errors
}

/** Preserve the prototype's audit states; approved opening records its T+1 effective time. */
export function reviewDriver(rows: DriverWithdrawal[], id: string, draft: ReviewDraft, now: string, operator: string): DriverWithdrawal[] {
  const current = rows.find((row) => row.id === id)
  if (!current) throw new Error("申请不存在，请刷新列表")
  if (current.restricted) throw new Error("无法查看")
  if (current.auditStatus !== "pending") throw new Error("审核状态已变化，请重新打开申请")
  const errors = validateReview(current, draft)
  if (Object.keys(errors).length) throw new Error(Object.values(errors)[0])
  const approved = draft.result === "approve"
  const row = { ...current, auditStatus: approved ? "approved" as const : "rejected" as const, auditTime: now, latestOperationTime: now, rejectReason: approved ? "" : draft.reason.trim() }
  const log: OperationLog = { time: now, operator, action: `${row.type === "open" ? "开通" : "关闭"}审核${approved ? "通过" : "不通过"}` }
  if (!approved) {
    row.modeStatus = row.type === "close" ? "opened" : row.closeTime ? "closed" : "unopened"
    log.reason = row.rejectReason
  } else if (row.type === "close") {
    row.modeStatus = "closing_pending_effective"
    row.closeTime = nextMidnight(now)
    log.note = "提现模式关闭时间"
    log.effectiveTime = row.closeTime
  } else {
    const plan = PRICING_PLANS[draft.planId]
    row.modeStatus = "opening_pending_effective"
    row.openTime = nextMidnight(now)
    row.closeTime = ""
    row.plan = `${plan.code} ${plan.name}`
    log.note = `分配报价方案：${row.plan}`
    log.effectiveTime = row.openTime
  }
  row.logs = [log, ...row.logs]
  return rows.map((item) => item.id === id ? row : item)
}

export type Filters = { driver: string; type: string; modeStatus: string; auditStatus: string; from: string; to: string }
export const EMPTY_FILTERS: Filters = { driver: "all", type: "all", modeStatus: "all", auditStatus: "all", from: "", to: "" }
export function filterDrivers(rows: DriverWithdrawal[], filters: Filters, timeZone = "America/New_York") {
  return rows.filter((row) => {
    const day = dateInZone(row.latestOperationTime, timeZone)
    return (filters.driver === "all" || row.id === filters.driver)
      && (filters.type === "all" || row.type === filters.type) && (filters.modeStatus === "all" || row.modeStatus === filters.modeStatus)
      && (filters.auditStatus === "all" || row.auditStatus === filters.auditStatus) && (!filters.from || day >= filters.from) && (!filters.to || day <= filters.to)
  }).sort((a, b) => Date.parse(b.latestOperationTime) - Date.parse(a.latestOperationTime) || a.id.localeCompare(b.id))
}
