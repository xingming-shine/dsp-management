"use client"

import { useSyncExternalStore } from "react"

import { initialDownloadRecords, type DownloadRecord, type LearningStatus } from "./data"

const STORAGE_KEY = "dsp-learning-v1"

export interface LearningState {
  statuses: Record<string, LearningStatus>
  minutes: Record<string, number>
  completedAt: Record<string, string>
  downloads: DownloadRecord[]
}

const initialState: LearningState = {
  statuses: {},
  minutes: {},
  completedAt: {},
  downloads: initialDownloadRecords,
}

let snapshot = initialState
let loaded = false
const listeners = new Set<() => void>()

function readState(): LearningState {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (!saved) return initialState
    const parsed = JSON.parse(saved) as Partial<LearningState>
    return {
      statuses: parsed.statuses ?? {},
      minutes: parsed.minutes ?? {},
      completedAt: parsed.completedAt ?? {},
      downloads: parsed.downloads ?? initialDownloadRecords,
    }
  } catch {
    return initialState
  }
}

export function useLearningState() {
  const state = useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => listeners.delete(listener) },
    () => {
      if (!loaded) {
        snapshot = readState()
        loaded = true
      }
      return snapshot
    },
    () => initialState
  )

  function updateState(updater: (current: LearningState) => LearningState) {
    snapshot = updater(snapshot)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
    listeners.forEach((listener) => listener())
  }

  return { state, updateState }
}
