"use client"

import { PeriodPicker } from "@/components/ui/period-picker"
import type { PeriodMode } from "@/features/data-cockpit/types"

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
  return (
    <PeriodPicker
      selection={{ mode, value, range }}
      allowRange={allowCustom}
      onChange={(selection) => {
        if (selection.mode !== mode) onModeChange(selection.mode)
        onValueChange(selection.value)
        onRangeChange?.(selection.range)
      }}
    />
  )
}
