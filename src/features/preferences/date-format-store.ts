"use client"

import { useSyncExternalStore } from "react"

import type { DateFormat } from "@/features/preferences/types"
import { DEFAULT_DATE_FORMAT } from "@/lib/date-time"
import { mockSession } from "@/mocks/session"
import { mockDspGateway } from "@/services/mock-dsp-gateway"

const STORAGE_KEY = "dsp-date-format"
const listeners = new Set<() => void>()
const validFormats = new Set<DateFormat>([
  "HH:mm:ss dd/MM/yyyy",
  "HH:mm:ss MM/dd/yyyy",
  "MM/dd/yyyy HH:mm:ss",
  "dd/MM/yyyy HH:mm:ss",
  "yyyy/MM/dd HH:mm:ss",
])

const legacyFormats: Record<string, DateFormat> = {
  "MM/DD/YYYY": "MM/dd/yyyy HH:mm:ss",
  "DD/MM/YYYY": "dd/MM/yyyy HH:mm:ss",
  "YYYY-MM-DD": "yyyy/MM/dd HH:mm:ss",
  "MM-DD-YYYY": "MM/dd/yyyy HH:mm:ss",
  "DD.MM.YYYY": "dd/MM/yyyy HH:mm:ss",
  "YYYY年MM月DD日": "yyyy/MM/dd HH:mm:ss",
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

function getClientSnapshot(): DateFormat {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    if (value && validFormats.has(value as DateFormat)) return value as DateFormat
    return value && legacyFormats[value] ? legacyFormats[value] : DEFAULT_DATE_FORMAT
  } catch {
    return DEFAULT_DATE_FORMAT
  }
}

function getServerSnapshot(): DateFormat {
  return mockSession.preferences.dateFormat
}

export function useSavedDateFormat() {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot)
}

export async function saveDateFormat(value: DateFormat) {
  await mockDspGateway.updatePreferences({ dateFormat: value })
  window.localStorage.setItem(STORAGE_KEY, value)
  listeners.forEach((listener) => listener())
}
