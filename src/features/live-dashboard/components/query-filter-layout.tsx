import * as React from "react"

import { FieldGroup } from "@/components/ui/field"
import { cn } from "@/lib/utils"

type QueryFilterLayoutProps = Omit<React.ComponentProps<"div">, "children"> & {
  fieldCount: number
  fields: React.ReactNode
  actions: React.ReactNode
  secondaryActions?: React.ReactNode
  desktopBreakpoint?: "lg" | "xl"
}

export function QueryFilterLayout({
  fieldCount,
  fields,
  actions,
  secondaryActions,
  desktopBreakpoint = "xl",
  className,
  ...props
}: QueryFilterLayoutProps) {
  const actionsShareRow = fieldCount < 4
  const desktop = desktopBreakpoint === "lg" ? {
    grid: "lg:grid-cols-4", fields: "lg:contents", fullFields: "lg:col-span-4 lg:grid-cols-4",
    actions: "lg:col-span-1 lg:col-start-4 lg:row-start-1 lg:self-end", full: "lg:col-span-4",
    split: "lg:contents", secondary: "lg:col-span-4 lg:col-start-1 lg:row-start-2", primary: "lg:col-span-1 lg:col-start-4 lg:row-start-1 lg:self-end lg:justify-end",
  } : {
    grid: "xl:grid-cols-4", fields: "xl:contents", fullFields: "xl:col-span-4 xl:grid-cols-4",
    actions: "xl:col-span-1 xl:col-start-4 xl:row-start-1 xl:self-end", full: "xl:col-span-4",
    split: "xl:contents", secondary: "xl:col-span-4 xl:col-start-1 xl:row-start-2", primary: "xl:col-span-1 xl:col-start-4 xl:row-start-1 xl:self-end xl:justify-end",
  }

  return (
    <div
      data-slot="query-filter-layout"
      data-field-count={fieldCount}
      className={cn(
        "grid grid-cols-1 gap-x-3 gap-y-4 sm:grid-cols-2 [&_[data-slot=field-label]:not(.sr-only)]:text-sm [&_[data-slot=field-label]:not(.sr-only)]:font-medium",
        desktop.grid,
        className
      )}
      {...props}
    >
      <FieldGroup
        className={cn(
          "grid grid-cols-1 gap-3 sm:col-span-2 sm:grid-cols-2",
          actionsShareRow
            ? desktop.fields
            : desktop.fullFields
        )}
      >
        {fields}
      </FieldGroup>
      <div
        data-slot="query-filter-actions"
        className={cn(
          "flex min-w-0 flex-wrap items-center gap-3 sm:col-span-2",
          actionsShareRow
            ? cn("justify-end", secondaryActions ? desktop.split : desktop.actions)
            : cn(desktop.full, secondaryActions ? "justify-between" : "justify-end")
        )}
      >
        {secondaryActions ? (
          <div className={cn("flex min-w-0 flex-wrap items-center gap-2", actionsShareRow && desktop.secondary)}>
            {secondaryActions}
          </div>
        ) : null}
        <div className={cn("flex items-center gap-2", secondaryActions && "ms-auto", actionsShareRow && secondaryActions && desktop.primary)}>
          {actions}
        </div>
      </div>
    </div>
  )
}
