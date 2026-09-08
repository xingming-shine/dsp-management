"use client"

import * as React from "react"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
} from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      role="navigation"
      aria-label="分页导航"
      data-slot="pagination"
      className={cn("flex w-full", className)}
      {...props}
    />
  )
}

function PaginationContent({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn(
        "flex items-center gap-[var(--pagination-gap)]",
        className
      )}
      {...props}
    />
  )
}

function PaginationItem(props: React.ComponentProps<"li">) {
  return <li data-slot="pagination-item" {...props} />
}

type PaginationLinkProps = {
  isActive?: boolean
} & React.ComponentProps<"a">

function PaginationLink({
  className,
  isActive,
  ...props
}: PaginationLinkProps) {
  return (
    <a
      aria-current={isActive ? "page" : undefined}
      data-slot="pagination-link"
      data-active={isActive || undefined}
      className={cn(
        buttonVariants({ variant: "outline", size: "sm" }),
        "min-w-[var(--pagination-control-height)] px-2 [font-size:var(--pagination-font-size)]",
        "hover:border-brand/20 hover:text-brand",
        isActive &&
          "border-transparent bg-brand-selected font-medium text-brand hover:border-transparent hover:bg-brand-hover hover:text-brand",
        className
      )}
      {...props}
    />
  )
}

function PaginationPrevious({
  className,
  text = "上一页",
  ...props
}: PaginationLinkProps & { text?: string }) {
  return (
    <PaginationLink
      aria-label="前往上一页"
      className={cn("px-2 sm:px-3", className)}
      {...props}
    >
      <ChevronLeftIcon data-icon="inline-start" />
      <span className="hidden sm:block">{text}</span>
    </PaginationLink>
  )
}

function PaginationNext({
  className,
  text = "下一页",
  ...props
}: PaginationLinkProps & { text?: string }) {
  return (
    <PaginationLink
      aria-label="前往下一页"
      className={cn("px-2 sm:px-3", className)}
      {...props}
    >
      <span className="hidden sm:block">{text}</span>
      <ChevronRightIcon data-icon="inline-end" />
    </PaginationLink>
  )
}

function PaginationEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden="true"
      data-slot="pagination-ellipsis"
      className={cn(
        "flex size-[var(--pagination-control-height)] items-center justify-center text-muted-foreground [&_svg]:size-4",
        className
      )}
      {...props}
    >
      <MoreHorizontalIcon />
      <span className="sr-only">更多页码</span>
    </span>
  )
}

type PageItem = number | "ellipsis-start" | "ellipsis-end"

function getPageItems(page: number, pageCount: number): PageItem[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1)
  }

  const pages = new Set([1, pageCount, page - 1, page, page + 1])
  const visiblePages = [...pages]
    .filter((item) => item >= 1 && item <= pageCount)
    .sort((a, b) => a - b)
  const items: PageItem[] = []

  visiblePages.forEach((visiblePage, index) => {
    const previousPage = visiblePages[index - 1]

    if (previousPage && visiblePage - previousPage > 1) {
      items.push(previousPage === 1 ? "ellipsis-start" : "ellipsis-end")
    }

    items.push(visiblePage)
  })

  return items
}

type DataPaginationProps = Omit<React.ComponentProps<"div">, "onChange"> & {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  pageSizeOptions?: number[]
  showJumper?: boolean
  showPageSize?: boolean
  showTotal?: boolean
}

type PaginationJumperProps = {
  currentPage: number
  pageCount: number
  onPageChange: (page: number) => void
}

function PaginationJumper({
  currentPage,
  pageCount,
  onPageChange,
}: PaginationJumperProps) {
  const [jumpValue, setJumpValue] = React.useState(String(currentPage))

  const commitJump = () => {
    const nextPage = Number.parseInt(jumpValue, 10)

    if (Number.isNaN(nextPage)) {
      setJumpValue(String(currentPage))
      return
    }

    const clampedPage = Math.min(Math.max(nextPage, 1), pageCount)
    setJumpValue(String(clampedPage))
    onPageChange(clampedPage)
  }

  return (
    <label className="flex items-center gap-2 whitespace-nowrap text-muted-foreground">
      <span>跳至</span>
      <Input
        type="number"
        min={1}
        max={pageCount}
        inputMode="numeric"
        aria-label="跳转页码"
        value={jumpValue}
        className="h-[var(--pagination-control-height)] w-14 px-2 text-center [font-size:var(--pagination-font-size)] tabular-nums"
        onChange={(event) => setJumpValue(event.target.value)}
        onBlur={commitJump}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur()
          }
        }}
      />
      <span>页</span>
    </label>
  )
}

function DataPagination({
  className,
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
  showJumper = true,
  showPageSize = true,
  showTotal = true,
  ...props
}: DataPaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const currentPage = Math.min(Math.max(page, 1), pageCount)

  const goToPage = React.useCallback(
    (nextPage: number) => {
      onPageChange(Math.min(Math.max(nextPage, 1), pageCount))
    },
    [onPageChange, pageCount]
  )

  return (
    <div
      data-slot="data-pagination"
      className={cn(
        "flex min-h-14 flex-col items-start justify-between gap-3 border-t bg-card px-3 py-3 [font-size:var(--pagination-font-size)] sm:flex-row sm:items-center",
        className
      )}
      {...props}
    >
      <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
        {showTotal ? (
          <span className="whitespace-nowrap tabular-nums">共 {total} 条</span>
        ) : null}
        {showPageSize ? (
          <label className="flex items-center gap-2 whitespace-nowrap">
            <span>每页</span>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                onPageSizeChange(Number(value))
                onPageChange(1)
              }}
            >
              <SelectTrigger
                size="sm"
                aria-label="每页显示条数"
                className="w-[4.5rem] [font-size:var(--pagination-font-size)]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {pageSizeOptions.map((option) => (
                    <SelectItem key={option} value={String(option)}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <span>条</span>
          </label>
        ) : null}
      </div>

      <div className="flex max-w-full flex-wrap items-center gap-3">
        <Pagination className="w-auto">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                aria-disabled={currentPage === 1}
                tabIndex={currentPage === 1 ? -1 : undefined}
                className={cn(
                  currentPage === 1 && "pointer-events-none opacity-50"
                )}
                onClick={(event) => {
                  event.preventDefault()
                  goToPage(currentPage - 1)
                }}
              />
            </PaginationItem>

            {getPageItems(currentPage, pageCount).map((item) => {
              if (typeof item !== "number") {
                return (
                  <PaginationItem key={item} className="hidden sm:block">
                    <PaginationEllipsis />
                  </PaginationItem>
                )
              }

              const hideOnMobile =
                item !== 1 && item !== currentPage && item !== pageCount

              return (
                <PaginationItem
                  key={item}
                  className={cn(hideOnMobile && "hidden sm:block")}
                >
                  <PaginationLink
                    href="#"
                    isActive={item === currentPage}
                    aria-label={`前往第 ${item} 页`}
                    onClick={(event) => {
                      event.preventDefault()
                      goToPage(item)
                    }}
                  >
                    {item}
                  </PaginationLink>
                </PaginationItem>
              )
            })}

            <PaginationItem>
              <PaginationNext
                href="#"
                aria-disabled={currentPage === pageCount}
                tabIndex={currentPage === pageCount ? -1 : undefined}
                className={cn(
                  currentPage === pageCount && "pointer-events-none opacity-50"
                )}
                onClick={(event) => {
                  event.preventDefault()
                  goToPage(currentPage + 1)
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>

        {showJumper ? (
          <PaginationJumper
            key={currentPage}
            currentPage={currentPage}
            pageCount={pageCount}
            onPageChange={goToPage}
          />
        ) : null}
      </div>
    </div>
  )
}

export {
  DataPagination,
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
}
export type { DataPaginationProps, PaginationLinkProps }
