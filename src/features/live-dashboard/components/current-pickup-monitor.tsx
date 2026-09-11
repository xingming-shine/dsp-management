"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowDownUpIcon, CopyIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { DriverSnapshot } from "@/features/live-dashboard/mock-data"
import { formatDate, formatTime } from "@/lib/date-time"
import { cn } from "@/lib/utils"
import { AnimatedSegmentedProgress } from "@/features/live-dashboard/components/animated-segmented-progress"

const statuses = ["未签到/签退", "未签退", "已签到/签退"] as const
const statusFilterLabels = ["未签到", "未签退", "已签到/签退"] as const
const matchesPickupStatus = (state: number, status: string) => status === "all" || (status === "1" ? state !== 2 : state === Number(status))
const pickupSortOptions = [
  { value: "default", label: "默认排序" },
  { value: "uncollected-desc", label: "未领件量 从高到低" },
  { value: "uncollected-asc", label: "未领件量 从低到高" },
  { value: "total-desc", label: "领件总量 从高到低" },
  { value: "total-asc", label: "领件总量 从低到高" },
  { value: "rate-desc", label: "领件率 从高到低" },
  { value: "rate-asc", label: "领件率 从低到高" },
] as const
type PickupSort = (typeof pickupSortOptions)[number]["value"]
const timestamp = (value: string | null, fallback: string) => value ? `${formatDate(value)} ${formatTime(value)}` : fallback

export function CurrentPickupMonitor({ drivers, period = "current", onViewDetail }: { drivers: DriverSnapshot[]; period?: "current" | "next"; onViewDetail: (driverId: string) => void }) {
  const fieldPrefix = period === "next" ? "next-pickup" : "pickup"
  const periodLabel = period === "next" ? "下期" : "当期"
  const collectedLabel = period === "next" ? "已领件（下期任务）" : "已领件"
  const [name, setName] = useState("")
  const [status, setStatus] = useState("all")
  const [filter, setFilter] = useState({ name: "", status: "all" })
  const [sort, setSort] = useState<PickupSort>("default")
  const [contactDriverId, setContactDriverId] = useState<string | null>(null)
  const contactCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sortLabel = pickupSortOptions.find((option) => option.value === sort)!.label
  const rows = useMemo(() => drivers.map((driver, index) => {
    const state = index === 0 ? 0 : index < 4 ? 1 : 2
    const due = 145 + index * 7
    const unsorted = state === 0 ? due - 15 : index % 4 + 3
    const sorted = state === 0 ? 15 : index % 5 + 4
    const collected = due - unsorted - sorted
    const other = state === 0 ? 0 : index % 6 + 2
    return { ...driver, state, due, unsorted, sorted, collected, other, rate: collected / due * 100,
      checkIn: state === 0 ? null : "2026-08-21T08:15:00-04:00",
      checkOut: state === 2 ? "2026-08-21T09:30:00-04:00" : null }
  }), [drivers])
  const visible = rows.filter((row) => row.name.toLowerCase().includes(filter.name.trim().toLowerCase()) && matchesPickupStatus(row.state, filter.status))
    .sort((a, b) => {
      if (sort === "default") return a.state - b.state || a.rate - b.rate
      const value = (row: typeof a) => sort.startsWith("uncollected")
        ? row.unsorted + row.sorted
        : sort.startsWith("total") ? row.collected + row.other : row.rate
      return sort.endsWith("asc") ? value(a) - value(b) : value(b) - value(a)
    })
  const due = rows.reduce((sum, row) => sum + row.due, 0)
  const collected = rows.reduce((sum, row) => sum + row.collected, 0)
  const summary = [
    { label: "应签到", value: rows.length, status: null },
    { label: "未签到", value: rows.filter((row) => matchesPickupStatus(row.state, "0")).length, status: "0" },
    { label: "未签退", value: rows.filter((row) => matchesPickupStatus(row.state, "1")).length, status: "1" },
    { label: "领件率", value: `${due ? (collected / due * 100).toFixed(2) : "0.00"}%`, status: null },
  ]

  useEffect(() => () => {
    if (contactCloseTimer.current) clearTimeout(contactCloseTimer.current)
  }, [])

  const openContact = (driverId: string) => {
    if (contactCloseTimer.current) clearTimeout(contactCloseTimer.current)
    setContactDriverId(driverId)
  }

  const scheduleContactClose = (driverId: string) => {
    if (contactCloseTimer.current) clearTimeout(contactCloseTimer.current)
    contactCloseTimer.current = setTimeout(() => {
      setContactDriverId((current) => current === driverId ? null : current)
    }, 150)
  }

  const copyPhone = async (phone: string, driverName: string) => {
    try {
      await navigator.clipboard.writeText(phone)
      toast.success(`${driverName} 的手机号已复制`)
    } catch {
      toast.error("复制失败，请手动复制手机号")
    }
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-3 rounded-lg bg-muted/30 p-3">
        <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,1fr)] gap-2">
          <div className="grid grid-cols-3 overflow-hidden rounded-lg border">
            {summary.slice(0, 3).map((item) => item.status !== null ? (
              <Button key={item.label} type="button" variant="ghost" className="h-auto min-w-0 cursor-pointer flex-wrap gap-2 rounded-none border-0 border-r border-border px-2 py-3 whitespace-normal last:border-r-0 hover:bg-brand-hover focus-visible:bg-brand-hover" aria-label={`查询${item.label}司机 ${item.value} 名`} onClick={() => { const nextStatus = item.status!; setStatus(nextStatus); setFilter({ name, status: nextStatus }) }}>
                <span className="text-xs text-muted-foreground">{item.label}</span><span className="text-sm font-semibold tabular-nums text-destructive">{item.value}</span>
              </Button>
            ) : <div key={item.label} className="flex flex-wrap items-center justify-center gap-2 border-r px-2 py-3 last:border-r-0"><span className="text-xs text-muted-foreground">{item.label}</span><span className="text-sm font-semibold tabular-nums">{item.value}</span></div>)}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 rounded-lg border px-2 py-3"><span className="text-xs text-muted-foreground">领件率</span><span className="text-sm font-semibold tabular-nums">{summary[3].value}</span></div>
        </div>
        <form onSubmit={(event) => { event.preventDefault(); setFilter({ name, status }) }}>
          <FieldGroup className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto]">
            <Field><FieldLabel htmlFor={`${fieldPrefix}-driver-name`} className="sr-only">司机姓名</FieldLabel><Input id={`${fieldPrefix}-driver-name`} placeholder="请输入司机的名字" value={name} onChange={(event) => setName(event.target.value)} /></Field>
            <Field><FieldLabel htmlFor={`${fieldPrefix}-driver-status`} className="sr-only">签到签退状态</FieldLabel><Select value={status} onValueChange={setStatus}><SelectTrigger id={`${fieldPrefix}-driver-status`} className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">全部异常状态</SelectItem>{statusFilterLabels.map((label, index) => <SelectItem key={label} value={String(index)}>{label}</SelectItem>)}</SelectGroup></SelectContent></Select></Field>
            <Button type="submit">查询</Button>
            <Button type="button" variant="outline" onClick={() => { setName(""); setStatus("all"); setFilter({ name: "", status: "all" }); setSort("default") }}>重置</Button>
          </FieldGroup>
        </form>
        <div className="-my-1 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="xs" aria-label={`领件司机排序：${sortLabel}`} title={sortLabel}>
                <ArrowDownUpIcon data-icon="inline-start" className={cn(sort !== "default" && "text-brand")} />{sortLabel}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuGroup>
                <DropdownMenuRadioGroup value={sort} onValueChange={(value) => setSort(value as PickupSort)}>
                  {pickupSortOptions.map((option) => <DropdownMenuRadioItem key={option.value} value={option.value}>{option.label}</DropdownMenuRadioItem>)}
                </DropdownMenuRadioGroup>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <span aria-live="polite">共 {visible.length} 名司机</span>
        </div>
        <ScrollArea className="h-[40rem] rounded-lg">
          <div className="flex flex-col gap-2 pr-3">
            {visible.map((row) => (
              <Popover key={row.id} open={contactDriverId === row.id} onOpenChange={(open) => open ? openContact(row.id) : setContactDriverId(null)}>
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto w-full flex-col items-stretch gap-3 rounded-lg p-4 text-left whitespace-normal"
                  aria-label={`查看${row.name}${periodLabel}领件详情运单列表`}
                  onFocus={() => openContact(row.id)}
                  onClick={() => onViewDetail(row.id)}
                >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="rounded-sm bg-brand/10 px-3 py-1 text-sm font-medium text-brand">{row.rating}★</span>
                    <PopoverTrigger asChild>
                      <span
                        className="truncate text-base font-medium"
                        onPointerEnter={() => openContact(row.id)}
                        onPointerLeave={() => scheduleContactClose(row.id)}
                        onClick={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          openContact(row.id)
                        }}
                      >
                        {row.name}
                      </span>
                    </PopoverTrigger>
                  </div>
                  <Tooltip><TooltipTrigger asChild><Badge variant={row.state === 2 ? "success" : "destructive"}>{statuses[row.state]}</Badge></TooltipTrigger><TooltipContent><div className="flex flex-col gap-1"><span>签到时间：{timestamp(row.checkIn, "未签到")}</span><span>签退时间：{timestamp(row.checkOut, "未签退")}</span></div></TooltipContent></Tooltip>
                </div>
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem] sm:gap-4">
                  <div className="flex min-w-0 flex-col gap-2 sm:pr-1">
                    <div className="grid grid-cols-[minmax(0,1fr)_5.5rem] items-center gap-x-1.5 gap-y-2 text-xs">
                      <span>应领件 <strong className="ml-2 font-medium tabular-nums">{row.due}</strong></span>
                      <span className="flex items-center justify-end gap-1 whitespace-nowrap text-muted-foreground">
                        <span>领件率</span>
                        <span className="font-medium tabular-nums text-foreground">{row.rate.toFixed(2)}%</span>
                      </span>
                      <AnimatedSegmentedProgress
                        value={row.rate}
                        ariaLabel={`${collectedLabel} ${row.collected}，已分拣未领件 ${row.sorted}，未分拣未领件 ${row.unsorted}，领件率 ${row.rate.toFixed(2)}%`}
                        className="h-2 bg-border"
                        segments={[
                          { className: "bg-chart-1", value: row.rate },
                          { className: "bg-muted-foreground", value: row.sorted / row.due * 100 },
                          { className: "bg-border", value: row.unsorted / row.due * 100 },
                        ]}
                      />
                      <span className="text-right tabular-nums text-muted-foreground">{row.collected}/{row.due}</span>
                      <div className="grid grid-cols-3 items-start gap-2 text-xs text-muted-foreground">
                        {[
                          { label: "未分拣未领件", value: row.unsorted, color: "bg-border", abnormal: true },
                          { label: "已分拣未领件", value: row.sorted, color: "bg-muted-foreground", abnormal: true },
                          { label: collectedLabel, value: row.collected, color: "bg-chart-1", abnormal: false },
                        ].map((item, index) => (
                          <span key={item.label} className={cn("min-w-0 leading-5", index === 1 && "text-center", index === 2 && "text-right")}>
                            <span aria-hidden="true" className={cn("mr-1 inline-block size-1.5 rounded-full align-middle", item.color)} />
                            <span>{item.label}</span>
                            <b className={cn("ml-1 inline-block font-normal tabular-nums", item.abnormal ? "text-destructive" : "text-foreground")}>{item.value}</b>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <dl className="flex flex-col gap-2 border-t pt-3 text-xs sm:border-t-0 sm:border-l sm:pt-0 sm:pl-4"><div className="flex justify-between gap-2"><dt className="text-muted-foreground">领件总量</dt><dd className="font-medium tabular-nums">{row.collected + row.other}</dd></div><div className="flex justify-between gap-2 pl-2"><dt className="text-muted-foreground">{period === "next" ? "下期任务领件" : "当期任务领件"}</dt><dd className="tabular-nums">{row.collected}</dd></div><div className="flex justify-between gap-2 pl-2"><dt className="text-muted-foreground">{period === "next" ? "非下期任务领件" : "非当期任务领件"}</dt><dd className="tabular-nums">{row.other}</dd></div></dl>
                </div>
                </Button>
                <PopoverContent
                  align="start"
                  side="top"
                  sideOffset={8}
                  className="w-72 max-w-[calc(100vw-2rem)] gap-3 p-3"
                  aria-label={`${row.name}的联系方式`}
                  onOpenAutoFocus={(event) => event.preventDefault()}
                  onPointerEnter={() => openContact(row.id)}
                  onPointerLeave={() => scheduleContactClose(row.id)}
                >
                  <PopoverHeader>
                    <PopoverTitle>司机联系方式</PopoverTitle>
                    <PopoverDescription>{row.name}</PopoverDescription>
                  </PopoverHeader>
                  <div className="grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-2 text-xs">
                    <span className="text-muted-foreground">手机号</span>
                    <span className="truncate font-medium tabular-nums">{row.phone || "暂无手机号"}</span>
                    <Button type="button" variant="outline" size="sm" disabled={!row.phone} onClick={() => copyPhone(row.phone, row.name)} aria-label={`复制${row.name}的手机号`}>
                      <CopyIcon data-icon="inline-start" />复制
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            ))}
            {!visible.length && <Empty><EmptyHeader><EmptyTitle>暂无匹配司机</EmptyTitle><EmptyDescription>请调整司机姓名或状态筛选条件。</EmptyDescription></EmptyHeader></Empty>}
          </div>
        </ScrollArea>
      </div>
    </TooltipProvider>
  )
}
