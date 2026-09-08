"use client"

import { ChevronDownIcon, XIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function StatusMultiSelect<T extends string>({
  id,
  ariaLabel,
  options,
  value,
  onValueChange,
}: {
  id: string
  ariaLabel: string
  options: readonly T[]
  value: T[]
  onValueChange: (value: T[]) => void
}) {
  const toggleValue = (option: T) => {
    onValueChange(
      value.includes(option)
        ? value.filter((item) => item !== option)
        : [...value, option]
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div
          id={id}
          role="button"
          tabIndex={0}
          aria-label={ariaLabel}
          className="flex h-9 w-full items-center gap-1 overflow-hidden rounded-md border bg-card px-1.5 outline-none hover:bg-brand-hover focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 data-[state=open]:border-ring data-[state=open]:ring-1 data-[state=open]:ring-ring/50"
        >
          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
            {value.length === 0 ? (
              <span className="truncate px-1.5 text-sm text-muted-foreground">全部</span>
            ) : (
              <>
                {value.slice(0, 2).map((option) => (
                  <Badge key={option} variant="secondary" asChild>
                    <button
                      type="button"
                      aria-label={`删除领件状态：${option}`}
                      onPointerDown={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                      }}
                      onClick={(event) => {
                        event.stopPropagation()
                        onValueChange(value.filter((item) => item !== option))
                      }}
                      onKeyDown={(event) => event.stopPropagation()}
                    >
                      <span className="max-w-28 truncate">{option}</span>
                      <XIcon className="text-brand" aria-hidden="true" />
                    </button>
                  </Badge>
                ))}
                {value.length > 2 ? (
                  <span className="shrink-0 text-xs text-muted-foreground">+{value.length - 2}</span>
                ) : null}
              </>
            )}
          </div>
          <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-0"
      >
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option}
            className="whitespace-nowrap"
            checked={value.includes(option)}
            onCheckedChange={() => toggleValue(option)}
            onSelect={(event) => event.preventDefault()}
          >
            {option}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
