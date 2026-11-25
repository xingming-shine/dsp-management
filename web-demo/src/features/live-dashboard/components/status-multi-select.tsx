"use client"

import { ChevronDownIcon, XIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function StatusMultiSelect<T extends string>({
  id,
  ariaLabel,
  options,
  value,
  onValueChange,
  getOptionLabel = (option) => option,
  maxVisible = 2,
  emptyLabel = "全部",
}: {
  id: string
  ariaLabel: string
  options: readonly T[]
  value: T[]
  onValueChange: (value: T[]) => void
  getOptionLabel?: (option: T) => string
  maxVisible?: number
  emptyLabel?: string
}) {
  const allSelected = options.length > 0 && value.length === options.length
  const partiallySelected = value.length > 0 && !allSelected
  const showSelectAll = options.length >= 3

  const toggleValue = (option: T) => {
    onValueChange(
      value.includes(option)
        ? value.filter((item) => item !== option)
        : [...value, option]
    )
  }

  const toggleAll = () => {
    onValueChange(allSelected ? [] : [...options])
  }

  return (
    <DropdownMenu>
      <div className="relative flex h-9 w-full items-center overflow-hidden rounded-md border bg-card outline-none hover:bg-brand-hover focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/50 has-data-[state=open]:border-ring has-data-[state=open]:ring-1 has-data-[state=open]:ring-ring/50 [&>svg:not([class*='size-'])]:size-4">
        <DropdownMenuTrigger asChild>
          <button
            id={id}
            type="button"
            aria-label={`${ariaLabel}，${value.length === 0 ? "当前为全部" : `已选择 ${value.length} 项`}`}
            className="absolute inset-0 rounded-[inherit] outline-none"
          />
        </DropdownMenuTrigger>
        <div className="pointer-events-none relative z-10 flex min-w-0 flex-1 items-center gap-1 overflow-hidden px-1.5">
          {value.length === 0 ? (
            <span className="truncate px-1.5 text-sm text-muted-foreground">{emptyLabel}</span>
          ) : (
            <>
              {value.slice(0, maxVisible).map((option) => (
                <Badge key={option} variant="filter" asChild>
                  <button
                    type="button"
                    className="pointer-events-auto"
                    aria-label={`移除选项：${getOptionLabel(option)}`}
                    title={`移除选项：${getOptionLabel(option)}`}
                    onClick={(event) => {
                      event.stopPropagation()
                      onValueChange(value.filter((item) => item !== option))
                    }}
                  >
                    <span className="max-w-28 truncate">{getOptionLabel(option)}</span>
                    <XIcon data-icon="inline-end" aria-hidden="true" />
                  </button>
                </Badge>
              ))}
              {value.length > maxVisible ? (
                <span className="shrink-0 text-xs text-muted-foreground">+{value.length - maxVisible}</span>
              ) : null}
            </>
          )}
        </div>
        <ChevronDownIcon className="pointer-events-none relative z-10 me-2 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="sr-only" aria-live="polite">
          {`已选择 ${value.length} / ${options.length} 项`}
        </span>
      </div>
      <DropdownMenuContent align="start" className="min-w-0">
        <DropdownMenuGroup>
          {showSelectAll ? (
            <DropdownMenuCheckboxItem
              checked={allSelected ? true : partiallySelected ? "indeterminate" : false}
              onCheckedChange={toggleAll}
              onSelect={(event) => event.preventDefault()}
            >
              <span>全选</span>
              <span className="ms-auto text-xs text-muted-foreground">
                {value.length}/{options.length}
              </span>
            </DropdownMenuCheckboxItem>
          ) : null}
          {showSelectAll ? <DropdownMenuSeparator /> : null}
          {options.map((option) => (
            <DropdownMenuCheckboxItem
              key={option}
              className="whitespace-nowrap"
              checked={value.includes(option)}
              onCheckedChange={() => toggleValue(option)}
              onSelect={(event) => event.preventDefault()}
            >
              {getOptionLabel(option)}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
