"use client"

import * as React from "react"
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DEFAULT_TIME_ZONE,
  formatDate,
  formatDateRange,
  formatMonth,
} from "@/lib/date-time"
import { cn } from "@/lib/utils"

type PeriodMode = "day" | "week" | "month"

type PeriodSelection = {
  mode: PeriodMode
  value: string
  range?: {
    start: string
    end: string
  }
}

type PeriodPickerProps = {
  selection: PeriodSelection
  onChange: (selection: PeriodSelection) => void
  allowRange?: boolean
  modes?: PeriodMode[]
  label?: string
  className?: string
}

const MODE_LABEL: Record<PeriodMode, string> = {
  day: "日",
  week: "周",
  month: "月",
}

const DAY_HEADERS = ["日", "一", "二", "三", "四", "五", "六"]
const WEEK_HEADERS = ["周次", "一", "二", "三", "四", "五", "六", "日"]

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function parseDay(value: string) {
  return new Date(`${value.slice(0, 10)}T00:00:00.000Z`)
}

function shiftDay(value: string, amount: number) {
  return isoDate(new Date(parseDay(value).getTime() + amount * 86400000))
}

function shiftMonth(value: string, amount: number) {
  return new Date(
    Date.UTC(
      Number(value.slice(0, 4)),
      Number(value.slice(5, 7)) - 1 + amount,
      1
    )
  )
    .toISOString()
    .slice(0, 7)
}

function todayISO(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: DEFAULT_TIME_ZONE,
    year: "numeric",
  }).formatToParts(now)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

function weekOf(value: string) {
  const day = parseDay(value)
  const offset = (day.getUTCDay() + 6) % 7
  const start = shiftDay(value, -offset)
  return `${start}~${shiftDay(start, 6)}`
}

function weekNumber(value: string) {
  const date = parseDay(value)
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7))
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1)
  return Math.ceil(((date.getTime() - yearStart) / 86400000 + 1) / 7)
}

function shiftPeriod(mode: PeriodMode, value: string, amount: number) {
  if (mode === "month") return shiftMonth(value, amount)
  if (mode === "week") return weekOf(shiftDay(value, amount * 7))
  return shiftDay(value, amount)
}

function defaultSelection(mode: PeriodMode): PeriodSelection {
  const today = todayISO()
  return {
    mode,
    value:
      mode === "month"
        ? today.slice(0, 7)
        : mode === "week"
          ? weekOf(shiftDay(today, -7))
          : today,
  }
}

function periodLabel(mode: PeriodMode, value: string) {
  if (mode === "month") return formatMonth(value)
  if (mode === "week") {
    const [start, end] = value.split("~")
    return `W${weekNumber(start)} · ${formatDateRange(start, end || shiftDay(start, 6))}`
  }
  return formatDate(value)
}

function periodCount(mode: PeriodMode, start: string, end: string) {
  if (mode === "month") {
    return (
      (Number(end.slice(0, 4)) - Number(start.slice(0, 4))) * 12 +
      Number(end.slice(5, 7)) -
      Number(start.slice(5, 7)) +
      1
    )
  }

  const startDay = mode === "week" ? start.split("~")[0] : start
  const endDay = mode === "week" ? end.split("~")[0] : end
  const days = Math.round(
    (parseDay(endDay).getTime() - parseDay(startDay).getTime()) / 86400000
  )
  return Math.floor(days / (mode === "week" ? 7 : 1)) + 1
}

function validateSelection(mode: PeriodMode, start: string, end: string) {
  if (!start || !end) return "请选择完整的起止时间"
  if (end < start) return "结束时间不能早于开始时间"
  if (end > defaultSelection(mode).value) return "不能选择未来周期"

  const count = periodCount(mode, start, end)
  const maximum = mode === "day" ? 31 : 12
  if (count > maximum) {
    return `最多选择${maximum}${mode === "day" ? "天" : mode === "week" ? "周" : "个月"}，当前已选择${count}`
  }
  return ""
}

function selectionSummary(selection: PeriodSelection) {
  const { mode, value, range } = selection
  if (!range) return `${periodLabel(mode, value)} · 单${MODE_LABEL[mode]}`

  const count = periodCount(mode, range.start, range.end)
  if (mode === "day") {
    return `${formatDateRange(range.start, range.end)} · 共${count}天`
  }
  if (mode === "week") {
    return `W${weekNumber(range.start.split("~")[0])}–W${weekNumber(range.end.split("~")[0])} · 共${count}周`
  }
  return `${formatMonth(range.start)}–${formatMonth(range.end)} · 共${count}个月`
}

function selectionTriggerLabel(selection: PeriodSelection) {
  if (!selection.range) return periodLabel(selection.mode, selection.value)
  if (selection.mode === "day") {
    return formatDateRange(selection.range.start, selection.range.end)
  }
  if (selection.mode === "week") {
    return `W${weekNumber(selection.range.start.split("~")[0])}–W${weekNumber(selection.range.end.split("~")[0])}`
  }
  return `${formatMonth(selection.range.start)}–${formatMonth(selection.range.end)}`
}

function rangeState(value: string, start: string, end: string, rangeMode: boolean) {
  return {
    end: rangeMode && value === end,
    middle: rangeMode && value > start && value < end,
    start: rangeMode && value === start,
  }
}

function PeriodPicker({
  selection,
  onChange,
  allowRange = true,
  modes = ["day", "week", "month"],
  label = "数据时间",
  className,
}: PeriodPickerProps) {
  const triggerId = React.useId()
  const [open, setOpen] = React.useState(false)
  const [draft, setDraft] = React.useState<PeriodSelection>(selection)
  const [rangeMode, setRangeMode] = React.useState(Boolean(selection.range))
  const [cursor, setCursor] = React.useState(
    (selection.range?.start || selection.value).slice(0, 7)
  )
  const [anchor, setAnchor] = React.useState<string>()
  const [hover, setHover] = React.useState<string>()

  const mode = selection.mode
  const start = draft.range?.start || draft.value
  const end = draft.range?.end || draft.value
  const previewStart = anchor && hover ? (anchor < hover ? anchor : hover) : start
  const previewEnd = anchor && hover ? (anchor < hover ? hover : anchor) : end
  const error = anchor ? "请选择结束周期" : validateSelection(mode, start, end)

  function resetDraft() {
    setDraft(selection)
    setRangeMode(Boolean(selection.range))
    setCursor((selection.range?.start || selection.value).slice(0, 7))
    setAnchor(undefined)
    setHover(undefined)
  }

  function changeMode(value: string) {
    if (!value) return
    onChange(defaultSelection(value as PeriodMode))
    setOpen(false)
  }

  function changeSelectionMode(value: string) {
    const nextRangeMode = value === "range"
    setRangeMode(nextRangeMode)
    setAnchor(undefined)
    setHover(undefined)
    setDraft({ mode, value: selection.value })
    setCursor(
      shiftMonth(
        selection.value.slice(0, 7),
        nextRangeMode ? (mode === "month" ? -12 : -1) : 0
      )
    )
  }

  function choose(value: string) {
    if (!rangeMode) {
      setDraft({ mode, value })
      return
    }

    if (!anchor) {
      setAnchor(value)
      setDraft({ mode, value, range: { start: value, end: value } })
      return
    }

    const nextStart = value < anchor ? value : anchor
    const nextEnd = value < anchor ? anchor : value
    setDraft({ mode, value: nextEnd, range: { start: nextStart, end: nextEnd } })
    setAnchor(undefined)
    setHover(undefined)
  }

  function moveFocus(event: React.KeyboardEvent<HTMLElement>, columns: number) {
    const buttons = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")
    )
    const index = buttons.indexOf(event.target as HTMLButtonElement)
    if (index < 0) return

    const offsets: Record<string, number> = {
      ArrowDown: columns,
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -columns,
      End: columns - 1 - (index % columns),
      Home: -(index % columns),
    }
    const offset = offsets[event.key]
    if (offset === undefined) return
    event.preventDefault()
    buttons[Math.max(0, Math.min(buttons.length - 1, index + offset))]?.focus()
  }

  function dayCalendar(month: string) {
    const first = `${month}-01`
    const days = Array.from({ length: 42 }, (_, index) =>
      shiftDay(first, index - parseDay(first).getUTCDay())
    )

    return (
      <div
        className="grid grid-cols-7 gap-y-1"
        onKeyDown={(event) => moveFocus(event, 7)}
      >
        {DAY_HEADERS.map((day) => (
          <span
            key={day}
            className="flex h-7 items-center justify-center text-xs font-medium text-muted-foreground"
          >
            {day}
          </span>
        ))}
        {days.map((day) => {
          const isCurrentMonth = day.slice(0, 7) === month
          const state = isCurrentMonth
            ? rangeState(day, previewStart, previewEnd, rangeMode)
            : { end: false, middle: false, start: false }
          const selected = isCurrentMonth && !rangeMode && day === start
          return (
            <Button
              key={day}
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                "period-picker-day relative h-8 w-full p-0 text-sm tabular-nums max-sm:h-9 [@media(pointer:coarse)]:h-9",
                day.slice(0, 7) !== month && "text-muted-foreground",
                selected && "is-selected",
                state.start && "is-range-start",
                state.middle && "is-in-range",
                state.end && "is-range-end"
              )}
              disabled={!isCurrentMonth || day > todayISO()}
              aria-label={formatDate(day)}
              aria-pressed={selected || state.start || state.middle || state.end}
              onClick={() => choose(day)}
              onFocus={() => anchor && setHover(day)}
              onMouseEnter={() => anchor && setHover(day)}
            >
              <span>{parseDay(day).getUTCDate()}</span>
            </Button>
          )
        })}
      </div>
    )
  }

  function weekCalendar(month: string) {
    const first = `${month}-01`
    const firstMonday = shiftDay(first, (8 - (parseDay(first).getUTCDay() || 7)) % 7)
    const weeks = Array.from({ length: 6 }, (_, index) => {
      const monday = shiftDay(firstMonday, index * 7)
      return {
        days: Array.from({ length: 7 }, (__, dayIndex) => shiftDay(monday, dayIndex)),
        value: weekOf(monday),
      }
    }).filter((week) => week.days[0].slice(0, 7) === month)

    return (
      <div className="grid gap-1.5" onKeyDown={(event) => moveFocus(event, 1)}>
        <div className="grid h-7 grid-cols-[50px_repeat(7,minmax(0,1fr))] items-center text-center text-xs font-medium text-muted-foreground">
          {WEEK_HEADERS.map((day, index) => (
            <span key={day} className={cn(index === 0 && "text-left")}>
              {day}
            </span>
          ))}
        </div>
        {weeks.map((week) => {
          const state = rangeState(week.value, previewStart, previewEnd, rangeMode)
          const selected = !rangeMode && week.value === start
          return (
            <Button
              key={week.value}
              type="button"
              variant="ghost"
              className={cn(
                "grid h-8 w-full grid-cols-[50px_repeat(7,minmax(0,1fr))] px-0 text-center text-sm tabular-nums max-sm:h-9 [@media(pointer:coarse)]:h-9",
                selected && "bg-brand text-brand-foreground hover:bg-brand/90 hover:text-brand-foreground",
                state.middle && "rounded-none bg-period-range text-brand hover:bg-period-range hover:text-brand",
                (state.start || state.end) && "bg-brand text-brand-foreground hover:bg-brand/90 hover:text-brand-foreground"
              )}
              disabled={week.value > defaultSelection("week").value}
              aria-label={periodLabel("week", week.value)}
              aria-pressed={selected || state.start || state.middle || state.end}
              onClick={() => choose(week.value)}
              onFocus={() => anchor && setHover(week.value)}
              onMouseEnter={() => anchor && setHover(week.value)}
            >
              <span className="text-left text-xs font-medium">
                W{weekNumber(week.days[0])}
              </span>
              {week.days.map((day) => (
                <span
                  key={day}
                  className={cn(day.slice(0, 7) !== month && "opacity-45")}
                >
                  {parseDay(day).getUTCDate()}
                </span>
              ))}
            </Button>
          )
        })}
      </div>
    )
  }

  function monthCalendar(month: string) {
    const year = month.slice(0, 4)
    const months = Array.from(
      { length: 12 },
      (_, index) => `${year}-${String(index + 1).padStart(2, "0")}`
    )
    return (
      <div
        className="grid grid-cols-3 gap-2"
        onKeyDown={(event) => moveFocus(event, 3)}
      >
        {months.map((monthValue) => {
          const state = rangeState(monthValue, previewStart, previewEnd, rangeMode)
          const selected = !rangeMode && monthValue === start
          return (
            <Button
              key={monthValue}
              type="button"
              variant="outline"
              className={cn(
                "h-8 text-sm tabular-nums max-sm:h-9 [@media(pointer:coarse)]:h-9",
                selected && "border-transparent bg-brand text-brand-foreground hover:bg-brand/90 hover:text-brand-foreground",
                state.middle && "rounded-none border-transparent bg-period-range text-brand hover:bg-period-range hover:text-brand",
                (state.start || state.end) && "border-transparent bg-brand text-brand-foreground hover:bg-brand/90 hover:text-brand-foreground"
              )}
              disabled={monthValue > todayISO().slice(0, 7)}
              aria-pressed={selected || state.start || state.middle || state.end}
              onClick={() => choose(monthValue)}
              onFocus={() => anchor && setHover(monthValue)}
              onMouseEnter={() => anchor && setHover(monthValue)}
            >
              {String(Number(monthValue.slice(5, 7))).padStart(2, "0")}月
            </Button>
          )
        })}
      </div>
    )
  }

  function calendar(month: string) {
    if (mode === "month") return monthCalendar(month)
    if (mode === "week") return weekCalendar(month)
    return dayCalendar(month)
  }

  const secondCursor = shiftMonth(cursor, mode === "month" ? 12 : 1)
  const quickOptions = mode === "day" ? [7, 14, 31] : mode === "week" ? [4, 8, 12] : [3, 6, 12]
  const calendarStep = mode === "month" ? 12 : 1

  return (
    <FieldGroup className={cn("grid gap-3 md:grid-cols-4", className)}>
      <Field>
        <FieldLabel>统计粒度</FieldLabel>
        <Tabs
          value={mode}
          onValueChange={changeMode}
        >
          <TabsList variant="raised" aria-label="统计粒度">
            {modes.map((item) => (
              <TabsTrigger key={item} value={item}>
                {MODE_LABEL[item]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </Field>

      <Field className="md:col-span-2">
        <FieldLabel htmlFor={triggerId}>{label}</FieldLabel>
        <Popover
          open={open}
          onOpenChange={(nextOpen) => {
            if (nextOpen) resetDraft()
            setOpen(nextOpen)
          }}
        >
          <PopoverTrigger asChild>
            <Button
              id={triggerId}
              type="button"
              variant="outline"
              className="w-full max-w-[320px] justify-start text-left [--button-font-size:var(--text-sm)]"
              aria-label={`${label}：${selectionTriggerLabel(selection)}`}
            >
              <CalendarIcon data-icon="inline-start" />
              <span className="truncate tabular-nums">
                {selectionTriggerLabel(selection)}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            sideOffset={8}
            collisionPadding={16}
            className={cn(
              "max-h-[var(--radix-popover-content-available-height)] gap-0 overflow-hidden p-0",
              rangeMode
                ? "w-[min(760px,calc(100vw-2rem))]"
                : "w-[min(400px,calc(100vw-2rem))]"
            )}
          >
            {allowRange ? (
              <div className="border-b px-4">
                <Tabs
                  value={rangeMode ? "range" : "single"}
                  onValueChange={changeSelectionMode}
                  className="gap-0"
                >
                  <TabsList variant="line" aria-label="时间选择方式">
                    <TabsTrigger value="single">单{MODE_LABEL[mode]}</TabsTrigger>
                    <TabsTrigger value="range">{MODE_LABEL[mode]}范围</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            ) : null}

            <div className="min-h-0 overflow-y-auto">
              <div
                className={cn(
                  "grid",
                  rangeMode &&
                    "lg:grid-cols-[minmax(0,1fr)_188px] [@media(pointer:coarse)]:grid-cols-1"
                )}
              >
                <div className="p-4">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="size-8 p-0"
                    aria-label={mode === "month" ? "上一年" : "上一个月"}
                    onClick={() => setCursor(shiftMonth(cursor, -calendarStep))}
                  >
                    <ChevronLeftIcon aria-hidden="true" />
                  </Button>
                  <div
                    className={cn(
                      "grid flex-1 gap-4 text-center text-sm font-medium",
                      rangeMode &&
                        "sm:grid-cols-2 [@media(pointer:coarse)]:grid-cols-1"
                    )}
                  >
                    <span>{mode === "month" ? `${cursor.slice(0, 4)}年` : `${Number(cursor.slice(0, 4))}年${Number(cursor.slice(5, 7))}月`}</span>
                    {rangeMode ? (
                      <span>{mode === "month" ? `${secondCursor.slice(0, 4)}年` : `${Number(secondCursor.slice(0, 4))}年${Number(secondCursor.slice(5, 7))}月`}</span>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="size-8 p-0"
                    aria-label={mode === "month" ? "下一年" : "下一个月"}
                    onClick={() => setCursor(shiftMonth(cursor, calendarStep))}
                  >
                    <ChevronRightIcon aria-hidden="true" />
                  </Button>
                </div>
                <div
                  className={cn(
                    "grid gap-4",
                    rangeMode &&
                      "sm:grid-cols-2 [@media(pointer:coarse)]:grid-cols-1"
                  )}
                >
                  {calendar(cursor)}
                  {rangeMode ? calendar(secondCursor) : null}
                </div>
                </div>

                {rangeMode ? (
                  <aside
                    className="border-t p-4 lg:border-s lg:border-t-0 [@media(pointer:coarse)]:border-s-0 [@media(pointer:coarse)]:border-t"
                    aria-label="快速选择"
                  >
                    <h3 className="mb-3 text-sm font-medium">快速选择</h3>
                    <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">
                      {quickOptions.map((count) => (
                        <Button
                          key={count}
                          type="button"
                          variant="outline"
                          className={cn(
                            periodCount(mode, start, end) === count &&
                              "border-brand bg-brand-selected text-brand hover:bg-brand-selected hover:text-brand"
                          )}
                          aria-pressed={periodCount(mode, start, end) === count}
                          onClick={() => {
                            const nextEnd = defaultSelection(mode).value
                            setDraft({
                              mode,
                              value: nextEnd,
                              range: {
                                start: shiftPeriod(mode, nextEnd, 1 - count),
                                end: nextEnd,
                              },
                            })
                            setAnchor(undefined)
                            setHover(undefined)
                          }}
                        >
                          近{count}{mode === "day" ? "天" : mode === "week" ? "周" : "个月"}
                        </Button>
                      ))}
                    </div>
                  </aside>
                ) : null}
              </div>

              <FieldError className="px-4">{error}</FieldError>
            </div>

            <footer className="flex min-h-[52px] shrink-0 flex-wrap items-center justify-between gap-3 border-t bg-muted/20 px-4 py-2">
              <span className="min-w-0 text-xs text-muted-foreground tabular-nums">
                {selectionSummary(
                  rangeMode
                    ? { mode, value: end, range: { start, end } }
                    : { mode, value: start }
                )}
              </span>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  取消
                </Button>
                <Button
                  type="button"
                  disabled={Boolean(error)}
                  onClick={() => {
                    onChange(
                      rangeMode
                        ? { mode, value: end, range: { start, end } }
                        : { mode, value: start }
                    )
                    setOpen(false)
                  }}
                >
                  应用
                </Button>
              </div>
            </footer>
          </PopoverContent>
        </Popover>
      </Field>

    </FieldGroup>
  )
}

export { PeriodPicker }
export type { PeriodMode, PeriodPickerProps, PeriodSelection }
