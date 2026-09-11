"use client"

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { flushSync } from "react-dom"
import { ExternalLinkIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { monitorDrivers, statusLabels, validCoordinate, type MonitorWaybill } from "../driver-monitor-data"
import { alertMetricItems, type AlertMetricKey } from "../alert-metric-config"
import { remainingProblemTime, type ProblemTask } from "../problem-task-data"
import { MonitorWaybillOverlay, WaybillLocationLink } from "./monitor-waybill-card"
import { formatDateTime } from "@/lib/date-time"
import { cn } from "@/lib/utils"
import { WaybillCardHeading, WaybillNavigationCard, WorkspaceColumns, WorkspaceDetail, WorkspaceHeader, WorkspaceRail } from "./waybill-workspace-parts"

type DetailTab = "details" | "pod"
export type AlertWaybillEntry = { id: string; waybill: MonitorWaybill; task?: ProblemTask }
type Selection = { id: string; tab: DetailTab; photoId?: string }
type OpenDetail = (id: string, tab?: DetailTab, photoId?: string) => void
const transitionName = (id: string) => `alert-row-${id.replace(/[^a-zA-Z0-9_-]/g, "-")}`

/** One mounted source list preserves filters and scroll while its rows become the rail. */
export function AlertWaybillWorkspace({ rows, metric, pageSize, onPageChange, onActiveChange, now, children }: {
  rows: AlertWaybillEntry[]
  metric: AlertMetricKey
  pageSize: number
  onPageChange: (page: number) => void
  onActiveChange: (active: boolean) => void
  now?: number
  children: (open: OpenDetail) => ReactNode
}) {
  const [selection, setSelection] = useState<Selection | null>(null)
  const [mobilePane, setMobilePane] = useState("detail")
  const list = useRef<HTMLDivElement>(null)
  const rail = useRef<HTMLDivElement>(null)
  const workspace = useRef<HTMLElement>(null)
  const backButton = useRef<HTMLButtonElement>(null)
  const returnTarget = useRef<string | null>(null)
  const originalScroll = useRef(0)
  const moving = useRef(false)
  const [closing, setClosing] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [rowNames, setRowNames] = useState(new Set<string>())
  const selected = rows.find((row) => row.id === selection?.id)
  const selectedIndex = rows.findIndex((row) => row.id === selection?.id)
  const active = Boolean(selected)

  function transition(update: () => void) {
    if (moving.current) return
    if (!document.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { update(); return }
    moving.current = true
    document.documentElement.setAttribute("data-waybill-transition", "open")
    const motion = document.startViewTransition(() => flushSync(update))
    void motion.finished.catch(() => {}).finally(() => {
      moving.current = false
      document.documentElement.removeAttribute("data-waybill-transition")
    })
  }

  function open(id: string, tab: DetailTab = "details", photoId?: string) {
    if (moving.current) return
    originalScroll.current = window.scrollY
    const names = new Set<string>()
    list.current?.querySelectorAll<HTMLElement>("[data-alert-source]").forEach((element) => {
      const rect = element.getBoundingClientRect()
      const rowId = element.dataset.alertSource!
      const visible = rect.bottom > 64 && rect.top < window.innerHeight
      element.style.viewTransitionName = visible ? transitionName(rowId) : "none"
      if (visible) names.add(rowId)
    })
    transition(() => { setRowNames(names); setSelection({ id, tab, photoId }); setMobilePane("detail"); onActiveChange(true) })
  }

  function close() {
    if (!selected || moving.current || closing) return
    const bounds = rail.current?.getBoundingClientRect()
    const cards = Array.from(rail.current?.querySelectorAll<HTMLElement>("[data-alert-card]") ?? [])
    const inView = (card: HTMLElement) => {
      const rect = card.getBoundingClientRect()
      return bounds && rect.top >= bounds.top && rect.bottom <= bounds.bottom
    }
    const current = cards.find((card) => card.dataset.alertCard === selected.id)
    const anchor = bounds?.height && current && !inView(current)
      ? cards.find(inView)?.dataset.alertCard ?? selected.id : selected.id
    returnTarget.current = anchor
    setClosing(true)
    closeTimer.current = setTimeout(() => {
      onPageChange(Math.floor(Math.max(0, rows.findIndex((row) => row.id === anchor)) / pageSize) + 1)
      setSelection(null)
      setClosing(false)
      onActiveChange(false)
    }, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 180)
  }

  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current) }, [])

  useLayoutEffect(() => {
    if (active) {
      workspace.current?.scrollIntoView({ block: "start", behavior: "instant" })
      backButton.current?.focus({ preventScroll: true })
    } else if (returnTarget.current) {
      const id = returnTarget.current
      returnTarget.current = null
      window.scrollTo({ top: originalScroll.current, behavior: "instant" })
      const source = Array.from(list.current?.querySelectorAll<HTMLElement>("[data-alert-source]") ?? []).find((node) => node.dataset.alertSource === id)
      const trigger = source?.querySelector<HTMLElement>("a,button")
      trigger?.focus({ preventScroll: true })
      source?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" })
      source?.setAttribute("data-returned-waybill", "true")
      return () => source?.removeAttribute("data-returned-waybill")
    }
  }, [active])

  useLayoutEffect(() => {
    const node = Array.from(rail.current?.querySelectorAll<HTMLElement>("[data-alert-card]") ?? []).find((card) => card.dataset.alertCard === selection?.id)
    if (node && rail.current?.clientHeight) {
      const box = node.getBoundingClientRect()
      const bounds = rail.current.getBoundingClientRect()
      if (box.top < bounds.top || box.bottom > bounds.bottom) rail.current.scrollTop += box.top - bounds.top - 8
    }
  }, [selection?.id, mobilePane])

  function select(id: string, focusCard = false) {
    if (closing || !rows.some((row) => row.id === id)) return
    setSelection((current) => ({ id, tab: current?.tab ?? "details" }))
    if (focusCard) requestAnimationFrame(() => {
      Array.from(rail.current?.querySelectorAll<HTMLElement>("[data-alert-card]") ?? []).find((card) => card.dataset.alertCard === id)?.querySelector<HTMLButtonElement>("[data-card-index]")?.focus({ preventScroll: true })
    })
    else setMobilePane("detail")
  }
  const driver = monitorDrivers.find((item) => item.id === selected?.waybill.driverId)
  const showProcessingAction = (metric === "pending" || metric === "suspected-lost") && selected?.task?.status === "待处理"
  return <div className="min-w-0">
    <div ref={list} hidden={active} style={{ viewTransitionName: "waybill-list" }}><SourceList open={open}>{children}</SourceList></div>
    {selected && selection && <section ref={workspace} aria-label="异常运单详情工作区" className={cn("waybill-workspace flex min-w-0 flex-col gap-3", closing && "waybill-workspace-closing")} onKeyDown={(event) => {
      if (event.key === "Escape" && !event.defaultPrevented && !(event.target as HTMLElement).closest('[role="dialog"],[role="menu"],[role="tooltip"]')) { event.preventDefault(); close() }
    }}>
      <WorkspaceHeader title={alertMetricItems.find((item) => item.key === metric)?.detailTitle ?? `${alertMetricItems.find((item) => item.key === metric)?.label ?? "异常"}运单`} index={selectedIndex} count={rows.length} closeRef={backButton} onClose={close} disabled={closing} onPrevious={() => select(rows[selectedIndex - 1].id)} onNext={() => select(rows[selectedIndex + 1].id)} mobileList={mobilePane === "list"} onToggleList={() => setMobilePane((pane) => pane === "list" ? "detail" : "list")} />
      <WorkspaceColumns>
        <WorkspaceRail aria-label="运单卡片列表" mobileList={mobilePane === "list"} style={{ viewTransitionName: "waybill-list" }}>
          <div ref={rail} tabIndex={0} aria-label="当前筛选运单列表" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3 outline-none focus-visible:ring-1 focus-visible:ring-ring">
            <div role="list" aria-label="运单列表" className="flex flex-col gap-2"><TooltipProvider>{rows.map((entry, index) => <AlertRailCard key={entry.id} entry={entry} index={index} selected={entry.id === selected.id} metric={metric} now={now} onSelect={() => select(entry.id)} onStep={(offset) => { const next = rows[index + offset]; if (next) select(next.id, true) }} transition={rowNames.has(entry.id) ? transitionName(entry.id) : undefined} />)}</TooltipProvider></div>
          </div>
        </WorkspaceRail>
        <WorkspaceDetail aria-label={selection.tab === "pod" ? "POD 详情" : "运单详情"} mobileList={mobilePane === "list"} style={{ viewTransitionName: "waybill-detail" }}>
          <div className="flex h-full min-h-0 min-w-0 flex-col">
          <div key={selected.id} className="waybill-information min-h-0 min-w-0 flex-1 overflow-hidden">
          {selection.tab === "details" ? <MonitorWaybillOverlay embedded row={selected.waybill} driver={driver} initialTab="details" onClose={close} /> : selected.waybill.status === "delivered" ? <MonitorWaybillOverlay embedded row={selected.waybill} driver={driver} initialTab="pod" initialPhotoId={selection.photoId} onClose={close} /> : <Empty className="h-full"><EmptyHeader><EmptyTitle>暂无 POD</EmptyTitle><EmptyDescription>该运单尚无可展示的签收照片，可继续切换其他运单。</EmptyDescription></EmptyHeader></Empty>}
          </div>
          {showProcessingAction && <footer aria-label="问题件处理操作栏" className="flex shrink-0 justify-end border-t bg-card px-[30px] py-[18px]">
            <Button type="button" disabled={closing} aria-label={`处理问题件 ${selected.waybill.id}`} onClick={() => toast.info(`将打开运单 ${selected.waybill.id} 的问题件处理抽屉，当前暂未接入。`)}>处理问题件</Button>
          </footer>}
          </div>
        </WorkspaceDetail>
      </WorkspaceColumns>
    </section>}
  </div>
}

function SourceList({ children, open }: { children: (open: OpenDetail) => ReactNode; open: OpenDetail }) {
  return <>{children(open)}</>
}

function RailText({ children, className }: { children: string; className?: string }) {
  return <Tooltip><TooltipTrigger asChild><span tabIndex={0} className={cn("min-w-0 truncate rounded-sm outline-none focus-visible:ring-1 focus-visible:ring-ring", className)}>{children}</span></TooltipTrigger><TooltipContent>{children}</TooltipContent></Tooltip>
}

function AlertRailCard({ entry, index, selected, metric, now, onSelect, onStep, transition }: { entry: AlertWaybillEntry; index: number; selected: boolean; metric: AlertMetricKey; now?: number; onSelect: () => void; onStep: (offset: number) => void; transition?: string }) {
  const { waybill: row, task } = entry
  const driver = monitorDrivers.find((item) => item.id === row.driverId)
  const isLocation = metric === "pod" || metric === "delivery-location"
  const scene = metric === "pending" || metric === "suspected-lost"
    ? `剩余处理时长：${task && now !== undefined ? remainingProblemTime(task.deadline, now) : "—"}`
    : metric === "in-progress" ? `问题件类型：${task?.type ?? "—"}`
    : `问题件结束时间：${task?.endedAt ? formatDateTime(task.endedAt) : "—"}`
  return <article role="listitem" data-alert-card={entry.id} aria-label={`${row.id} 运单卡片`} style={{ viewTransitionName: transition }}>
    <WaybillNavigationCard autoHeight index={index} active={selected} label={`查看运单 ${row.id}`} onSelect={onSelect} onKeyDown={(event) => { if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); onStep(event.key === "ArrowDown" ? 1 : -1) } }}>
    <WaybillCardHeading number={row.id} status={statusLabels[row.status]} />
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs font-normal text-muted-foreground">
      <span className="inline-flex min-w-0 max-w-full items-baseline gap-1"><span className="shrink-0">司机：</span><span className="min-w-0 break-words text-foreground">{task?.driver ?? driver?.name ?? "—"}</span></span>
      <span className="inline-flex min-w-0 max-w-full items-baseline gap-1"><span className="shrink-0">路区：</span><span className="min-w-0 break-words">{row.route?.trim() || "—"}</span></span>
    </div>
    <div className="flex min-h-4 min-w-0 items-center gap-2">{isLocation ? <>{validCoordinate(row.collectedPosition) ? <WaybillLocationLink row={row} /> : <Tooltip><TooltipTrigger asChild><span tabIndex={0} aria-disabled="true" className="inline-flex items-center gap-1 text-muted-foreground"><ExternalLinkIcon className="size-3" />妥投位置</span></TooltipTrigger><TooltipContent>暂无妥投坐标，无法跳转</TooltipContent></Tooltip>}{row.deviation !== null && row.deviation !== undefined && <span className={cn("tabular-nums", row.deviation > 800 && "text-destructive")}>偏离距离 {row.deviation} m</span>}</> : <RailText className={task && now !== undefined && (metric === "pending" || metric === "suspected-lost") && Date.parse(task.deadline) <= now ? "text-destructive" : undefined}>{scene}</RailText>}</div>
    <div className="flex min-w-0 items-center justify-between gap-2 text-muted-foreground"><RailText>{task?.latestAction ?? row.latestAction}</RailText><time className="shrink-0 tabular-nums" dateTime={task?.actionAt ?? row.actionAt}>{formatDateTime(task?.actionAt ?? row.actionAt)}</time></div>
    </WaybillNavigationCard>
  </article>
}
