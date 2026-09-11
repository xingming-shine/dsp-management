"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

type TableProps = React.ComponentProps<"table"> & {
  variant?: "default" | "grid"
  bordered?: boolean
  toolbar?: React.ReactNode
  footer?: React.ReactNode
  viewportClassName?: string
}

type StickyColumn = "right"

type TableHeadProps = React.ComponentProps<"th"> & {
  sticky?: StickyColumn
}

type TableCellProps = React.ComponentProps<"td"> & {
  sticky?: StickyColumn
}

function Table({
  className,
  variant = "default",
  bordered = true,
  toolbar,
  footer,
  viewportClassName,
  ...props
}: TableProps) {
  return (
    <div
      data-slot="table-container"
      className={cn("relative w-full overflow-hidden bg-card", bordered && "rounded-lg border")}
    >
      {toolbar ? (
        <div data-slot="table-toolbar" className="bg-card p-4">
          {toolbar}
        </div>
      ) : null}
      <div className={cn("overflow-auto", viewportClassName)}>
        <table
          data-slot="table"
          data-variant={variant}
          className={cn(
            "w-full caption-bottom text-xs",
            variant === "grid" &&
              "[&_tr>*:not(:last-child):not(:has(+_[data-sticky=right]))]:border-r",
            className
          )}
          {...props}
        />
      </div>
      {footer}
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn(
        "bg-[color-mix(in_oklab,var(--muted)_50%,var(--card))] [&_tr]:border-b",
        className
      )}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b transition-colors hover:bg-brand-hover has-aria-expanded:bg-brand-selected data-[state=selected]:bg-brand-selected [&:hover>[data-sticky=right]]:bg-[linear-gradient(var(--brand-hover),var(--brand-hover))] [&:has([aria-expanded=true])>[data-sticky=right]]:bg-brand-selected [&[data-state=selected]>[data-sticky=right]]:bg-brand-selected",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, sticky, ...props }: TableHeadProps) {
  return (
    <th
      data-slot="table-head"
      data-sticky={sticky}
      className={cn(
        "h-12 px-3 text-start align-middle font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pe-0 data-[sticky=right]:sticky data-[sticky=right]:right-0 data-[sticky=right]:z-20 data-[sticky=right]:bg-[color-mix(in_oklab,var(--muted)_50%,var(--card))]",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, sticky, ...props }: TableCellProps) {
  return (
    <td
      data-slot="table-cell"
      data-sticky={sticky}
      className={cn(
        "h-12 px-3 py-0 text-start align-middle whitespace-nowrap [&:has([role=checkbox])]:pe-0 data-[sticky=right]:sticky data-[sticky=right]:right-0 data-[sticky=right]:z-10 data-[sticky=right]:bg-card",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-xs text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
