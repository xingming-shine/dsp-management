import type { WorkMode } from "./mock-data"

export type PickupPeriod = "current" | "next"
export type OverviewCardId = "allocation" | "handoff" | "delivery" | "next-allocation" | "current-pickup" | "next-handoff"
export type OverviewDetailAction = (title: string, driverId?: string, period?: PickupPeriod) => void

export const overviewCardsByMode: Record<WorkMode, readonly OverviewCardId[]> = {
  "same-day": ["allocation", "handoff", "delivery", "next-allocation"],
  "next-day": ["current-pickup", "delivery", "next-allocation", "next-handoff"],
}

export const overviewCardTitles: Record<OverviewCardId, string> = {
  allocation: "当期领件任务分配",
  handoff: "站点交取件",
  delivery: "派件作业",
  "next-allocation": "下期领件任务分配",
  "current-pickup": "当期领件任务",
  "next-handoff": "站点交取件（下期领件任务）",
}
