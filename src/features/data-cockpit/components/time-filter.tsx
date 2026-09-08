"use client"

import { useMemo, useState } from "react"
import { CalendarRangeIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import {
  getDefaultPeriod,
  getMonthOptions,
  getPeriodContext,
  getWeekOptions,
  validateRange,
} from "@/features/data-cockpit/date-utils"
import type { PeriodMode } from "@/features/data-cockpit/types"

function PeriodPicker({
  mode,
  value,
  onValueChange,
  idPrefix,
}: {
  mode: PeriodMode
  value: string
  onValueChange: (value: string) => void
  idPrefix: string
}) {
  if (mode === "day") {
    return (
      <Field orientation="horizontal">
        <FieldLabel htmlFor={`${idPrefix}-day`} className="sr-only">
          日期
        </FieldLabel>
        <Input
          id={`${idPrefix}-day`}
          type="date"
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          className="w-auto"
        />
      </Field>
    )
  }

  const options = mode === "week" ? getWeekOptions() : getMonthOptions()
  return (
    <Field orientation="horizontal">
      <FieldTitle className="sr-only">
        {mode === "week" ? "周" : "月份"}
      </FieldTitle>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="min-w-48" aria-label="选择统计周期">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  )
}

export function TimeFilter({
  mode,
  value,
  onModeChange,
  onValueChange,
  range,
  onRangeChange,
  allowCustom = true,
}: {
  mode: PeriodMode
  value: string
  onModeChange: (mode: PeriodMode) => void
  onValueChange: (value: string) => void
  range?: { start: string; end: string }
  onRangeChange?: (range?: { start: string; end: string }) => void
  allowCustom?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [draftStart, setDraftStart] = useState(range?.start ?? value)
  const [draftEnd, setDraftEnd] = useState(range?.end ?? value)
  const [error, setError] = useState("")

  const options = useMemo(
    () => (mode === "week" ? getWeekOptions() : getMonthOptions()),
    [mode]
  )

  const changeMode = (next: string) => {
    if (!next) return
    const nextMode = next as PeriodMode
    onModeChange(nextMode)
    onValueChange(getDefaultPeriod(nextMode))
    onRangeChange?.(undefined)
  }

  const applyRange = () => {
    const nextError = validateRange(mode, draftStart, draftEnd)
    setError(nextError)
    if (nextError) return
    onRangeChange?.({ start: draftStart, end: draftEnd })
    setOpen(false)
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Field orientation="horizontal" className="w-auto">
        <FieldTitle id="cockpit-period-mode" className="sr-only">统计周期</FieldTitle>
        <ToggleGroup
          type="single"
          variant="outline"
          spacing={0}
          value={mode}
          onValueChange={changeMode}
          aria-labelledby="cockpit-period-mode"
        >
          <ToggleGroupItem value="day">日</ToggleGroupItem>
          <ToggleGroupItem value="week">周</ToggleGroupItem>
          <ToggleGroupItem value="month">月</ToggleGroupItem>
        </ToggleGroup>
      </Field>

      <span className="text-sm font-medium">数据时间</span>

      {range ? (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">区间汇总</span>
          <BadgeRange mode={mode} start={range.start} end={range.end} />
          <Button variant="ghost" size="sm" onClick={() => onRangeChange?.()}>
            清除
          </Button>
        </div>
      ) : (
        <PeriodPicker
          mode={mode}
          value={value}
          onValueChange={onValueChange}
          idPrefix="cockpit"
        />
      )}

      {allowCustom ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDraftStart(range?.start ?? value)
                setDraftEnd(range?.end ?? value)
                setError("")
              }}
            >
              <CalendarRangeIcon data-icon="inline-start" />
              日期范围
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>自定义时间范围</DialogTitle>
              <DialogDescription>
                日范围最长31天，周和月范围最长12个周期。
              </DialogDescription>
            </DialogHeader>
            <FieldGroup>
              {mode === "day" ? (
                <>
                  <Field data-invalid={Boolean(error)}>
                    <FieldLabel htmlFor="range-start">开始日期</FieldLabel>
                    <Input
                      id="range-start"
                      type="date"
                      value={draftStart}
                      onChange={(event) => setDraftStart(event.target.value)}
                      aria-invalid={Boolean(error)}
                    />
                  </Field>
                  <Field data-invalid={Boolean(error)}>
                    <FieldLabel htmlFor="range-end">结束日期</FieldLabel>
                    <Input
                      id="range-end"
                      type="date"
                      value={draftEnd}
                      onChange={(event) => setDraftEnd(event.target.value)}
                      aria-invalid={Boolean(error)}
                    />
                    <FieldError>{error}</FieldError>
                  </Field>
                </>
              ) : (
                <>
                  <Field data-invalid={Boolean(error)}>
                    <FieldLabel>开始{mode === "week" ? "周" : "月份"}</FieldLabel>
                    <RangeSelect
                      value={draftStart}
                      onValueChange={setDraftStart}
                      options={options}
                      label="选择开始周期"
                    />
                  </Field>
                  <Field data-invalid={Boolean(error)}>
                    <FieldLabel>结束{mode === "week" ? "周" : "月份"}</FieldLabel>
                    <RangeSelect
                      value={draftEnd}
                      onValueChange={setDraftEnd}
                      options={options}
                      label="选择结束周期"
                    />
                    <FieldError>{error}</FieldError>
                  </Field>
                </>
              )}
            </FieldGroup>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                取消
              </Button>
              <Button onClick={applyRange}>确认</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  )
}

function RangeSelect({
  value,
  onValueChange,
  options,
  label,
}: {
  value: string
  onValueChange: (value: string) => void
  options: Array<{ value: string; label: string }>
  label: string
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

function BadgeRange({ mode, start, end }: { mode: PeriodMode; start: string; end: string }) {
  return (
    <Badge variant="secondary">
      {getPeriodContext(mode, end, { start, end }).display}
    </Badge>
  )
}
