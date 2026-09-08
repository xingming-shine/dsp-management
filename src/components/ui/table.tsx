"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

type TableProps = React.ComponentProps<"table"> & {
  variant?: "default" | "grid"
  toolbar?: React.ReactNode
  footer?: React.ReactNode
  viewportClassName?: string
}

function Table({
  className,
  variant = "default",
  toolbar,
  footer,
  viewportClassName,
  ...props
}: TableProps) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-hidden rounded-lg border bg-card"
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
              "[&_tr>*:not(:last-child)]:border-r",
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
      className={cn("bg-muted/50 [&_tr]:border-b", className)}
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
        "border-b transition-colors hover:bg-brand-hover has-aria-expanded:bg-brand-selected data-[state=selected]:bg-brand-selected",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-12 px-3 text-start align-middle font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pe-0",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "h-12 px-3 py-0 align-middle whitespace-nowrap [&:has([role=checkbox])]:pe-0",
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
