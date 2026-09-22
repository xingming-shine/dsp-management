"use client"

import { useSyncExternalStore } from "react"
import { initialApplications } from "./mock-data"
import { transition, type WorkflowAction } from "./model"

// Match the standalone prototype: data and selected files live in this browser session.
// Client-side navigation preserves them; a full refresh restores the demonstration data.
let applications = initialApplications
const listeners = new Set<() => void>()
function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
export function useWithdrawalApplications() {
  return useSyncExternalStore(subscribe, () => applications, () => initialApplications)
}
export function dispatchWithdrawal(action: WorkflowAction, operator: string) {
  applications = transition(applications, action, new Date().toISOString(), operator)
  listeners.forEach((listener) => listener())
}
