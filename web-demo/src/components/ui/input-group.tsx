"use client"

import * as React from "react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

// The shadcn input-group composition, adapted to the project's owned Input,
// 36px controls, 1px focus ring, and embedded Select triggers.
function InputGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div
    data-slot="input-group"
    role="group"
    className={cn(
      "group/input-group relative flex h-9 w-full min-w-0 items-center rounded-md border border-input bg-transparent transition-[color,box-shadow] focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/40 has-[[aria-invalid=true]]:border-destructive has-[[aria-invalid=true]]:ring-destructive/20",
      "[&_[data-slot=select-trigger]]:h-full [&_[data-slot=select-trigger]]:rounded-none [&_[data-slot=select-trigger]]:border-0 [&_[data-slot=select-trigger]]:bg-transparent [&_[data-slot=select-trigger]]:shadow-none [&_[data-slot=select-trigger]]:ring-0",
      className
    )}
    {...props}
  />
}

function InputGroupAddon({
  className,
  align = "inline-start",
  onClick,
  ...props
}: React.ComponentProps<"div"> & { align?: "inline-start" | "inline-end" }) {
  return <div
    data-slot="input-group-addon"
    data-align={align}
    className={cn("flex shrink-0 items-center gap-2 px-3", align === "inline-start" ? "order-first" : "order-last", className)}
    onClick={(event) => {
      onClick?.(event)
      if (!event.defaultPrevented && !(event.target as HTMLElement).closest("button, a, input, select")) {
        event.currentTarget.parentElement?.querySelector("input")?.focus()
      }
    }}
    {...props}
  />
}

function InputGroupInput({ className, ...props }: React.ComponentProps<"input">) {
  return <Input
    data-slot="input-group-control"
    className={cn("h-full flex-1 rounded-none border-0 bg-transparent shadow-none ring-0 focus-visible:ring-0 disabled:bg-transparent aria-invalid:ring-0 dark:bg-transparent dark:disabled:bg-transparent", className)}
    {...props}
  />
}

export { InputGroup, InputGroupAddon, InputGroupInput }
