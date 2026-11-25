"use client"

import { useState } from "react"
import { ArrowDownUpIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { StatusMultiSelect } from "./status-multi-select"
import type { DashboardDriverSnapshot } from "../driver-rows"
import { cn } from "@/lib/utils"

const driverStatusFilterOptions = [
  { value: "not-started", label: "未开始派送" },
  { value: "30min", label: "30min 未派送" },
  { value: "1h", label: "1h 未派送" },
  { value: "2h", label: "2h 未派送" },
  { value: "pod", label: "POD 不合规" },
  { value: "location", label: "妥投位置异常" },
  { value: "fake", label: "虚假问题件" },
] as const

type DriverStatusFilter = (typeof driverStatusFilterOptions)[number]["value"]

const driverSortOptions = [
  { value: "default", label: "默认排序" },
  { value: "pending-desc", label: "待派件量 从高到低" },
  { value: "pending-asc", label: "待派件量 从低到高" },
  { value: "clearance-desc", label: "日清率 从高到低" },
  { value: "clearance-asc", label: "日清率 从低到高" },
] as const
type DriverSort = (typeof driverSortOptions)[number]["value"]


export function useDeliveryDriverFilters<T extends DashboardDriverSnapshot>(drivers: T[]) {
  const [query, setQuery] = useState("")
  const [statusFilters, setStatusFilters] = useState<DriverStatusFilter[]>([])
  const [sort, setSort] = useState<DriverSort>("default")
  const sortLabel = driverSortOptions.find((option) => option.value === sort)!.label
  const visibleDrivers = drivers.filter((driver) => {
    const matchesQuery = driver.name.toLowerCase().includes(query.trim().toLowerCase())
    const matchesStatus = statusFilters.length === 0 || statusFilters.some((filter) => {
      if (filter === "not-started") return driver.status === "未开始派送"
      if (filter === "30min" || filter === "1h" || filter === "2h") return driver.status.startsWith(filter)
      if (filter === "pod") return Boolean(driver.podIssues)
      if (filter === "location") return Boolean(driver.locationIssues)
      return Boolean(driver.fakeIssues)
    })
    return matchesQuery && matchesStatus
  }).sort((a, b) => {
    if (sort === "default") return 0
    const value = (driver: DashboardDriverSnapshot) => sort.startsWith("pending")
      ? driver.pending
      : driver.total > 0 ? (driver.delivered + driver.exception) / driver.total : 0
    return sort.endsWith("asc") ? value(a) - value(b) : value(b) - value(a)
  })
  function resetFilters() { setQuery(""); setStatusFilters([]); setSort("default"); toast.success("筛选条件已重置") }

  return { query, setQuery, statusFilters, setStatusFilters, sort, setSort, sortLabel, visibleDrivers, resetFilters }
}

type DriverFilters = ReturnType<typeof useDeliveryDriverFilters>

export function DeliveryDriverFilters({ filters, drivers, idPrefix, compact = false, showQuickStatuses = true, deliveryPph, onResultsChange }: {
  filters: DriverFilters
  drivers: DashboardDriverSnapshot[]
  idPrefix: string
  compact?: boolean
  showQuickStatuses?: boolean
  deliveryPph?: number
  onResultsChange?: () => void
}) {
  const { query, setQuery, statusFilters, setStatusFilters, sort, setSort, sortLabel, visibleDrivers, resetFilters } = filters
  const actions = <><Button type="submit">查询</Button><Button type="button" variant="outline" onClick={() => { resetFilters(); onResultsChange?.() }}>重置</Button></>
  const quickStatuses = driverStatusFilterOptions.slice(0, 4)
  return <form className={cn("@container flex min-w-0 flex-col", compact ? "gap-3" : "gap-2")} aria-label="司机查询与排序" onSubmit={(event) => { event.preventDefault(); onResultsChange?.(); toast.success(`查询到 ${visibleDrivers.length} 名司机`) }}>
    {showQuickStatuses && <div className="grid min-w-0 gap-2 @min-[560px]:grid-cols-[minmax(0,4fr)_minmax(9rem,1fr)]">
      <div className="grid min-w-0 grid-cols-2 overflow-hidden rounded-lg border @min-[560px]:grid-cols-4">
        {quickStatuses.map((item, index) => {
          const count = drivers.filter((driver) => item.value === "not-started" ? driver.status === "未开始派送" : driver.status.startsWith(item.value)).length
          return <Button key={item.value} type="button" variant="ghost" className={cn("h-11 min-w-0 gap-0.5 rounded-none border-0 border-border px-1.5 py-1.5 whitespace-nowrap", index < 2 && "border-b @min-[560px]:border-b-0", index % 2 === 0 && "border-r", index < quickStatuses.length - 1 && "@min-[560px]:border-r", compact && "flex-col gap-1 px-1 py-1")} aria-label={`查询${item.label}司机 ${count} 名`} onClick={() => { setStatusFilters([item.value]); onResultsChange?.() }}><span className="whitespace-nowrap text-xs text-muted-foreground">{item.label}</span><span className="text-sm font-semibold tabular-nums text-destructive">{count}</span></Button>
        })}
      </div>
      <div role="status" aria-label={`PPH（派送）${deliveryPph === undefined ? "暂无数据" : `${deliveryPph.toFixed(1)} 件每小时`}`} className="flex h-11 min-w-0 items-center justify-center gap-2 rounded-lg border px-2 py-1 whitespace-nowrap">
        <span className="text-xs text-muted-foreground">PPH（派送）</span>
        <span className="font-heading text-sm font-semibold tabular-nums text-foreground">{deliveryPph === undefined ? "—" : deliveryPph.toFixed(1)}{deliveryPph === undefined ? null : <small className="ml-1 font-sans text-xs font-normal text-muted-foreground">件/h</small>}</span>
      </div>
    </div>}
    <FieldGroup className={cn("grid gap-2", compact ? "grid-cols-2" : "@min-[560px]:grid-cols-[minmax(8rem,1fr)_minmax(10rem,1fr)_auto]")}>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-search`} className="sr-only">司机姓名</FieldLabel>
        <Input id={`${idPrefix}-search`} value={query} onChange={(event) => { setQuery(event.target.value); onResultsChange?.() }} placeholder="请输入司机的名字" />
      </Field>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-status-filter`} className="sr-only">异常状态筛选</FieldLabel>
        <StatusMultiSelect id={`${idPrefix}-status-filter`} ariaLabel="异常状态筛选" options={driverStatusFilterOptions.map((option) => option.value)} value={statusFilters} getOptionLabel={(value) => driverStatusFilterOptions.find((option) => option.value === value)?.label ?? value} maxVisible={1} emptyLabel="全部异常状态" onValueChange={(value) => { setStatusFilters(value); onResultsChange?.() }} />
      </Field>
      {!compact && <div className="flex items-center justify-end gap-2">{actions}</div>}
    </FieldGroup>
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button type="button" variant="ghost" size="sm" className="h-7 w-21 gap-1 px-1.5 has-data-[icon=inline-start]:ps-1.5" aria-label={`司机排序：${sortLabel}`} title={sortLabel}><ArrowDownUpIcon data-icon="inline-start" className={cn(sort !== "default" && "text-brand")} />{sortLabel}</Button></DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52"><DropdownMenuGroup><DropdownMenuRadioGroup value={sort} onValueChange={(value) => { setSort(value as DriverSort); onResultsChange?.() }}>{driverSortOptions.map((option) => <DropdownMenuRadioItem key={option.value} value={option.value}>{option.label}</DropdownMenuRadioItem>)}</DropdownMenuRadioGroup></DropdownMenuGroup></DropdownMenuContent>
      </DropdownMenu>
      {compact ? <div className="flex items-center gap-2">{actions}</div> : <span>共 {visibleDrivers.length} 名司机</span>}
    </div>
  </form>
}
