"use client"

import { useSyncExternalStore } from "react"
import { initialBillsState } from "./mock-data"
import type { BillsState } from "./model"

// Deliberately matches the existing finance prototypes: client navigation keeps
// data; a full reload restores fixtures. Files never leave the browser.
let state = initialBillsState
const listeners = new Set<() => void>()
function subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } }
export function useBills() { return useSyncExternalStore(subscribe, () => state, () => initialBillsState) }
export function updateBills(update: (current: BillsState) => BillsState) {
  state = update(state)
  listeners.forEach((listener) => listener())
}
