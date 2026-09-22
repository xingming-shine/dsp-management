"use client"

import { useSyncExternalStore } from "react"
import { initialDrivers } from "./mock-data"
import { reviewDriver, type ReviewDraft } from "./model"

// Same preview lifecycle as DSP withdrawal: navigation preserves edits; refresh resets mock data.
let drivers = initialDrivers
const listeners = new Set<() => void>()
function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
export function useDriverWithdrawals() {
  return useSyncExternalStore(subscribe, () => drivers, () => initialDrivers)
}
export function submitDriverReview(id: string, draft: ReviewDraft, operator: string) {
  drivers = reviewDriver(drivers, id, draft, new Date().toISOString(), operator)
  listeners.forEach((listener) => listener())
}
