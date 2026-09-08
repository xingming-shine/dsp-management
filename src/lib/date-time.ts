import type { DateFormat } from "@/features/preferences/types"

export const DEFAULT_DATE_FORMAT: DateFormat = "MM/DD/YYYY"
export const DEFAULT_TIME_ZONE = "America/New_York"
export const DATE_TIME_LOCALE = "en-US"

type DateInput = Date | number | string

interface FormatOptions {
  dateFormat?: DateFormat
  fallback?: string
  timeZone?: string
}

function normalizeDateInput(value: DateInput) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return {
      date: new Date(`${value}T00:00:00.000Z`),
      timeZone: "UTC",
    }
  }

  if (typeof value === "string" && /^\d{4}-\d{2}$/.test(value)) {
    return {
      date: new Date(`${value}-01T00:00:00.000Z`),
      timeZone: "UTC",
    }
  }

  return { date: value instanceof Date ? value : new Date(value) }
}

function getDateParts(value: DateInput, timeZone: string) {
  const normalized = normalizeDateInput(value)
  const date = normalized.date
  if (Number.isNaN(date.getTime())) return null

  const parts = new Intl.DateTimeFormat(DATE_TIME_LOCALE, {
    day: "2-digit",
    month: "2-digit",
    timeZone: normalized.timeZone ?? timeZone,
    year: "numeric",
  }).formatToParts(date)
  const partMap = Object.fromEntries(parts.map((part) => [part.type, part.value]))

  return {
    day: partMap.day,
    month: partMap.month,
    year: partMap.year,
  }
}

export function formatDate(
  value: DateInput,
  {
    dateFormat = DEFAULT_DATE_FORMAT,
    fallback = "—",
    timeZone = DEFAULT_TIME_ZONE,
  }: FormatOptions = {}
) {
  const parts = getDateParts(value, timeZone)
  if (!parts) return fallback

  const { day, month, year } = parts
  const formats: Record<DateFormat, string> = {
    "YYYY-MM-DD": `${year}-${month}-${day}`,
    "MM/DD/YYYY": `${month}/${day}/${year}`,
    "DD/MM/YYYY": `${day}/${month}/${year}`,
    "YYYY年MM月DD日": `${year}年${month}月${day}日`,
    "MM-DD-YYYY": `${month}-${day}-${year}`,
    "DD.MM.YYYY": `${day}.${month}.${year}`,
  }

  return formats[dateFormat]
}

export function formatMonth(
  value: DateInput,
  { fallback = "—", timeZone = DEFAULT_TIME_ZONE }: FormatOptions = {}
) {
  const parts = getDateParts(value, timeZone)
  return parts ? `${parts.month}/${parts.year}` : fallback
}

export function formatTime(
  value: DateInput,
  {
    fallback = "—",
    includeSeconds = true,
    timeZone = DEFAULT_TIME_ZONE,
  }: FormatOptions & { includeSeconds?: boolean } = {}
) {
  const normalized = normalizeDateInput(value)
  if (Number.isNaN(normalized.date.getTime())) return fallback

  return new Intl.DateTimeFormat(DATE_TIME_LOCALE, {
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    second: includeSeconds ? "2-digit" : undefined,
    timeZone: normalized.timeZone ?? timeZone,
  }).format(normalized.date)
}

export function formatDateTime(
  value: DateInput,
  options: FormatOptions & { includeSeconds?: boolean } = {}
) {
  const normalized = normalizeDateInput(value)
  if (Number.isNaN(normalized.date.getTime())) return options.fallback ?? "—"

  return `${formatDate(value, options)} ${formatTime(value, {
    ...options,
    includeSeconds: options.includeSeconds ?? false,
  })}`
}

export function formatDateRange(
  start: DateInput,
  end: DateInput,
  options: FormatOptions = {}
) {
  return `${formatDate(start, options)} – ${formatDate(end, options)}`
}
