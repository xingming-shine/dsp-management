"use client"

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { flushSync } from "react-dom"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { formatDateTime } from "@/lib/date-time"
import { cn } from "@/lib/utils"
import { WaybillDetailSheet } from "@/features/live-dashboard/components/waybill-detail-sheet"
import { WAYBILL_CARD_PITCH, WaybillCardHeading, WaybillNavigationCard, WorkspaceColumns, WorkspaceDetail, WorkspaceHeader, WorkspaceRail } from "./waybill-workspace-parts"

/** Source fields stay separate: pickup/return/delivery status never substitutes for waybill status. */
export type WorkspaceWaybill = {
  trackingNumber: string
  waybillStatus?: string
  route: string
  postalCode: string
  latestAction: string
  actionAt: string
  operator: string
  driver?: string
  assignedCourier?: string | null
  pickupCourier?: string | null
  courierRoute?: string | null
  pickupStatus?: string
  pickupAt?: string | null
  pushedAt?: string
  deliveryDate?: string
  status?: string
  source?: "current" | "history"
  waybillType?: string
  overdueDays?: string
  deliveryAttempts?: number
  deliveredAt?: string | null
  deliveryIssue?: string
  problemType?: string | null
  issueInstruction?: string
  returnType?: string
  returnStatus?: string
  reportedAt?: string
  returnedAt?: string | null
  exceptionReason?: string
  nonStandardReturnInfo?: { returnedAt: string; stationName: string; reason: string; operator: string } | null
}

export type WaybillScene = "task" | "pickup" | "uncollected" | "expected" | "pending" | "delivered" | "exception" | "nonstandard-return" | "return"
type DetailField = { label: string; value: string }
const field = (label: string, value: string | number | null | undefined): DetailField => ({ label, value: value === null || value === undefined || value === "" ? "—" : String(value) })
const time = (value?: string | null) => value ? formatDateTime(value) : "—"

function contextField(row: WorkspaceWaybill, scene: WaybillScene): DetailField {
  switch (scene) {
    case "task":
    case "pickup":
    case "uncollected": return field("领件状态", row.pickupStatus)
    case "expected":
    case "nonstandard-return": return field("派件来源", row.source === "current" ? "当期应派" : row.source === "history" ? "历史未派" : null)
    case "pending": return field("超期天数", row.overdueDays)
    case "delivered": return field("妥投异常", row.deliveryIssue)
    case "exception": return field("问题件类型", row.problemType)
    case "return": return field("退回状态", row.returnStatus)
  }
}

function driverField(row: WorkspaceWaybill, scene: WaybillScene) {
  return scene === "task" ? field("指派司机", row.assignedCourier) : field("司机", row.driver)
}

const transitionName = (number: string) => `waybill-row-${number.replace(/[^a-zA-Z0-9_-]/g, "-")}`

/** Capture the rendered table before committing the card layout, retaining visual identity. */
export function useWaybillSelection<T extends WorkspaceWaybill>() {
  const [selected, setSelected] = useState<T | null>(null)
  const select = (row: T | null) => {
    if (selected || !row || !document.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setSelected(row)
      return
    }
    document.documentElement.dataset.waybillTransition = "open"
    const transition = document.startViewTransition(() => flushSync(() => setSelected(row)))
    void transition.finished.catch(() => {}).finally(() => { delete document.documentElement.dataset.waybillTransition })
  }
  return [selected, select] as const
}

/** Keeps the table mounted so query drafts, sorting and horizontal scroll survive detail browsing. */
export function WaybillWorkspace<T extends WorkspaceWaybill>({ children, rows, selected, onSelect, pageSize, onPageChange, scene, title }: {
  children: ReactNode
  rows: T[]
  selected: T | null
  onSelect: (row: T | null) => void
  pageSize: number
  onPageChange: (page: number) => void
  scene: WaybillScene
  title: string
}) {
  const listRef = useRef<HTMLDivElement>(null)
  const returnTarget = useRef<string | null>(null)
  const originalScroll = useRef(0)

  useLayoutEffect(() => {
    if (selected || !returnTarget.current) return
    const number = returnTarget.current
    returnTarget.current = null
    const trigger = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? [])
      .find((button) => button.textContent?.trim() === number)
    window.scrollTo({ top: originalScroll.current, behavior: "instant" })
    if (trigger) {
      trigger.focus({ preventScroll: true })
      trigger.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" })
      const row = trigger.closest("tr")
      row?.setAttribute("data-returned-waybill", "true")
      return () => row?.removeAttribute("data-returned-waybill")
    }
  }, [selected])

  return <div className="min-w-0">
    <div ref={listRef} hidden={Boolean(selected)} style={{ viewTransitionName: "waybill-list" }} onClickCapture={() => {
      originalScroll.current = window.scrollY
      const numbers = new Set(rows.map((row) => row.trackingNumber))
      listRef.current?.querySelectorAll<HTMLTableRowElement>("tr").forEach((tableRow) => {
        const number = tableRow.querySelector("button")?.textContent?.trim()
        const rect = tableRow.getBoundingClientRect()
        tableRow.style.viewTransitionName = number && numbers.has(number) && rect.top >= 64 && rect.bottom <= window.innerHeight ? transitionName(number) : "none"
      })
    }}>
      {children}
    </div>
    {selected ? <WaybillWorkspacePanel
      rows={rows} selected={selected} onSelect={onSelect} scene={scene} title={title}
      onClose={(anchor) => {
        const index = rows.findIndex((row) => row.trackingNumber === anchor.trackingNumber)
        returnTarget.current = anchor.trackingNumber
        onPageChange(Math.floor(Math.max(0, index) / pageSize) + 1)
        onSelect(null)
      }}
    /> : null}
  </div>
}

const CARD_PITCH = WAYBILL_CARD_PITCH

function WaybillWorkspacePanel<T extends WorkspaceWaybill>({ rows, selected, onSelect, onClose, scene, title }: {
  rows: T[]; selected: T; onSelect: (row: T) => void; onClose: (anchor: T) => void; scene: WaybillScene; title: string
}) {
  const selectedIndex = rows.findIndex((row) => row.trackingNumber === selected.trackingNumber)
  const [scrollTop, setScrollTop] = useState(Math.max(0, selectedIndex) * CARD_PITCH)
  const [railHeight, setRailHeight] = useState(600)
  const [mobileList, setMobileList] = useState(false)
  const [closing, setClosing] = useState(false)
  const railRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initialIndex = useRef(Math.max(0, selectedIndex))
  const lastRailScroll = useRef(Math.max(0, selectedIndex) * CARD_PITCH)
  const firstVisible = Math.min(Math.max(0, rows.length - 1), Math.floor(scrollTop / CARD_PITCH))
  const start = Math.max(0, firstVisible - 3)
  const end = Math.min(rows.length, firstVisible + Math.ceil(railHeight / CARD_PITCH) + 4)

  useLayoutEffect(() => {
    const rail = railRef.current
    if (!rail) return
    rail.scrollTop = initialIndex.current * CARD_PITCH
    panelRef.current?.scrollIntoView({ block: "start", behavior: "instant" })
    closeRef.current?.focus({ preventScroll: true })
    const observer = new ResizeObserver(() => {
      if (rail.clientHeight) {
        setRailHeight(rail.clientHeight)
        rail.scrollTop = lastRailScroll.current
      }
    })
    observer.observe(rail)
    return () => observer.disconnect()
  }, [])

  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current) }, [])

  const close = () => {
    if (closing) return
    // A scrolled-away selection must not pull the parent table back to an older position.
    const bottom = scrollTop + railHeight
    const selectedIsVisible = !railRef.current?.clientHeight || (selectedIndex * CARD_PITCH >= scrollTop && selectedIndex * CARD_PITCH < bottom)
    const anchor = selectedIsVisible ? selected : rows[firstVisible] ?? selected
    setClosing(true)
    closeTimer.current = setTimeout(() => onClose(anchor), window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 180)
  }

  const select = (index: number, focusCard = false) => {
    const row = rows[index]
    if (!row || closing) return
    onSelect(row)
    const rail = railRef.current
    if (rail) {
      const top = index * CARD_PITCH
      if (!rail.clientHeight || top < rail.scrollTop || top + 112 > rail.scrollTop + rail.clientHeight) {
        lastRailScroll.current = top
        setScrollTop(top)
        rail.scrollTop = top
      }
    }
    if (focusCard) requestAnimationFrame(() => railRef.current?.querySelector<HTMLButtonElement>(`[data-card-index="${index}"]`)?.focus({ preventScroll: true }))
    else setMobileList(false)
  }

  return <section ref={panelRef} aria-label={`${title}运单工作台`} className={cn("waybill-workspace flex min-w-0 flex-col gap-3", closing && "waybill-workspace-closing")}
    onKeyDown={(event) => {
      if ((event.target as HTMLElement).closest('[role="dialog"]')) return
      if (event.key === "Escape" && !event.defaultPrevented) { event.preventDefault(); close() }
    }}>
    <WorkspaceHeader title={title} index={selectedIndex} count={rows.length} closeRef={closeRef} onClose={close} disabled={closing} onPrevious={() => select(selectedIndex - 1)} onNext={() => select(selectedIndex + 1)} mobileList={mobileList} onToggleList={() => setMobileList(!mobileList)} />
    <WorkspaceColumns>
      <WorkspaceRail style={{ viewTransitionName: "waybill-list" }} mobileList={mobileList} aria-label="运单卡片列表">
        <div ref={railRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3" onScroll={(event) => {
          if (!event.currentTarget.clientHeight) return
          lastRailScroll.current = event.currentTarget.scrollTop
          setScrollTop(event.currentTarget.scrollTop)
        }}>
          <div role="list" aria-label="运单列表" className="relative" style={{ height: rows.length * CARD_PITCH }}>
            {rows.slice(start, end).map((row, offset) => {
              const index = start + offset
              const active = row.trackingNumber === selected.trackingNumber
              const driver = driverField(row, scene)
              const sceneField = contextField(row, scene)
              const status = row.waybillStatus?.trim()
              const visibleStatus = status && status !== "—" && status !== "-" ? status : undefined
              const fullyVisible = index * CARD_PITCH >= scrollTop && index * CARD_PITCH + 112 <= scrollTop + railHeight
              return <div role="listitem" aria-setsize={rows.length} aria-posinset={index + 1} key={row.trackingNumber} className="absolute inset-x-0" style={{ top: index * CARD_PITCH, viewTransitionName: fullyVisible ? transitionName(row.trackingNumber) : "none" }}>
                <WaybillNavigationCard index={index} active={active} label={`查看运单 ${row.trackingNumber}${visibleStatus ? `，${visibleStatus}` : ""}`} onSelect={() => select(index)}
                  onKeyDown={(event) => {
                    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return
                    event.preventDefault()
                    select(index + (event.key === "ArrowDown" ? 1 : -1), true)
                  }}>
                  <WaybillCardHeading number={row.trackingNumber} status={visibleStatus} />
                  <span className="flex min-w-0 gap-3 text-xs text-muted-foreground"><CardText value={`${driver.label}：${driver.value}`} /><CardText value={`路区：${row.route || "—"}`} /></span>
                  <span className="flex min-w-0 text-xs"><CardText value={`${sceneField.label}：${sceneField.value}`} /></span>
                  <span className="flex min-w-0 justify-between gap-2 text-xs text-muted-foreground"><CardText value={row.latestAction || "—"} /><span className="shrink-0 tabular-nums">{time(row.actionAt)}</span></span>
                </WaybillNavigationCard>
              </div>
            })}
          </div>
        </div>
      </WorkspaceRail>
      <WorkspaceDetail style={{ viewTransitionName: "waybill-detail" }} mobileList={mobileList}>
        <WaybillInformation key={selected.trackingNumber} row={selected} onClose={close} />
      </WorkspaceDetail>
    </WorkspaceColumns>
  </section>
}

function CardText({ value }: { value: string }) {
  return <Tooltip><TooltipTrigger asChild><span className="min-w-0 truncate">{value}</span></TooltipTrigger><TooltipContent>{value}</TooltipContent></Tooltip>
}

function WaybillInformation({ row, onClose }: { row: WorkspaceWaybill; onClose: () => void }) {
  return <article className="waybill-information h-full min-w-0" aria-label={`运单 ${row.trackingNumber} 详情`}>
    <WaybillDetailSheet embedded row={{
      trackingNumber: row.trackingNumber,
      pushedAt: row.pushedAt ?? row.pickupAt ?? row.reportedAt ?? "",
      pickupCourier: row.pickupCourier ?? row.driver ?? null,
      pickupStatus: row.status ?? row.pickupStatus ?? row.returnStatus ?? "—",
      waybillStatus: row.waybillStatus ?? "—",
      actionAt: row.actionAt, route: row.route, postalCode: row.postalCode,
      nonStandardReturnInfo: row.nonStandardReturnInfo,
    }} onOpenChange={(open) => { if (!open) onClose() }} />
  </article>
}
