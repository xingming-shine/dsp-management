"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { DriverSnapshot } from "@/features/live-dashboard/mock-data"
import { formatDate, formatTime } from "@/lib/date-time"
import { cn } from "@/lib/utils"

const statuses = ["未签到/签退", "未签退", "已签到/签退"] as const
const timestamp = (value: string | null, fallback: string) => value ? `${formatDate(value)} ${formatTime(value)}` : fallback

export function CurrentPickupMonitor({ drivers }: { drivers: DriverSnapshot[] }) {
  const [name, setName] = useState("")
  const [status, setStatus] = useState("all")
  const [filter, setFilter] = useState({ name: "", status: "all" })
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
  const visible = rows.filter((row) => row.name.toLowerCase().includes(filter.name.trim().toLowerCase()) && (filter.status === "all" || row.state === Number(filter.status)))
    .sort((a, b) => a.state - b.state || a.rate - b.rate)
  const due = rows.reduce((sum, row) => sum + row.due, 0)
  const collected = rows.reduce((sum, row) => sum + row.collected, 0)
  const summary = [
    { label: "应签到", value: rows.length, abnormal: false },
    { label: "未签到", value: rows.filter((row) => row.state === 0).length, abnormal: true },
    { label: "未签退", value: rows.filter((row) => row.state !== 2).length, abnormal: true },
    { label: "领件率", value: `${due ? (collected / due * 100).toFixed(2) : "0.00"}%`, abnormal: false },
  ]

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-3 rounded-lg bg-muted/30 p-3">
        <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,1fr)] gap-2">
          <div className="grid grid-cols-3 rounded-lg border">
            {summary.slice(0, 3).map((item) => <div key={item.label} className="flex flex-wrap items-center justify-center gap-2 border-r px-2 py-3 last:border-r-0"><span className="text-xs text-muted-foreground">{item.label}</span><span className={cn("text-sm font-semibold tabular-nums", item.abnormal ? "text-destructive" : "text-foreground")}>{item.value}</span></div>)}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 rounded-lg border px-2 py-3"><span className="text-xs text-muted-foreground">领件率</span><span className="text-sm font-semibold tabular-nums">{summary[3].value}</span></div>
        </div>
        <form onSubmit={(event) => { event.preventDefault(); setFilter({ name, status }) }}>
          <FieldGroup className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto]">
            <Field><FieldLabel htmlFor="pickup-driver-name" className="sr-only">司机姓名</FieldLabel><Input id="pickup-driver-name" placeholder="请输入司机的名字" value={name} onChange={(event) => setName(event.target.value)} /></Field>
            <Field><FieldLabel htmlFor="pickup-driver-status" className="sr-only">签到签退状态</FieldLabel><Select value={status} onValueChange={setStatus}><SelectTrigger id="pickup-driver-status" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">全部异常状态</SelectItem>{statuses.map((label, index) => <SelectItem key={label} value={String(index)}>{label}</SelectItem>)}</SelectGroup></SelectContent></Select></Field>
            <Button type="submit">查询</Button>
            <Button type="button" variant="outline" onClick={() => { setName(""); setStatus("all"); setFilter({ name: "", status: "all" }) }}>重置</Button>
          </FieldGroup>
        </form>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span>排序：签到签退异常 → 领件率</span><span aria-live="polite">共 {visible.length} 名司机</span></div>
        <ScrollArea className="h-[40rem] rounded-lg">
          <div className="flex flex-col gap-2 pr-3">
            {visible.map((row) => (
              <article key={row.id} className="flex flex-col gap-3 rounded-lg border bg-card p-4" aria-label={`${row.name}当期领件情况`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-3"><span className="rounded-sm bg-brand/10 px-3 py-1 text-sm font-medium text-brand">{row.rating}★</span><span className="truncate text-base font-medium">{row.name}</span></div>
                  <Tooltip><TooltipTrigger asChild><Badge asChild variant={row.state === 2 ? "success" : "destructive"}><button type="button" aria-label={`${row.name}${statuses[row.state]}，查看签到签退时间`}>{statuses[row.state]}</button></Badge></TooltipTrigger><TooltipContent><div className="flex flex-col gap-1"><span>签到时间：{timestamp(row.checkIn, "未签到")}</span><span>签退时间：{timestamp(row.checkOut, "未签退")}</span></div></TooltipContent></Tooltip>
                </div>
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem] sm:gap-4">
                  <div className="flex min-w-0 flex-col gap-2 sm:pr-1">
                    <div className="grid grid-cols-[minmax(0,1fr)_3.25rem] items-center gap-x-1.5 gap-y-2 text-xs">
                      <span>应领件 <strong className="ml-2 font-medium tabular-nums">{row.due}</strong></span>
                      <span className="text-right tabular-nums text-muted-foreground">{row.collected}/{row.due}</span>
                      <div role="img" aria-label={`已领件 ${row.collected}，已分拣未领件 ${row.sorted}，未分拣未领件 ${row.unsorted}，领件率 ${row.rate.toFixed(2)}%`} className="flex h-2 overflow-hidden rounded-full bg-border"><span className="bg-chart-1" style={{ width: `${row.rate}%` }} /><span className="bg-muted-foreground" style={{ width: `${row.sorted / row.due * 100}%` }} /><span className="bg-border" style={{ width: `${row.unsorted / row.due * 100}%` }} /></div>
                      <span className="text-right tabular-nums text-muted-foreground">{row.rate.toFixed(2)}%</span>
                      <div className="grid grid-cols-3 items-start gap-2 text-xs text-muted-foreground">
                        {[
                          { label: "未分拣未领件", value: row.unsorted, color: "bg-border", abnormal: true },
                          { label: "已分拣未领件", value: row.sorted, color: "bg-muted-foreground", abnormal: true },
                          { label: "已领件", value: row.collected, color: "bg-chart-1", abnormal: false },
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
                  <dl className="flex flex-col gap-2 border-t pt-3 text-xs sm:border-t-0 sm:border-l sm:pt-0 sm:pl-4"><div className="flex justify-between gap-2"><dt className="text-muted-foreground">领件总量</dt><dd className="font-medium tabular-nums">{row.collected + row.other}</dd></div><div className="flex justify-between gap-2 pl-2"><dt className="text-muted-foreground">当期任务件</dt><dd className="tabular-nums">{row.collected}</dd></div><div className="flex justify-between gap-2 pl-2"><dt className="text-muted-foreground">非当期任务件</dt><dd className="tabular-nums">{row.other}</dd></div></dl>
                </div>
              </article>
            ))}
            {!visible.length && <Empty><EmptyHeader><EmptyTitle>暂无匹配司机</EmptyTitle><EmptyDescription>请调整司机姓名或状态筛选条件。</EmptyDescription></EmptyHeader></Empty>}
          </div>
        </ScrollArea>
      </div>
    </TooltipProvider>
  )
}
