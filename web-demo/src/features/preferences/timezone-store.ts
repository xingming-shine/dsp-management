"use client"

import { useSyncExternalStore } from "react"
import { mockSession } from "@/mocks/session"

let timezone = mockSession.preferences.timezone
const listeners = new Set<() => void>()
function subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } }
export function useTimezone() { return useSyncExternalStore(subscribe, () => timezone, () => mockSession.preferences.timezone) }
export function setTimezone(value: string) { timezone = value; listeners.forEach((listener) => listener()) }

export function getTimezone() { return timezone }
