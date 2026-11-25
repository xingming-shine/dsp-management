import { maskName, maskPhone, reviewDriver, type DriverWithdrawal, type ReviewDraft } from "../driver-withdrawal-mode/model"
import { transition, type Application, type WorkflowAction } from "../withdrawal-mode/model"

export type WithdrawalState = { applications: Application[]; drivers: DriverWithdrawal[]; history: Application[] }
export function activeDrivers(drivers: DriverWithdrawal[], organizationId: string) {
  return drivers.filter((row) => row.organizationId === organizationId && (row.modeStatus === "opened" || row.modeStatus === "closing_pending_effective"))
}
export function withAffectedDrivers(row: Application, drivers: DriverWithdrawal[]): Application {
  if (!row.organizationId) return row
  const active = activeDrivers(drivers, row.organizationId)
  return { ...row, drivers: active.map((driver) => ({ id: driver.id, name: maskName(driver.name), phone: maskPhone(driver.phone), fullName: driver.name, fullPhone: driver.phone, fleet: driver.fleet, openDate: driver.openTime })), affectedDriverCount: active.length }
}

/** Apply scheduled changes once, including when a suspended tab becomes active again. */
export function settleWithdrawals(state: WithdrawalState, now: string): WithdrawalState {
  let changed = false
  const drivers = state.drivers.map((row) => {
    const opening = row.modeStatus === "opening_pending_effective"
    const closing = row.modeStatus === "closing_pending_effective"
    const effective = opening ? row.openTime : row.closeTime
    if ((!opening && !closing) || !effective || Date.parse(effective) > Date.parse(now)) return row
    changed = true
    return { ...row, modeStatus: opening ? "opened" as const : "closed" as const, latestOperationTime: effective,
      logs: [{ time: effective, operator: "系统", action: `提现模式${opening ? "开通" : "关闭"}生效` }, ...row.logs] }
  })
  const applications = state.applications.map((row) => {
    if (row.modeStatus !== "closing_pending_effective" || Date.parse(row.expectedCloseTime) > Date.parse(now)) return row
    changed = true
    return { ...row, modeStatus: "closed" as const, logs: [{ time: row.expectedCloseTime, operator: "系统", status: "已关闭", action: "车队及司机提现模式关闭生效" }, ...row.logs] }
  })
  if (!changed) return state
  const history = state.history.map((row) => applications.find((item) => item.requestId === row.requestId) ?? row)
  return { applications, drivers, history }
}

export function applyFleetAction(state: WithdrawalState, action: WorkflowAction, now: string, operator: string, organizationId?: string): WithdrawalState {
  const current = settleWithdrawals(state, now)
  if (action.type === "open" && !action.existingId && organizationId && current.applications.some((row) => row.organizationId === organizationId)) throw new Error("该车队已有申请，请从现有记录继续操作")
  const prepared = action.type === "close" ? current.applications.map((row) => row.id === action.id ? withAffectedDrivers(row, current.drivers) : row) : current.applications
  let applications = transition(prepared, action, now, operator)
  if (action.type === "delete") return { ...current, applications }
  const id = action.type === "open" ? action.existingId ?? action.id : action.id
  applications = applications.map((row) => row.id !== id ? row : { ...row,
    organizationId: row.organizationId ?? organizationId,
    requestId: action.type === "open" || action.type === "close" ? `${id}-${now}` : row.requestId,
  })
  const updated = applications.find((row) => row.id === id)!
  let drivers = current.drivers
  if (updated.organizationId && action.type === "audit" && action.result === "pass" && updated.applicationType === "close") {
    drivers = drivers.map((driver) => {
      if (driver.organizationId !== updated.organizationId) return driver
      if (driver.type === "open" && driver.auditStatus === "pending") return { ...driver, auditStatus: "rejected" as const, auditTime: now, latestOperationTime: now, rejectReason: "车队关闭提现模式，开通申请已取消。", logs: [{ time: now, operator: "系统", action: "取消开通申请", reason: "车队关闭提现模式" }, ...driver.logs] }
      if (!["opened", "opening_pending_effective", "closing_pending_effective"].includes(driver.modeStatus)) return driver
      const effectiveTime = driver.modeStatus === "closing_pending_effective" && driver.closeTime < updated.expectedCloseTime ? driver.closeTime : updated.expectedCloseTime
      return { ...driver, type: "close" as const, auditStatus: "approved" as const, auditTime: now, latestOperationTime: now, rejectReason: "", modeStatus: "closing_pending_effective" as const, closeTime: effectiveTime,
        logs: [{ time: now, operator, action: "车队关闭提现模式", note: "联动关闭时间", effectiveTime }, ...driver.logs] }
    })
  }
  const history = updated.organizationId ? [updated, ...current.history.filter((row) => row.requestId !== updated.requestId)] : current.history
  return settleWithdrawals({ applications, drivers, history }, now)
}

export function applyDriverReview(state: WithdrawalState, id: string, draft: ReviewDraft, now: string, operator: string): WithdrawalState {
  const current = settleWithdrawals(state, now)
  const driver = current.drivers.find((row) => row.id === id)
  const fleet = current.applications.find((row) => row.organizationId === driver?.organizationId)
  if (draft.result === "approve" && driver?.type === "open" && (!fleet || fleet.modeStatus !== "opened" || (fleet.applicationType === "close" && fleet.auditStatus === "pending_business"))) throw new Error("车队提现模式未开通或正在关闭，暂不能通过司机开通申请")
  return { ...current, drivers: reviewDriver(current.drivers, id, draft, now, operator) }
}
