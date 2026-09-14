"use client"

import { PeriodPicker } from "@/components/ui/period-picker"
import type { Selection } from "@/features/data-cockpit/cockpit-model"

export function CockpitTimeFilter({
  selection,
  onChange,
  allowRange = true,
  modes = ["day", "week", "month"],
}: {
  selection: Selection
  onChange: (selection: Selection) => void
  allowRange?: boolean
  modes?: Selection["mode"][]
}) {
  return (
    <PeriodPicker
      selection={selection}
      onChange={onChange}
      allowRange={allowRange}
      modes={modes}
    />
  )
}
