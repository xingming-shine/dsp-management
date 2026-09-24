"use client"

import { useEffect, useSyncExternalStore } from "react"
import { mockSession } from "@/mocks/session"
import type { ReviewDraft } from "../driver-withdrawal-mode/model"
import type { WorkflowAction } from "../withdrawal-mode/model"
import { applyDriverReview, applyFleetAction, settleWithdrawals, type WithdrawalState } from "./model"
import { initialWithdrawalState } from "./mock-data"

// All three withdrawal menus share the same in-memory preview. Refresh restores mocks.
let state = initialWithdrawalState
const listeners = new Set<() => void>()
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
function publish(next: WithdrawalState) {
  if (next === state) return
  state = next
  listeners.forEach((listener) => listener())
}
function settle() { publish(settleWithdrawals(state, new Date().toISOString())) }
export function useFinanceWithdrawals() {
  const snapshot = useSyncExternalStore(subscribe, () => state, () => initialWithdrawalState)
  useEffect(() => {
    settle()
    const timer = window.setInterval(settle, 30_000)
    window.addEventListener("focus", settle)
    return () => { clearInterval(timer); window.removeEventListener("focus", settle) }
  }, [])
  return snapshot
}
export function dispatchFleetAction(action: WorkflowAction, operator: string) {
  const organizationId = action.type === "open" ? mockSession.organizations.find((org) => org.name === action.draft.fleetName)?.id : undefined
  publish(applyFleetAction(state, action, new Date().toISOString(), operator, organizationId))
}
export function dispatchDriverReview(id: string, draft: ReviewDraft, operator: string) {
  publish(applyDriverReview(state, id, draft, new Date().toISOString(), operator))
}
export function recordSensitiveView(id: string, field: "name" | "phone") {
  const row = state.drivers.find((driver) => driver.id === id)
  if (!row || row.restricted) return
  const log = { time: new Date().toISOString(), operator: mockSession.user.name, action: `查看司机${field === "name" ? "姓名" : "电话"}` }
  publish({ ...state, drivers: state.drivers.map((driver) => driver.id === id ? { ...driver, logs: [log, ...driver.logs] } : driver) })
}
