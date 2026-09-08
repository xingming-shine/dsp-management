import type { PeriodMode, RankMode } from "@/features/data-cockpit/types"
import { formatDate, formatDateRange, formatMonth } from "@/lib/date-time"

export function formatDateValue(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-")
}

export function getLatestAvailableDate() {
  const date = new Date()
  date.setDate(date.getDate() - 1)
  return formatDateValue(date)
}

function formatDisplayDate(date: Date) {
  return formatDate(formatDateValue(date))
}

function getIsoWeekNumber(date: Date) {
  const normalized = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = normalized.getUTCDay() || 7
  normalized.setUTCDate(normalized.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(normalized.getUTCFullYear(), 0, 1))

  return Math.ceil(((normalized.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

export function getRankingPeriodLabel(mode: RankMode, currentDate = new Date()) {
  const latestAvailableDate = new Date(currentDate)
  latestAvailableDate.setDate(latestAvailableDate.getDate() - 1)

  if (mode === "month") {
    const value = formatDateValue(latestAvailableDate).slice(0, 7)
    return `排名月份：${formatMonth(value)} · 每月7号更新`
  }

  const day = latestAvailableDate.getDay() || 7
  const weekStart = new Date(latestAvailableDate)
  weekStart.setDate(latestAvailableDate.getDate() - day + 1)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)

  return `排名周期：W${getIsoWeekNumber(weekStart)}（${formatDateRange(formatDateValue(weekStart), formatDateValue(weekEnd))}）· 每周三更新`
}

export interface PeriodContext {
  labels: string[]
  display: string
  unit: "日" | "周" | "月"
}

function parseDate(value: string) {
  return new Date(`${value.slice(0, 10)}T00:00:00`)
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1)
}

function weekLabel(value: string) {
  const [startValue, endValue] = value.split("~")
  const start = parseDate(startValue)
  const end = parseDate(endValue || formatDateValue(addDays(start, 6)))
  return `W${getIsoWeekNumber(start)}（${formatDateRange(formatDateValue(start), formatDateValue(end))}）`
}

export function getPeriodContext(
  mode: PeriodMode,
  value: string,
  range?: { start: string; end: string }
): PeriodContext {
  if (mode === "day") {
    const end = parseDate(range?.end || value)
    const start = range?.start ? parseDate(range.start) : addDays(end, -29)
    const labels: string[] = []
    for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) {
      labels.push(formatDisplayDate(cursor))
    }
    return {
      labels,
      display: range
        ? formatDateRange(formatDateValue(start), formatDateValue(end))
        : formatDisplayDate(end),
      unit: "日",
    }
  }

  if (mode === "week") {
    const options = getWeekOptions(52)
    const startValue = range?.start || value
    const endValue = range?.end || value
    const startIndex = options.findIndex((option) => option.value === startValue)
    const endIndex = options.findIndex((option) => option.value === endValue)
    const selected = range && startIndex >= 0 && endIndex >= startIndex
      ? options.slice(startIndex, endIndex + 1)
      : (() => {
          const index = options.findIndex((option) => option.value === value)
          return options.slice(Math.max(0, index - 11), index + 1)
        })()
    return {
      labels: selected.map((option) => weekLabel(option.value)),
      display: range ? `${weekLabel(startValue)} – ${weekLabel(endValue)}` : weekLabel(value),
      unit: "周",
    }
  }

  const end = parseDate(`${range?.end || value}-01`)
  const start = range?.start ? parseDate(`${range.start}-01`) : addMonths(end, -11)
  const labels: string[] = []
  for (let cursor = start; cursor <= end; cursor = addMonths(cursor, 1)) {
    labels.push(formatMonth(formatDateValue(cursor).slice(0, 7)))
  }
  return {
    labels,
    display: range
      ? `${formatMonth(range.start)} – ${formatMonth(range.end)}`
      : formatMonth(value),
    unit: "月",
  }
}

export const RANKING_POLICY = {
  weekStart: "2026-07-06",
  monthStart: "2026-07",
} as const

export function getRankingPolicyLabel(mode: RankMode) {
  if (mode === "month") return formatMonth(RANKING_POLICY.monthStart)

  const start = parseDate(RANKING_POLICY.weekStart)
  const end = addDays(start, 6)
  return `W${getIsoWeekNumber(start)}（${formatDateRange(RANKING_POLICY.weekStart, formatDateValue(end))}）`
}

export function isRankingBeforePolicy(mode: RankMode, period: string) {
  return mode === "week"
    ? period.split("~")[0] < RANKING_POLICY.weekStart
    : period < RANKING_POLICY.monthStart
}

export function getLatestRankingPeriod(mode: RankMode, currentDate = new Date()) {
  const options = mode === "week" ? getWeekOptions(24) : getMonthOptions(24)
  const offset = mode === "week"
    ? (currentDate.getDay() === 1 || currentDate.getDay() === 2 ? 3 : 2)
    : (currentDate.getDate() <= 7 ? 3 : 2)
  return options.at(-offset)?.value ?? options[0]?.value ?? ""
}

export function resolveRankingPeriod(mode: RankMode, requested: string, currentDate = new Date()) {
  const latest = getLatestRankingPeriod(mode, currentDate)
  if (requested <= latest) return { period: requested, message: "" }
  const label = mode === "week" ? weekLabel(latest) : formatMonth(latest)
  return {
    period: latest,
    message: mode === "week"
      ? `所选周排名尚未更新，已为你展示最近可用的 ${label} 数据。周排名每周三更新。`
      : `所选月排名尚未更新，已为你展示最近可用的 ${label} 数据。月排名每月7号更新。`,
  }
}

export function getLatestDriverMonth(currentDate = new Date()) {
  const options = getMonthOptions(24)
  return options.at(currentDate.getDate() <= 5 ? -3 : -2)?.value ?? ""
}

export function resolveDriverMonth(requested: string, currentDate = new Date()) {
  const latest = getLatestDriverMonth(currentDate)
  if (requested <= latest) return { period: requested, message: "" }
  return {
    period: latest,
    message: `所选月份的司机表现尚未更新，已为你展示最近可用的 ${formatMonth(latest)} 数据。司机表现每月5号更新。`,
  }
}

export function getMonthOptions(count = 12) {
  const now = new Date()
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (count - 1 - index), 1)
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
    return { value, label: formatMonth(value) }
  })
}

export function getWeekOptions(count = 12) {
  const current = new Date()
  const day = current.getDay() || 7
  current.setDate(current.getDate() - day + 1)

  return Array.from({ length: count }, (_, index) => {
    const start = new Date(current)
    start.setDate(start.getDate() - (count - 1 - index) * 7)
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    const oneJan = new Date(start.getFullYear(), 0, 1)
    const week = Math.ceil(
      ((start.getTime() - oneJan.getTime()) / 86400000 + oneJan.getDay() + 1) / 7
    )
    return {
      value: `${formatDateValue(start)}~${formatDateValue(end)}`,
      label: `W${week}（${formatDateRange(formatDateValue(start), formatDateValue(end))}）`,
    }
  })
}

export function getDefaultPeriod(mode: PeriodMode) {
  if (mode === "day") return getLatestAvailableDate()
  if (mode === "week") return getWeekOptions().at(-1)?.value ?? ""
  return getMonthOptions().at(-2)?.value ?? getMonthOptions().at(-1)?.value ?? ""
}

export function validateRange(mode: PeriodMode, start: string, end: string) {
  if (!start || !end) return "请选择完整的起止时间"
  if (end < start) return "结束时间不能早于开始时间"

  if (mode === "day") {
    const days =
      Math.round(
        (new Date(`${end}T00:00:00`).getTime() -
          new Date(`${start}T00:00:00`).getTime()) /
          86400000
      ) + 1
    if (days > 31) return `最多选择31天，当前已选择 ${days} 天`
  }

  const options = mode === "week" ? getWeekOptions() : getMonthOptions()
  const startIndex = options.findIndex((option) => option.value === start)
  const endIndex = options.findIndex((option) => option.value === end)
  if (startIndex >= 0 && endIndex - startIndex + 1 > 12) {
    return mode === "week" ? "最多选择12周" : "最多选择12个月"
  }

  return ""
}
